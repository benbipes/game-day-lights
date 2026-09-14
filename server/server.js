// server.js - Game Day Smart Lighting Webhook & Automation Server

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEAMS, DEFAULT_USER_CONFIG } from './config.js';
import { LightService } from './lightService.js';
import { EspnService } from './espnService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// Ensure data dir
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load or initialize config
let userConfig = { ...DEFAULT_USER_CONFIG };
if (fs.existsSync(CONFIG_FILE)) {
  try {
    const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    userConfig = {
      ...userConfig,
      ...saved,
      homeAssistant: { ...userConfig.homeAssistant, ...(saved.homeAssistant || {}) },
      philipsHue: { ...userConfig.philipsHue, ...(saved.philipsHue || {}) },
      general: { ...userConfig.general, ...(saved.general || {}) }
    };
  } catch (err) {
    console.error('Error loading config file, using defaults:', err);
  }
}

function saveConfigToFile(cfg) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save config:', err);
  }
}

// Services
const lightService = new LightService(userConfig);
const espnService = new EspnService(lightService);

// Initialize initial ambient light
lightService.setAmbientLighting(userConfig.general.activeTeam || 'canes');

// Connected SSE clients for real-time reactivity
const sseClients = new Set();

function broadcastSse(eventName, data) {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch (err) {
      sseClients.delete(res);
    }
  }
}

// Broadcast light state updates
lightService.onStateChange((state) => {
  broadcastSse('state_update', {
    ...state,
    match: espnService.getMatch(lightService.currentTeamId)
  });
});

// Helper: parse request JSON body
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Helper: JSON response
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Helper: static file MIME types
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function serveStatic(req, res, pathname) {
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not Found');
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function generateHomeAssistantYaml(config) {
  const webhookId = config.homeAssistant.webhookId || 'game_day_score_celebration';
  const entityId = config.homeAssistant.entityId || 'light.living_room_lights';

  return `# Home Assistant Automation for Game Day Lights
# Paste this into your automations.yaml or Home Assistant Automation Editor

- id: 'game_day_lights_webhook'
  alias: 'Game Day Lights - Score Celebration & Ambient Sync'
  description: 'Synchronizes lights to team colors and triggers flashing goal celebrations'
  trigger:
    - platform: webhook
      webhook_id: "${webhookId}"
      allowed_methods:
        - POST
      local_only: false
  action:
    - choose:
        # 1. Goal / Touchdown Celebration Flash
        - conditions:
            - condition: template
              value_template: "{{ trigger.json.event == 'score_celebration' }}"
          sequence:
            # Flash light in primary team color
            - service: light.turn_on
              target:
                entity_id: "${entityId}"
              data:
                rgb_color: "{{ trigger.json.rgb_color }}"
                brightness: 255
                flash: long
            # Wait for celebration duration then restore
            - delay:
                seconds: "{{ trigger.json.duration_seconds | default(12) }}"
            - service: light.turn_on
              target:
                entity_id: "${entityId}"
              data:
                rgb_color: "{{ trigger.json.rgb_color }}"
                brightness: 220
                transition: 2

        # 2. Ambient Game Day Sync
        - conditions:
            - condition: template
              value_template: "{{ trigger.json.event == 'ambient_sync' }}"
          sequence:
            - service: light.turn_on
              target:
                entity_id: "${entityId}"
              data:
                rgb_color: "{{ trigger.json.rgb_color }}"
                brightness: "{{ trigger.json.brightness | default(220) }}"
                transition: 3
`;
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // --- API Routes ---

  // SSE Stream: /api/events/stream
  if (pathname === '/api/events/stream' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('\n');
    sseClients.add(res);

    // Send initial snapshot
    const initialData = {
      activeTeam: lightService.currentTeamId,
      mode: lightService.currentMode,
      currentColor: lightService.currentLightColor,
      isCelebrating: lightService.currentMode === 'celebration',
      match: espnService.getMatch(lightService.currentTeamId),
      matches: espnService.getAllMatches(),
      config: userConfig,
      logs: lightService.logs.slice(0, 30)
    };
    res.write(`event: initial_state\ndata: ${JSON.stringify(initialData)}\n\n`);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // GET /api/teams
  if (pathname === '/api/teams' && req.method === 'GET') {
    return sendJson(res, 200, { teams: TEAMS });
  }

  // GET /api/state
  if (pathname === '/api/state' && req.method === 'GET') {
    return sendJson(res, 200, {
      activeTeam: lightService.currentTeamId,
      mode: lightService.currentMode,
      currentColor: lightService.currentLightColor,
      isCelebrating: lightService.currentMode === 'celebration',
      match: espnService.getMatch(lightService.currentTeamId),
      matches: espnService.getAllMatches(),
      logs: lightService.logs.slice(0, 50)
    });
  }

  // POST /api/select-team
  if (pathname === '/api/select-team' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const teamId = body.teamId;
      if (!TEAMS[teamId]) {
        return sendJson(res, 400, { error: 'Unknown team ID' });
      }
      userConfig.general.activeTeam = teamId;
      saveConfigToFile(userConfig);
      await lightService.setAmbientLighting(teamId);
      return sendJson(res, 200, {
        success: true,
        teamId,
        match: espnService.getMatch(teamId)
      });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // POST /api/webhooks/score - Generic Inbound Webhook
  if (pathname === '/api/webhooks/score' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = espnService.handleGenericScoreWebhook(body);
      return sendJson(res, 200, {
        success: true,
        message: 'Score webhook processed',
        result
      });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // POST /api/webhooks/espn - ESPN Inbound Webhook
  if (pathname === '/api/webhooks/espn' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = espnService.handleEspnWebhook(body);
      return sendJson(res, 200, {
        success: true,
        message: 'ESPN webhook processed',
        result
      });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // POST /api/simulate-score
  if (pathname === '/api/simulate-score' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const teamId = body.teamId || lightService.currentTeamId;
      const match = espnService.simulateScore(teamId, body);
      return sendJson(res, 200, { success: true, match });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // POST /api/simulate-opponent-score
  if (pathname === '/api/simulate-opponent-score' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const teamId = body.teamId || lightService.currentTeamId;
      const match = espnService.simulateOpponentScore(teamId);
      return sendJson(res, 200, { success: true, match });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // POST /api/reset-match
  if (pathname === '/api/reset-match' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const teamId = body.teamId || lightService.currentTeamId;
      const match = espnService.resetMatch(teamId);
      return sendJson(res, 200, { success: true, match });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // POST /api/test-celebration
  if (pathname === '/api/test-celebration' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const teamId = body.teamId || lightService.currentTeamId;
      await lightService.triggerCelebration(teamId, {
        type: 'MANUAL TEST',
        summary: 'Manual celebration trigger from dashboard'
      });
      return sendJson(res, 200, { success: true, teamId });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // POST /api/test-ambient
  if (pathname === '/api/test-ambient' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const teamId = body.teamId || lightService.currentTeamId;
      await lightService.setAmbientLighting(teamId);
      return sendJson(res, 200, { success: true, teamId });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // GET /api/config
  if (pathname === '/api/config' && req.method === 'GET') {
    return sendJson(res, 200, { config: userConfig });
  }

  // POST /api/config
  if (pathname === '/api/config' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      userConfig = {
        ...userConfig,
        ...body,
        homeAssistant: { ...userConfig.homeAssistant, ...(body.homeAssistant || {}) },
        philipsHue: { ...userConfig.philipsHue, ...(body.philipsHue || {}) },
        general: { ...userConfig.general, ...(body.general || {}) }
      };
      saveConfigToFile(userConfig);
      lightService.updateConfig(userConfig);
      broadcastSse('config_update', { config: userConfig });
      return sendJson(res, 200, { success: true, config: userConfig });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // GET /api/ha-yaml
  if (pathname === '/api/ha-yaml' && req.method === 'GET') {
    const yaml = generateHomeAssistantYaml(userConfig);
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end(yaml);
  }

  // GET /api/logs
  if (pathname === '/api/logs' && req.method === 'GET') {
    return sendJson(res, 200, { logs: lightService.logs });
  }

  // Serve static files
  return serveStatic(req, res, pathname);
});

let PORT = parseInt(process.env.PORT, 10) || 3300;

function startServer(portToTry) {
  server.listen(portToTry, '0.0.0.0', () => {
    console.log(`\n🏒 Game Day Lights Server running at: http://localhost:${portToTry}`);
    console.log(`📡 Inbound Webhook endpoint: http://localhost:${portToTry}/api/webhooks/score`);
    console.log(`📡 ESPN Webhook endpoint:    http://localhost:${portToTry}/api/webhooks/espn\n`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} in use, trying ${PORT + 1}...`);
    PORT++;
    startServer(PORT);
  } else {
    console.error('Server error:', err);
  }
});

startServer(PORT);


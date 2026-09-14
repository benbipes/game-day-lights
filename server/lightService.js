import https from 'node:https';
import { TEAMS } from './config.js';

// Philips Hue Bridge uses internal self-signed TLS certificates on local private LAN (RFC 1918)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// RGB to Hue CIE 1931 XY converter
export function rgbToXy(red, green, blue) {
  let r = red / 255;
  let g = green / 255;
  let b = blue / 255;

  r = r > 0.04045 ? Math.pow((r + 0.055) / (1.0 + 0.055), 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / (1.0 + 0.055), 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / (1.0 + 0.055), 2.4) : b / 12.92;

  const X = r * 0.664511 + g * 0.154324 + b * 0.162028;
  const Y = r * 0.283881 + g * 0.668433 + b * 0.047685;
  const Z = r * 0.000088 + g * 0.072310 + b * 0.986039;

  const sum = X + Y + Z;
  if (sum === 0) return [0.3127, 0.3290]; // Default white D65

  return [parseFloat((X / sum).toFixed(4)), parseFloat((Y / sum).toFixed(4))];
}

export class LightService {
  constructor(config) {
    this.config = config;
    this.currentMode = 'ambient'; // 'ambient' | 'celebration' | 'off'
    this.currentTeamId = config.general.activeTeam || 'canes';
    this.currentLightColor = TEAMS[this.currentTeamId]?.ambientRgb || [200, 16, 46];
    this.activeCelebrationTimer = null;
    this.activeFlashInterval = null;
    this.activeHardwareStrobeInterval = null;
    this.lastStrobeColorIdx = -1;
    this.previousStates = {};
    this.flashStep = 0;
    this.logs = [];
    this.stateListeners = [];
  }

  onStateChange(fn) {
    this.stateListeners.push(fn);
  }

  notifyStateChange(extraData = {}) {
    const state = {
      mode: this.currentMode,
      activeTeam: this.currentTeamId,
      currentColor: this.currentLightColor,
      isCelebrating: this.currentMode === 'celebration',
      ...extraData
    };
    for (const fn of this.stateListeners) {
      try { fn(state); } catch (err) { console.error('Listener error:', err); }
    }
  }

  addLog(source, type, details, success = true) {
    const entry = {
      id: Date.now() + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      source,
      type,
      details,
      success
    };
    this.logs.unshift(entry);
    if (this.logs.length > 100) this.logs.pop();
    this.notifyStateChange({ newLog: entry });
    return entry;
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.addLog('System', 'CONFIG_UPDATE', 'Integration settings updated');
  }

  // --- External Integrations: Home Assistant & Philips Hue ---

  async dispatchHomeAssistantWebhook(payload) {
    const ha = this.config.homeAssistant;
    if (!ha || !ha.enabled) return { skipped: true, reason: 'Disabled' };

    const cleanHost = (ha.host || '').replace(/\/+$/, '');
    const url = `${cleanHost}/api/webhook/${ha.webhookId}`;
    const startTime = Date.now();

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000)
      });
      const latency = Date.now() - startTime;
      const ok = res.ok;
      this.addLog('Home Assistant', 'WEBHOOK_POST', {
        endpoint: `/api/webhook/${ha.webhookId}`,
        status: res.status,
        latencyMs: latency,
        payload
      }, ok);
      return { success: ok, status: res.status, latencyMs: latency };
    } catch (err) {
      this.addLog('Home Assistant', 'WEBHOOK_ERROR', {
        endpoint: url,
        error: err.message,
        payload
      }, false);
      return { success: false, error: err.message };
    }
  }

  async dispatchHomeAssistantService(rgbColor, brightness = 254, flash = null) {
    const ha = this.config.homeAssistant;
    if (!ha || !ha.enabled || ha.mode !== 'service') return { skipped: true };

    const cleanHost = (ha.host || '').replace(/\/+$/, '');
    const url = `${cleanHost}/api/services/light/turn_on`;
    const payload = {
      entity_id: ha.entityId || 'light.living_room',
      rgb_color: rgbColor,
      brightness: brightness
    };
    if (flash) payload.flash = flash;

    const startTime = Date.now();
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ha.accessToken}`
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000)
      });
      const latency = Date.now() - startTime;
      this.addLog('Home Assistant', 'REST_SERVICE', {
        service: 'light.turn_on',
        entityId: ha.entityId,
        rgb: rgbColor,
        flash,
        status: res.status,
        latencyMs: latency
      }, res.ok);
      return { success: res.ok, status: res.status };
    } catch (err) {
      this.addLog('Home Assistant', 'SERVICE_ERROR', { error: err.message }, false);
      return { success: false, error: err.message };
    }
  }

  // Resilient Hue Bridge fetcher: tries HTTP first (fast native port 80 for local REST v1),
  // then falls back to HTTPS with self-signed certificate acceptance (RFC 1918 LAN)
  async fetchHue(cleanIp, path, options = {}) {
    const timeout = options.timeout || 4000;
    try {
      return await fetch(`http://${cleanIp}${path}`, {
        ...options,
        signal: AbortSignal.timeout(timeout)
      });
    } catch (httpErr) {
      return await new Promise((resolve, reject) => {
        const req = https.request(`https://${cleanIp}${path}`, {
          method: options.method || 'GET',
          headers: options.headers || {},
          rejectUnauthorized: false,
          timeout
        }, (res) => {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              json: async () => {
                try {
                  return JSON.parse(data || '{}');
                } catch (parseErr) {
                  return { error: 'Invalid JSON response from Hue Bridge' };
                }
              },
              text: async () => data
            });
          });
        });
        req.on('error', (sslErr) => {
          reject(new Error(`Could not reach Hue Bridge at ${cleanIp}: ${httpErr.message} (HTTPS fallback: ${sslErr.message})`));
        });
        req.on('timeout', () => {
          req.destroy(new Error(`Hue Bridge connection timed out after ${timeout}ms`));
        });
        if (options.body) {
          req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
        }
        req.end();
      });
    }
  }

  getTargetIds() {
    const hue = this.config.philipsHue;
    if (!hue) return [];
    const ids = [];
    if (Array.isArray(hue.targetIds) && hue.targetIds.length > 0) {
      ids.push(...hue.targetIds);
    } else if (hue.targetId) {
      String(hue.targetId).split(/[, ]+/).filter(Boolean).forEach(id => ids.push(id));
    }
    return [...new Set(ids.map(id => String(id).trim()))].filter(Boolean);
  }

  async captureTargetState(targetId) {
    const hue = this.config.philipsHue;
    if (!hue || !hue.enabled) return null;
    const cleanIp = (hue.bridgeIp || '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
    if (!cleanIp || !hue.username) return null;

    const isGroup = (hue.targetType || 'group') === 'group';
    const path = isGroup
      ? `/api/${hue.username}/groups/${targetId}`
      : `/api/${hue.username}/lights/${targetId}`;

    try {
      const res = await this.fetchHue(cleanIp, path, { method: 'GET', timeout: 3500 });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || data.error) return null;

      if (isGroup) {
        const wasOn = Boolean(data.state?.any_on ?? data.action?.on);
        let bri = data.action?.bri ?? 254;
        let xy = data.action?.xy;
        let ct = data.action?.ct;
        let colormode = data.action?.colormode || 'xy';
        let hueVal = data.action?.hue;
        let sat = data.action?.sat;

        // Ground-truth check: query first light in group for true physical bulb state
        if (Array.isArray(data.lights) && data.lights.length > 0) {
          try {
            const firstLightRes = await this.fetchHue(cleanIp, `/api/${hue.username}/lights/${data.lights[0]}`, { method: 'GET', timeout: 2000 });
            if (firstLightRes.ok) {
              const lightData = await firstLightRes.json();
              if (lightData && lightData.state) {
                if (typeof lightData.state.bri === 'number') bri = lightData.state.bri;
                if (lightData.state.ct) ct = lightData.state.ct;
                if (Array.isArray(lightData.state.xy)) xy = lightData.state.xy;
                if (lightData.state.colormode) colormode = lightData.state.colormode;
                if (typeof lightData.state.hue === 'number') hueVal = lightData.state.hue;
                if (typeof lightData.state.sat === 'number') sat = lightData.state.sat;
                if (typeof lightData.state.on === 'boolean' && data.state?.any_on === undefined) {
                  wasOn = lightData.state.on;
                }
              }
            }
          } catch (e) {
            // Keep group.action values on individual light query timeout
          }
        }

        return {
          targetId: String(targetId),
          isGroup: true,
          name: data.name,
          wasOn,
          bri,
          xy,
          ct,
          colormode,
          hue: hueVal,
          sat,
          lights: data.lights,
          rawAction: data.action
        };
      } else {
        const wasOn = Boolean(data.state?.on);
        return {
          targetId: String(targetId),
          isGroup: false,
          name: data.name,
          wasOn,
          bri: data.state?.bri ?? 254,
          xy: data.state?.xy,
          ct: data.state?.ct,
          colormode: data.state?.colormode || 'xy',
          hue: data.state?.hue,
          sat: data.state?.sat,
          rawState: data.state
        };
      }
    } catch (err) {
      return null;
    }
  }

  async dispatchSingleHueTarget(cleanIp, username, targetType, targetId, bodyPayload) {
    const isGroup = (targetType || 'group') === 'group';
    const path = isGroup
      ? `/api/${username}/groups/${targetId}/action`
      : `/api/${username}/lights/${targetId}/state`;

    const startTime = Date.now();
    try {
      const res = await this.fetchHue(cleanIp, path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
        timeout: 4000
      });
      const latency = Date.now() - startTime;
      const data = await res.json().catch(() => null);
      const isOk = res.ok && (!Array.isArray(data) || !data[0]?.error);
      return { success: isOk, targetId: String(targetId), data, latencyMs: latency, status: res.status };
    } catch (err) {
      return { success: false, targetId: String(targetId), error: err.message };
    }
  }

  async dispatchHueBridge(bodyPayload, specificTargetId = null) {
    const hue = this.config.philipsHue;
    if (!hue || !hue.enabled) return { skipped: true, reason: 'Disabled' };

    const cleanIp = (hue.bridgeIp || '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
    if (!cleanIp || !hue.username) {
      return { skipped: true, reason: 'Hue Bridge IP or username not configured' };
    }

    const targets = specificTargetId ? [String(specificTargetId)] : this.getTargetIds();
    if (targets.length === 0) {
      return { skipped: true, reason: 'No Hue target room or light configured' };
    }

    const results = await Promise.allSettled(
      targets.map(id => this.dispatchSingleHueTarget(cleanIp, hue.username, hue.targetType || 'group', id, bodyPayload))
    );

    const outcomes = results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason?.message });
    const allOk = outcomes.length > 0 && outcomes.every(o => o.success);

    this.addLog('Philips Hue', 'BRIDGE_COMMAND', {
      targets,
      payload: bodyPayload,
      outcomes
    }, allOk);

    return { success: allOk, outcomes };
  }

  // --- Hue Bridge Auto-Discovery & Pairing ---

  async discoverHueBridges() {
    try {
      const res = await fetch('https://discovery.meethue.com/', { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          return { success: true, bridges: list.map(b => ({ id: b.id, ip: b.internalipaddress })) };
        }
      }
    } catch (err) {
      // Cloud discovery fallback
    }
    return { success: false, message: 'Could not auto-discover from cloud. Please enter your Bridge IP manually.' };
  }

  async pairHueBridge(bridgeIp) {
    const cleanIp = (bridgeIp || '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
    try {
      const res = await this.fetchHue(cleanIp, '/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devicetype: 'game_day_lights#mac' }),
        timeout: 5000
      });
      const data = await res.json();
      if (Array.isArray(data) && data[0]) {
        if (data[0].error) {
          if (data[0].error.type === 101) {
            return {
              success: false,
              linkButtonRequired: true,
              message: 'Link button not pressed! Press the large round button on top of your Hue Bridge, then click Pair again within 30 seconds.'
            };
          }
          return { success: false, error: data[0].error.description };
        }
        if (data[0].success) {
          const username = data[0].success.username;
          this.config.philipsHue.bridgeIp = cleanIp;
          this.config.philipsHue.username = username;
          this.addLog('Philips Hue', 'BRIDGE_PAIRED', { bridgeIp: cleanIp, username });
          return { success: true, username, bridgeIp: cleanIp };
        }
      }
      return { success: false, message: 'Unexpected response from Hue Bridge' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async getHueRooms(bridgeIp, username) {
    const cleanIp = (bridgeIp || '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
    try {
      const res = await this.fetchHue(cleanIp, `/api/${username}/groups`, { timeout: 5000 });
      const groups = await res.json();
      const rooms = [];
      if (Array.isArray(groups)) {
        if (groups[0]?.error) {
          return { success: false, error: groups[0].error.description || 'Hue Bridge returned an error' };
        }
      } else if (groups && typeof groups === 'object') {
        for (const [id, grp] of Object.entries(groups)) {
          if (grp && typeof grp === 'object' && grp.name) {
            rooms.push({
              id: String(id),
              name: grp.name,
              type: grp.type || 'Room',
              lights: Array.isArray(grp.lights) ? grp.lights : []
            });
          }
        }
      }
      return { success: true, rooms };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }


  // --- Lighting Orchestration ---

  async setAmbientLighting(teamId = null, dispatchToHardware = true) {
    if (teamId) this.currentTeamId = teamId;
    const team = TEAMS[this.currentTeamId];
    if (!team) return;

    // Clear any running celebration loops
    if (this.activeFlashInterval) {
      clearInterval(this.activeFlashInterval);
      this.activeFlashInterval = null;
    }
    if (this.activeCelebrationTimer) {
      clearTimeout(this.activeCelebrationTimer);
      this.activeCelebrationTimer = null;
    }

    this.currentMode = 'ambient';
    this.currentLightColor = team.ambientRgb;
    this.notifyStateChange();

    this.addLog('Lighting', 'AMBIENT_SYNC', {
      team: team.name,
      rgb: team.ambientRgb,
      hex: team.primaryColor,
      xy: team.ambientXy,
      dispatched: dispatchToHardware
    });

    if (!dispatchToHardware) return;

    // 1. Home Assistant Webhook
    this.dispatchHomeAssistantWebhook({
      event: 'ambient_sync',
      team: team.id,
      team_name: team.name,
      action: 'set_ambient',
      rgb_color: team.ambientRgb,
      hex_color: team.primaryColor,
      brightness: this.config.general.ambientBrightness || 220
    });

    // 2. Home Assistant REST
    this.dispatchHomeAssistantService(team.ambientRgb, this.config.general.ambientBrightness || 220);

    // 3. Philips Hue Bridge
    this.dispatchHueBridge({
      on: true,
      xy: team.ambientXy,
      bri: this.config.general.ambientBrightness || 220,
      transitiontime: 15
    });
  }

  async triggerCelebration(teamId = null, scoreEvent = null) {
    const activeId = teamId || this.currentTeamId;
    const team = TEAMS[activeId];
    if (!team) return;

    this.currentTeamId = activeId;
    const wasAlreadyCelebrating = this.currentMode === 'celebration';
    this.currentMode = 'celebration';
    this.flashStep = 0;

    // Clear existing celebration loops and timers
    if (this.activeFlashInterval) {
      clearInterval(this.activeFlashInterval);
      this.activeFlashInterval = null;
    }
    if (this.activeHardwareStrobeInterval) {
      clearInterval(this.activeHardwareStrobeInterval);
      this.activeHardwareStrobeInterval = null;
    }
    if (this.activeCelebrationTimer) {
      clearTimeout(this.activeCelebrationTimer);
      this.activeCelebrationTimer = null;
    }

    const celebration = team.celebration;
    const celebrationColors = celebration.colors || [team.ambientRgb];
    const durationSeconds = this.config.general.celebrationDurationSeconds || 10;
    const durationMs = durationSeconds * 1000;
    const flashIntervalMs = celebration.flashIntervalMs || 250;
    const celebrationEndTime = Date.now() + durationMs;

    this.addLog('Lighting', 'GOAL_CELEBRATION_START', {
      team: team.name,
      title: celebration.celebrationTitle,
      event: scoreEvent,
      style: celebration.style,
      durationMs,
      durationSeconds
    });

    // Send high-level webhook to Home Assistant
    this.dispatchHomeAssistantWebhook({
      event: 'score_celebration',
      team: team.id,
      team_name: team.name,
      title: celebration.celebrationTitle,
      style: celebration.style,
      score_event: scoreEvent,
      rgb_color: team.ambientRgb,
      colors: celebrationColors,
      flash: 'long',
      duration_seconds: durationSeconds
    });

    // Home Assistant REST Flash
    this.dispatchHomeAssistantService(celebrationColors[0], 254, 'long');

    // 1. CAPTURE EXACT CURRENT LIGHT STATE FOR ALL TARGET ROOMS
    // Only capture if not already celebrating to avoid capturing active celebration colors!
    const targetIds = this.getTargetIds();
    if (!wasAlreadyCelebrating || !this.previousStates || Object.keys(this.previousStates).length === 0) {
      this.previousStates = {};
      if (this.config.philipsHue?.enabled) {
        await Promise.allSettled(
          targetIds.map(async (id) => {
            const state = await this.captureTargetState(id);
            if (state) {
              this.previousStates[id] = state;
            }
          })
        );
        this.addLog('Philips Hue', 'STATE_SNAPSHOT_CAPTURED', {
          targets: targetIds,
          snapshotCount: Object.keys(this.previousStates).length,
          states: this.previousStates
        });
      }
    }

    // Helper for non-repeating random color picker from team palette
    const getRandomTeamColor = () => {
      if (!celebrationColors || celebrationColors.length === 0) return [255, 255, 255];
      if (celebrationColors.length === 1) return celebrationColors[0];
      let nextIdx;
      do {
        nextIdx = Math.floor(Math.random() * celebrationColors.length);
      } while (nextIdx === this.lastStrobeColorIdx);
      this.lastStrobeColorIdx = nextIdx;
      return celebrationColors[nextIdx];
    };

    // Helper to send a clean Hue color strobe with in-flight concurrency lock
    let isHardwareDispatchBusy = false;
    const sendHardwareFlash = async (rgb) => {
      if (isHardwareDispatchBusy) return;
      isHardwareDispatchBusy = true;
      try {
        const xy = rgbToXy(rgb[0], rgb[1], rgb[2]);
        const bri = (rgb[0] < 25 && rgb[1] < 25 && rgb[2] < 25) ? 60 : 254;
        await this.dispatchHueBridge({
          on: true,
          xy,
          bri,
          alert: 'none',
          transitiontime: 2 // 0.2s quick color transition
        });
      } finally {
        isHardwareDispatchBusy = false;
      }
    };

    // 2. DISPATCH FIRST COLOR FLASH TO HARDWARE IMMEDIATELY
    const firstColor = getRandomTeamColor();
    sendHardwareFlash(firstColor);

    // 3. HARDWARE MULTI-COLOR RANDOM STROBE LOOP (1000ms cadence strictly adheres to Philips Hue Zigbee broadcast limit)
    // Stops 800ms before durationMs so the Zigbee radio is completely clear for the restore command!
    const hardwareCadenceMs = 1000;
    this.activeHardwareStrobeInterval = setInterval(() => {
      if (Date.now() >= celebrationEndTime - 800) {
        if (this.activeHardwareStrobeInterval) {
          clearInterval(this.activeHardwareStrobeInterval);
          this.activeHardwareStrobeInterval = null;
        }
        return;
      }
      const nextRgb = getRandomTeamColor();
      sendHardwareFlash(nextRgb);
    }, hardwareCadenceMs);

    // 4. SOFTWARE STROBE FOR REAL-TIME UI VISUALIZER AND SSE
    this.activeFlashInterval = setInterval(() => {
      this.flashStep++;
      const nextRgb = getRandomTeamColor();
      this.currentLightColor = nextRgb;
      this.notifyStateChange({
        flashStep: this.flashStep,
        celebrationTitle: celebration.celebrationTitle,
        celebrationTagline: celebration.celebrationTagline,
        audioKey: celebration.audioKey
      });
    }, flashIntervalMs);

    // 5. SCHEDULE CELEBRATION END & EXACT STATE RESTORATION
    this.activeCelebrationTimer = setTimeout(() => {
      this.endCelebration();
    }, durationMs);

    this.notifyStateChange({
      celebrationStarted: true,
      durationMs,
      durationSeconds,
      celebrationTitle: celebration.celebrationTitle,
      celebrationTagline: celebration.celebrationTagline,
      audioKey: celebration.audioKey,
      scoreEvent
    });
  }

  async endCelebration() {
    if (this.activeFlashInterval) {
      clearInterval(this.activeFlashInterval);
      this.activeFlashInterval = null;
    }
    if (this.activeHardwareStrobeInterval) {
      clearInterval(this.activeHardwareStrobeInterval);
      this.activeHardwareStrobeInterval = null;
    }
    if (this.activeCelebrationTimer) {
      clearTimeout(this.activeCelebrationTimer);
      this.activeCelebrationTimer = null;
    }

    const team = TEAMS[this.currentTeamId];
    this.currentMode = 'ambient';
    this.currentLightColor = team?.ambientRgb || [200, 16, 46];

    const targetIds = this.getTargetIds();
    const restoreOutcomes = {};

    // Restore each room/light to its exact prior state
    await Promise.allSettled(
      targetIds.map(async (id) => {
        const saved = this.previousStates ? this.previousStates[id] : null;
        if (saved) {
          if (!saved.wasOn) {
            // Room/light was previously OFF -> Turn it back OFF
            restoreOutcomes[id] = { action: 'turn_off' };
            await this.dispatchHueBridge({ on: false, alert: 'none' }, id);
          } else {
            // Room/light was previously ON -> Restore exact brightness and color/temperature
            const restorePayload = {
              on: true,
              bri: typeof saved.bri === 'number' ? saved.bri : 254,
              alert: 'none',
              transitiontime: 8
            };
            if (saved.colormode === 'ct' && saved.ct) {
              restorePayload.ct = saved.ct;
            } else if (saved.colormode === 'hs' && typeof saved.hue === 'number') {
              restorePayload.hue = saved.hue;
              if (typeof saved.sat === 'number') restorePayload.sat = saved.sat;
            } else if (saved.xy && Array.isArray(saved.xy)) {
              restorePayload.xy = saved.xy;
            } else if (saved.ct) {
              restorePayload.ct = saved.ct;
            } else if (team?.ambientXy) {
              restorePayload.xy = team.ambientXy;
            }
            restoreOutcomes[id] = { action: 'restore_state', payload: restorePayload };
            await this.dispatchHueBridge(restorePayload, id);
          }
        } else {
          // No prior state recorded -> Reset to ambient
          const fallbackPayload = {
            on: true,
            xy: team?.ambientXy || [0.5, 0.4],
            bri: this.config.general.ambientBrightness || 220,
            alert: 'none',
            transitiontime: 8
          };
          restoreOutcomes[id] = { action: 'fallback_ambient', payload: fallbackPayload };
          await this.dispatchHueBridge(fallbackPayload, id);
        }
      })
    );

    this.addLog('Lighting', 'CELEBRATION_RESTORE', {
      team: team?.name,
      targets: targetIds,
      restoreOutcomes
    });

    // Clear saved states snapshot
    this.previousStates = {};

    this.notifyStateChange({ mode: 'ambient', isCelebrating: false, celebrationEnded: true });
  }

  testHardware() {
    const team = TEAMS[this.currentTeamId];
    return {
      ambientSample: {
        team: team.name,
        rgb: team.ambientRgb,
        xy: team.ambientXy,
        hex: team.primaryColor
      },
      celebrationSample: team.celebration
    };
  }
}

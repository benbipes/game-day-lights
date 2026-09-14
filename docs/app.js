// app.js - Game Day Lights Client Engine, Web Audio Synthesizer & Interactive Controller

class SoundSynthesizer {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.masterGain = null;
    this.activeNodes = [];
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.8;
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  stopAll() {
    for (const node of this.activeNodes) {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) {}
    }
    this.activeNodes = [];
  }

  // 1. Carolina Hurricanes - NHL Brass Air Horn & Siren
  playNhlGoalHorn() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    this.stopAll();

    const now = this.ctx.currentTime;
    const dur = 6.0;

    // Chord: Bb3 (233.08 Hz), Db4 (277.18 Hz), F4 (349.23 Hz)
    const freqs = [233.08, 277.18, 349.23, 116.54];
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = idx === 3 ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 1.015, now + dur);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.15);
      gain.gain.setValueAtTime(0.18, now + dur - 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + dur);
      this.activeNodes.push(osc);
    });

    // Emergency Warning Siren
    const sirenOsc = this.ctx.createOscillator();
    const sirenGain = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();

    sirenOsc.type = 'sawtooth';
    sirenOsc.frequency.setValueAtTime(600, now);

    lfo.frequency.setValueAtTime(1.8, now);
    lfoGain.gain.setValueAtTime(250, now);
    lfo.connect(sirenOsc.frequency);

    sirenGain.gain.setValueAtTime(0.001, now);
    sirenGain.gain.linearRampToValueAtTime(0.08, now + 0.3);
    sirenGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    sirenOsc.connect(sirenGain);
    sirenGain.connect(this.masterGain);

    lfo.start(now);
    sirenOsc.start(now);
    lfo.stop(now + dur);
    sirenOsc.stop(now + dur);
    this.activeNodes.push(sirenOsc, lfo);
  }

  // 2. Minnesota Vikings - Resonant Gjallarhorn & Stadium Pulse
  playGjallarhorn() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    this.stopAll();

    const now = this.ctx.currentTime;
    const dur = 7.0;

    const pitches = [55, 110, 164.81];
    pitches.forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 1.03, now + 1.2);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.98, now + dur);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.linearRampToValueAtTime(800, now + 1.0);
      filter.frequency.exponentialRampToValueAtTime(220, now + dur);
      filter.Q.value = 4.0;

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.5);
      gain.gain.setValueAtTime(0.25, now + dur - 1.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + dur);
      this.activeNodes.push(osc);
    });

    for (let i = 0; i < 4; i++) {
      const beatTime = now + (i * 1.4);
      const drumOsc = this.ctx.createOscillator();
      const drumGain = this.ctx.createGain();

      drumOsc.type = 'sine';
      drumOsc.frequency.setValueAtTime(120, beatTime);
      drumOsc.frequency.exponentialRampToValueAtTime(35, beatTime + 0.5);

      drumGain.gain.setValueAtTime(0.3, beatTime);
      drumGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.55);

      drumOsc.connect(drumGain);
      drumGain.connect(this.masterGain);

      drumOsc.start(beatTime);
      drumOsc.stop(beatTime + 0.6);
      this.activeNodes.push(drumOsc);
    }
  }

  // 3. Liverpool FC - Anfield Roar & Goal Chimes
  playLiverpoolGoal() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    this.stopAll();

    const now = this.ctx.currentTime;
    const dur = 6.0;

    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, now);
    filter.Q.value = 1.5;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.01, now);
    noiseGain.linearRampToValueAtTime ? noiseGain.gain.linearRampToValueAtTime(0.18, now + 0.8) : (noiseGain.gain.value = 0.18);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + dur);
    this.activeNodes.push(noise);

    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = now + (idx * 0.18);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.15, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 1.2);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(noteTime);
      osc.stop(noteTime + 1.3);
      this.activeNodes.push(osc);
    });
  }

  // 4. NC State Wolfpack - Collegiate Touchdown Fanfare & Siren
  playWolfpackTouchdown() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    this.stopAll();

    const now = this.ctx.currentTime;
    const dur = 5.5;

    const siren = this.ctx.createOscillator();
    const sirenGain = this.ctx.createGain();

    siren.type = 'sawtooth';
    siren.frequency.setValueAtTime(250, now);
    siren.frequency.exponentialRampToValueAtTime(950, now + 1.2);
    siren.frequency.exponentialRampToValueAtTime(500, now + 2.5);
    siren.frequency.exponentialRampToValueAtTime(900, now + 3.8);

    sirenGain.gain.setValueAtTime(0.001, now);
    sirenGain.gain.linearRampToValueAtTime(0.2, now + 0.3);
    sirenGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    siren.connect(sirenGain);
    sirenGain.connect(this.masterGain);

    siren.start(now);
    siren.stop(now + dur);
    this.activeNodes.push(siren);

    [293.66, 369.99, 440].forEach((f) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(f, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur - 1);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + dur);
      this.activeNodes.push(osc);
    });
  }

  // 5. Tennessee Volunteers - Rocky Top Brass Fanfare & Neyland Cannon
  playRockyTop() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    this.stopAll();

    const now = this.ctx.currentTime;
    const dur = 6.0;

    // Neyland Stadium Celebration Cannon Blast
    const cannonOsc = this.ctx.createOscillator();
    const cannonGain = this.ctx.createGain();
    cannonOsc.type = 'sine';
    cannonOsc.frequency.setValueAtTime(100, now);
    cannonOsc.frequency.exponentialRampToValueAtTime(25, now + 0.8);

    cannonGain.gain.setValueAtTime(0.45, now);
    cannonGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    cannonOsc.connect(cannonGain);
    cannonGain.connect(this.masterGain);
    cannonOsc.start(now);
    cannonOsc.stop(now + 0.95);
    this.activeNodes.push(cannonOsc);

    // Second Cannon blast
    const cannon2 = this.ctx.createOscillator();
    const cannon2Gain = this.ctx.createGain();
    cannon2.type = 'triangle';
    cannon2.frequency.setValueAtTime(80, now + 0.9);
    cannon2.frequency.exponentialRampToValueAtTime(20, now + 1.6);
    cannon2Gain.gain.setValueAtTime(0.35, now + 0.9);
    cannon2Gain.gain.exponentialRampToValueAtTime(0.001, now + 1.7);
    cannon2.connect(cannon2Gain);
    cannon2Gain.connect(this.masterGain);
    cannon2.start(now + 0.9);
    cannon2.stop(now + 1.75);
    this.activeNodes.push(cannon2);

    // Up-tempo Rocky Top Brass Chorus
    const melody = [
      { f: 293.66, t: 0.15, d: 0.22 },
      { f: 369.99, t: 0.40, d: 0.22 },
      { f: 440.00, t: 0.65, d: 0.35 },
      { f: 493.88, t: 1.05, d: 0.25 },
      { f: 440.00, t: 1.35, d: 0.25 },
      { f: 369.99, t: 1.65, d: 0.30 },
      { f: 293.66, t: 2.00, d: 0.45 },
      { f: 329.63, t: 2.50, d: 0.25 },
      { f: 369.99, t: 2.80, d: 0.25 },
      { f: 293.66, t: 3.10, d: 0.55 },
      { f: 293.66, t: 3.70, d: 0.25 },
      { f: 293.66, t: 4.00, d: 0.70 }
    ];

    melody.forEach((note) => {
      const noteTime = now + note.t;
      const osc = this.ctx.createOscillator();
      const oscHarmonic = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note.f, noteTime);

      oscHarmonic.type = 'square';
      oscHarmonic.frequency.setValueAtTime(note.f * 2, noteTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, noteTime);

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.18, noteTime + 0.04);
      gain.gain.setValueAtTime(0.16, noteTime + note.d * 0.75);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + note.d);

      osc.connect(filter);
      oscHarmonic.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(noteTime);
      oscHarmonic.start(noteTime);
      osc.stop(noteTime + note.d + 0.05);
      oscHarmonic.stop(noteTime + note.d + 0.05);
      this.activeNodes.push(osc, oscHarmonic);
    });
  }

  playByAudioKey(key) {
    if (key === 'nhl_goal_horn') this.playNhlGoalHorn();
    else if (key === 'gjallarhorn') this.playGjallarhorn();
    else if (key === 'liverpool_goal') this.playLiverpoolGoal();
    else if (key === 'wolfpack_touchdown') this.playWolfpackTouchdown();
    else if (key === 'rocky_top') this.playRockyTop();
    else this.playNhlGoalHorn();
  }
}

// Built-in Fallback Teams Data
const FALLBACK_TEAMS = {
  canes: {
    id: 'canes',
    name: 'Carolina Hurricanes',
    short: 'Canes',
    league: 'NHL',
    sport: 'Hockey',
    primaryColor: '#C8102E',
    secondaryColor: '#000000',
    accentColor: '#FFFFFF',
    ambientRgb: [200, 16, 46],
    celebration: {
      colors: [[255, 0, 0], [255, 255, 255], [200, 16, 46], [150, 0, 0]],
      durationMs: 12000,
      flashIntervalMs: 250,
      audioKey: 'nhl_goal_horn',
      celebrationTitle: 'CANES GOAL!',
      celebrationTagline: 'THE SIREN SOUNDS IN RALEIGH! 🚨'
    },
    defaultMatch: {
      opponent: 'New York Rangers',
      opponentShort: 'NYR',
      scoreTeam: 3,
      scoreOpponent: 2,
      period: '3rd Period',
      clock: '04:12',
      lastEvent: 'GOAL: Sebastian Aho (Slap Shot, assists: Teravainen, Slavin)'
    }
  },
  wolfpack: {
    id: 'wolfpack',
    name: 'NC State Wolfpack',
    short: 'Wolfpack',
    league: 'NCAA',
    sport: 'College Football',
    primaryColor: '#CC0000',
    secondaryColor: '#FFFFFF',
    accentColor: '#000000',
    ambientRgb: [204, 0, 0],
    celebration: {
      colors: [[204, 0, 0], [255, 255, 255], [255, 30, 30], [255, 255, 255]],
      durationMs: 12000,
      flashIntervalMs: 220,
      audioKey: 'wolfpack_touchdown',
      celebrationTitle: 'TOUCHDOWN WOLFPACK!',
      celebrationTagline: 'CARTER-FINLEY STADIUM ERUPTS! 🐺'
    },
    defaultMatch: {
      opponent: 'North Carolina Tar Heels',
      opponentShort: 'UNC',
      scoreTeam: 28,
      scoreOpponent: 20,
      period: '4th Quarter',
      clock: '02:45',
      lastEvent: 'TOUCHDOWN: KC Concepcion 42 yd pass from Grayson McCall'
    }
  },
  vikings: {
    id: 'vikings',
    name: 'Minnesota Vikings',
    short: 'Vikings',
    league: 'NFL',
    sport: 'Football',
    primaryColor: '#4F2683',
    secondaryColor: '#FFC62F',
    accentColor: '#FFFFFF',
    ambientRgb: [79, 38, 131],
    celebration: {
      colors: [[79, 38, 131], [255, 198, 47], [125, 60, 205], [255, 225, 90]],
      durationMs: 14000,
      flashIntervalMs: 280,
      audioKey: 'gjallarhorn',
      celebrationTitle: 'VIKINGS TOUCHDOWN!',
      celebrationTagline: 'SKOL! THE GJALLARHORN SOUNDS! ⚔️'
    },
    defaultMatch: {
      opponent: 'Green Bay Packers',
      opponentShort: 'GB',
      scoreTeam: 24,
      scoreOpponent: 17,
      period: '4th Quarter',
      clock: '03:18',
      lastEvent: 'TOUCHDOWN: Justin Jefferson 24 yd catch from Sam Darnold'
    }
  },
  liverpool: {
    id: 'liverpool',
    name: 'Liverpool FC',
    short: 'Liverpool',
    league: 'Premier League',
    sport: 'Soccer',
    primaryColor: '#C8102E',
    secondaryColor: '#00B2A9',
    accentColor: '#F6EB61',
    ambientRgb: [200, 16, 46],
    celebration: {
      colors: [[200, 16, 46], [255, 255, 255], [255, 30, 45], [0, 178, 169]],
      durationMs: 12000,
      flashIntervalMs: 250,
      audioKey: 'liverpool_goal',
      celebrationTitle: 'GOAL FOR LIVERPOOL!',
      celebrationTagline: 'YOU\'LL NEVER WALK ALONE! ⚽'
    },
    defaultMatch: {
      opponent: 'Manchester City',
      opponentShort: 'MCI',
      scoreTeam: 2,
      scoreOpponent: 1,
      period: '2nd Half',
      clock: '82:15',
      lastEvent: 'GOAL: Mohamed Salah (Right footed shot into bottom corner)'
    }
  },
  vols: {
    id: 'vols',
    name: 'Tennessee Volunteers',
    short: 'Vols',
    league: 'NCAA',
    sport: 'College Football',
    primaryColor: '#FF8200',
    secondaryColor: '#FFFFFF',
    accentColor: '#58595B',
    ambientRgb: [255, 130, 0],
    celebration: {
      colors: [[255, 130, 0], [255, 255, 255], [255, 100, 0], [88, 89, 91]],
      durationMs: 14000,
      flashIntervalMs: 250,
      audioKey: 'rocky_top',
      celebrationTitle: 'TOUCHDOWN TENNESSEE!',
      celebrationTagline: 'ROCKY TOP YOU\'LL ALWAYS BE HOME SWEET HOME TO ME! 🍊🏈'
    },
    defaultMatch: {
      opponent: 'Alabama Crimson Tide',
      opponentShort: 'BAMA',
      scoreTeam: 35,
      scoreOpponent: 28,
      period: '4th Quarter',
      clock: '01:15',
      lastEvent: 'TOUCHDOWN: Squirrel White 38 yd pass from Nico Iamaleava'
    }
  }
};

// LocalStorage Persistence Keys
const STORAGE_KEYS = {
  CONFIG: 'game_day_lights_config_v1',
  ACTIVE_TEAM: 'game_day_lights_active_team',
  SOUND: 'game_day_lights_sound_enabled'
};

// Application State
const state = {
  teams: FALLBACK_TEAMS,
  activeTeam: 'canes',
  currentRgb: [200, 16, 46],
  mode: 'ambient',
  isCelebrating: false,
  isStandalone: false,
  sound: new SoundSynthesizer(),
  match: JSON.parse(JSON.stringify(FALLBACK_TEAMS.canes.defaultMatch)),
  config: {
    homeAssistant: {
      enabled: false,
      mode: 'webhook',
      host: 'http://homeassistant.local:8123',
      webhookId: 'game_day_score_celebration',
      entityId: 'light.living_room_lights',
      accessToken: ''
    },
    philipsHue: {
      enabled: true,
      bridgeIp: '',
      username: '',
      targetType: 'group',
      targetId: '1',
      useAlertStrobe: true
    },
    general: {
      activeTeam: 'canes',
      ambientBrightness: 220,
      celebrationDurationSeconds: 12
    }
  },
  logs: []
};

// DOM References Container
let elements = {};

function initElements() {
  elements = {
    celebrationOverlay: document.getElementById('celebration-overlay'),
    celebrationTitle: document.getElementById('celebration-title'),
    celebrationTagline: document.getElementById('celebration-tagline'),
    celebrationBadge: document.getElementById('celebration-badge'),
    celebrationProgressBar: document.getElementById('celebration-progress-bar'),

    statusLabel: document.getElementById('status-label'),
    systemStatusIndicator: document.getElementById('system-status-indicator'),
    headerBulbIndicator: document.getElementById('header-bulb-indicator'),
    btnSoundToggle: document.getElementById('btn-sound-toggle'),
    soundIcon: document.getElementById('sound-icon'),
    soundLabel: document.getElementById('sound-label'),
    btnQuickCelebrate: document.getElementById('btn-quick-celebrate'),
    btnQuickAmbient: document.getElementById('btn-quick-ambient'),

    // Scoreboard
    matchLeagueBadge: document.getElementById('match-league-badge'),
    matchPeriodClock: document.getElementById('match-period-clock'),
    scoreTeamLogoWrap: document.getElementById('score-team-badge'),
    scoreTeamName: document.getElementById('score-team-name'),
    scoreTeamPts: document.getElementById('score-team-pts'),
    scoreOpponentName: document.getElementById('score-opponent-name'),
    scoreOpponentPts: document.getElementById('score-opponent-pts'),
    matchLastEvent: document.getElementById('match-last-event'),
    btnSimScoreText: document.getElementById('btn-sim-score-text'),

    // Visualizer
    colorRgbDisplay: document.getElementById('color-rgb-display'),
    roomAmbientWash: document.getElementById('room-ambient-wash'),
    tvScreen: document.getElementById('tv-screen'),
    screenTeamIcon: document.getElementById('screen-team-icon'),
    screenMatchupText: document.getElementById('screen-matchup-text'),
    screenClockText: document.getElementById('screen-clock-text'),
    strobeModeText: document.getElementById('strobe-mode-text'),

    // Tabs
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabPanels: document.querySelectorAll('.tab-panel'),

    // HA & Hue Config
    haYamlBlock: document.getElementById('ha-yaml-block'),
    btnCopyYaml: document.getElementById('btn-copy-yaml'),
    btnSaveHa: document.getElementById('btn-save-ha'),
    btnTestHa: document.getElementById('btn-test-ha'),
    btnSaveHue: document.getElementById('btn-save-hue'),
    btnTestHue: document.getElementById('btn-test-hue'),
    haModeSelect: document.getElementById('ha-mode'),
    groupHaToken: document.getElementById('group-ha-token'),

    // Webhook
    webhookUrlDisplay: document.getElementById('webhook-url-display'),
    webhookEspnUrlDisplay: document.getElementById('webhook-espn-url-display'),
    btnCopyWebhookUrl: document.getElementById('btn-copy-webhook-url'),
    btnCopyEspnUrl: document.getElementById('btn-copy-espn-url'),
    testWebhookPayload: document.getElementById('test-webhook-payload'),
    btnSendTestWebhook: document.getElementById('btn-send-test-webhook'),
    testWebhookResult: document.getElementById('test-webhook-result'),

    // Logs
    logsContainer: document.getElementById('logs-container'),
    logCount: document.getElementById('log-count'),
    btnClearLogs: document.getElementById('btn-clear-logs')
  };
}

// Helper: escape HTML string
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Generate client-side fallback YAML snippet
function generateClientHaYaml() {
  const webhookId = state.config?.homeAssistant?.webhookId || 'game_day_score_celebration';
  const entityId = state.config?.homeAssistant?.entityId || 'light.living_room_lights';
  return `- id: 'game_day_lights_webhook'
  alias: 'Game Day Lights - Score Celebration & Ambient Sync'
  trigger:
    - platform: webhook
      webhook_id: "${webhookId}"
      allowed_methods:
        - POST
  action:
    - choose:
        - conditions:
            - condition: template
              value_template: "{{ trigger.json.event == 'score_celebration' }}"
          sequence:
            - service: light.turn_on
              target:
                entity_id: "${entityId}"
              data:
                rgb_color: "{{ trigger.json.rgb_color }}"
                brightness: 255
                flash: long
            - delay:
                seconds: 12
            - service: light.turn_on
              target:
                entity_id: "${entityId}"
              data:
                rgb_color: "{{ trigger.json.rgb_color }}"
                brightness: 220
                transition: 2`;
}

// Fetch or generate Home Assistant YAML
async function fetchHaYaml() {
  if (!elements.haYamlBlock) return;
  const isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (!isHttp || !isLocal) {
    elements.haYamlBlock.innerHTML = `<code>${escapeHtml(generateClientHaYaml())}</code>`;
    return;
  }

  try {
    const res = await fetch('/api/ha-yaml');
    if (res.ok) {
      const text = await res.text();
      elements.haYamlBlock.innerHTML = `<code>${escapeHtml(text)}</code>`;
    } else {
      elements.haYamlBlock.innerHTML = `<code>${escapeHtml(generateClientHaYaml())}</code>`;
    }
  } catch (err) {
    elements.haYamlBlock.innerHTML = `<code>${escapeHtml(generateClientHaYaml())}</code>`;
  }
}

// LocalStorage Persistence & Config Management
function loadSavedConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        state.config = {
          ...state.config,
          ...parsed,
          homeAssistant: { ...state.config.homeAssistant, ...(parsed.homeAssistant || {}) },
          philipsHue: { ...state.config.philipsHue, ...(parsed.philipsHue || {}) },
          general: { ...state.config.general, ...(parsed.general || {}) }
        };
      }
    }

    const savedTeam = localStorage.getItem(STORAGE_KEYS.ACTIVE_TEAM);
    if (savedTeam && state.teams[savedTeam]) {
      state.activeTeam = savedTeam;
      state.currentRgb = state.teams[savedTeam].ambientRgb;
      state.match = JSON.parse(JSON.stringify(state.teams[savedTeam].defaultMatch));
    }

    const savedSound = localStorage.getItem(STORAGE_KEYS.SOUND);
    if (savedSound !== null) {
      state.sound.enabled = savedSound === 'true';
    }
  } catch (err) {
    console.warn('Could not read from localStorage:', err);
  }
}

// Environment Detection & Safe Network Fetching
function isLocalEnvironment() {
  const h = window.location.hostname;
  return h === 'localhost' ||
         h === '127.0.0.1' ||
         h === '::1' ||
         h.endsWith('.local') ||
         h.startsWith('192.168.') ||
         h.startsWith('10.') ||
         window.location.port === '3300';
}

async function safeFetchJson(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text().catch(() => '');
      return {
        ok: false,
        status: res.status,
        isJson: false,
        text,
        data: null,
        error: `Server returned non-JSON response (${res.status} ${res.statusText || ''})`
      };
    }
    const data = await res.json().catch(() => null);
    return {
      ok: res.ok,
      status: res.status,
      isJson: true,
      data,
      error: res.ok ? null : (data?.message || data?.error || `Request failed with status ${res.status}`)
    };
  } catch (netErr) {
    return {
      ok: false,
      status: 0,
      isJson: false,
      data: null,
      error: netErr.message || 'Network request failed'
    };
  }
}

async function saveConfig(partial = null) {
  if (partial) {
    state.config = {
      ...state.config,
      ...partial,
      homeAssistant: { ...state.config.homeAssistant, ...(partial.homeAssistant || {}) },
      philipsHue: { ...state.config.philipsHue, ...(partial.philipsHue || {}) },
      general: { ...state.config.general, ...(partial.general || {}) }
    };
  }

  // Always persist immediately to browser localStorage
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(state.config));
  } catch (err) {
    console.warn('Could not write config to localStorage:', err);
  }

  // Also send to backend server if running in local server mode
  const isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';
  if (isHttp && isLocalEnvironment()) {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.config)
      });
    } catch (err) {
      // Backend offline or unreachable
    }
  }
}

async function syncServerConfig() {
  const isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';
  if (!isHttp || !isLocalEnvironment()) return;

  try {
    const res = await safeFetchJson('/api/config');
    if (res.ok && res.data && res.data.config) {
      const data = res.data;
      if (data && data.config) {
        const localHue = state.config.philipsHue || {};
        const serverHue = data.config.philipsHue || {};

        state.config = {
          ...data.config,
          homeAssistant: {
            ...data.config.homeAssistant,
            ...(state.config.homeAssistant || {})
          },
          philipsHue: {
            ...serverHue,
            ...localHue,
            bridgeIp: localHue.bridgeIp || serverHue.bridgeIp || '',
            username: localHue.username || serverHue.username || ''
          },
          general: {
            ...data.config.general,
            ...(state.config.general || {})
          }
        };

        try {
          localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(state.config));
        } catch (e) {}

        renderConfigForms();
        fetchHaYaml();
      }
    }
  } catch (err) {}
}

// Populate config forms
function renderConfigForms() {
  if (!state.config) return;

  const ha = state.config.homeAssistant || {};
  const haEnabledEl = document.getElementById('ha-enabled');
  if (haEnabledEl) haEnabledEl.checked = !!ha.enabled;
  const haModeEl = document.getElementById('ha-mode');
  if (haModeEl) haModeEl.value = ha.mode || 'webhook';
  const haHostEl = document.getElementById('ha-host');
  if (haHostEl) haHostEl.value = ha.host || 'http://homeassistant.local:8123';
  const haWebhookEl = document.getElementById('ha-webhook-id');
  if (haWebhookEl) haWebhookEl.value = ha.webhookId || 'game_day_score_celebration';
  const haEntityEl = document.getElementById('ha-entity-id');
  if (haEntityEl) haEntityEl.value = ha.entityId || 'light.living_room_lights';
  const haTokenEl = document.getElementById('ha-token');
  if (haTokenEl && ha.accessToken) haTokenEl.value = ha.accessToken;
  toggleHaModeFields(ha.mode || 'webhook');

  const hue = state.config.philipsHue || {};
  const hueEnabledEl = document.getElementById('hue-enabled');
  if (hueEnabledEl) hueEnabledEl.checked = !!hue.enabled;
  const hueIpEl = document.getElementById('hue-ip');
  if (hueIpEl) hueIpEl.value = hue.bridgeIp || '';
  const hueUserEl = document.getElementById('hue-user');
  if (hueUserEl) hueUserEl.value = hue.username || '';
  const hueTypeEl = document.getElementById('hue-target-type');
  if (hueTypeEl) hueTypeEl.value = hue.targetType || 'group';
  const hueTargetIdEl = document.getElementById('hue-target-id');
  if (hueTargetIdEl) hueTargetIdEl.value = hue.targetId || '1';
  const hueAlertEl = document.getElementById('hue-alert-strobe');
  if (hueAlertEl) hueAlertEl.checked = !!hue.useAlertStrobe;

  const origin = window.location.origin || 'http://localhost:3300';
  if (elements.webhookUrlDisplay) {
    elements.webhookUrlDisplay.textContent = `${origin}/api/webhooks/score`;
  }
  if (elements.webhookEspnUrlDisplay) {
    elements.webhookEspnUrlDisplay.textContent = `${origin}/api/webhooks/espn`;
  }
}

function toggleHaModeFields(mode) {
  if (elements.groupHaToken) {
    elements.groupHaToken.style.display = mode === 'service' ? 'block' : 'none';
  }
}

// Render activity logs
function renderLogs() {
  if (!elements.logsContainer) return;
  if (elements.logCount) elements.logCount.textContent = state.logs.length;
  elements.logsContainer.innerHTML = '';

  if (state.logs.length === 0) {
    elements.logsContainer.innerHTML = '<div style="color: #64748b; padding: 1rem; text-align: center;">No activity recorded yet. Trigger a celebration or webhook to see live telemetry.</div>';
    return;
  }

  for (const log of state.logs.slice(0, 30)) {
    const el = document.createElement('div');
    el.className = log.success === false ? 'log-entry error' : 'log-entry';

    const time = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '';
    const detailsStr = typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '');

    el.innerHTML = `
      <span class="log-time">${escapeHtml(time)}</span>
      <span class="log-badge">${escapeHtml(log.source || 'App')}</span>
      <span class="log-badge">${escapeHtml(log.type || 'EVENT')}</span>
      <span class="log-details">${escapeHtml(detailsStr)}</span>
    `;
    elements.logsContainer.appendChild(el);
  }
}

// Update Dynamic CSS Variables and theme
function updateThemeColors() {
  const root = document.documentElement;
  const rgbStr = state.currentRgb.join(', ');
  root.style.setProperty('--current-light-rgb', rgbStr);
  root.style.setProperty('--current-light-glow', `rgba(${rgbStr}, 0.5)`);

  const team = state.teams[state.activeTeam];
  if (team) {
    root.style.setProperty('--team-primary', team.primaryColor);
    root.style.setProperty('--team-secondary', team.secondaryColor);
  }

  if (elements.colorRgbDisplay) {
    elements.colorRgbDisplay.textContent = `RGB(${rgbStr})`;
  }

  if (elements.statusLabel && elements.strobeModeText) {
    if (state.isCelebrating) {
      elements.statusLabel.textContent = '🚨 CELEBRATION STROBE ACTIVE';
      elements.strobeModeText.textContent = 'GOAL STROBE FLASHING';
      elements.strobeModeText.style.color = '#ffc62f';
    } else {
      const modeSuffix = state.isStandalone ? ' (Standalone)' : '';
      elements.statusLabel.textContent = `Ambient Synced: ${team?.name || 'Canes'}${modeSuffix}`;
      elements.strobeModeText.textContent = 'AMBIENT SYNCED';
      elements.strobeModeText.style.color = 'var(--team-primary)';
    }
  }
}

// Render scoreboard
function renderScoreboard() {
  const team = state.teams[state.activeTeam];
  const m = state.match;
  if (!team || !m) return;

  const teamIcons = { canes: '🌀', wolfpack: '🐺', vikings: '⚔️', liverpool: '⚽', vols: '🍊' };
  const oppIcons = { 'New York Rangers': '🗽', 'Green Bay Packers': '🧀', 'North Carolina Tar Heels': '🐏', 'Manchester City': '⛵', 'Alabama Crimson Tide': '🐘' };

  if (elements.matchLeagueBadge) elements.matchLeagueBadge.textContent = `${team.league} • ${team.sport.toUpperCase()}`;
  if (elements.matchPeriodClock) elements.matchPeriodClock.textContent = `${m.period || ''} • ${m.clock || ''}`;

  if (elements.scoreTeamLogoWrap) elements.scoreTeamLogoWrap.textContent = teamIcons[team.id] || '🏆';
  if (elements.scoreTeamName) elements.scoreTeamName.textContent = team.name;
  if (elements.scoreTeamPts) elements.scoreTeamPts.textContent = m.scoreTeam ?? 0;

  if (elements.scoreOpponentName) elements.scoreOpponentName.textContent = m.opponent || 'Opponent';
  if (elements.scoreOpponentPts) elements.scoreOpponentPts.textContent = m.scoreOpponent ?? 0;

  const oppBadge = document.getElementById('score-opponent-badge');
  if (oppBadge) oppBadge.textContent = oppIcons[m.opponent] || '🛡️';

  if (elements.matchLastEvent) elements.matchLastEvent.textContent = m.lastEvent || 'Game in progress';

  if (elements.screenTeamIcon) elements.screenTeamIcon.textContent = teamIcons[team.id] || '🏆';
  if (elements.screenMatchupText) elements.screenMatchupText.textContent = `${team.short.toUpperCase()} VS ${m.opponentShort || 'OPP'}`;
  if (elements.screenClockText) elements.screenClockText.textContent = `${m.period || ''} ${m.clock || ''}`;

  if (elements.btnSimScoreText) {
    const isFootball = team.id === 'vikings' || team.id === 'wolfpack' || team.id === 'vols';
    elements.btnSimScoreText.textContent = isFootball ? '+ Touchdown (+6)' : '+ Goal (+1)';
  }
}

// Highlight Active Team Card
function highlightActiveTeamCard(teamId) {
  const cards = document.querySelectorAll('.team-card');
  if (cards) {
    cards.forEach(card => {
      const cardTeam = card.getAttribute('data-team');
      if (cardTeam === teamId) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }
}

// Celebration Overlay Display
let celebrationTimeout = null;

function triggerCelebrationDisplay(data) {
  if (!elements.celebrationOverlay) return;
  elements.celebrationOverlay.classList.remove('hidden');

  if (elements.celebrationTitle) elements.celebrationTitle.textContent = data.celebrationTitle || 'GOAL!';
  if (elements.celebrationTagline) elements.celebrationTagline.textContent = data.celebrationTagline || 'CELEBRATION TRIGGERED!';
  if (elements.celebrationBadge) {
    elements.celebrationBadge.textContent = data.scoreEvent?.type ? `🚨 ${data.scoreEvent.type}!` : '🚨 SCORE!';
  }

  if (elements.celebrationProgressBar) {
    elements.celebrationProgressBar.style.transition = 'none';
    elements.celebrationProgressBar.style.width = '100%';
    setTimeout(() => {
      if (elements.celebrationProgressBar) {
        elements.celebrationProgressBar.style.transition = 'width 12s linear';
        elements.celebrationProgressBar.style.width = '0%';
      }
    }, 50);
  }

  if (data.audioKey) {
    state.sound.playByAudioKey(data.audioKey);
  }

  if (celebrationTimeout) clearTimeout(celebrationTimeout);
  celebrationTimeout = setTimeout(() => {
    hideCelebrationDisplay();
  }, 12500);
}

function hideCelebrationDisplay() {
  if (elements.celebrationOverlay) {
    elements.celebrationOverlay.classList.add('hidden');
  }
  if (elements.celebrationProgressBar) {
    elements.celebrationProgressBar.style.transition = 'none';
    elements.celebrationProgressBar.style.width = '100%';
  }
}

// Local Client-Side Celebration Runner
let localFlashInterval = null;

function runLocalCelebration(teamId, eventName = 'GOAL') {
  const team = state.teams[teamId];
  if (!team) return;
  state.isCelebrating = true;
  updateThemeColors();

  triggerCelebrationDisplay({
    celebrationTitle: team.celebration?.celebrationTitle || 'GOAL!',
    celebrationTagline: team.celebration?.celebrationTagline || 'CELEBRATION!',
    audioKey: team.celebration?.audioKey,
    scoreEvent: { type: eventName }
  });

  if (localFlashInterval) clearInterval(localFlashInterval);
  let step = 0;
  const colors = team.celebration?.colors || [[255, 0, 0], [255, 255, 255]];
  const intervalMs = team.celebration?.flashIntervalMs || 250;

  localFlashInterval = setInterval(() => {
    step++;
    state.currentRgb = colors[step % colors.length];
    updateThemeColors();
  }, intervalMs);

  const durationMs = team.celebration?.durationMs || 12000;
  setTimeout(() => {
    runLocalAmbient(teamId);
  }, durationMs);
}

function runLocalAmbient(teamId) {
  if (localFlashInterval) {
    clearInterval(localFlashInterval);
    localFlashInterval = null;
  }
  state.isCelebrating = false;
  const team = state.teams[teamId];
  if (team) {
    state.currentRgb = team.ambientRgb;
  }
  hideCelebrationDisplay();
  updateThemeColors();
}

// Select Team Action
async function selectTeam(teamId) {
  state.activeTeam = teamId;
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TEAM, teamId);
  } catch (e) {}

  const team = state.teams[teamId];
  if (team) {
    state.currentRgb = team.ambientRgb;
    if (state.isStandalone || !state.match || state.match.teamId !== teamId) {
      state.match = JSON.parse(JSON.stringify(team.defaultMatch));
    }
  }
  updateThemeColors();
  renderScoreboard();
  highlightActiveTeamCard(teamId);

  const isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (isHttp && isLocal) {
    try {
      const res = await fetch('/api/select-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId })
      });
      const data = await res.json();
      if (data.success && data.match) {
        state.match = data.match;
        renderScoreboard();
      }
    } catch (err) {
      state.isStandalone = true;
    }
  } else {
    state.isStandalone = true;
  }
}

// Safe SSE Connection
function initSse() {
  const isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';

  if (!isHttp || !isLocalEnvironment()) {
    state.isStandalone = true;
    updateThemeColors();
    return;
  }

  try {
    const evtSource = new EventSource('/api/events/stream');

    evtSource.addEventListener('initial_state', (e) => {
      try {
        const data = JSON.parse(e.data);
        state.activeTeam = data.activeTeam;
        state.currentRgb = data.currentColor;
        state.mode = data.mode;
        state.isCelebrating = data.isCelebrating;
        state.match = data.match;
        if (data.config) {
          const localHue = state.config.philipsHue || {};
          const serverHue = data.config.philipsHue || {};
          state.config = {
            ...data.config,
            homeAssistant: {
              ...data.config.homeAssistant,
              ...(state.config.homeAssistant || {})
            },
            philipsHue: {
              ...serverHue,
              ...localHue,
              bridgeIp: localHue.bridgeIp || serverHue.bridgeIp || '',
              username: localHue.username || serverHue.username || ''
            },
            general: {
              ...data.config.general,
              ...(state.config.general || {})
            }
          };
          try {
            localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(state.config));
          } catch (err) {}
        }
        state.logs = data.logs || [];

        updateThemeColors();
        renderScoreboard();
        renderLogs();
        renderConfigForms();
        fetchHaYaml();
        highlightActiveTeamCard(state.activeTeam);
      } catch (err) {}
    });

    evtSource.addEventListener('config_update', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.config) {
          state.config = {
            ...state.config,
            ...data.config,
            homeAssistant: { ...state.config.homeAssistant, ...(data.config.homeAssistant || {}) },
            philipsHue: { ...state.config.philipsHue, ...(data.config.philipsHue || {}) }
          };
          try {
            localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(state.config));
          } catch (err) {}
          renderConfigForms();
          fetchHaYaml();
        }
      } catch (err) {}
    });

    evtSource.addEventListener('state_update', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.activeTeam) state.activeTeam = data.activeTeam;
        if (data.currentColor) state.currentRgb = data.currentColor;
        if (data.mode) state.mode = data.mode;
        state.isCelebrating = !!data.isCelebrating;
        if (data.match) state.match = data.match;

        if (data.newLog) {
          state.logs.unshift(data.newLog);
          renderLogs();
        }

        if (data.celebrationStarted) {
          triggerCelebrationDisplay(data);
        }

        if (data.isCelebrating === false && elements.celebrationOverlay && !elements.celebrationOverlay.classList.contains('hidden')) {
          hideCelebrationDisplay();
        }

        updateThemeColors();
        renderScoreboard();
        highlightActiveTeamCard(state.activeTeam);
      } catch (err) {}
    });

    evtSource.onerror = () => {
      state.isStandalone = true;
      updateThemeColors();
    };
  } catch (err) {
    state.isStandalone = true;
    updateThemeColors();
  }
}

// Event Listeners Setup
function setupEventListeners() {
  // Team cards click
  const teamCards = document.querySelectorAll('.team-card');
  if (teamCards) {
    teamCards.forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const teamId = card.getAttribute('data-team');
        if (teamId) selectTeam(teamId);
      });
    });
  }

  // Sound Toggle
  if (elements.btnSoundToggle) {
    elements.btnSoundToggle.addEventListener('click', () => {
      state.sound.enabled = !state.sound.enabled;
      try {
        localStorage.setItem(STORAGE_KEYS.SOUND, String(state.sound.enabled));
      } catch (e) {}
      if (state.sound.enabled) {
        state.sound.init();
        if (elements.soundIcon) elements.soundIcon.textContent = '🔊';
        if (elements.soundLabel) elements.soundLabel.textContent = 'Sound ON';
      } else {
        state.sound.stopAll();
        if (elements.soundIcon) elements.soundIcon.textContent = '🔇';
        if (elements.soundLabel) elements.soundLabel.textContent = 'Sound MUTED';
      }
    });
  }

  // Quick Celebration Button
  if (elements.btnQuickCelebrate) {
    elements.btnQuickCelebrate.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/test-celebration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId: state.activeTeam })
        });
        if (!res.ok) throw new Error('API unavailable');
      } catch (err) {
        runLocalCelebration(state.activeTeam, 'TEST CELEBRATION');
      }
    });
  }

  // Quick Ambient Reset Button
  if (elements.btnQuickAmbient) {
    elements.btnQuickAmbient.addEventListener('click', async () => {
      hideCelebrationDisplay();
      state.sound.stopAll();
      try {
        await fetch('/api/test-ambient', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId: state.activeTeam })
        });
      } catch (err) {
        runLocalAmbient(state.activeTeam);
      }
    });
  }

  // Simulator Controls
  const btnSimScore = document.getElementById('btn-sim-score');
  if (btnSimScore) {
    btnSimScore.addEventListener('click', async () => {
      const isFootball = state.activeTeam === 'vikings' || state.activeTeam === 'wolfpack' || state.activeTeam === 'vols';
      const pts = isFootball ? 6 : 1;
      const evtName = isFootball ? 'TOUCHDOWN' : 'GOAL';

      try {
        const res = await fetch('/api/simulate-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamId: state.activeTeam,
            event: evtName,
            points: pts
          })
        });
        if (!res.ok) throw new Error('API unavailable');
      } catch (err) {
        if (state.match) {
          state.match.scoreTeam = (state.match.scoreTeam || 0) + pts;
          state.match.lastEvent = `${evtName} scored (+${pts} pts)`;
          renderScoreboard();
        }
        runLocalCelebration(state.activeTeam, evtName);
      }
    });
  }

  const btnSimTd = document.getElementById('btn-sim-touchdown');
  if (btnSimTd) {
    btnSimTd.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/simulate-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamId: state.activeTeam,
            event: 'TOUCHDOWN',
            points: 6
          })
        });
        if (!res.ok) throw new Error('API unavailable');
      } catch (err) {
        if (state.match) {
          state.match.scoreTeam = (state.match.scoreTeam || 0) + 6;
          state.match.lastEvent = `TOUCHDOWN scored (+6 pts)`;
          renderScoreboard();
        }
        runLocalCelebration(state.activeTeam, 'TOUCHDOWN');
      }
    });
  }

  const btnSimOpp = document.getElementById('btn-sim-opp');
  if (btnSimOpp) {
    btnSimOpp.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/simulate-opponent-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId: state.activeTeam })
        });
        if (!res.ok) throw new Error('API unavailable');
      } catch (err) {
        if (state.match) {
          state.match.scoreOpponent = (state.match.scoreOpponent || 0) + 1;
          state.match.lastEvent = `OPPONENT SCORE (+1 pt)`;
          renderScoreboard();
        }
      }
    });
  }

  const btnSimReset = document.getElementById('btn-sim-reset');
  if (btnSimReset) {
    btnSimReset.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/reset-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId: state.activeTeam })
        });
        if (!res.ok) throw new Error('API unavailable');
      } catch (err) {
        const team = state.teams[state.activeTeam];
        if (team) {
          state.match = JSON.parse(JSON.stringify(team.defaultMatch));
          renderScoreboard();
          runLocalAmbient(state.activeTeam);
        }
      }
    });
  }

  // Tabs Switching
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  if (tabButtons && tabButtons.length > 0) {
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tabId = btn.getAttribute('data-tab');
        if (!tabId) return;

        const targetPanel = document.getElementById(tabId);
        if (!targetPanel) return;

        tabButtons.forEach(b => b.classList.remove('active'));
        if (tabPanels) tabPanels.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        targetPanel.classList.add('active');
      });
    });
  }

  // HA Mode toggle
  if (elements.haModeSelect) {
    elements.haModeSelect.addEventListener('change', (e) => {
      toggleHaModeFields(e.target.value);
    });
  }

  // Save HA Config
  if (elements.btnSaveHa) {
    elements.btnSaveHa.addEventListener('click', async () => {
      const updatedHa = {
        enabled: document.getElementById('ha-enabled')?.checked || false,
        mode: document.getElementById('ha-mode')?.value || 'webhook',
        host: (document.getElementById('ha-host')?.value || '').trim() || 'http://homeassistant.local:8123',
        webhookId: (document.getElementById('ha-webhook-id')?.value || '').trim() || 'game_day_score_celebration',
        entityId: (document.getElementById('ha-entity-id')?.value || '').trim() || 'light.living_room_lights',
        accessToken: (document.getElementById('ha-token')?.value || '').trim()
      };
      await saveConfig({ homeAssistant: updatedHa });
      fetchHaYaml();
      alert('✅ Home Assistant settings saved successfully!');
    });
  }

  // Save Philips Hue Config
  if (elements.btnSaveHue) {
    elements.btnSaveHue.addEventListener('click', async () => {
      const bridgeIp = (document.getElementById('hue-ip')?.value || '').trim();
      const username = (document.getElementById('hue-user')?.value || '').trim();
      const targetType = document.getElementById('hue-target-type')?.value || 'group';
      const targetId = (document.getElementById('hue-target-id')?.value || '1').trim();
      const useAlertStrobe = document.getElementById('hue-alert-strobe')?.checked ?? true;
      const enabled = document.getElementById('hue-enabled')?.checked ?? true;

      const updatedHue = {
        enabled,
        bridgeIp,
        username,
        targetType,
        targetId,
        useAlertStrobe
      };

      await saveConfig({ philipsHue: updatedHue });
      renderConfigForms();
      alert(`✅ Philips Hue settings saved!\n\nBridge IP: ${bridgeIp || '(none entered)'}\nTarget: ${targetType} ${targetId}`);
    });
  }

  // Real-time autosave on input change/blur so typing IP is never lost
  const hueIpInput = document.getElementById('hue-ip');
  if (hueIpInput) {
    hueIpInput.addEventListener('change', () => {
      const val = hueIpInput.value.trim();
      if (!state.config.philipsHue) state.config.philipsHue = {};
      state.config.philipsHue.bridgeIp = val;
      try {
        localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(state.config));
      } catch (e) {}
    });
  }

  const hueUserInput = document.getElementById('hue-user');
  if (hueUserInput) {
    hueUserInput.addEventListener('change', () => {
      const val = hueUserInput.value.trim();
      if (!state.config.philipsHue) state.config.philipsHue = {};
      state.config.philipsHue.username = val;
      try {
        localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(state.config));
      } catch (e) {}
    });
  }

  // Auto-Detect Hue Bridge
  const btnDiscoverHue = document.getElementById('btn-discover-hue');
  if (btnDiscoverHue) {
    btnDiscoverHue.addEventListener('click', async () => {
      btnDiscoverHue.textContent = 'Searching...';
      try {
        let bridges = null;
        if (isLocalEnvironment()) {
          const res = await safeFetchJson('/api/hue/discover', { method: 'POST' });
          if (res.ok && res.data && res.data.bridges && res.data.bridges.length > 0) {
            bridges = res.data.bridges;
          }
        }

        // Direct cloud discovery fallback (supports CORS, works on both GitHub Pages & local server)
        if (!bridges || bridges.length === 0) {
          try {
            const cloudRes = await fetch('https://discovery.meethue.com/', { signal: AbortSignal.timeout(5000) });
            if (cloudRes.ok) {
              const list = await cloudRes.json();
              if (Array.isArray(list) && list.length > 0) {
                bridges = list.map(b => ({ id: b.id, ip: b.internalipaddress }));
              }
            }
          } catch (e) {
            console.warn('Direct Hue cloud discovery error:', e);
          }
        }

        if (bridges && bridges.length > 0) {
          const detectedIp = bridges[0].ip;
          const ipEl = document.getElementById('hue-ip');
          if (ipEl) ipEl.value = detectedIp;
          await saveConfig({
            philipsHue: {
              ...state.config.philipsHue,
              bridgeIp: detectedIp
            }
          });
          alert(`Found Hue Bridge at: ${detectedIp}\nBridge IP saved to settings!`);
        } else {
          alert('Could not auto-detect Bridge via cloud. Please enter the Bridge IP shown in your Hue iPhone app (Settings ➔ Bridge settings ➔ Network settings).');
        }
      } catch (err) {
        alert('Could not reach discovery service. Please enter the Bridge IP manually.');
      } finally {
        btnDiscoverHue.textContent = '🔍 Auto-Detect IP';
      }
    });
  }

  // Pair Hue Bridge (Press Button)
  const btnPairHue = document.getElementById('btn-pair-hue');
  const pairFeedback = document.getElementById('hue-pair-feedback');
  if (btnPairHue) {
    btnPairHue.addEventListener('click', async () => {
      const ipEl = document.getElementById('hue-ip');
      const rawIp = ipEl ? ipEl.value.trim() : '';
      const ip = rawIp.replace(/^https?:\/\//, '').replace(/\/+$/, '');
      if (!ip) {
        alert('Please enter your Hue Bridge IP address first (e.g. 192.168.1.50).');
        return;
      }
      btnPairHue.textContent = 'Pairing...';
      if (pairFeedback) {
        pairFeedback.style.display = 'block';
        pairFeedback.style.color = '#e2e8f0';
        pairFeedback.innerHTML = '<span>⏳ Contacting Hue Bridge...</span>';
      }

      // Local Server vs Public GitHub Pages handling
      if (isLocalEnvironment()) {
        try {
          const res = await safeFetchJson('/api/hue/pair', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bridgeIp: ip })
          });

          if (res.ok && res.data && res.data.success) {
            const userEl = document.getElementById('hue-user');
            if (userEl) userEl.value = res.data.username;
            if (pairFeedback) {
              pairFeedback.style.color = '#4ade80';
              pairFeedback.innerHTML = '✅ <strong>Bridge paired successfully!</strong> Application Key saved.';
            }
            await saveConfig({
              philipsHue: {
                ...state.config.philipsHue,
                bridgeIp: ip,
                username: res.data.username
              }
            });
            fetchHueRooms();
          } else if (res.data && res.data.linkButtonRequired) {
            if (pairFeedback) {
              pairFeedback.style.color = '#fbbf24';
              pairFeedback.innerHTML = '🔘 <strong>Link button not pressed!</strong> Press the large round button on top of your Hue Bridge, then click <strong>Pair Bridge</strong> again within 30 seconds.';
            }
          } else {
            if (pairFeedback) {
              pairFeedback.style.color = '#ef4444';
              pairFeedback.innerHTML = `⚠️ <strong>Pairing failed:</strong> ${escapeHtml(res.error || res.data?.error || res.data?.message || 'Could not connect to bridge')}`;
            }
          }
        } catch (err) {
          if (pairFeedback) {
            pairFeedback.style.color = '#ef4444';
            pairFeedback.innerHTML = '⚠️ <strong>Error connecting:</strong> ' + escapeHtml(err.message || 'Unknown network error');
          }
        } finally {
          btnPairHue.textContent = '🔘 Pair Bridge (Press Button)';
        }
      } else {
        // GitHub Pages / External HTTPS mode:
        // Browsers block public HTTPS sites from fetching local private LAN IPs (Mixed Content & PNA)
        btnPairHue.textContent = '🔘 Pair Bridge (Press Button)';
        if (pairFeedback) {
          pairFeedback.style.color = '';
          pairFeedback.innerHTML = `
            <div style="background: rgba(30, 41, 59, 0.95); border: 1px solid rgba(251, 191, 36, 0.4); border-radius: 8px; padding: 1rem; margin-top: 0.5rem; text-align: left;">
              <div style="display: flex; align-items: center; gap: 0.4rem; color: #fbbf24; font-weight: 600; font-size: 0.9rem; margin-bottom: 0.5rem;">
                <span>🌐</span> <span>Browser Security Restriction on GitHub Pages</span>
              </div>
              <p style="font-size: 0.8rem; color: #cbd5e1; margin: 0 0 0.75rem 0; line-height: 1.45;">
                You are viewing this site on GitHub Pages (public HTTPS). Web browsers strictly block public websites from connecting directly to local home devices (<code style="background: rgba(0,0,0,0.3); padding: 2px 5px; border-radius: 4px; color: #38bdf8;">http://${escapeHtml(ip)}</code>).
              </p>
              
              <div style="margin-bottom: 0.85rem; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
                <div style="font-size: 0.85rem; font-weight: 600; color: #4ade80; margin-bottom: 0.25rem;">Option 1: Recommended (Automatic 1-Click Pairing)</div>
                <p style="font-size: 0.78rem; color: #94a3b8; margin: 0 0 0.4rem 0;">
                  Your local Mac server is running right now with direct access to your home network:
                </p>
                <a href="http://localhost:3300" target="_blank" class="btn btn-xs btn-primary" style="display: inline-block; text-decoration: none; padding: 0.35rem 0.75rem; font-size: 0.8rem;">
                  🚀 Open http://localhost:3300
                </a>
              </div>

              <div>
                <div style="font-size: 0.85rem; font-weight: 600; color: #60a5fa; margin-bottom: 0.25rem;">Option 2: Pair via Mac Terminal (Stay on GitHub Pages)</div>
                <p style="font-size: 0.78rem; color: #94a3b8; margin: 0 0 0.35rem 0;">
                  1. Press the big round button on top of your Hue Bridge.<br>
                  2. Open Terminal on your Mac and run:
                </p>
                <pre style="background: #0f172a; padding: 0.5rem 0.6rem; border-radius: 6px; font-size: 0.73rem; overflow-x: auto; color: #38bdf8; margin: 0 0 0.4rem 0; border: 1px solid rgba(255,255,255,0.1);"><code>curl -s -X POST http://${escapeHtml(ip)}/api -d '{"devicetype":"game_day_lights#mac"}'</code></pre>
                <p style="font-size: 0.75rem; color: #94a3b8; margin: 0;">
                  3. Copy the <code style="color: #4ade80;">"username"</code> value from the response, paste it into <strong>Hue API App Key</strong> above, and click <strong>Save Hue Settings</strong>.
                </p>
              </div>
            </div>
          `;
        }
      }
    });
  }

  // Fetch Rooms
  async function fetchHueRooms() {
    try {
      if (!isLocalEnvironment()) return;
      const res = await safeFetchJson('/api/hue/rooms');
      if (!res.ok || !res.data) return;
      const data = res.data;
      const select = document.getElementById('hue-room-select');
      if (select && data.success && data.rooms && data.rooms.length > 0) {
        select.innerHTML = '<option value="">-- Select Your Room / Group --</option>';
        data.rooms.forEach(r => {
          select.innerHTML += `<option value="${r.id}">${escapeHtml(r.name)} (${escapeHtml(r.type || 'Room')})</option>`;
        });
        select.style.display = 'block';
        select.addEventListener('change', async () => {
          if (select.value) {
            const targetEl = document.getElementById('hue-target-id');
            if (targetEl) targetEl.value = select.value;
            const typeEl = document.getElementById('hue-target-type');
            if (typeEl) typeEl.value = 'group';
            await saveConfig({
              philipsHue: {
                ...state.config.philipsHue,
                targetType: 'group',
                targetId: select.value
              }
            });
          }
        });
      }
    } catch (e) {}
  }

  const btnFetchRooms = document.getElementById('btn-fetch-rooms');
  if (btnFetchRooms) {
    btnFetchRooms.addEventListener('click', fetchHueRooms);
  }

  // Test Hue Flash
  if (elements.btnTestHue) {
    elements.btnTestHue.addEventListener('click', async () => {
      runLocalCelebration(state.activeTeam, 'HUE TEST');
      try {
        await fetch('/api/test-celebration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId: state.activeTeam })
        });
      } catch (e) {}
    });
  }

  // Copy YAML
  if (elements.btnCopyYaml) {
    elements.btnCopyYaml.addEventListener('click', () => {
      if (elements.haYamlBlock) {
        const yaml = elements.haYamlBlock.innerText;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(yaml).catch(() => {});
        }
        elements.btnCopyYaml.textContent = '✅ Copied!';
        setTimeout(() => {
          if (elements.btnCopyYaml) elements.btnCopyYaml.textContent = '📋 Copy YAML';
        }, 2000);
      }
    });
  }

  // Copy Webhook URLs
  if (elements.btnCopyWebhookUrl) {
    elements.btnCopyWebhookUrl.addEventListener('click', () => {
      if (elements.webhookUrlDisplay && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(elements.webhookUrlDisplay.textContent).catch(() => {});
        elements.btnCopyWebhookUrl.textContent = 'Copied!';
        setTimeout(() => {
          if (elements.btnCopyWebhookUrl) elements.btnCopyWebhookUrl.textContent = 'Copy';
        }, 2000);
      }
    });
  }

  if (elements.btnCopyEspnUrl) {
    elements.btnCopyEspnUrl.addEventListener('click', () => {
      if (elements.webhookEspnUrlDisplay && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(elements.webhookEspnUrlDisplay.textContent).catch(() => {});
        elements.btnCopyEspnUrl.textContent = 'Copied!';
        setTimeout(() => {
          if (elements.btnCopyEspnUrl) elements.btnCopyEspnUrl.textContent = 'Copy';
        }, 2000);
      }
    });
  }

  // Webhook Tester Presets
  const presets = {
    canes: { team: 'canes', event: 'GOAL', player: 'Sebastian Aho', scoreTeam: 4, scoreOpponent: 2 },
    wolfpack: { team: 'wolfpack', event: 'TOUCHDOWN', player: 'KC Concepcion', scoreTeam: 35, scoreOpponent: 20 },
    vols: { team: 'vols', event: 'TOUCHDOWN', player: 'Squirrel White', scoreTeam: 35, scoreOpponent: 28 },
    vikings: { team: 'vikings', event: 'TOUCHDOWN', player: 'Justin Jefferson', scoreTeam: 31, scoreOpponent: 17 },
    liverpool: { team: 'liverpool', event: 'GOAL', player: 'Mohamed Salah', scoreTeam: 3, scoreOpponent: 1 }
  };

  const btnPresetCanes = document.getElementById('btn-preset-canes');
  if (btnPresetCanes) {
    btnPresetCanes.addEventListener('click', () => {
      if (elements.testWebhookPayload) elements.testWebhookPayload.value = JSON.stringify(presets.canes, null, 2);
    });
  }

  const btnPresetWolf = document.getElementById('btn-preset-wolfpack');
  if (btnPresetWolf) {
    btnPresetWolf.addEventListener('click', () => {
      if (elements.testWebhookPayload) elements.testWebhookPayload.value = JSON.stringify(presets.wolfpack, null, 2);
    });
  }

  const btnPresetVols = document.getElementById('btn-preset-vols');
  if (btnPresetVols) {
    btnPresetVols.addEventListener('click', () => {
      if (elements.testWebhookPayload) elements.testWebhookPayload.value = JSON.stringify(presets.vols, null, 2);
    });
  }

  const btnPresetVik = document.getElementById('btn-preset-vikings');
  if (btnPresetVik) {
    btnPresetVik.addEventListener('click', () => {
      if (elements.testWebhookPayload) elements.testWebhookPayload.value = JSON.stringify(presets.vikings, null, 2);
    });
  }

  const btnPresetLiv = document.getElementById('btn-preset-liverpool');
  if (btnPresetLiv) {
    btnPresetLiv.addEventListener('click', () => {
      if (elements.testWebhookPayload) elements.testWebhookPayload.value = JSON.stringify(presets.liverpool, null, 2);
    });
  }

  // Send Inbound Test Webhook
  if (elements.btnSendTestWebhook) {
    elements.btnSendTestWebhook.addEventListener('click', async () => {
      if (!elements.testWebhookResult || !elements.testWebhookPayload) return;
      elements.testWebhookResult.classList.remove('hidden');
      elements.testWebhookResult.textContent = 'Sending webhook...';

      try {
        const payload = JSON.parse(elements.testWebhookPayload.value);
        const res = await fetch('/api/webhooks/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        elements.testWebhookResult.textContent = `Status ${res.status}:\n${JSON.stringify(data, null, 2)}`;
      } catch (err) {
        elements.testWebhookResult.textContent = `Error: ${err.message}`;
      }
    });
  }

  // Clear Logs
  if (elements.btnClearLogs) {
    elements.btnClearLogs.addEventListener('click', () => {
      state.logs = [];
      renderLogs();
    });
  }
}

// Fetch Initial Teams Data
async function loadTeams() {
  const isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';
  if (!isHttp || !isLocalEnvironment()) return;

  try {
    const res = await safeFetchJson('/api/teams');
    if (res.ok && res.data && res.data.teams) {
      state.teams = res.data.teams;
      updateThemeColors();
      renderScoreboard();
    }
  } catch (err) {
    // Keep client-side fallback
  }
}

// Initialize Application
function initApp() {
  loadSavedConfig();
  initElements();
  if (elements.soundIcon && elements.soundLabel) {
    elements.soundIcon.textContent = state.sound.enabled ? '🔊' : '🔇';
    elements.soundLabel.textContent = state.sound.enabled ? 'Sound ON' : 'Sound MUTED';
  }
  setupEventListeners();
  updateThemeColors();
  renderScoreboard();
  highlightActiveTeamCard(state.activeTeam);
  renderConfigForms();
  fetchHaYaml();
  renderLogs();
  loadTeams();
  syncServerConfig();
  initSse();

  // Show local server guidance banner if viewing on GitHub Pages / remote HTTPS
  if (!isLocalEnvironment()) {
    const ghNotice = document.getElementById('hue-ghpages-notice');
    if (ghNotice) ghNotice.style.display = 'block';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

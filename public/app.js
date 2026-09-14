// app.js - Game Day Lights Client Logic, Web Audio Synthesizer & Real-time Visualizer

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
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
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

      // Attack & decay
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

    lfo.frequency.setValueAtTime(1.8, now); // 1.8 Hz siren oscillation
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
    this.stopAll();

    const now = this.ctx.currentTime;
    const dur = 7.0;

    // Deep ancient Scandinavian horn: 55Hz (A1), 110Hz (A2), 164.8Hz (E3)
    const pitches = [55, 110, 164.81];
    pitches.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      // Natural breath pitch-bend
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

    // Sub-bass war drum boom (Skol clap rhythm)
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
    this.stopAll();

    const now = this.ctx.currentTime;
    const dur = 6.0;

    // Crowd noise buffer
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
    noiseGain.gain.linearRampToValueAtTime(0.18, now + 0.8);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + dur);
    this.activeNodes.push(noise);

    // Fanfare chords
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
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
    this.stopAll();

    const now = this.ctx.currentTime;
    const dur = 5.5;

    // Upward pitch sweep siren (Wolfpack howl style)
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

    // Brass Fanfare Triad: D4 (293.66), F#4 (369.99), A4 (440)
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

  playByAudioKey(key) {
    if (key === 'nhl_goal_horn') this.playNhlGoalHorn();
    else if (key === 'gjallarhorn') this.playGjallarhorn();
    else if (key === 'liverpool_goal') this.playLiverpoolGoal();
    else if (key === 'wolfpack_touchdown') this.playWolfpackTouchdown();
    else this.playNhlGoalHorn();
  }
}

// Default fallback teams data for standalone static hosting (GitHub Pages)
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
  }
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
      enabled: true,
      mode: 'webhook',
      host: 'http://homeassistant.local:8123',
      webhookId: 'game_day_score_celebration',
      entityId: 'light.living_room_lights'
    },
    philipsHue: {
      enabled: true,
      bridgeIp: '192.168.1.50',
      username: 'hue_api_key',
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


// DOM References
const elements = {
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

// Connect SSE stream for real-time updates
function initSse() {
  const evtSource = new EventSource('/api/events/stream');

  evtSource.addEventListener('initial_state', (e) => {
    const data = JSON.parse(e.data);
    state.activeTeam = data.activeTeam;
    state.currentRgb = data.currentColor;
    state.mode = data.mode;
    state.isCelebrating = data.isCelebrating;
    state.match = data.match;
    state.config = data.config;
    state.logs = data.logs || [];

    updateThemeColors();
    renderScoreboard();
    renderLogs();
    renderConfigForms();
    fetchHaYaml();
    highlightActiveTeamCard(state.activeTeam);
  });

  evtSource.addEventListener('state_update', (e) => {
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

    if (data.isCelebrating === false && !elements.celebrationOverlay.classList.contains('hidden')) {
      hideCelebrationDisplay();
    }

    updateThemeColors();
    renderScoreboard();
    highlightActiveTeamCard(state.activeTeam);
  });

  evtSource.onerror = () => {
    state.isStandalone = true;
    const team = state.teams[state.activeTeam];
    elements.statusLabel.textContent = `Ambient Synced: ${team?.name || 'Canes'} (Standalone Mode)`;
  };
}

// Update Dynamic CSS Variables
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

  elements.colorRgbDisplay.textContent = `RGB(${rgbStr})`;

  if (state.isCelebrating) {
    elements.statusLabel.textContent = '🚨 CELEBRATION STROBE ACTIVE';
    elements.strobeModeText.textContent = 'GOAL STROBE FLASHING';
    elements.strobeModeText.style.color = '#ffc62f';
  } else {
    elements.statusLabel.textContent = `Ambient Synced: ${team?.name || 'Canes'}`;
    elements.strobeModeText.textContent = 'AMBIENT SYNCED';
    elements.strobeModeText.style.color = 'var(--team-primary)';
  }
}

// Render Scoreboard
function renderScoreboard() {
  const team = state.teams[state.activeTeam];
  const m = state.match;
  if (!team || !m) return;

  const teamIcons = { canes: '🌀', wolfpack: '🐺', vikings: '⚔️', liverpool: '⚽' };
  const oppIcons = { 'New York Rangers': '🗽', 'Green Bay Packers': '🧀', 'North Carolina Tar Heels': '🐏', 'Manchester City': '⛵' };

  elements.matchLeagueBadge.textContent = `${team.league} • ${team.sport.toUpperCase()}`;
  elements.matchPeriodClock.textContent = `${m.period} • ${m.clock}`;

  elements.scoreTeamLogoWrap.textContent = teamIcons[team.id] || '🏆';
  elements.scoreTeamName.textContent = team.name;
  elements.scoreTeamPts.textContent = m.scoreTeam;

  elements.scoreOpponentName.textContent = m.opponent;
  elements.scoreOpponentPts.textContent = m.scoreOpponent;
  document.getElementById('score-opponent-badge').textContent = oppIcons[m.opponent] || '🛡️';

  elements.matchLastEvent.textContent = m.lastEvent;

  // TV Screen Display
  elements.screenTeamIcon.textContent = teamIcons[team.id] || '🏆';
  elements.screenMatchupText.textContent = `${team.short.toUpperCase()} VS ${m.opponentShort || 'OPP'}`;
  elements.screenClockText.textContent = `${m.period} ${m.clock}`;

  // Update simulator button label based on sport
  const isFootball = team.id === 'vikings' || team.id === 'wolfpack';
  elements.btnSimScoreText.textContent = isFootball ? '+ Touchdown (+6)' : '+ Goal (+1)';
}

// Celebration Display & Sound
let celebrationTimeout = null;

function triggerCelebrationDisplay(data) {
  elements.celebrationOverlay.classList.remove('hidden');
  elements.celebrationTitle.textContent = data.celebrationTitle || 'GOAL!';
  elements.celebrationTagline.textContent = data.celebrationTagline || 'CELEBRATION TRIGGERED!';
  elements.celebrationBadge.textContent = data.scoreEvent?.type ? `🚨 ${data.scoreEvent.type}!` : '🚨 SCORE!';

  // Reset & animate progress bar
  elements.celebrationProgressBar.style.width = '100%';
  setTimeout(() => {
    elements.celebrationProgressBar.style.transition = 'width 12s linear';
    elements.celebrationProgressBar.style.width = '0%';
  }, 50);

  // Play synthesized audio
  if (data.audioKey) {
    state.sound.playByAudioKey(data.audioKey);
  }

  if (celebrationTimeout) clearTimeout(celebrationTimeout);
  celebrationTimeout = setTimeout(() => {
    hideCelebrationDisplay();
  }, 12500);
}

function hideCelebrationDisplay() {
  elements.celebrationOverlay.classList.add('hidden');
  elements.celebrationProgressBar.style.transition = 'none';
  elements.celebrationProgressBar.style.width = '100%';
}

// Highlight Team Card
function highlightActiveTeamCard(teamId) {
  document.querySelectorAll('.team-card').forEach(card => {
    card.classList.toggle('active', card.dataset.team === teamId);
  });
}

// Local celebration runner for standalone / GitHub Pages hosting
let localFlashInterval = null;

function runLocalCelebration(teamId, eventName = 'GOAL') {
  const team = state.teams[teamId];
  if (!team) return;
  state.isCelebrating = true;
  updateThemeColors();

  triggerCelebrationDisplay({
    celebrationTitle: team.celebration.celebrationTitle,
    celebrationTagline: team.celebration.celebrationTagline,
    audioKey: team.celebration.audioKey,
    scoreEvent: { type: eventName }
  });

  if (localFlashInterval) clearInterval(localFlashInterval);
  let step = 0;
  localFlashInterval = setInterval(() => {
    step++;
    const colors = team.celebration.colors;
    state.currentRgb = colors[step % colors.length];
    updateThemeColors();
  }, team.celebration.flashIntervalMs || 250);

  setTimeout(() => {
    runLocalAmbient(teamId);
  }, team.celebration.durationMs || 12000);
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
}

// Quick Celebration & Ambient Buttons
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

// Simulator Controls
document.getElementById('btn-sim-score').addEventListener('click', async () => {
  const isFootball = state.activeTeam === 'vikings' || state.activeTeam === 'wolfpack';
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
      state.match.scoreTeam += pts;
      state.match.lastEvent = `${evtName} scored (+${pts} pts)`;
      renderScoreboard();
    }
    runLocalCelebration(state.activeTeam, evtName);
  }
});

document.getElementById('btn-sim-touchdown').addEventListener('click', async () => {
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
      state.match.scoreTeam += 6;
      state.match.lastEvent = `TOUCHDOWN scored (+6 pts)`;
      renderScoreboard();
    }
    runLocalCelebration(state.activeTeam, 'TOUCHDOWN');
  }
});

document.getElementById('btn-sim-opp').addEventListener('click', async () => {
  try {
    const res = await fetch('/api/simulate-opponent-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: state.activeTeam })
    });
    if (!res.ok) throw new Error('API unavailable');
  } catch (err) {
    if (state.match) {
      state.match.scoreOpponent += 1;
      state.match.lastEvent = `OPPONENT SCORE (+1 pt)`;
      renderScoreboard();
    }
  }
});

document.getElementById('btn-sim-reset').addEventListener('click', async () => {
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


  // Tabs
  elements.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.tabButtons.forEach(b => b.classList.remove('active'));
      elements.tabPanels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  elements.haModeSelect.addEventListener('change', (e) => {
    toggleHaModeFields(e.target.value);
  });

  // Save Home Assistant Config
  elements.btnSaveHa.addEventListener('click', async () => {
    const updated = {
      homeAssistant: {
        enabled: document.getElementById('ha-enabled').checked,
        mode: document.getElementById('ha-mode').value,
        host: document.getElementById('ha-host').value,
        webhookId: document.getElementById('ha-webhook-id').value,
        entityId: document.getElementById('ha-entity-id').value,
        accessToken: document.getElementById('ha-token').value
      }
    };
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    fetchHaYaml();
    alert('Home Assistant settings saved successfully!');
  });

  // Save Philips Hue Config
  elements.btnSaveHue.addEventListener('click', async () => {
    const updated = {
      philipsHue: {
        enabled: document.getElementById('hue-enabled').checked,
        bridgeIp: document.getElementById('hue-ip').value,
        username: document.getElementById('hue-user').value,
        targetType: document.getElementById('hue-target-type').value,
        targetId: document.getElementById('hue-target-id').value,
        useAlertStrobe: document.getElementById('hue-alert-strobe').checked
      }
    };
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    alert('Philips Hue settings saved successfully!');
  });

  // Auto-Detect Hue Bridge
  const btnDiscoverHue = document.getElementById('btn-discover-hue');
  if (btnDiscoverHue) {
    btnDiscoverHue.addEventListener('click', async () => {
      btnDiscoverHue.textContent = 'Searching...';
      try {
        const res = await fetch('/api/hue/discover', { method: 'POST' });
        const data = await res.json();
        if (data.success && data.bridges && data.bridges.length > 0) {
          document.getElementById('hue-ip').value = data.bridges[0].ip;
          alert(`Found Hue Bridge at: ${data.bridges[0].ip}`);
        } else {
          alert('Could not auto-detect Bridge via cloud. Please enter the Bridge IP shown in your Hue iPhone app.');
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
      const ip = document.getElementById('hue-ip').value.trim();
      if (!ip) {
        alert('Please enter your Hue Bridge IP first.');
        return;
      }
      btnPairHue.textContent = 'Pairing...';
      if (pairFeedback) {
        pairFeedback.style.display = 'block';
        pairFeedback.textContent = 'Contacting Hue Bridge...';
      }
      try {
        const res = await fetch('/api/hue/pair', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bridgeIp: ip })
        });
        const data = await res.json();
        if (data.success) {
          document.getElementById('hue-user').value = data.username;
          if (pairFeedback) {
            pairFeedback.style.color = '#4ade80';
            pairFeedback.textContent = '✅ Bridge paired successfully! Application Key saved.';
          }
          fetchHueRooms();
        } else {
          if (pairFeedback) {
            pairFeedback.style.color = '#fbbf24';
            pairFeedback.textContent = data.message || data.error || 'Failed to pair with bridge.';
          }
        }
      } catch (err) {
        if (pairFeedback) {
          pairFeedback.style.color = '#ef4444';
          pairFeedback.textContent = 'Error connecting to bridge: ' + err.message;
        }
      } finally {
        btnPairHue.textContent = '🔘 Pair Bridge (Press Button)';
      }
    });
  }

  // Fetch Rooms
  async function fetchHueRooms() {
    try {
      const res = await fetch('/api/hue/rooms');
      const data = await res.json();
      const select = document.getElementById('hue-room-select');
      if (select && data.success && data.rooms && data.rooms.length > 0) {
        select.innerHTML = '<option value="">-- Select Your Room / Group --</option>';
        data.rooms.forEach(r => {
          select.innerHTML += `<option value="${r.id}">${r.name} (${r.type || 'Room'})</option>`;
        });
        select.style.display = 'block';
        select.addEventListener('change', () => {
          if (select.value) {
            document.getElementById('hue-target-id').value = select.value;
            document.getElementById('hue-target-type').value = 'group';
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
  elements.btnCopyYaml.addEventListener('click', () => {
    const yaml = elements.haYamlBlock.innerText;
    navigator.clipboard.writeText(yaml);
    elements.btnCopyYaml.textContent = '✅ Copied!';
    setTimeout(() => { elements.btnCopyYaml.textContent = '📋 Copy YAML'; }, 2000);
  });

  // Copy Webhook URLs
  elements.btnCopyWebhookUrl.addEventListener('click', () => {
    navigator.clipboard.writeText(elements.webhookUrlDisplay.textContent);
    elements.btnCopyWebhookUrl.textContent = 'Copied!';
    setTimeout(() => { elements.btnCopyWebhookUrl.textContent = 'Copy'; }, 2000);
  });

  elements.btnCopyEspnUrl.addEventListener('click', () => {
    navigator.clipboard.writeText(elements.webhookEspnUrlDisplay.textContent);
    elements.btnCopyEspnUrl.textContent = 'Copied!';
    setTimeout(() => { elements.btnCopyEspnUrl.textContent = 'Copy'; }, 2000);
  });

  // Webhook Tester Presets
  const presets = {
    canes: { team: 'canes', event: 'GOAL', player: 'Sebastian Aho', scoreTeam: 4, scoreOpponent: 2 },
    wolfpack: { team: 'wolfpack', event: 'TOUCHDOWN', player: 'KC Concepcion', scoreTeam: 35, scoreOpponent: 20 },
    vikings: { team: 'vikings', event: 'TOUCHDOWN', player: 'Justin Jefferson', scoreTeam: 31, scoreOpponent: 17 },
    liverpool: { team: 'liverpool', event: 'GOAL', player: 'Mohamed Salah', scoreTeam: 3, scoreOpponent: 1 }
  };

  document.getElementById('btn-preset-canes').addEventListener('click', () => {
    elements.testWebhookPayload.value = JSON.stringify(presets.canes, null, 2);
  });
  document.getElementById('btn-preset-wolfpack').addEventListener('click', () => {
    elements.testWebhookPayload.value = JSON.stringify(presets.wolfpack, null, 2);
  });
  document.getElementById('btn-preset-vikings').addEventListener('click', () => {
    elements.testWebhookPayload.value = JSON.stringify(presets.vikings, null, 2);
  });
  document.getElementById('btn-preset-liverpool').addEventListener('click', () => {
    elements.testWebhookPayload.value = JSON.stringify(presets.liverpool, null, 2);
  });

  // Send Inbound Test Webhook
  elements.btnSendTestWebhook.addEventListener('click', async () => {
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

  // Clear Logs
  elements.btnClearLogs.addEventListener('click', () => {
    state.logs = [];
    renderLogs();
  });
}

// Fetch Initial Teams Data
async function loadTeams() {
  try {
    const res = await fetch('/api/teams');
    const data = await res.json();
    state.teams = data.teams;
  } catch (err) {
    console.error('Failed to load teams:', err);
  }
}

// Initialize Application
async function initApp() {
  updateThemeColors();
  renderScoreboard();
  highlightActiveTeamCard(state.activeTeam);
  renderConfigForms();
  fetchHaYaml();
  await loadTeams();
  setupEventListeners();
  initSse();
}

document.addEventListener('DOMContentLoaded', initApp);


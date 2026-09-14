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

// Application State
const state = {
  teams: {},
  activeTeam: 'canes',
  currentRgb: [200, 16, 46],
  mode: 'ambient',
  isCelebrating: false,
  sound: new SoundSynthesizer(),
  match: null,
  config: null,
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
    elements.statusLabel.textContent = 'Reconnecting to Server...';
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

// Select Team Action
async function selectTeam(teamId) {
  try {
    const res = await fetch('/api/select-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId })
    });
    const data = await res.json();
    if (data.success) {
      state.activeTeam = teamId;
      state.match = data.match;
      updateThemeColors();
      renderScoreboard();
      highlightActiveTeamCard(teamId);
    }
  } catch (err) {
    console.error('Failed to select team:', err);
  }
}

// Render Logs
function renderLogs() {
  elements.logCount.textContent = state.logs.length;
  elements.logsContainer.innerHTML = '';

  if (state.logs.length === 0) {
    elements.logsContainer.innerHTML = '<div style="color: #64748b; padding: 1rem; text-align: center;">No activity recorded yet. Trigger a celebration or webhook to see live telemetry.</div>';
    return;
  }

  for (const log of state.logs.slice(0, 30)) {
    const el = document.createElement('div');
    el.className = `log-entry ${log.success ? '' : 'error'}`;
    
    const time = new Date(log.timestamp).toLocaleTimeString();
    const detailsStr = typeof log.details === 'object' ? JSON.stringify(log.details) : log.details;

    el.innerHTML = `
      <span class="log-time">${time}</span>
      <span class="log-badge">${log.source}</span>
      <span class="log-badge">${log.type}</span>
      <span class="log-details">${detailsStr}</span>
    `;
    elements.logsContainer.appendChild(el);
  }
}

// Config Forms & Home Assistant YAML
async function fetchHaYaml() {
  try {
    const res = await fetch('/api/ha-yaml');
    const text = await res.text();
    elements.haYamlBlock.innerHTML = `<code>${escapeHtml(text)}</code>`;
  } catch (err) {
    elements.haYamlBlock.textContent = '# Failed to load Home Assistant YAML';
  }
}

function renderConfigForms() {
  if (!state.config) return;

  const ha = state.config.homeAssistant || {};
  document.getElementById('ha-enabled').checked = !!ha.enabled;
  document.getElementById('ha-mode').value = ha.mode || 'webhook';
  document.getElementById('ha-host').value = ha.host || 'http://homeassistant.local:8123';
  document.getElementById('ha-webhook-id').value = ha.webhookId || 'game_day_score_celebration';
  document.getElementById('ha-entity-id').value = ha.entityId || 'light.living_room_lights';
  toggleHaModeFields(ha.mode);

  const hue = state.config.philipsHue || {};
  document.getElementById('hue-enabled').checked = !!hue.enabled;
  document.getElementById('hue-ip').value = hue.bridgeIp || '192.168.1.50';
  document.getElementById('hue-user').value = hue.username || '';
  document.getElementById('hue-target-type').value = hue.targetType || 'group';
  document.getElementById('hue-target-id').value = hue.targetId || '1';
  document.getElementById('hue-alert-strobe').checked = !!hue.useAlertStrobe;

  // Display webhook URLs
  const origin = window.location.origin;
  elements.webhookUrlDisplay.textContent = `${origin}/api/webhooks/score`;
  elements.webhookEspnUrlDisplay.textContent = `${origin}/api/webhooks/espn`;
}

function toggleHaModeFields(mode) {
  if (mode === 'service') {
    elements.groupHaToken.style.display = 'block';
  } else {
    elements.groupHaToken.style.display = 'none';
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Event Listeners Initialization
function setupEventListeners() {
  // Team cards click
  document.querySelectorAll('.team-card').forEach(card => {
    card.addEventListener('click', () => {
      const teamId = card.dataset.team;
      selectTeam(teamId);
    });
  });

  // Sound Toggle
  elements.btnSoundToggle.addEventListener('click', () => {
    state.sound.enabled = !state.sound.enabled;
    if (state.sound.enabled) {
      state.sound.init();
      elements.soundIcon.textContent = '🔊';
      elements.soundLabel.textContent = 'Sound ON';
    } else {
      state.sound.stopAll();
      elements.soundIcon.textContent = '🔇';
      elements.soundLabel.textContent = 'Sound MUTED';
    }
  });

  // Quick Celebration & Ambient Buttons
  elements.btnQuickCelebrate.addEventListener('click', async () => {
    await fetch('/api/test-celebration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: state.activeTeam })
    });
  });

  elements.btnQuickAmbient.addEventListener('click', async () => {
    hideCelebrationDisplay();
    state.sound.stopAll();
    await fetch('/api/test-ambient', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: state.activeTeam })
    });
  });

  // Simulator Controls
  document.getElementById('btn-sim-score').addEventListener('click', async () => {
    const isFootball = state.activeTeam === 'vikings' || state.activeTeam === 'wolfpack';
    await fetch('/api/simulate-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamId: state.activeTeam,
        event: isFootball ? 'TOUCHDOWN' : 'GOAL',
        points: isFootball ? 6 : 1
      })
    });
  });

  document.getElementById('btn-sim-touchdown').addEventListener('click', async () => {
    await fetch('/api/simulate-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamId: state.activeTeam,
        event: 'TOUCHDOWN',
        points: 6
      })
    });
  });

  document.getElementById('btn-sim-opp').addEventListener('click', async () => {
    await fetch('/api/simulate-opponent-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: state.activeTeam })
    });
  });

  document.getElementById('btn-sim-reset').addEventListener('click', async () => {
    await fetch('/api/reset-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: state.activeTeam })
    });
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
  await loadTeams();
  setupEventListeners();
  initSse();
}

document.addEventListener('DOMContentLoaded', initApp);

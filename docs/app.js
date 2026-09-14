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

  // Helper: Play collegiate marching snare hit / cadence roll
  playSnare(time, duration = 0.12, gainLevel = 0.15) {
    if (!this.ctx) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainLevel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + duration);
    this.activeNodes.push(noise);
  }

  // Helper: Play stadium / marching bass drum
  playBassDrum(time, startFreq = 120, endFreq = 38, duration = 0.5, gainLevel = 0.35) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + duration);

    gain.gain.setValueAtTime(gainLevel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration);
    this.activeNodes.push(osc);
  }

  // Helper: Play rich brass lead note (Sawtooth + Square harmonic with lowpass envelope)
  playBrassNote(freq, startTime, dur, vol = 0.16) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const oscHarmonic = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, startTime);

    oscHarmonic.type = 'square';
    oscHarmonic.frequency.setValueAtTime(freq * 2, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, startTime);
    filter.frequency.linearRampToValueAtTime(2200, startTime + 0.04);
    filter.frequency.exponentialRampToValueAtTime(1100, startTime + dur);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.035);
    gain.gain.setValueAtTime(vol * 0.9, startTime + dur * 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

    osc.connect(filter);
    oscHarmonic.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    oscHarmonic.start(startTime);
    osc.stop(startTime + dur + 0.05);
    oscHarmonic.stop(startTime + dur + 0.05);
    this.activeNodes.push(osc, oscHarmonic);
  }

  // Helper: Play church / cathedral pipe organ chord
  playOrganChord(frequencies, startTime, dur, vol = 0.12) {
    if (!this.ctx) return;
    frequencies.forEach(f => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.1);
      gain.gain.setValueAtTime(vol * 0.85, startTime + dur - 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + dur);
      this.activeNodes.push(osc);
    });
  }

  // 1. Carolina Hurricanes - "Brass Bonanza" Hockey Anthem, Warning Siren & Air Horn
  playNhlGoalHorn() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    this.stopAll();

    const now = this.ctx.currentTime;

    // Dual NHL Air Horn Chord Blast (Bb3, Db4, F4, Bb2)
    const hornPitches = [233.08, 277.18, 349.23, 116.54];
    hornPitches.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx === 3 ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.12);
      gain.gain.setValueAtTime(0.18, now + 1.8);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 2.3);
      this.activeNodes.push(osc);
    });

    // Emergency Storm Siren
    const sirenOsc = this.ctx.createOscillator();
    const sirenGain = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();

    sirenOsc.type = 'sawtooth';
    sirenOsc.frequency.setValueAtTime(550, now);
    lfo.frequency.setValueAtTime(1.6, now);
    lfoGain.gain.setValueAtTime(240, now);
    lfo.connect(sirenOsc.frequency);

    sirenGain.gain.setValueAtTime(0.001, now);
    sirenGain.gain.linearRampToValueAtTime(0.08, now + 0.3);
    sirenGain.gain.exponentialRampToValueAtTime(0.001, now + 6.0);

    sirenOsc.connect(sirenGain);
    sirenGain.connect(this.masterGain);
    lfo.start(now);
    sirenOsc.start(now);
    lfo.stop(now + 6.0);
    sirenOsc.stop(now + 6.0);
    this.activeNodes.push(sirenOsc, lfo);

    // "Brass Bonanza" Hockey Brass Fanfare (starting at 0.8s)
    const bonanzaMelody = [
      { f: 392.00, t: 0.80, d: 0.18 }, // G4
      { f: 392.00, t: 1.02, d: 0.18 }, // G4
      { f: 440.00, t: 1.25, d: 0.18 }, // A4
      { f: 493.88, t: 1.48, d: 0.22 }, // B4
      { f: 587.33, t: 1.75, d: 0.35 }, // D5
      { f: 493.88, t: 2.15, d: 0.22 }, // B4
      { f: 392.00, t: 2.42, d: 0.22 }, // G4
      { f: 440.00, t: 2.68, d: 0.45 }, // A4
      { f: 293.66, t: 3.20, d: 0.30 }, // D4
      { f: 392.00, t: 3.55, d: 0.18 }, // G4
      { f: 493.88, t: 3.78, d: 0.20 }, // B4
      { f: 587.33, t: 4.02, d: 0.22 }, // D5
      { f: 523.25, t: 4.28, d: 0.22 }, // C5
      { f: 493.88, t: 4.54, d: 0.22 }, // B4
      { f: 440.00, t: 4.80, d: 0.35 }, // A4
      { f: 392.00, t: 5.20, d: 0.65 }  // G4
    ];

    bonanzaMelody.forEach(note => {
      this.playBrassNote(note.f, now + note.t, note.d, 0.15);
    });
  }

  // 2. Minnesota Vikings - "Skol, Vikings" Fight Song & Resonant Gjallarhorn
  playGjallarhorn() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    this.stopAll();

    const now = this.ctx.currentTime;
    const dur = 7.0;

    // Resonant Acoustic Gjallarhorn Blast
    const hornPitches = [55, 110, 164.81];
    hornPitches.forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 1.025, now + 1.2);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.98, now + dur);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, now);
      filter.frequency.linearRampToValueAtTime(750, now + 1.0);
      filter.frequency.exponentialRampToValueAtTime(200, now + dur);
      filter.Q.value = 4.0;

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.4);
      gain.gain.setValueAtTime(0.20, now + dur - 1.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + dur);
      this.activeNodes.push(osc);
    });

    // Rhythmic Skol Stadium Drums (4 deep stadium claps)
    for (let i = 0; i < 4; i++) {
      this.playBassDrum(now + (i * 1.4), 115, 32, 0.6, 0.32);
    }

    // "Skol, Vikings" Fight Song Brass Melody ("Skol, Vikings, let's win this game...")
    const skolMelody = [
      { f: 233.08, t: 0.50, d: 0.35 }, // Bb3
      { f: 293.66, t: 0.90, d: 0.35 }, // D4
      { f: 349.23, t: 1.30, d: 0.40 }, // F4
      { f: 466.16, t: 1.75, d: 0.60 }, // Bb4 ("Skol!")
      { f: 440.00, t: 2.45, d: 0.28 }, // A4
      { f: 392.00, t: 2.78, d: 0.28 }, // G4
      { f: 349.23, t: 3.10, d: 0.45 }, // F4
      { f: 392.00, t: 3.60, d: 0.28 }, // G4
      { f: 349.23, t: 3.92, d: 0.28 }, // F4
      { f: 293.66, t: 4.24, d: 0.32 }, // D4
      { f: 233.08, t: 4.60, d: 0.50 }, // Bb3
      { f: 261.63, t: 5.15, d: 0.25 }, // C4
      { f: 293.66, t: 5.42, d: 0.25 }, // D4
      { f: 311.13, t: 5.70, d: 0.30 }, // Eb4
      { f: 349.23, t: 6.05, d: 0.65 }  // F4
    ];

    skolMelody.forEach(note => {
      this.playBrassNote(note.f, now + note.t, note.d, 0.16);
    });
  }

  // 3. NC State Wolfpack - "The Red and White Song" Collegiate March & Siren
  playWolfpackTouchdown() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    this.stopAll();

    const now = this.ctx.currentTime;
    const dur = 6.0;

    // Carter-Finley Stadium Wolfpack Siren
    const siren = this.ctx.createOscillator();
    const sirenGain = this.ctx.createGain();
    siren.type = 'sawtooth';
    siren.frequency.setValueAtTime(260, now);
    siren.frequency.exponentialRampToValueAtTime(920, now + 1.1);
    siren.frequency.exponentialRampToValueAtTime(480, now + 2.2);
    siren.frequency.exponentialRampToValueAtTime(880, now + 3.4);

    sirenGain.gain.setValueAtTime(0.001, now);
    sirenGain.gain.linearRampToValueAtTime(0.18, now + 0.25);
    sirenGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    siren.connect(sirenGain);
    sirenGain.connect(this.masterGain);
    siren.start(now);
    siren.stop(now + dur);
    this.activeNodes.push(siren);

    // Marching Cadence Snare Drum & Bass Drum
    for (let i = 0; i < 14; i++) {
      const snareTime = now + 0.4 + (i * 0.32);
      this.playSnare(snareTime, 0.08, 0.12);
      if (i % 2 === 0) {
        this.playBassDrum(snareTime, 120, 40, 0.35, 0.28);
      }
    }

    // "The Red and White Song" Collegiate Fight Song Fanfare ("We're the Red and White from State...")
    const redWhiteMelody = [
      { f: 261.63, t: 0.40, d: 0.22 }, // C4 ("We're")
      { f: 329.63, t: 0.65, d: 0.22 }, // E4 ("the")
      { f: 392.00, t: 0.90, d: 0.28 }, // G4 ("Red")
      { f: 392.00, t: 1.22, d: 0.20 }, // G4 ("and")
      { f: 440.00, t: 1.45, d: 0.28 }, // A4 ("White")
      { f: 392.00, t: 1.78, d: 0.30 }, // G4 ("from")
      { f: 329.63, t: 2.12, d: 0.45 }, // E4 ("State!")
      { f: 261.63, t: 2.65, d: 0.25 }, // C4 ("and")
      { f: 293.66, t: 2.95, d: 0.25 }, // D4 ("we")
      { f: 329.63, t: 3.25, d: 0.25 }, // E4 ("know")
      { f: 349.23, t: 3.55, d: 0.28 }, // F4 ("we")
      { f: 392.00, t: 3.88, d: 0.32 }, // G4 ("are")
      { f: 329.63, t: 4.25, d: 0.30 }, // E4 ("the")
      { f: 261.63, t: 4.60, d: 0.35 }, // C4 ("best!")
      { f: 293.66, t: 5.00, d: 0.25 }, // D4 ("Go")
      { f: 261.63, t: 5.30, d: 0.65 }  // C4 ("State!")
    ];

    redWhiteMelody.forEach(note => {
      this.playBrassNote(note.f, now + note.t, note.d, 0.16);
    });
  }

  // 5. Tennessee Volunteers - "Rocky Top" Fight Song Fanfare, Snare Cadence & Neyland Cannon
  playRockyTop() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    this.stopAll();

    const now = this.ctx.currentTime;
    const dur = 6.5;

    // Neyland Stadium Celebration Cannon Blast #1
    this.playBassDrum(now, 130, 24, 0.9, 0.55);
    this.playSnare(now, 0.45, 0.28);

    // Marching Band Snare Drum Cadence
    for (let i = 0; i < 16; i++) {
      const beatTime = now + 0.25 + (i * 0.26);
      this.playSnare(beatTime, 0.08, 0.14);
      if (i % 2 === 0) {
        this.playBassDrum(beatTime, 110, 38, 0.3, 0.26);
      }
    }

    // Neyland Stadium Celebration Cannon Blast #2 (at crescendo)
    this.playBassDrum(now + 4.8, 125, 22, 0.95, 0.55);
    this.playSnare(now + 4.8, 0.5, 0.30);

    // Up-tempo "Rocky Top" Brass Chorus ("Rocky Top, you'll always be, home sweet home to me...")
    const rockyTopMelody = [
      { f: 293.66, t: 0.25, d: 0.20 }, // D4 ("Rock-")
      { f: 369.99, t: 0.48, d: 0.20 }, // F#4 ("-y")
      { f: 440.00, t: 0.70, d: 0.32 }, // A4 ("Top,")
      { f: 493.88, t: 1.08, d: 0.22 }, // B4 ("you'll")
      { f: 440.00, t: 1.34, d: 0.22 }, // A4 ("al-")
      { f: 369.99, t: 1.60, d: 0.28 }, // F#4 ("-ways")
      { f: 293.66, t: 1.92, d: 0.40 }, // D4 ("be,")
      { f: 329.63, t: 2.38, d: 0.22 }, // E4 ("home")
      { f: 369.99, t: 2.64, d: 0.22 }, // F#4 ("sweet")
      { f: 293.66, t: 2.90, d: 0.48 }, // D4 ("home")
      { f: 293.66, t: 3.44, d: 0.22 }, // D4 ("to")
      { f: 293.66, t: 3.70, d: 0.45 }, // D4 ("me!")
      { f: 369.99, t: 4.22, d: 0.22 }, // F#4 ("Good")
      { f: 440.00, t: 4.48, d: 0.25 }, // A4 ("ol'")
      { f: 493.88, t: 4.78, d: 0.35 }, // B4 ("Rock-")
      { f: 440.00, t: 5.18, d: 0.28 }, // A4 ("-y")
      { f: 369.99, t: 5.50, d: 0.30 }, // F#4 ("Top,")
      { f: 293.66, t: 5.85, d: 0.65 }  // D4 ("Ten-nes-see!")
    ];

    rockyTopMelody.forEach(note => {
      this.playBrassNote(note.f, now + note.t, note.d, 0.17);
    });
  }

  playByAudioKey(key) {
    if (key === 'nhl_goal_horn') this.playNhlGoalHorn();
    else if (key === 'gjallarhorn') this.playGjallarhorn();
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
    espnId: '7',
    sportPath: 'hockey/nhl',
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
    espnId: '152',
    sportPath: 'football/college-football',
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
    espnId: '16',
    sportPath: 'football/nfl',
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
  vols: {
    id: 'vols',
    name: 'Tennessee Volunteers',
    short: 'Vols',
    league: 'NCAA',
    sport: 'College Football',
    espnId: '2633',
    sportPath: 'football/college-football',
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
  matches: {},
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
  cachedHueRooms: [],
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
    btnMasterSystemToggle: document.getElementById('btn-master-system-toggle'),
    masterSystemLabel: document.getElementById('master-system-label'),
    modalSystemMaster: document.getElementById('modal-system-master'),
    btnSoundToggle: document.getElementById('btn-sound-toggle'),
    soundIcon: document.getElementById('sound-icon'),
    soundLabel: document.getElementById('sound-label'),
    btnQuickCelebrate: document.getElementById('btn-quick-celebrate'),
    btnQuickAmbient: document.getElementById('btn-quick-ambient'),

    // Scoreboard
    matchLeagueBadge: document.getElementById('match-league-badge'),
    matchBroadcastBadge: document.getElementById('match-broadcast-badge'),
    matchVenueBadge: document.getElementById('match-venue-badge'),
    matchPeriodClock: document.getElementById('match-period-clock'),
    matchDateDisplay: document.getElementById('match-date-display'),
    btnRefreshScores: document.getElementById('btn-refresh-scores'),
    liveSourceIndicator: document.getElementById('live-source-indicator'),
    liveSourceText: document.getElementById('live-source-text'),
    scoreTeamLogoWrap: document.getElementById('score-team-badge'),
    scoreTeamName: document.getElementById('score-team-name'),
    scoreTeamPts: document.getElementById('score-team-pts'),
    scoreOpponentName: document.getElementById('score-opponent-name'),
    scoreOpponentPts: document.getElementById('score-opponent-pts'),
    matchLastEvent: document.getElementById('match-last-event'),
    btnSimScoreText: document.getElementById('btn-sim-score-text'),

    // Betting Lines & Odds
    oddsSpreadVal: document.getElementById('odds-spread-val'),
    oddsOuVal: document.getElementById('odds-ou-val'),
    oddsMlVal: document.getElementById('odds-ml-val'),
    oddsProviderName: document.getElementById('odds-provider-name'),

    // Win Probability Tracker
    probTeamName: document.getElementById('prob-team-name'),
    probOppName: document.getElementById('prob-opp-name'),
    teamWinProbVal: document.getElementById('team-win-prob-val'),
    oppWinProbVal: document.getElementById('opp-win-prob-val'),
    winProbFill: document.getElementById('win-prob-fill'),

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
  if (hueTargetIdEl) {
    if (Array.isArray(hue.targetIds) && hue.targetIds.length > 0) {
      hueTargetIdEl.value = hue.targetIds.join(', ');
    } else {
      hueTargetIdEl.value = hue.targetId || '1';
    }
  }
  const hueAlertEl = document.getElementById('hue-alert-strobe');
  if (hueAlertEl) hueAlertEl.checked = !!hue.useAlertStrobe;
  const huePerBulbEl = document.getElementById('hue-per-bulb');
  if (huePerBulbEl) huePerBulbEl.checked = hue.perBulbMultiColor !== false;
  const hueStrobeEl = document.getElementById('hue-strobe-effect');
  if (hueStrobeEl) hueStrobeEl.value = hue.strobeEffect || 'alternating';
  const modalMasterEl = document.getElementById('modal-system-master');
  if (modalMasterEl) modalMasterEl.checked = state.config?.general?.systemEnabled !== false;

  if (Array.isArray(state.cachedHueRooms) && state.cachedHueRooms.length > 0) {
    renderRoomsGrid(state.cachedHueRooms);
  }

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

// Strobe Effect Helper for Virtual Fixtures
function calculateVisualizerFixtureColors({ effect = 'alternating', palette = [], step = 0 }) {
  if (!palette || palette.length === 0) palette = [[255, 255, 255]];
  const fixtures = ['pendantLeft', 'pendantRight', 'tvBacklight', 'floorLeft', 'floorRight'];
  const assignments = {};
  const len = palette.length;

  switch (effect) {
    case 'scatter': {
      fixtures.forEach((id, idx) => {
        const rand = (idx * 2 + step * 3 + Math.floor(step / 2)) % len;
        assignments[id] = palette[rand];
      });
      break;
    }
    case 'wave': {
      fixtures.forEach((id, idx) => {
        assignments[id] = palette[(idx + step) % len];
      });
      break;
    }
    case 'pulse': {
      const isBurst = step % 2 === 0;
      fixtures.forEach((id, idx) => {
        const c1 = palette[idx % 2 === 0 ? 0 : Math.min(1, len - 1)];
        const c2 = palette[idx % 2 === 0 ? Math.min(2, len - 1) : Math.min(3, len - 1)];
        assignments[id] = isBurst ? c1 : c2;
      });
      break;
    }
    case 'alternating':
    default: {
      const colorA = palette[0];
      const colorB = palette.length > 1 ? palette[1] : palette[0];
      const isEvenStep = step % 2 === 0;
      fixtures.forEach((id, idx) => {
        assignments[id] = ((idx % 2 === 0) === isEvenStep) ? colorA : colorB;
      });
      break;
    }
  }
  return assignments;
}

function applyFixtureColors(fixtures) {
  if (!fixtures) return;
  const p1 = document.getElementById('bulb-pendant-1');
  const p2 = document.getElementById('bulb-pendant-2');
  const tv = document.getElementById('tv-lightstrip-glow');
  const f1 = document.getElementById('bulb-floor-1');
  const f2 = document.getElementById('bulb-floor-2');

  if (p1 && fixtures.pendantLeft) p1.style.setProperty('--fixture-rgb', fixtures.pendantLeft.join(', '));
  if (p2 && fixtures.pendantRight) p2.style.setProperty('--fixture-rgb', fixtures.pendantRight.join(', '));
  if (tv && fixtures.tvBacklight) tv.style.setProperty('--fixture-rgb', fixtures.tvBacklight.join(', '));
  if (f1 && fixtures.floorLeft) f1.style.setProperty('--fixture-rgb', fixtures.floorLeft.join(', '));
  if (f2 && fixtures.floorRight) f2.style.setProperty('--fixture-rgb', fixtures.floorRight.join(', '));
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

  const strobeEffect = state.config?.philipsHue?.strobeEffect || 'alternating';
  const perBulb = state.config?.philipsHue?.perBulbMultiColor !== false;

  const strobeLabels = {
    alternating: '⚡ Alternating Strobe',
    scatter: '🌈 Palette Scatter',
    wave: '🌊 Chasing Wave',
    pulse: '🚨 Pulse Strobe'
  };

  const strobeBadge = document.getElementById('visualizer-strobe-badge');
  if (strobeBadge) {
    strobeBadge.textContent = strobeLabels[strobeEffect] || '⚡ Alternating Strobe';
  }

  // Multi-bulb ambient distribution on virtual fixtures when not in active celebration
  if (!state.isCelebrating) {
    if (perBulb && team?.celebration?.colors && team.celebration.colors.length > 1) {
      const c = team.celebration.colors;
      applyFixtureColors({
        pendantLeft: c[0],
        pendantRight: c[1] || c[0],
        tvBacklight: c[2] || c[0],
        floorLeft: c[1] || c[0],
        floorRight: c[0]
      });
    } else {
      const p1 = document.getElementById('bulb-pendant-1');
      const p2 = document.getElementById('bulb-pendant-2');
      const tv = document.getElementById('tv-lightstrip-glow');
      const f1 = document.getElementById('bulb-floor-1');
      const f2 = document.getElementById('bulb-floor-2');
      if (p1) p1.style.removeProperty('--fixture-rgb');
      if (p2) p2.style.removeProperty('--fixture-rgb');
      if (tv) tv.style.removeProperty('--fixture-rgb');
      if (f1) f1.style.removeProperty('--fixture-rgb');
      if (f2) f2.style.removeProperty('--fixture-rgb');
    }
  }

  const systemEnabled = state.config?.general?.systemEnabled !== false;

  if (elements.btnMasterSystemToggle) {
    if (systemEnabled) {
      elements.btnMasterSystemToggle.classList.remove('system-standby');
      elements.btnMasterSystemToggle.classList.add('system-active');
      elements.btnMasterSystemToggle.title = 'Click to pause light flashing (Standby/Away mode)';
      if (elements.masterSystemLabel) elements.masterSystemLabel.textContent = 'System Active';
    } else {
      elements.btnMasterSystemToggle.classList.remove('system-active');
      elements.btnMasterSystemToggle.classList.add('system-standby');
      elements.btnMasterSystemToggle.title = 'Click to enable light flashing on game day';
      if (elements.masterSystemLabel) elements.masterSystemLabel.textContent = 'System Standby';
    }
  }

  if (elements.modalSystemMaster) {
    elements.modalSystemMaster.checked = systemEnabled;
  }

  if (elements.statusLabel && elements.strobeModeText) {
    if (state.isCelebrating) {
      elements.statusLabel.textContent = '🚨 CELEBRATION STROBE ACTIVE';
      elements.strobeModeText.textContent = `${(strobeLabels[strobeEffect] || 'STROBE').toUpperCase()} ACTIVE`;
      elements.strobeModeText.style.color = '#ffc62f';
    } else if (!systemEnabled) {
      elements.statusLabel.textContent = '⏸️ System Standby (Lights Muted)';
      elements.strobeModeText.textContent = 'STANDBY / AWAY';
      elements.strobeModeText.style.color = '#fbbf24';
    } else {
      const modeSuffix = state.isStandalone ? ' (Standalone)' : '';
      elements.statusLabel.textContent = `Lights Armed: ${team?.name || 'Canes'}${modeSuffix}`;
      elements.strobeModeText.textContent = perBulb ? 'MULTI-BULB AMBIENT' : 'LIGHTS ARMED';
      elements.strobeModeText.style.color = 'var(--team-primary)';
    }
  }
}

// Helper: Format game date & time
function formatGameDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' +
           d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch (e) {
    return dateStr;
  }
}

// Render scoreboard
function renderScoreboard() {
  const team = state.teams[state.activeTeam];
  const m = state.match;
  if (!team || !m) return;

  const teamIcons = { canes: '🌀', wolfpack: '🐺', vikings: '⚔️', vols: '🍊' };
  const oppIcons = {
    'New York Rangers': '🗽', 'Green Bay Packers': '🧀', 'North Carolina Tar Heels': '🐏',
    'Manchester City': '⛵', 'Alabama Crimson Tide': '🐘', 'Kennesaw State Owls': '🦉',
    'Chicago Bears': '🐻', 'Vanderbilt Commodores': '⚓', 'Florida Panthers': '🐆',
    'Newcastle United': '🏰'
  };

  if (elements.matchLeagueBadge) elements.matchLeagueBadge.textContent = `${team.league} • ${team.sport.toUpperCase()}`;

  // Game state styling & clock
  const isLive = m.isLive || m.gameState === 'in' || m.status === 'LIVE';
  const isFinal = m.gameState === 'post' || m.status === 'FINAL';
  const isScheduled = !isLive && !isFinal;

  if (elements.matchPeriodClock) {
    if (isLive) {
      elements.matchPeriodClock.innerHTML = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#ef4444;margin-right:5px;box-shadow:0 0 6px #ef4444;"></span>LIVE • ${m.period || ''} ${m.clock || ''}`;
      elements.matchPeriodClock.style.background = 'rgba(239, 68, 68, 0.2)';
      elements.matchPeriodClock.style.borderColor = '#ef4444';
      elements.matchPeriodClock.style.color = '#fca5a5';
    } else if (isFinal) {
      elements.matchPeriodClock.textContent = `FINAL (${m.period || 'Final'})`;
      elements.matchPeriodClock.style.background = 'rgba(100, 116, 139, 0.2)';
      elements.matchPeriodClock.style.borderColor = 'rgba(148, 163, 184, 0.4)';
      elements.matchPeriodClock.style.color = '#cbd5e1';
    } else {
      elements.matchPeriodClock.textContent = m.statusDetail || 'Upcoming';
      elements.matchPeriodClock.style.background = 'rgba(245, 158, 11, 0.15)';
      elements.matchPeriodClock.style.borderColor = 'rgba(245, 158, 11, 0.4)';
      elements.matchPeriodClock.style.color = '#fde68a';
    }
  }

  // Date Display
  if (elements.matchDateDisplay) {
    if (isLive) {
      elements.matchDateDisplay.textContent = '🔥 Game In Progress Right Now';
      elements.matchDateDisplay.style.color = '#f87171';
    } else if (isFinal) {
      elements.matchDateDisplay.textContent = `🏁 Final Score • ${m.gameDate ? formatGameDate(m.gameDate) : 'Completed'}`;
      elements.matchDateDisplay.style.color = '#94a3b8';
    } else if (m.gameDate) {
      elements.matchDateDisplay.textContent = `🗓️ Kickoff: ${formatGameDate(m.gameDate)}`;
      elements.matchDateDisplay.style.color = '#fbbf24';
    } else {
      elements.matchDateDisplay.textContent = '🗓️ Upcoming Game';
      elements.matchDateDisplay.style.color = '#fbbf24';
    }
  }

  // TV Broadcast badge
  if (elements.matchBroadcastBadge) {
    if (m.broadcast && m.broadcast !== 'TBD') {
      elements.matchBroadcastBadge.textContent = `📺 ${m.broadcast}`;
      elements.matchBroadcastBadge.style.display = 'inline-block';
    } else {
      elements.matchBroadcastBadge.style.display = 'none';
    }
  }

  // Venue badge
  if (elements.matchVenueBadge) {
    if (m.venue && m.venue !== 'TBD') {
      elements.matchVenueBadge.textContent = `🏟️ ${m.venue}`;
      elements.matchVenueBadge.style.display = 'inline-block';
    } else {
      elements.matchVenueBadge.style.display = 'none';
    }
  }

  // Source indicator text
  if (elements.liveSourceText) {
    const timeStr = m.lastUpdated ? new Date(m.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    elements.liveSourceText.textContent = `${m.source || 'ESPN Live Feed'}${timeStr ? ' · ' + timeStr : ''}`;
  }

  // Home / Away indicator tags
  const homeTag = document.querySelector('.home-side .score-team-tag');
  const awayTag = document.querySelector('.away-side .score-team-tag');
  if (homeTag && awayTag) {
    if (m.homeAway === 'away') {
      homeTag.textContent = 'AWAY';
      awayTag.textContent = 'HOME';
    } else {
      homeTag.textContent = 'HOME';
      awayTag.textContent = 'AWAY';
    }
  }

  // Team details
  if (elements.scoreTeamLogoWrap) {
    if (m.teamLogo) {
      elements.scoreTeamLogoWrap.innerHTML = `<img src="${m.teamLogo}" alt="${team.name}" style="width:28px;height:28px;object-fit:contain;vertical-align:middle;">`;
    } else {
      elements.scoreTeamLogoWrap.textContent = teamIcons[team.id] || '🏆';
    }
  }
  if (elements.scoreTeamName) elements.scoreTeamName.textContent = team.name;

  // Score display: For scheduled games with 0-0, display '-' unless user simulated score
  if (elements.scoreTeamPts) {
    if (isScheduled && m.scoreTeam === 0 && m.scoreOpponent === 0) {
      elements.scoreTeamPts.textContent = '-';
    } else {
      elements.scoreTeamPts.textContent = m.scoreTeam ?? 0;
    }
  }

  if (elements.scoreOpponentName) elements.scoreOpponentName.textContent = m.opponent || 'Opponent';
  if (elements.scoreOpponentPts) {
    if (isScheduled && m.scoreTeam === 0 && m.scoreOpponent === 0) {
      elements.scoreOpponentPts.textContent = '-';
    } else {
      elements.scoreOpponentPts.textContent = m.scoreOpponent ?? 0;
    }
  }

  const oppBadge = document.getElementById('score-opponent-badge');
  if (oppBadge) {
    if (m.opponentLogo) {
      oppBadge.innerHTML = `<img src="${m.opponentLogo}" alt="${m.opponent}" style="width:28px;height:28px;object-fit:contain;vertical-align:middle;">`;
    } else {
      oppBadge.textContent = oppIcons[m.opponent] || '🛡️';
    }
  }

  if (elements.matchLastEvent) elements.matchLastEvent.textContent = m.lastEvent || 'Game in progress';

  // Betting Lines & Odds
  if (elements.oddsSpreadVal) {
    elements.oddsSpreadVal.textContent = m.odds?.details || '--';
  }
  if (elements.oddsOuVal) {
    elements.oddsOuVal.textContent = m.odds?.overUnder ? `O/U ${m.odds.overUnder}` : '--';
  }
  if (elements.oddsMlVal) {
    let mlText = '--';
    if (m.homeAway === 'home' && m.odds?.moneyLineHome) {
      mlText = m.odds.moneyLineHome;
    } else if (m.homeAway === 'away' && m.odds?.moneyLineAway) {
      mlText = m.odds.moneyLineAway;
    } else if (m.odds?.moneyLineHome || m.odds?.moneyLineAway) {
      mlText = m.odds.moneyLineHome || m.odds.moneyLineAway;
    }
    elements.oddsMlVal.textContent = mlText;
  }
  if (elements.oddsProviderName) {
    elements.oddsProviderName.textContent = m.odds?.provider || 'DraftKings';
  }

  // Win Probability
  const teamWinProb = typeof m.winProbability === 'number' ? m.winProbability : (m.pregameWinProbability || 50.0);
  const oppWinProb = Math.round((100 - teamWinProb) * 10) / 10;

  if (elements.probTeamName) elements.probTeamName.textContent = team.short.toUpperCase();
  if (elements.probOppName) elements.probOppName.textContent = (m.opponentShort || 'OPP').toUpperCase();
  if (elements.teamWinProbVal) elements.teamWinProbVal.textContent = `${teamWinProb.toFixed(1)}%`;
  if (elements.oppWinProbVal) elements.oppWinProbVal.textContent = `${oppWinProb.toFixed(1)}%`;

  if (elements.winProbFill) {
    const clampedWidth = Math.max(2, Math.min(98, teamWinProb));
    elements.winProbFill.style.width = `${clampedWidth}%`;
  }

  if (elements.screenTeamIcon) elements.screenTeamIcon.textContent = teamIcons[team.id] || '🏆';
  if (elements.screenMatchupText) elements.screenMatchupText.textContent = `${team.short.toUpperCase()} VS ${m.opponentShort || 'OPP'}`;
  if (elements.screenClockText) {
    if (isLive) {
      elements.screenClockText.textContent = `${m.period || ''} ${m.clock || ''}`;
    } else if (isFinal) {
      elements.screenClockText.textContent = 'FINAL';
    } else {
      elements.screenClockText.textContent = m.period || 'Upcoming';
    }
  }

  if (elements.btnSimScoreText) {
    const isFootball = team.id === 'vikings' || team.id === 'wolfpack' || team.id === 'vols';
    elements.btnSimScoreText.textContent = isFootball ? '+ Touchdown (+6)' : '+ Goal (+1)';
  }
}

// Dynamically update team selector cards with real dates & opponents
function updateTeamCardsSchedule() {
  Object.keys(state.teams).forEach(teamId => {
    const card = document.getElementById(`card-${teamId}`);
    if (!card) return;

    const oppEl = card.querySelector('.match-opponent-text');
    if (!oppEl) return;

    const m = state.matches[teamId];
    if (!m) return;

    const prefix = m.homeAway === 'away' ? 'at' : 'vs';
    const opp = m.opponentShort || m.opponent || 'Opponent';

    if (m.isLive || m.gameState === 'in' || m.status === 'LIVE') {
      oppEl.innerHTML = `<span style="color:#ef4444;font-weight:700;">🔴 LIVE:</span> ${prefix} ${opp} (${m.scoreTeam}-${m.scoreOpponent})`;
    } else if (m.gameState === 'post' || m.status === 'FINAL') {
      oppEl.textContent = `Final: ${prefix} ${opp} (${m.scoreTeam}-${m.scoreOpponent})`;
    } else if (m.gameDate) {
      try {
        const d = new Date(m.gameDate);
        const dayStr = d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
        const timeStr = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
        oppEl.textContent = `${dayStr} · ${prefix} ${opp} (${timeStr})`;
      } catch (e) {
        oppEl.textContent = `${prefix} ${opp}`;
      }
    } else {
      oppEl.textContent = `${prefix} ${opp}`;
    }
  });
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

function triggerCelebrationDisplay(data = {}) {
  if (!elements.celebrationOverlay) return;
  elements.celebrationOverlay.classList.remove('hidden');

  const durMs = data.durationMs || (state.config?.general?.celebrationDurationSeconds || 10) * 1000;
  const durSec = durMs / 1000;

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
        elements.celebrationProgressBar.style.transition = `width ${durSec}s linear`;
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
  }, durMs);
}

function hideCelebrationDisplay() {
  if (celebrationTimeout) {
    clearTimeout(celebrationTimeout);
    celebrationTimeout = null;
  }
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

  const systemEnabled = state.config?.general?.systemEnabled !== false;
  if (!systemEnabled) {
    if (elements.matchLastEvent) {
      const orig = elements.matchLastEvent.textContent;
      elements.matchLastEvent.textContent = `⏸️ Score Event (${eventName}) — Light flashing suppressed (System in Standby)`;
      elements.matchLastEvent.style.color = '#fbbf24';
      setTimeout(() => {
        if (elements.matchLastEvent) {
          elements.matchLastEvent.textContent = orig;
          elements.matchLastEvent.style.color = '';
        }
      }, 4000);
    }
    return;
  }

  state.isCelebrating = true;
  updateThemeColors();

  const durationMs = (state.config?.general?.celebrationDurationSeconds || 10) * 1000;

  triggerCelebrationDisplay({
    celebrationTitle: team.celebration?.celebrationTitle || 'GOAL!',
    celebrationTagline: team.celebration?.celebrationTagline || 'CELEBRATION!',
    audioKey: team.celebration?.audioKey,
    durationMs,
    scoreEvent: { type: eventName }
  });

  if (localFlashInterval) clearInterval(localFlashInterval);
  let step = 0;
  const colors = team.celebration?.colors || [[255, 0, 0], [255, 255, 255]];
  const intervalMs = team.celebration?.flashIntervalMs || 250;

  // Non-repeating random color selector from team celebration colors
  let lastColorIdx = -1;
  const getNextRandomColor = () => {
    if (!colors || colors.length === 0) return [255, 255, 255];
    if (colors.length === 1) return colors[0];
    let nextIdx;
    do {
      nextIdx = Math.floor(Math.random() * colors.length);
    } while (nextIdx === lastColorIdx);
    lastColorIdx = nextIdx;
    return colors[nextIdx];
  };

  const strobeEffect = state.config?.philipsHue?.strobeEffect || 'alternating';
  const perBulb = state.config?.philipsHue?.perBulbMultiColor !== false;

  const updateFlashFrame = () => {
    state.currentRgb = getNextRandomColor();
    if (perBulb && colors.length > 1) {
      const fixtureColors = calculateVisualizerFixtureColors({
        effect: strobeEffect,
        palette: colors,
        step
      });
      applyFixtureColors(fixtureColors);
    }
    updateThemeColors();
  };

  // Immediate first flash
  updateFlashFrame();

  localFlashInterval = setInterval(() => {
    step++;
    updateFlashFrame();
  }, intervalMs);

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
    if (state.matches && state.matches[teamId]) {
      state.match = state.matches[teamId];
    } else if (state.isStandalone || !state.match || state.match.teamId !== teamId) {
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
        state.matches[teamId] = data.match;
        renderScoreboard();
        updateTeamCardsSchedule();
      }
    } catch (err) {
      state.isStandalone = true;
    }
  } else {
    state.isStandalone = true;
    // On standalone / GitHub Pages, fetch ESPN schedule directly if not yet cached
    if (!state.matches || !state.matches[teamId] || state.matches[teamId].source !== 'ESPN Live Sports') {
      fetchEspnDirectForTeam(teamId).then(m => {
        if (m) {
          state.matches[teamId] = m;
          if (state.activeTeam === teamId) {
            state.match = m;
            renderScoreboard();
          }
          updateTeamCardsSchedule();
        }
      });
    }
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
        if (data.matches) {
          state.matches = data.matches;
          if (state.matches[state.activeTeam]) {
            state.match = state.matches[state.activeTeam];
          }
          updateTeamCardsSchedule();
        }
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

    evtSource.addEventListener('matches_update', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.matches) {
          state.matches = data.matches;
          if (state.matches[state.activeTeam]) {
            state.match = state.matches[state.activeTeam];
          }
          renderScoreboard();
          updateTeamCardsSchedule();
        }
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
            philipsHue: { ...state.config.philipsHue, ...(data.config.philipsHue || {}) },
            general: { ...state.config.general, ...(data.config.general || {}) }
          };
          try {
            localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(state.config));
          } catch (err) {}
          renderConfigForms();
          updateThemeColors();
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

        if (typeof data.systemEnabled === 'boolean') {
          if (!state.config) state.config = {};
          if (!state.config.general) state.config.general = {};
          state.config.general.systemEnabled = data.systemEnabled;
        }

        if (data.newLog) {
          state.logs.unshift(data.newLog);
          renderLogs();
        }

        if (data.celebrationStarted) {
          triggerCelebrationDisplay(data);
        }

        if (data.fixtureColors) {
          applyFixtureColors(data.fixtureColors);
        }

        if (data.strobeEffect && state.config?.philipsHue) {
          state.config.philipsHue.strobeEffect = data.strobeEffect;
        }

        if ((data.isCelebrating === false || data.celebrationEnded) && elements.celebrationOverlay && !elements.celebrationOverlay.classList.contains('hidden')) {
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

// ==========================================================================
// Settings Modal & Hue Rooms Controller (Top-Level Scope)
// ==========================================================================
function openSettingsModal(targetTab = null) {
  const settingsModal = document.getElementById('settings-modal');
  if (!settingsModal) return;
  settingsModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  if (targetTab) {
    const tabBtn = document.querySelector(`.tab-btn[data-tab="${targetTab}"]`);
    if (tabBtn) tabBtn.click();
  }

  if (Array.isArray(state.cachedHueRooms) && state.cachedHueRooms.length === 0) {
    if (state.config?.philipsHue?.bridgeIp && state.config?.philipsHue?.username) {
      fetchHueRooms();
    }
  }
}

function closeSettingsModal() {
  const settingsModal = document.getElementById('settings-modal');
  if (!settingsModal) return;
  settingsModal.classList.add('hidden');
  document.body.style.overflow = '';
}

function getCurrentlySelectedTargetIds() {
  const rawInput = (document.getElementById('hue-target-id')?.value || '').trim();
  if (rawInput) {
    return [...new Set(rawInput.split(/[, ]+/).filter(Boolean))];
  }
  if (Array.isArray(state.config?.philipsHue?.targetIds) && state.config.philipsHue.targetIds.length > 0) {
    return state.config.philipsHue.targetIds.map(String);
  }
  if (state.config?.philipsHue?.targetId) {
    return [String(state.config.philipsHue.targetId)];
  }
  return ['1'];
}

function renderRoomsGrid(rooms) {
  const grid = document.getElementById('hue-rooms-grid');
  if (!grid) return;
  if (!rooms || rooms.length === 0) {
    grid.innerHTML = `
      <div class="rooms-placeholder" style="grid-column: 1 / -1; padding: 0.8rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; border: 1px dashed rgba(255,255,255,0.15); border-radius: 8px;">
        No rooms found. Check your Bridge IP and Username.
      </div>
    `;
    grid.style.display = 'block';
    return;
  }

  state.cachedHueRooms = rooms;
  const selectedIds = getCurrentlySelectedTargetIds();

  grid.innerHTML = rooms.map(r => {
    const isSelected = selectedIds.includes(String(r.id));
    const lightCount = Array.isArray(r.lights) ? r.lights.length : 0;
    return `
      <div class="hue-room-card ${isSelected ? 'selected' : ''}" data-room-id="${r.id}">
        <input type="checkbox" class="hue-room-checkbox" value="${r.id}" ${isSelected ? 'checked' : ''}>
        <div class="hue-room-details">
          <span class="hue-room-title">${escapeHtml(r.name)}</span>
          <span class="hue-room-meta">
            <span>${escapeHtml(r.type || 'Room')}</span>
            <span class="hue-room-badge">ID: ${r.id}</span>
            ${lightCount > 0 ? `<span class="hue-room-badge">${lightCount} 💡</span>` : ''}
          </span>
        </div>
      </div>
    `;
  }).join('');

  grid.style.display = 'grid';

  // Add click listeners to cards and checkboxes
  grid.querySelectorAll('.hue-room-card').forEach(card => {
    card.addEventListener('click', async (e) => {
      const checkbox = card.querySelector('.hue-room-checkbox');
      if (e.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
      }
      card.classList.toggle('selected', checkbox.checked);

      // Gather all selected IDs
      const checkedCards = grid.querySelectorAll('.hue-room-checkbox:checked');
      let newSelectedIds = Array.from(checkedCards).map(cb => cb.value);

      const targetEl = document.getElementById('hue-target-id');
      if (targetEl) {
        targetEl.value = newSelectedIds.join(', ');
      }

      const typeEl = document.getElementById('hue-target-type');
      if (typeEl) typeEl.value = 'group';

      await saveConfig({
        philipsHue: {
          ...state.config.philipsHue,
          targetType: 'group',
          targetId: newSelectedIds.join(', '),
          targetIds: newSelectedIds
        }
      });
    });
  });
}

function populateRoomsDropdown(rooms) {
  renderRoomsGrid(rooms);
}

async function fetchHueRooms(arg = false) {
  const isExplicitClick = arg === true || (arg && typeof arg === 'object' && arg.type === 'click');
  const ipEl = document.getElementById('hue-ip');
  const userEl = document.getElementById('hue-user');
  const ip = (ipEl?.value || state.config.philipsHue?.bridgeIp || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const username = (userEl?.value || state.config.philipsHue?.username || '').trim();
  const btnFetchRooms = document.getElementById('btn-fetch-rooms');

  if (!username) {
    if (isExplicitClick) {
      alert('Please enter or pair your Hue API App Key / Username first.');
    }
    return;
  }

  if (!isLocalEnvironment()) {
    if (!isExplicitClick) return; // Don't pop prompt on initial background load in hosted env
    const userChoice = prompt(
      `🌐 On GitHub Pages, web browsers block connecting directly to local Wi-Fi devices.\n\n` +
      `Options to load your rooms:\n\n` +
      `1. Open http://localhost:3300 in your browser (all rooms load automatically in 1 click!)\n\n` +
      `2. Or in Terminal run:\ncurl -s http://${ip || '<IP>'}/api/${username}/groups\n\n` +
      `Paste that command's JSON output below to load the dropdown right now:`
    );
    if (userChoice && userChoice.trim()) {
      try {
        const groups = JSON.parse(userChoice.trim());
        const rooms = [];
        if (typeof groups === 'object' && !groups.error) {
          for (const [id, grp] of Object.entries(groups)) {
            rooms.push({ id: String(id), name: grp.name, type: grp.type || 'Room', lights: grp.lights || [] });
          }
        }
        if (rooms.length > 0) {
          populateRoomsDropdown(rooms);
          alert(`✅ Successfully loaded ${rooms.length} rooms!`);
          return;
        }
      } catch (parseErr) {
        alert('Could not parse JSON. You can also just type your room numbers directly into "Target ID" (e.g. 1, 81).');
      }
    }
    return;
  }

  // Local Mac Server flow
  if (btnFetchRooms) btnFetchRooms.textContent = '⏳ Loading...';
  try {
    const url = `/api/hue/rooms?bridgeIp=${encodeURIComponent(ip)}&username=${encodeURIComponent(username)}`;
    const res = await safeFetchJson(url);
    if (res.ok && res.data && res.data.rooms && res.data.rooms.length > 0) {
      populateRoomsDropdown(res.data.rooms);
      if (btnFetchRooms) btnFetchRooms.textContent = '✅ Loaded!';
      setTimeout(() => { if (btnFetchRooms) btnFetchRooms.textContent = '🔄 Load / Refresh Rooms'; }, 2500);
    } else {
      const msg = res.data?.error || res.error || 'Could not reach bridge';
      if (isExplicitClick) {
        alert(`Could not load rooms: ${msg}\nEnsure your Hue Bridge IP and Username are correct.`);
      } else {
        console.warn(`[Hue] Background room fetch notice: ${msg}`);
      }
      if (btnFetchRooms) btnFetchRooms.textContent = '🔄 Load / Refresh Rooms';
    }
  } catch (e) {
    if (btnFetchRooms) btnFetchRooms.textContent = '🔄 Load / Refresh Rooms';
  }
}

// Attach globally for inline HTML handlers & debugging
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.renderRoomsGrid = renderRoomsGrid;
window.fetchHueRooms = fetchHueRooms;

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

  // Master System Toggle Controller
  async function toggleMasterSystem(explicitVal = null) {
    const current = state.config?.general?.systemEnabled !== false;
    const targetVal = explicitVal !== null ? !!explicitVal : !current;
    if (!state.config) state.config = {};
    if (!state.config.general) state.config.general = {};
    state.config.general.systemEnabled = targetVal;

    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(state.config));
    } catch (e) {}

    updateThemeColors();

    try {
      const res = await fetch('/api/system/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemEnabled: targetVal })
      });
      const data = await res.json();
      if (data.success && typeof data.systemEnabled === 'boolean') {
        state.config.general.systemEnabled = data.systemEnabled;
        updateThemeColors();
      }
    } catch (err) {
      // Standalone / offline fallback
    }
  }

  // Master System Toggle Button
  if (elements.btnMasterSystemToggle) {
    elements.btnMasterSystemToggle.addEventListener('click', () => {
      toggleMasterSystem();
    });
  }

  // Modal Master System Toggle
  if (elements.modalSystemMaster) {
    elements.modalSystemMaster.addEventListener('change', (e) => {
      toggleMasterSystem(e.target.checked);
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

  // Refresh Live Scores from ESPN
  if (elements.btnRefreshScores) {
    elements.btnRefreshScores.addEventListener('click', () => {
      fetchLiveSports(true);
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
        const data = await res.json();
        if (data.match) {
          state.match = data.match;
          renderScoreboard();
        }
      } catch (err) {
        if (state.match) {
          state.match.scoreTeam = (state.match.scoreTeam || 0) + pts;
          state.match.lastEvent = `${evtName} scored (+${pts} pts)`;
          state.match.winProbability = calculateClientWinProb(state.match, state.teams[state.activeTeam]);
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
        const data = await res.json();
        if (data.match) {
          state.match = data.match;
          renderScoreboard();
        }
      } catch (err) {
        if (state.match) {
          state.match.scoreTeam = (state.match.scoreTeam || 0) + 6;
          state.match.lastEvent = `TOUCHDOWN scored (+6 pts)`;
          state.match.winProbability = calculateClientWinProb(state.match, state.teams[state.activeTeam]);
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
        const data = await res.json();
        if (data.match) {
          state.match = data.match;
          renderScoreboard();
        }
      } catch (err) {
        if (state.match) {
          state.match.scoreOpponent = (state.match.scoreOpponent || 0) + 1;
          state.match.lastEvent = `OPPONENT SCORE (+1 pt)`;
          state.match.winProbability = calculateClientWinProb(state.match, state.teams[state.activeTeam]);
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
        const data = await res.json();
        if (data.match) {
          state.match = data.match;
          renderScoreboard();
        }
      } catch (err) {
        const team = state.teams[state.activeTeam];
        if (team) {
          state.match = JSON.parse(JSON.stringify(team.defaultMatch));
          state.match.winProbability = state.match.pregameWinProbability || 50.0;
          renderScoreboard();
          runLocalAmbient(state.activeTeam);
        }
      }
    });
  }

  // ==========================================================================
  // Settings & Integrations Modal Controller
  // ==========================================================================
  const settingsModal = document.getElementById('settings-modal');
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const btnOpenSettingsFooter = document.getElementById('btn-open-settings-footer');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const statusIndicator = document.getElementById('system-status-indicator');

  if (btnOpenSettings) {
    btnOpenSettings.addEventListener('click', (e) => {
      e.preventDefault();
      openSettingsModal();
    });
  }

  if (btnOpenSettingsFooter) {
    btnOpenSettingsFooter.addEventListener('click', (e) => {
      e.preventDefault();
      openSettingsModal();
    });
  }

  if (btnCloseSettings) {
    btnCloseSettings.addEventListener('click', (e) => {
      e.preventDefault();
      closeSettingsModal();
    });
  }

  if (statusIndicator) {
    statusIndicator.style.cursor = 'pointer';
    statusIndicator.title = 'Click to open Setup & Settings';
    statusIndicator.addEventListener('click', (e) => {
      e.preventDefault();
      openSettingsModal();
    });
  }

  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        closeSettingsModal();
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && settingsModal && !settingsModal.classList.contains('hidden')) {
      closeSettingsModal();
    }
  });

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

        if (tabId === 'tab-philips-hue' && Array.isArray(state.cachedHueRooms) && state.cachedHueRooms.length === 0) {
          fetchHueRooms();
        }
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
      const useAlertStrobe = document.getElementById('hue-alert-strobe')?.checked ?? false;
      const perBulbMultiColor = document.getElementById('hue-per-bulb') ? document.getElementById('hue-per-bulb').checked : true;
      const strobeEffect = document.getElementById('hue-strobe-effect')?.value || 'alternating';
      const enabled = document.getElementById('hue-enabled')?.checked ?? true;
      const targetIds = targetId.split(/[, ]+/).filter(Boolean);
      const updatedHue = {
        enabled,
        bridgeIp,
        username,
        targetType,
        targetId,
        targetIds: targetIds.length > 0 ? targetIds : ['1'],
        useAlertStrobe,
        perBulbMultiColor,
        strobeEffect
      };

      await saveConfig({ philipsHue: updatedHue });
      renderConfigForms();
      alert(`✅ Philips Hue settings saved!\n\nBridge IP: ${bridgeIp || '(none entered)'}\nTarget(s): ${targetType} ${targetIds.join(', ')}`);
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



  // Manual Target ID input synchronization
  const targetIdInput = document.getElementById('hue-target-id');
  if (targetIdInput) {
    targetIdInput.addEventListener('change', async () => {
      const selectedIds = getCurrentlySelectedTargetIds();
      const grid = document.getElementById('hue-rooms-grid');
      if (grid) {
        grid.querySelectorAll('.hue-room-card').forEach(card => {
          const id = card.getAttribute('data-room-id');
          const isSel = selectedIds.includes(String(id));
          card.classList.toggle('selected', isSel);
          const cb = card.querySelector('.hue-room-checkbox');
          if (cb) cb.checked = isSel;
        });
      }
      await saveConfig({
        philipsHue: {
          ...state.config.philipsHue,
          targetId: targetIdInput.value,
          targetIds: selectedIds
        }
      });
    });
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
    vikings: { team: 'vikings', event: 'TOUCHDOWN', player: 'Justin Jefferson', scoreTeam: 31, scoreOpponent: 17 }
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

// Calculate live win probability client-side
function calculateClientWinProb(match, team) {
  if (!match) return 50.0;
  if (match.gameState === 'post' || match.status === 'FINAL') {
    if (match.scoreTeam > match.scoreOpponent) return 100.0;
    if (match.scoreTeam < match.scoreOpponent) return 0.0;
    return 50.0;
  }
  const scoreDiff = (match.scoreTeam || 0) - (match.scoreOpponent || 0);
  const sport = (team?.sport || match.sport || '').toLowerCase();
  const isFootball = sport.includes('football');
  const isSoccer = sport.includes('soccer') || sport.includes('epl');
  const isHockey = sport.includes('hockey');

  let scale = 14.0;
  if (isSoccer) scale = 2.2;
  else if (isHockey) scale = 3.0;

  const pregameProb = typeof match.pregameWinProbability === 'number' ? match.pregameWinProbability : 50.0;
  const clampedP0 = Math.max(0.01, Math.min(0.99, pregameProb / 100.0));
  const logOdds0 = Math.log(clampedP0 / (1.0 - clampedP0));

  let periodNum = 2;
  if (typeof match.period === 'string') {
    const matchPeriod = match.period.match(/\d+/);
    if (matchPeriod) periodNum = parseInt(matchPeriod[0], 10);
  }
  const maxPeriods = isFootball ? 4 : (isHockey ? 3 : 2);
  const timeProgress = Math.min(1.0, Math.max(0.2, periodNum / maxPeriods));

  const scoreLogOdds = (scoreDiff / scale) * 4.0;
  const blendedLogOdds = logOdds0 * (1.0 - timeProgress * 0.75) + scoreLogOdds * (0.5 + timeProgress * 0.8);

  const prob = 1.0 / (1.0 + Math.exp(-blendedLogOdds));
  return Math.round(Math.max(0.1, Math.min(99.9, prob * 100)) * 10) / 10;
}

// Client-side ESPN parser for GitHub Pages or remote standalone operation
async function fetchEspnDirectForTeam(teamId) {
  const team = state.teams[teamId];
  if (!team || !team.sportPath || !team.espnId) return null;

  try {
    const schedUrl = `https://site.api.espn.com/apis/site/v2/sports/${team.sportPath}/teams/${team.espnId}/schedule`;
    const res = await fetch(schedUrl);
    if (!res.ok) return null;

    const data = await res.json();
    const events = data.events || [];
    if (events.length === 0) return null;

    // Prioritize: 1. In-progress ('in'), 2. Next upcoming ('pre'), 3. Most recent completed ('post')
    let event = events.find(e => e.competitions?.[0]?.status?.type?.state === 'in');
    if (!event) {
      event = events.find(e => e.competitions?.[0]?.status?.type?.state === 'pre');
    }
    if (!event) {
      const completed = events.filter(e => e.competitions?.[0]?.status?.type?.state === 'post');
      if (completed.length > 0) event = completed[completed.length - 1];
    }
    if (!event) return null;

    const comp = event.competitions?.[0] || {};
    const compState = comp.status?.type?.state || 'pre';
    const isLive = compState === 'in';

    const teamComp = comp.competitors?.find(c =>
      String(c.team?.id) === String(team.espnId) ||
      (c.team?.displayName && c.team.displayName.toLowerCase().includes(team.short.toLowerCase()))
    ) || comp.competitors?.[0];
    const oppComp = comp.competitors?.find(c => c !== teamComp) || comp.competitors?.[1];

    const homeAway = teamComp?.homeAway || 'home';
    const statusType = isLive ? 'LIVE' : (compState === 'post' ? 'FINAL' : 'SCHEDULED');
    const rawScoreTeam = teamComp?.score?.value ?? (teamComp?.score?.displayValue ? parseInt(teamComp.score.displayValue, 10) : null);
    const rawScoreOpp = oppComp?.score?.value ?? (oppComp?.score?.displayValue ? parseInt(oppComp.score.displayValue, 10) : null);

    const venueName = comp.venue?.fullName || 'TBD';
    const venueCity = comp.venue?.address?.city ? ` (${comp.venue.address.city})` : '';
    const venue = `${venueName}${venueCity}`;

    const broadcast = comp.broadcasts?.[0]?.media?.shortName ||
                      comp.broadcasts?.[0]?.names?.[0] ||
                      'TBD';

    const detail = comp.status?.type?.detail || comp.status?.type?.description || 'Upcoming';
    let period = 'Upcoming';
    let clock = 'Pregame';

    if (isLive) {
      period = comp.status?.period ? (team.sport.includes('Football') ? `Q${comp.status.period}` : `Period ${comp.status.period}`) : 'Live';
      clock = comp.status?.displayClock || 'Live';
    } else if (compState === 'post') {
      period = 'Final';
      clock = 'Final';
    } else {
      period = 'Upcoming';
      clock = detail;
    }

    let lastEventText = '';
    if (isLive) {
      lastEventText = comp.situation?.lastPlay?.text || `LIVE: ${team.short} ${rawScoreTeam ?? 0} - ${rawScoreOpp ?? 0} ${oppComp?.team?.abbreviation || 'OPP'}`;
    } else if (compState === 'post') {
      lastEventText = `FINAL: ${teamComp?.team?.shortDisplayName || team.short} ${rawScoreTeam ?? 0}, ${oppComp?.team?.shortDisplayName || 'OPP'} ${rawScoreOpp ?? 0}`;
    } else {
      lastEventText = `Upcoming Matchup: ${event.name} • ${detail}`;
    }

    // Query ESPN summary for live betting lines and predictor
    let summaryData = null;
    if (team.sportPath && event.id) {
      try {
        const sumUrl = `https://site.api.espn.com/apis/site/v2/sports/${team.sportPath}/summary?event=${event.id}`;
        const sumRes = await fetch(sumUrl);
        if (sumRes.ok) summaryData = await sumRes.json();
      } catch (sumErr) {}
    }

    // Odds
    const pick = summaryData?.pickcenter?.[0] || comp.odds?.[0];
    const oddsDetails = pick?.details || 'Even';
    const overUnder = pick?.overUnder !== undefined ? pick.overUnder : null;
    const spreadVal = pick?.spread !== undefined ? pick.spread : null;
    const providerName = pick?.provider?.name || 'DraftKings';
    const mlHome = pick?.homeTeamOdds?.moneyLine || null;
    const mlAway = pick?.awayTeamOdds?.moneyLine || null;

    // Win Probability
    let pregameWinProbability = 50.0;
    if (summaryData?.predictor) {
      const homeProj = parseFloat(summaryData.predictor.homeTeam?.gameProjection);
      const awayProj = parseFloat(summaryData.predictor.awayTeam?.gameProjection);
      if (homeAway === 'home' && !isNaN(homeProj)) {
        pregameWinProbability = homeProj;
      } else if (homeAway === 'away' && !isNaN(awayProj)) {
        pregameWinProbability = awayProj;
      }
    } else if (spreadVal !== null) {
      const isFavored = (homeAway === 'home' && spreadVal < 0) || (homeAway === 'away' && spreadVal > 0);
      const absSpread = Math.abs(spreadVal);
      const calcP = 1.0 / (1.0 + Math.pow(10, (isFavored ? -absSpread : absSpread) / 14));
      pregameWinProbability = Math.round(calcP * 1000) / 10;
    }

    let winProbability = pregameWinProbability;
    if (compState === 'post') {
      winProbability = (rawScoreTeam > rawScoreOpp) ? 100.0 : ((rawScoreTeam < rawScoreOpp) ? 0.0 : 50.0);
    } else if (isLive) {
      if (summaryData?.winprobability && summaryData.winprobability.length > 0) {
        const lastWp = summaryData.winprobability[summaryData.winprobability.length - 1];
        const homeWp = lastWp.homeWinPercentage;
        if (typeof homeWp === 'number') {
          winProbability = homeAway === 'home' ? Math.round(homeWp * 1000) / 10 : Math.round((1 - homeWp) * 1000) / 10;
        }
      } else {
        winProbability = calculateClientWinProb({
          scoreTeam: rawScoreTeam,
          scoreOpponent: rawScoreOpp,
          period,
          pregameWinProbability,
          gameState: compState
        }, team);
      }
    }

    const matchObj = {
      teamId,
      teamName: team.name,
      teamShort: team.short,
      sport: team.sport,
      league: team.league,
      status: statusType,
      gameState: compState,
      statusDetail: detail,
      period,
      clock,
      gameDate: event.date || null,
      opponent: oppComp?.team?.displayName || team.defaultMatch.opponent,
      opponentShort: oppComp?.team?.abbreviation || oppComp?.team?.shortDisplayName || team.defaultMatch.opponentShort,
      opponentLogo: oppComp?.team?.logo || '',
      teamLogo: teamComp?.team?.logo || '',
      homeAway,
      scoreTeam: rawScoreTeam ?? 0,
      scoreOpponent: rawScoreOpp ?? 0,
      venue,
      broadcast,
      odds: {
        provider: providerName,
        details: oddsDetails,
        spread: spreadVal,
        overUnder,
        moneyLineHome: mlHome,
        moneyLineAway: mlAway,
        formatted: `Spread: ${oddsDetails} • O/U: ${overUnder ?? 'N/A'} • ${providerName}`
      },
      pregameWinProbability,
      winProbability,
      lastEvent: lastEventText,
      isLive,
      source: 'ESPN Live Sports',
      lastUpdated: new Date().toISOString()
    };

    return matchObj;
  } catch (err) {
    return null;
  }
}

// Unified Live Sports Fetcher (Works locally via backend or standalone via direct ESPN API)
async function fetchLiveSports(force = false) {
  if (elements.btnRefreshScores) {
    elements.btnRefreshScores.classList.add('spinning');
  }

  const isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';
  let fetchedFromServer = false;

  if (isHttp && isLocalEnvironment()) {
    try {
      const endpoint = force ? '/api/matches/refresh' : '/api/matches';
      const method = force ? 'POST' : 'GET';
      const res = await fetch(endpoint, { method });
      if (res.ok) {
        const data = await res.json();
        if (data.matches) {
          state.matches = data.matches;
          if (state.matches[state.activeTeam]) {
            state.match = state.matches[state.activeTeam];
          }
          fetchedFromServer = true;
        }
      }
    } catch (err) {
      fetchedFromServer = false;
    }
  }

  // If not on local server or server query failed (e.g. GitHub Pages), query ESPN directly
  if (!fetchedFromServer) {
    const promises = Object.keys(state.teams).map(async (teamId) => {
      const match = await fetchEspnDirectForTeam(teamId);
      if (match) {
        state.matches[teamId] = match;
        if (state.activeTeam === teamId) {
          state.match = match;
        }
      }
    });
    await Promise.allSettled(promises);
  }

  renderScoreboard();
  updateTeamCardsSchedule();

  if (elements.btnRefreshScores) {
    setTimeout(() => {
      elements.btnRefreshScores.classList.remove('spinning');
    }, 450);
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
  fetchLiveSports(false);

  // Auto-load Hue rooms if bridge is configured
  setTimeout(() => {
    if (state.config.philipsHue?.bridgeIp && state.config.philipsHue?.username) {
      fetchHueRooms();
    }
  }, 800);

  // Background auto-refresh of live sports every 30 seconds
  setInterval(() => {
    fetchLiveSports(false);
  }, 30000);

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


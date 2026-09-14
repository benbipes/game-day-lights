// Configuration for Game Day Lights: Teams, Color Palettes, and Default Settings

export const TEAMS = {
  canes: {
    id: 'canes',
    name: 'Carolina Hurricanes',
    short: 'Canes',
    league: 'NHL',
    sport: 'Hockey',
    location: 'Raleigh, NC',
    espnId: '7',
    sportPath: 'hockey/nhl',
    yahooLeague: 'nhl',
    primaryColor: '#C8102E', // Canes Storm Red
    secondaryColor: '#000000', // Black
    accentColor: '#FFFFFF', // Ice White
    ambientRgb: [200, 16, 46],
    ambientXy: [0.671, 0.297], // Philips Hue CIE 1931 XY
    brightness: 254,
    celebration: {
      style: 'siren_strobe',
      colors: [
        [255, 0, 0],
        [255, 255, 255],
        [200, 16, 46],
        [150, 0, 0]
      ],
      durationMs: 12000,
      flashIntervalMs: 250,
      audioKey: 'nhl_goal_horn',
      celebrationTitle: 'CANES GOAL!',
      celebrationTagline: 'THE SIREN SOUNDS IN RALEIGH! 🚨',
      soundDescription: 'Emergency warning siren & NHL air horn blast'
    },
    defaultMatch: {
      opponent: 'New York Rangers',
      opponentShort: 'NYR',
      homeAway: 'home',
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
    location: 'Raleigh, NC',
    espnId: '152',
    sportPath: 'football/college-football',
    yahooLeague: 'ncaaf',
    primaryColor: '#CC0000', // Wolfpack Red
    secondaryColor: '#FFFFFF', // Clean White
    accentColor: '#000000', // Black
    ambientRgb: [204, 0, 0],
    ambientXy: [0.675, 0.322],
    brightness: 254,
    celebration: {
      style: 'touchdown_burst',
      colors: [
        [204, 0, 0],
        [255, 255, 255],
        [255, 30, 30],
        [255, 255, 255]
      ],
      durationMs: 12000,
      flashIntervalMs: 220,
      audioKey: 'wolfpack_touchdown',
      celebrationTitle: 'TOUCHDOWN WOLFPACK!',
      celebrationTagline: 'CARTER-FINLEY STADIUM ERUPTS! 🐺',
      soundDescription: 'Wolfpack howl siren & stadium touchdown burst'
    },
    defaultMatch: {
      opponent: 'North Carolina Tar Heels',
      opponentShort: 'UNC',
      homeAway: 'home',
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
    location: 'Minneapolis, MN',
    espnId: '16',
    sportPath: 'football/nfl',
    yahooLeague: 'nfl',
    primaryColor: '#4F2683', // Vikings Royal Purple
    secondaryColor: '#FFC62F', // Vikings Gold
    accentColor: '#FFFFFF', // White
    ambientRgb: [79, 38, 131],
    ambientXy: [0.222, 0.103],
    brightness: 254,
    celebration: {
      style: 'gjallarhorn_strobe',
      colors: [
        [79, 38, 131], // Purple
        [255, 198, 47], // Gold
        [125, 60, 205], // Vivid Purple
        [255, 225, 90]  // Bright Gold
      ],
      durationMs: 14000,
      flashIntervalMs: 280,
      audioKey: 'gjallarhorn',
      celebrationTitle: 'VIKINGS TOUCHDOWN!',
      celebrationTagline: 'SKOL! THE GJALLARHORN SOUNDS! ⚔️',
      soundDescription: 'Resonant acoustic Gjallarhorn deep horn and Skol chant'
    },
    defaultMatch: {
      opponent: 'Green Bay Packers',
      opponentShort: 'GB',
      homeAway: 'home',
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
    location: 'Knoxville, TN',
    espnId: '2633',
    sportPath: 'football/college-football',
    yahooLeague: 'ncaaf',
    primaryColor: '#FF8200', // Tennessee Pantone 151 Orange
    secondaryColor: '#FFFFFF', // White
    accentColor: '#58595B', // Smokey Gray
    ambientRgb: [255, 130, 0],
    ambientXy: [0.609, 0.377],
    brightness: 254,
    celebration: {
      style: 'rocky_top_strobe',
      colors: [
        [255, 130, 0],
        [255, 255, 255],
        [255, 100, 0],
        [88, 89, 91]
      ],
      durationMs: 14000,
      flashIntervalMs: 250,
      audioKey: 'rocky_top',
      celebrationTitle: 'TOUCHDOWN TENNESSEE!',
      celebrationTagline: 'ROCKY TOP YOU\'LL ALWAYS BE HOME SWEET HOME TO ME! 🍊🏈',
      soundDescription: 'Synthesized Rocky Top brass march & Neyland Stadium touchdown cannon'
    },
    defaultMatch: {
      opponent: 'Alabama Crimson Tide',
      opponentShort: 'BAMA',
      homeAway: 'home',
      scoreTeam: 35,
      scoreOpponent: 28,
      period: '4th Quarter',
      clock: '01:15',
      lastEvent: 'TOUCHDOWN: Squirrel White 38 yd pass from Nico Iamaleava'
    }
  }
};

export const DEFAULT_USER_CONFIG = {
  // Home Assistant configuration
  homeAssistant: {
    enabled: true,
    mode: 'webhook', // 'webhook' or 'service'
    host: 'http://homeassistant.local:8123',
    webhookId: 'game_day_score_celebration',
    accessToken: '', // Long-Lived Access Token for service calls
    entityId: 'light.living_room_lights', // or group
    sendColorRgb: true,
    sendFlash: true
  },
  // Philips Hue direct configuration
  philipsHue: {
    enabled: true,
    bridgeIp: '',
    username: '',
    targetType: 'group', // 'group' or 'light'
    targetId: '1', // legacy single target ID
    targetIds: ['1'], // multi-room target IDs
    useAlertStrobe: false,
    perBulbMultiColor: true, // distribute team colors across individual bulbs in room
    strobeEffect: 'alternating' // 'alternating' | 'scatter' | 'wave' | 'pulse'
  },
  // General options
  general: {
    systemEnabled: true,
    activeTeam: 'canes',
    ambientBrightness: 220,
    celebrationBrightness: 254,
    celebrationDurationSeconds: 12,
    soundEnabled: true,
    soundVolume: 0.8
  }
};


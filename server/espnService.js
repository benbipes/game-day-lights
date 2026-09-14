// espnService.js - Live Score Tracker, Webhook Ingestion & Simulation Engine

import { TEAMS } from './config.js';

export class EspnService {
  constructor(lightService) {
    this.lightService = lightService;
    // Current match state per team
    this.matches = {};
    for (const [key, team] of Object.entries(TEAMS)) {
      this.matches[key] = {
        teamId: key,
        teamName: team.name,
        teamShort: team.short,
        sport: team.sport,
        league: team.league,
        ...JSON.parse(JSON.stringify(team.defaultMatch)),
        isLive: true,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  getMatch(teamId) {
    return this.matches[teamId] || null;
  }

  getAllMatches() {
    return this.matches;
  }

  // Parse generic webhook payload
  handleGenericScoreWebhook(payload) {
    const rawTeam = (payload.team || payload.teamId || payload.team_id || '').toLowerCase();
    let matchedKey = null;

    if (rawTeam.includes('cane') || rawTeam.includes('carolina') || rawTeam.includes('hurricanes')) {
      matchedKey = 'canes';
    } else if (rawTeam.includes('wolfpack') || rawTeam.includes('nc state') || rawTeam.includes('ncsu')) {
      matchedKey = 'wolfpack';
    } else if (rawTeam.includes('viking') || rawTeam.includes('minnesota') || rawTeam.includes('min')) {
      matchedKey = 'vikings';
    } else if (rawTeam.includes('liverpool') || rawTeam.includes('lfc') || rawTeam.includes('reds')) {
      matchedKey = 'liverpool';
    }

    if (!matchedKey) {
      // Fall back to active team
      matchedKey = this.lightService.currentTeamId;
    }

    const match = this.matches[matchedKey];
    const prevScore = match.scoreTeam;
    const eventType = payload.event || payload.type || 'SCORE';
    const player = payload.player || payload.scorer || 'Team Play';

    // Handle point delta or absolute score
    if (typeof payload.scoreTeam === 'number') {
      match.scoreTeam = payload.scoreTeam;
    } else if (typeof payload.points === 'number') {
      match.scoreTeam += payload.points;
    } else {
      // Default increment based on sport
      const isFootball = matchedKey === 'vikings' || matchedKey === 'wolfpack';
      const inc = isFootball ? (eventType.toLowerCase().includes('field') ? 3 : 6) : 1;
      match.scoreTeam += inc;
    }

    if (typeof payload.scoreOpponent === 'number') {
      match.scoreOpponent = payload.scoreOpponent;
    }

    match.lastEvent = `${eventType.toUpperCase()}: ${player}`;
    match.lastUpdated = new Date().toISOString();

    const scoreIncreased = match.scoreTeam > prevScore;

    this.lightService.addLog('Webhook', 'INBOUND_WEBHOOK_RECEIVED', {
      matchedTeam: matchedKey,
      eventType,
      player,
      score: `${match.scoreTeam} - ${match.scoreOpponent}`,
      triggeredCelebration: scoreIncreased
    });

    if (scoreIncreased) {
      this.lightService.triggerCelebration(matchedKey, {
        type: eventType,
        player,
        scoreTeam: match.scoreTeam,
        scoreOpponent: match.scoreOpponent,
        summary: match.lastEvent
      });
    }

    return {
      success: true,
      teamId: matchedKey,
      scoreIncreased,
      match
    };
  }

  // Parse ESPN webhook format
  handleEspnWebhook(payload) {
    const play = payload.play || payload.lastPlay || {};
    const text = play.text || payload.description || payload.headline || 'Score update';
    const rawTeam = (payload.team || payload.competitor || '').toLowerCase();
    
    // Check if score changed
    return this.handleGenericScoreWebhook({
      team: rawTeam,
      event: payload.scoringPlay ? 'GOAL / TOUCHDOWN' : 'PLAY',
      player: text,
      scoreTeam: payload.homeScore ?? payload.teamScore,
      scoreOpponent: payload.awayScore ?? payload.opponentScore
    });
  }

  // Simulate a score directly from the UI
  simulateScore(teamId, options = {}) {
    const match = this.matches[teamId];
    if (!match) return null;

    const points = options.points || (teamId === 'vikings' || teamId === 'wolfpack' ? 6 : 1);
    const eventName = options.event || (teamId === 'vikings' || teamId === 'wolfpack' ? 'TOUCHDOWN' : 'GOAL');
    const player = options.player || this.getRandomPlayer(teamId);

    match.scoreTeam += points;
    match.lastEvent = `${eventName}: ${player} (+${points} pts)`;
    match.lastUpdated = new Date().toISOString();

    this.lightService.addLog('Simulator', 'SIMULATED_SCORE', {
      team: match.teamName,
      event: eventName,
      player,
      newScore: `${match.scoreTeam} - ${match.scoreOpponent}`
    });

    this.lightService.triggerCelebration(teamId, {
      type: eventName,
      player,
      scoreTeam: match.scoreTeam,
      scoreOpponent: match.scoreOpponent,
      summary: match.lastEvent
    });

    return match;
  }

  simulateOpponentScore(teamId) {
    const match = this.matches[teamId];
    if (!match) return null;

    const points = teamId === 'vikings' || teamId === 'wolfpack' ? 3 : 1;
    match.scoreOpponent += points;
    match.lastEvent = `OPPONENT SCORE (+${points} pts)`;
    match.lastUpdated = new Date().toISOString();

    this.lightService.addLog('Simulator', 'OPPONENT_SCORE', {
      team: match.teamName,
      opponent: match.opponent,
      newScore: `${match.scoreTeam} - ${match.scoreOpponent}`
    });

    // Opponent score does NOT trigger celebration
    this.lightService.notifyStateChange({ opponentScored: true, match });
    return match;
  }

  resetMatch(teamId) {
    const team = TEAMS[teamId];
    if (!team) return null;
    this.matches[teamId] = {
      teamId,
      teamName: team.name,
      teamShort: team.short,
      sport: team.sport,
      league: team.league,
      ...JSON.parse(JSON.stringify(team.defaultMatch)),
      isLive: true,
      lastUpdated: new Date().toISOString()
    };
    this.lightService.setAmbientLighting(teamId);
    return this.matches[teamId];
  }

  getRandomPlayer(teamId) {
    const players = {
      canes: ['Sebastian Aho', 'Martin Necas', 'Seth Jarvis', 'Teuvo Teravainen', 'Brent Burns'],
      wolfpack: ['KC Concepcion', 'Grayson McCall', 'Jordan Waters', 'Dacari Collins'],
      vikings: ['Justin Jefferson', 'Jordan Addison', 'Aaron Jones', 'T.J. Hockenson'],
      liverpool: ['Mohamed Salah', 'Luis Diaz', 'Dominik Szoboszlai', 'Darwin Nunez', 'Virgil van Dijk']
    };
    const list = players[teamId] || ['Key Player'];
    return list[Math.floor(Math.random() * list.length)];
  }
}

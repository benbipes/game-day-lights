// espnService.js - Live Score Tracker, ESPN/Yahoo Sports Aggregator & Simulation Engine

import { TEAMS } from './config.js';

export class EspnService {
  constructor(lightService) {
    this.lightService = lightService;
    this.onMatchesUpdate = null;
    this.pollingInterval = null;

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
        status: 'SCHEDULED',
        gameState: 'pre',
        statusDetail: 'Loading real schedule...',
        gameDate: null,
        venue: 'TBD',
        broadcast: 'TBD',
        isLive: false,
        source: 'Initializing',
        lastUpdated: new Date().toISOString()
      };
    }

    // Start background live polling
    this.startPolling();
  }

  getMatch(teamId) {
    return this.matches[teamId] || null;
  }

  getAllMatches() {
    return this.matches;
  }

  startPolling(intervalMs = 30000) {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    // Initial fetch immediately
    this.refreshAllGames().catch(() => {});
    this.pollingInterval = setInterval(() => {
      this.refreshAllGames().catch(() => {});
    }, intervalMs);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // Refresh all teams from live ESPN APIs
  async refreshAllGames() {
    const promises = Object.keys(TEAMS).map(teamId => this.fetchTeamGame(teamId));
    await Promise.allSettled(promises);
    if (this.onMatchesUpdate) {
      this.onMatchesUpdate(this.matches);
    }
    return this.matches;
  }

  // Fetch real game data for a single team from ESPN / Yahoo
  async fetchTeamGame(teamId) {
    const team = TEAMS[teamId];
    if (!team) return null;

    const prevMatch = this.matches[teamId];

    try {
      let event = null;
      let comp = null;
      let upcomingEvent = null;
      let lastCompletedEvent = null;

      // 1. Check today's league scoreboard
      if (team.sportPath) {
        try {
          const sbUrl = `https://site.api.espn.com/apis/site/v2/sports/${team.sportPath}/scoreboard`;
          const sbRes = await fetch(sbUrl, { signal: AbortSignal.timeout(4500) });
          if (sbRes.ok) {
            const sbData = await sbRes.json();
            event = (sbData.events || []).find(e => {
              const comps = e.competitions?.[0]?.competitors || [];
              return comps.some(c =>
                String(c.team?.id) === String(team.espnId) ||
                (c.team?.displayName && c.team.displayName.toLowerCase().includes(team.short.toLowerCase()))
              );
            });
          }
        } catch (err) {
          // Scoreboard fetch error, fallback to schedule
        }
      }

      // 2. Query team official schedule to find upcoming and recent games
      if (team.sportPath && team.espnId) {
        try {
          const schedUrl = `https://site.api.espn.com/apis/site/v2/sports/${team.sportPath}/teams/${team.espnId}/schedule`;
          const schedRes = await fetch(schedUrl, { signal: AbortSignal.timeout(4500) });
          if (schedRes.ok) {
            const schedData = await schedRes.json();
            const events = schedData.events || [];

            // Find next upcoming game (state is 'pre')
            upcomingEvent = events.find(e => {
              const s = e.competitions?.[0]?.status?.type?.state;
              return s === 'pre';
            });

            // Find most recent completed game (state is 'post')
            const completed = events.filter(e => e.competitions?.[0]?.status?.type?.state === 'post');
            if (completed.length > 0) {
              lastCompletedEvent = completed[completed.length - 1];
            }

            // If scoreboard didn't find a live game today, prioritize:
            // 1. A live game if any
            // 2. Upcoming game
            // 3. Most recent completed game
            if (!event || event.competitions?.[0]?.status?.type?.state === 'post') {
              if (upcomingEvent) {
                event = upcomingEvent;
              } else if (lastCompletedEvent) {
                event = lastCompletedEvent;
              }
            }
          }
        } catch (schedErr) {
          // Team schedule fetch failed
        }
      }

      if (!event) {
        return prevMatch;
      }

      comp = event.competitions?.[0] || {};
      const state = comp.status?.type?.state || 'pre';
      const isLive = state === 'in';

      const teamComp = comp.competitors?.find(c =>
        String(c.team?.id) === String(team.espnId) ||
        (c.team?.displayName && c.team.displayName.toLowerCase().includes(team.short.toLowerCase()))
      ) || comp.competitors?.[0];
      const oppComp = comp.competitors?.find(c => c !== teamComp) || comp.competitors?.[1];

      const homeAway = teamComp?.homeAway || 'home';
      const statusType = isLive ? 'LIVE' : (state === 'post' ? 'FINAL' : 'SCHEDULED');

      const rawScoreTeam = teamComp?.score?.value ?? (teamComp?.score?.displayValue ? parseInt(teamComp.score.displayValue, 10) : null);
      const rawScoreOpp = oppComp?.score?.value ?? (oppComp?.score?.displayValue ? parseInt(oppComp.score.displayValue, 10) : null);

      const venueName = comp.venue?.fullName || 'TBD Stadium';
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
      } else if (state === 'post') {
        period = 'Final';
        clock = 'Final';
      } else {
        period = 'Upcoming';
        clock = detail;
      }

      // Friendly last event / ticker text
      let lastEventText = '';
      if (isLive) {
        lastEventText = comp.situation?.lastPlay?.text || `LIVE: ${team.short} ${rawScoreTeam ?? 0} - ${rawScoreOpp ?? 0} ${oppComp?.team?.abbreviation || 'OPP'}`;
      } else if (state === 'post') {
        lastEventText = `FINAL: ${teamComp?.team?.shortDisplayName || team.short} ${rawScoreTeam ?? 0}, ${oppComp?.team?.shortDisplayName || 'OPP'} ${rawScoreOpp ?? 0}`;
      } else {
        lastEventText = `Upcoming Matchup: ${event.name} • ${detail}`;
      }

      const newMatch = {
        teamId,
        teamName: team.name,
        teamShort: team.short,
        sport: team.sport,
        league: team.league,
        status: statusType,
        gameState: state,
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
        lastEvent: lastEventText,
        isLive,
        source: 'ESPN Live Sports',
        lastUpdated: new Date().toISOString()
      };

      // Score Delta Trigger: If game is LIVE and team score increased, fire Hue lights!
      if (prevMatch && prevMatch.isLive && newMatch.isLive) {
        if (newMatch.scoreTeam > prevMatch.scoreTeam) {
          const delta = newMatch.scoreTeam - prevMatch.scoreTeam;
          this.lightService.addLog('Live ESPN', 'LIVE_SCORE_DETECTED', {
            team: team.name,
            delta,
            newScore: `${newMatch.scoreTeam} - ${newMatch.scoreOpponent}`,
            headline: newMatch.lastEvent
          });
          this.lightService.triggerCelebration(teamId, {
            type: delta >= 6 ? 'TOUCHDOWN' : (delta === 3 ? 'FIELD GOAL' : 'GOAL'),
            player: 'Live Play',
            scoreTeam: newMatch.scoreTeam,
            scoreOpponent: newMatch.scoreOpponent,
            summary: newMatch.lastEvent
          });
        }
      }

      this.matches[teamId] = newMatch;
      return newMatch;
    } catch (err) {
      return prevMatch;
    }
  }

  // Parse generic inbound webhook payload
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
    } else if (rawTeam.includes('vols') || rawTeam.includes('tennessee') || rawTeam.includes('volunteer') || rawTeam.includes('ut')) {
      matchedKey = 'vols';
    }

    if (!matchedKey) {
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
      const isFootball = matchedKey === 'vikings' || matchedKey === 'wolfpack' || matchedKey === 'vols';
      const inc = isFootball ? (eventType.toLowerCase().includes('field') ? 3 : 6) : 1;
      match.scoreTeam += inc;
    }

    if (typeof payload.scoreOpponent === 'number') {
      match.scoreOpponent = payload.scoreOpponent;
    }

    match.status = 'LIVE';
    match.gameState = 'in';
    match.isLive = true;
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

    return this.handleGenericScoreWebhook({
      team: rawTeam,
      event: payload.scoringPlay ? 'GOAL / TOUCHDOWN' : 'PLAY',
      player: text,
      scoreTeam: payload.homeScore ?? payload.teamScore,
      scoreOpponent: payload.awayScore ?? payload.opponentScore
    });
  }

  // Manual simulator controls
  simulateScore(teamId, options = {}) {
    const match = this.matches[teamId];
    if (!match) return null;

    const isFootball = teamId === 'vikings' || teamId === 'wolfpack' || teamId === 'vols';
    const points = options.points || (isFootball ? 6 : 1);
    const eventName = options.event || (isFootball ? 'TOUCHDOWN' : 'GOAL');
    const player = options.player || this.getRandomPlayer(teamId);

    match.scoreTeam = (match.scoreTeam || 0) + points;
    match.status = 'LIVE';
    match.gameState = 'in';
    match.isLive = true;
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

    const points = (teamId === 'vikings' || teamId === 'wolfpack' || teamId === 'vols') ? 3 : 1;
    match.scoreOpponent = (match.scoreOpponent || 0) + points;
    match.status = 'LIVE';
    match.gameState = 'in';
    match.isLive = true;
    match.lastEvent = `OPPONENT SCORE (+${points} pts)`;
    match.lastUpdated = new Date().toISOString();

    this.lightService.addLog('Simulator', 'OPPONENT_SCORE', {
      team: match.teamName,
      opponent: match.opponent,
      newScore: `${match.scoreTeam} - ${match.scoreOpponent}`
    });

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
      status: 'SCHEDULED',
      gameState: 'pre',
      isLive: false,
      lastUpdated: new Date().toISOString()
    };
    // Trigger real refresh
    this.fetchTeamGame(teamId).catch(() => {});
    this.lightService.setAmbientLighting(teamId);
    return this.matches[teamId];
  }

  getRandomPlayer(teamId) {
    const players = {
      canes: ['Sebastian Aho', 'Martin Necas', 'Seth Jarvis', 'Teuvo Teravainen', 'Brent Burns'],
      wolfpack: ['KC Concepcion', 'Grayson McCall', 'Jordan Waters', 'Dacari Collins'],
      vikings: ['Justin Jefferson', 'Jordan Addison', 'Aaron Jones', 'T.J. Hockenson'],
      liverpool: ['Mohamed Salah', 'Luis Diaz', 'Dominik Szoboszlai', 'Darwin Nunez', 'Virgil van Dijk'],
      vols: ['Nico Iamaleava', 'Squirrel White', 'Dylan Sampson', 'Dont\'e Thornton Jr.', 'Bru McCoy']
    };
    const list = players[teamId] || ['Key Player'];
    return list[Math.floor(Math.random() * list.length)];
  }
}

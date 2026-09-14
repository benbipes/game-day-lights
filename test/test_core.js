// test/test_core.js - Automated Verification Suite for Game Day Lights

import assert from 'node:assert';
import { TEAMS, DEFAULT_USER_CONFIG } from '../server/config.js';
import { LightService, rgbToXy } from '../server/lightService.js';
import { EspnService } from '../server/espnService.js';

console.log('🧪 Starting Game Day Lights Automated Test Suite...\n');

// Test 1: Team Configuration & CIE 1931 XY Color Conversion
console.log('▶ Test 1: Verify Teams and Color Palettes');
assert.ok(TEAMS.canes, 'Carolina Hurricanes team config exists');
assert.ok(TEAMS.wolfpack, 'NC State Wolfpack team config exists');
assert.ok(TEAMS.vikings, 'Minnesota Vikings team config exists');
assert.ok(TEAMS.liverpool, 'Liverpool FC team config exists');
assert.ok(TEAMS.vols, 'Tennessee Volunteers team config exists');

// Verify RGB to XY conversion
const canesXy = rgbToXy(200, 16, 46);
assert.ok(canesXy[0] > 0.5 && canesXy[1] > 0.2, 'Canes Red converts to valid Hue XY');
const vikingsXy = rgbToXy(79, 38, 131);
assert.ok(vikingsXy[0] > 0.1 && vikingsXy[1] < 0.2, 'Vikings Purple converts to valid Hue XY');
const volsXy = rgbToXy(255, 130, 0);
assert.ok(volsXy[0] > 0.55 && volsXy[1] > 0.35, 'Tennessee Orange converts to valid Hue XY');
console.log('  ✅ Teams and Hue XY color conversions validated');

// Test 2: LightService Ambient & Celebration State Management
console.log('▶ Test 2: LightService Ambient & Celebration Orchestration');
const lightService = new LightService(DEFAULT_USER_CONFIG);

// Test Ambient Sync
lightService.setAmbientLighting('canes');
assert.strictEqual(lightService.currentTeamId, 'canes');
assert.strictEqual(lightService.currentMode, 'ambient');
assert.deepStrictEqual(lightService.currentLightColor, [200, 16, 46]);
console.log('  ✅ Canes ambient lighting set to Red [200, 16, 46]');

lightService.setAmbientLighting('vols');
assert.strictEqual(lightService.currentTeamId, 'vols');
assert.deepStrictEqual(lightService.currentLightColor, [255, 130, 0]);
console.log('  ✅ Vols ambient lighting set to Tennessee Orange [255, 130, 0]');

lightService.setAmbientLighting('vikings');
assert.strictEqual(lightService.currentTeamId, 'vikings');
assert.deepStrictEqual(lightService.currentLightColor, [79, 38, 131]);
console.log('  ✅ Vikings ambient lighting set to Purple [79, 38, 131]');

// Test Celebration Trigger
let stateUpdates = [];
lightService.onStateChange((state) => {
  stateUpdates.push(state);
});

lightService.triggerCelebration('vikings', { type: 'TOUCHDOWN' });
assert.strictEqual(lightService.currentMode, 'celebration');
assert.strictEqual(lightService.activeCelebrationTimer !== null, true);

// End celebration
lightService.endCelebration();
assert.strictEqual(lightService.currentMode, 'ambient');
assert.deepStrictEqual(lightService.currentLightColor, [79, 38, 131]);
console.log('  ✅ Celebration triggered and smoothly restored to ambient');

// Test 3: EspnService Webhook Ingestion & Score Delta Detection
console.log('▶ Test 3: EspnService Live Score & Webhook Ingestion');
const espnService = new EspnService(lightService);

// 3a. Canes Goal Webhook
lightService.setAmbientLighting('canes');
const canesInitialScore = espnService.getMatch('canes').scoreTeam;
const canesWebhookResult = espnService.handleGenericScoreWebhook({
  team: 'canes',
  event: 'GOAL',
  player: 'Sebastian Aho',
  scoreTeam: canesInitialScore + 1,
  scoreOpponent: 2
});

assert.strictEqual(canesWebhookResult.success, true);
assert.strictEqual(canesWebhookResult.scoreIncreased, true);
assert.strictEqual(espnService.getMatch('canes').scoreTeam, canesInitialScore + 1);
assert.strictEqual(lightService.currentMode, 'celebration');
console.log('  ✅ Canes Goal webhook triggered goal celebration!');

lightService.endCelebration();

// 3b. Opponent Score (Should NOT trigger celebration)
const oppInitialScore = espnService.getMatch('canes').scoreOpponent;
espnService.simulateOpponentScore('canes');
assert.strictEqual(espnService.getMatch('canes').scoreOpponent, oppInitialScore + 1);
assert.strictEqual(lightService.currentMode, 'ambient', 'Opponent score did not trigger celebration');
console.log('  ✅ Opponent score recorded without triggering celebration');

// 3c. Minnesota Vikings Touchdown Webhook
const vikingsInitialScore = espnService.getMatch('vikings').scoreTeam;
const vikingsWebhookResult = espnService.handleGenericScoreWebhook({
  team: 'Minnesota Vikings',
  type: 'TOUCHDOWN',
  player: 'Justin Jefferson',
  points: 6
});

assert.strictEqual(vikingsWebhookResult.scoreIncreased, true);
assert.strictEqual(espnService.getMatch('vikings').scoreTeam, vikingsInitialScore + 6);
assert.strictEqual(lightService.currentMode, 'celebration');
assert.strictEqual(lightService.currentTeamId, 'vikings');
console.log('  ✅ Vikings Touchdown triggered Purple & Gold celebration!');

lightService.endCelebration();

// 3d. Liverpool FC Goal Webhook
const liverpoolInitialScore = espnService.getMatch('liverpool').scoreTeam;
const liverpoolResult = espnService.handleGenericScoreWebhook({
  team: 'Liverpool',
  event: 'GOAL',
  player: 'Mohamed Salah',
  points: 1
});

assert.strictEqual(liverpoolResult.scoreIncreased, true);
assert.strictEqual(espnService.getMatch('liverpool').scoreTeam, liverpoolInitialScore + 1);
assert.strictEqual(lightService.currentMode, 'celebration');
console.log('  ✅ Liverpool FC Goal triggered Anfield Red celebration!');

lightService.endCelebration();

// 3e. NC State Wolfpack Touchdown Webhook
const wolfpackInitial = espnService.getMatch('wolfpack').scoreTeam;
const wolfpackResult = espnService.handleGenericScoreWebhook({
  team: 'NC State',
  event: 'TOUCHDOWN',
  player: 'KC Concepcion',
  points: 6
});

assert.strictEqual(wolfpackResult.scoreIncreased, true);
assert.strictEqual(espnService.getMatch('wolfpack').scoreTeam, wolfpackInitial + 6);
assert.strictEqual(lightService.currentMode, 'celebration');
console.log('  ✅ Wolfpack Touchdown triggered Red & White celebration!');

lightService.endCelebration();

// 3f. Tennessee Volunteers Touchdown Webhook
const volsInitial = espnService.getMatch('vols').scoreTeam;
const volsResult = espnService.handleGenericScoreWebhook({
  team: 'Tennessee Vols',
  event: 'TOUCHDOWN',
  player: 'Squirrel White',
  points: 6
});

assert.strictEqual(volsResult.scoreIncreased, true);
assert.strictEqual(espnService.getMatch('vols').scoreTeam, volsInitial + 6);
assert.strictEqual(lightService.currentMode, 'celebration');
assert.strictEqual(lightService.currentTeamId, 'vols');
console.log('  ✅ Tennessee Touchdown triggered Rocky Top celebration!');

lightService.endCelebration();

// Test 4: Verify Telemetry Logs
console.log('▶ Test 4: Telemetry Activity Logs');
assert.ok(lightService.logs.length > 5, 'Activity logs successfully populated');
const latestLog = lightService.logs[0];
assert.ok(latestLog.timestamp && latestLog.source && latestLog.type, 'Log entries have valid telemetry structure');
console.log(`  ✅ Activity logs recorded ${lightService.logs.length} telemetry events`);

// Test 5: Verify Betting Lines & Dynamic Win Probability Engine
console.log('▶ Test 5: Betting Lines & Win Probability Tracker');
const volsMatch = espnService.getMatch('vols');
assert.ok(volsMatch.odds, 'Vols match has odds object');
assert.ok(volsMatch.odds.provider, 'Odds includes provider name (e.g. DraftKings)');
assert.ok(typeof volsMatch.winProbability === 'number', 'Win probability is numeric');
assert.ok(volsMatch.winProbability >= 0 && volsMatch.winProbability <= 100, 'Win probability is bounded [0, 100]');

// Test dynamic calculation on score swing
const baseProb = volsMatch.winProbability;
espnService.simulateScore('vols', { points: 6, event: 'TOUCHDOWN' });
const probAfterTD = espnService.getMatch('vols').winProbability;
assert.ok(probAfterTD >= baseProb, 'Touchdown increases or maintains high win probability');

espnService.simulateOpponentScore('vols');
const probAfterOpp = espnService.getMatch('vols').winProbability;
assert.ok(probAfterOpp <= probAfterTD, 'Opponent score decreases win probability');

// Test Final Game Probability logic
const finalMatchWin = espnService.calculateLiveWinProbability({
  gameState: 'post',
  scoreTeam: 35,
  scoreOpponent: 28,
  sport: 'football'
});
assert.strictEqual(finalMatchWin, 100.0, 'Final winning score gives 100% win probability');

const finalMatchLoss = espnService.calculateLiveWinProbability({
  gameState: 'post',
  scoreTeam: 21,
  scoreOpponent: 28,
  sport: 'football'
});
assert.strictEqual(finalMatchLoss, 0.0, 'Final losing score gives 0% win probability');

console.log('  ✅ Betting lines and dynamic win probability calculations verified!');

espnService.stopPolling();

console.log('\n🎉 ALL TESTS PASSED! Game Day Lights core engine is verified and ready.\n');
process.exit(0);


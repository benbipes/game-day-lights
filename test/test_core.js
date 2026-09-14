// test/test_core.js - Automated Verification Suite for Game Day Lights

import assert from 'node:assert';
import { TEAMS, DEFAULT_USER_CONFIG } from '../server/config.js';
import { LightService, rgbToXy, calculateStrobeColors, calculateVisualizerFixtureColors } from '../server/lightService.js';
import { EspnService } from '../server/espnService.js';

console.log('🧪 Starting Game Day Lights Automated Test Suite...\n');

// Test 1: Team Configuration & CIE 1931 XY Color Conversion
console.log('▶ Test 1: Verify Teams and Color Palettes');
assert.ok(TEAMS.canes, 'Carolina Hurricanes team config exists');
assert.ok(TEAMS.wolfpack, 'NC State Wolfpack team config exists');
assert.ok(TEAMS.vikings, 'Minnesota Vikings team config exists');
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

// Test 2b: Multi-Room Target Resolution
console.log('▶ Test 2b: Multi-Room Target ID Resolution');
lightService.updateConfig({ philipsHue: { targetIds: ['1', '81'] } });
assert.deepStrictEqual(lightService.getTargetIds(), ['1', '81'], 'targetIds array resolved');

lightService.updateConfig({ philipsHue: { targetIds: [], targetId: '1, 81, 4' } });
assert.deepStrictEqual(lightService.getTargetIds(), ['1', '81', '4'], 'comma-separated targetId resolved');
console.log('  ✅ Multi-room target IDs resolved correctly for single, array, and comma-separated');

// Test 2c: Exact Light State Restoration (OFF -> OFF; ON -> Prior color/bri)
console.log('▶ Test 2c: Exact State Restoration Engine');
const capturedDispatches = [];
lightService.dispatchSingleHueTarget = async (cleanIp, username, targetType, targetId, payload) => {
  capturedDispatches.push({ targetId, payload });
  return { success: true, targetId };
};

// Target 3 was OFF before celebration; Target 1 was ON at warm white 180 bri; Target 4 was ON with hs colormode
lightService.updateConfig({ philipsHue: { targetIds: ['1', '3', '4'], enabled: true, bridgeIp: '192.168.1.1', username: 'testuser' } });
lightService.previousStates = {
  '3': { targetId: '3', wasOn: false },
  '1': { targetId: '1', wasOn: true, bri: 180, ct: 366, colormode: 'ct' },
  '4': { targetId: '4', wasOn: true, bri: 150, hue: 12000, sat: 200, colormode: 'hs' }
};

await lightService.endCelebration();

const target3Dispatch = capturedDispatches.find(d => d.targetId === '3');
assert.ok(target3Dispatch, 'Target 3 received restore dispatch');
assert.strictEqual(target3Dispatch.payload.on, false, 'Target 3 that was OFF was restored to OFF');

const target1Dispatch = capturedDispatches.find(d => d.targetId === '1');
assert.ok(target1Dispatch, 'Target 1 received restore dispatch');
assert.strictEqual(target1Dispatch.payload.on, true, 'Target 1 that was ON was restored to ON');
assert.strictEqual(target1Dispatch.payload.bri, 180, 'Target 1 restored prior brightness');
assert.strictEqual(target1Dispatch.payload.ct, 366, 'Target 1 restored prior color temperature');

const target4Dispatch = capturedDispatches.find(d => d.targetId === '4');
assert.ok(target4Dispatch, 'Target 4 received restore dispatch');
assert.strictEqual(target4Dispatch.payload.on, true, 'Target 4 that was ON was restored to ON');
assert.strictEqual(target4Dispatch.payload.bri, 150, 'Target 4 restored prior brightness');
assert.strictEqual(target4Dispatch.payload.hue, 12000, 'Target 4 restored prior hue');
assert.strictEqual(target4Dispatch.payload.sat, 200, 'Target 4 restored prior sat');
console.log('  ✅ Exact state restoration validated: OFF room restored to OFF, ON room restored to prior bri, ct, and hs color');

// Test Celebration Trigger & Duration Sync
let stateUpdates = [];
lightService.onStateChange((state) => {
  stateUpdates.push(state);
});

await lightService.triggerCelebration('vikings', { type: 'TOUCHDOWN' });
assert.strictEqual(lightService.currentMode, 'celebration');
assert.strictEqual(lightService.activeCelebrationTimer !== null, true);
assert.strictEqual(lightService.activeHardwareStrobeInterval !== null, true);

const startEvent = stateUpdates.find(s => s.celebrationStarted);
assert.ok(startEvent, 'Celebration started event emitted');
assert.strictEqual(typeof startEvent.durationMs, 'number', 'Emits durationMs in celebrationStarted');
assert.strictEqual(typeof startEvent.durationSeconds, 'number', 'Emits durationSeconds in celebrationStarted');

// End celebration
await lightService.endCelebration();
assert.strictEqual(lightService.currentMode, 'ambient');
assert.strictEqual(lightService.activeHardwareStrobeInterval, null, 'Hardware strobe cleared on celebration end');
assert.deepStrictEqual(lightService.currentLightColor, [79, 38, 131]);
const endEvent = stateUpdates.find(s => s.celebrationEnded);
assert.ok(endEvent, 'Celebration ended event emitted with celebrationEnded flag');
console.log('  ✅ Celebration triggered, duration synchronized, and smoothly restored to prior state');


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

// 3d. NC State Wolfpack Touchdown Webhook
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

// 3e. Tennessee Volunteers Touchdown Webhook
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

// Test 6: Multi-Bulb Color Distribution, Strobe Effects & Individual Bulb Restoration
console.log('▶ Test 6: Multi-Bulb Strobe Effects & Individual Bulb State Restoration');

// 6a: Strobe Color Calculations across modes
const palette = [[200, 16, 46], [255, 255, 255], [0, 0, 0]];
const testBulbIds = ['1', '2', '3', '4'];

// Alternating Mode
const altStep0 = calculateStrobeColors({ effect: 'alternating', bulbIds: testBulbIds, palette, step: 0 });
assert.deepStrictEqual(altStep0['1'], palette[0], 'Alternating step 0 bulb 1 is colorA');
assert.deepStrictEqual(altStep0['2'], palette[1], 'Alternating step 0 bulb 2 is colorB');
assert.deepStrictEqual(altStep0['3'], palette[0], 'Alternating step 0 bulb 3 is colorA');

const altStep1 = calculateStrobeColors({ effect: 'alternating', bulbIds: testBulbIds, palette, step: 1 });
assert.deepStrictEqual(altStep1['1'], palette[1], 'Alternating step 1 bulb 1 swaps to colorB');
assert.deepStrictEqual(altStep1['2'], palette[0], 'Alternating step 1 bulb 2 swaps to colorA');

// Wave Mode
const waveStep0 = calculateStrobeColors({ effect: 'wave', bulbIds: testBulbIds, palette, step: 0 });
const waveStep1 = calculateStrobeColors({ effect: 'wave', bulbIds: testBulbIds, palette, step: 1 });
assert.deepStrictEqual(waveStep0['1'], palette[0], 'Wave step 0 bulb 1 is palette[0]');
assert.deepStrictEqual(waveStep1['1'], palette[1], 'Wave step 1 bulb 1 shifts to palette[1]');

// Pulse Mode
const pulseBurst = calculateStrobeColors({ effect: 'pulse', bulbIds: testBulbIds, palette, step: 0 });
const pulseAlt = calculateStrobeColors({ effect: 'pulse', bulbIds: testBulbIds, palette, step: 1 });
assert.ok(pulseBurst['1'] && pulseAlt['1'], 'Pulse generates assignments for both burst and alternate phases');

// Scatter Mode
const scatterAssignments = calculateStrobeColors({ effect: 'scatter', bulbIds: testBulbIds, palette, step: 0 });
testBulbIds.forEach(id => {
  assert.ok(palette.some(c => c[0] === scatterAssignments[id][0] && c[1] === scatterAssignments[id][1] && c[2] === scatterAssignments[id][2]),
    `Bulb ${id} assigned valid color from palette in scatter mode`);
});

// Visualizer Fixture Colors
const visualizerFixtures = calculateVisualizerFixtureColors({ effect: 'alternating', palette, step: 0 });
['pendantLeft', 'pendantRight', 'tvBacklight', 'floorLeft', 'floorRight'].forEach(fid => {
  assert.ok(visualizerFixtures[fid], `Visualizer fixture ${fid} received assigned color`);
});
console.log('  ✅ Strobe effect algorithms validated: Alternating, Wave, Pulse, Scatter & Virtual Fixtures');

// 6b: Individual Bulb State Restoration
const individualDispatches = [];
const multiBulbLightService = new LightService(DEFAULT_USER_CONFIG);
multiBulbLightService.updateConfig({
  philipsHue: {
    enabled: true,
    bridgeIp: '192.168.86.174',
    username: 'test-user-token',
    targetIds: ['1'],
    perBulbMultiColor: true,
    strobeEffect: 'alternating'
  }
});

multiBulbLightService.dispatchSingleHueTarget = async (cleanIp, username, targetType, targetId, payload) => {
  individualDispatches.push({ targetType, targetId, payload });
  return { success: true, targetId };
};

// Group 1 contains bulbs '10', '11', '12' with individual prior states
multiBulbLightService.previousStates = {
  '1': {
    targetId: '1',
    isGroup: true,
    individualBulbs: {
      '10': { wasOn: false },
      '11': { wasOn: true, bri: 210, ct: 350, colormode: 'ct' },
      '12': { wasOn: true, bri: 180, hue: 45000, sat: 200, colormode: 'hs' }
    }
  }
};

await multiBulbLightService.endCelebration();

const bulb10 = individualDispatches.find(d => d.targetId === '10');
assert.ok(bulb10, 'Bulb 10 received individual restore dispatch');
assert.strictEqual(bulb10.payload.on, false, 'Bulb 10 that was OFF restored to OFF');

const bulb11 = individualDispatches.find(d => d.targetId === '11');
assert.ok(bulb11, 'Bulb 11 received individual restore dispatch');
assert.strictEqual(bulb11.payload.on, true, 'Bulb 11 restored to ON');
assert.strictEqual(bulb11.payload.bri, 210, 'Bulb 11 restored prior brightness (210)');
assert.strictEqual(bulb11.payload.ct, 350, 'Bulb 11 restored prior color temperature (350)');

const bulb12 = individualDispatches.find(d => d.targetId === '12');
assert.ok(bulb12, 'Bulb 12 received individual restore dispatch');
assert.strictEqual(bulb12.payload.on, true, 'Bulb 12 restored to ON');
assert.strictEqual(bulb12.payload.bri, 180, 'Bulb 12 restored prior brightness (180)');
assert.strictEqual(bulb12.payload.hue, 45000, 'Bulb 12 restored prior hue (45000)');
assert.strictEqual(bulb12.payload.sat, 200, 'Bulb 12 restored prior saturation (200)');

console.log('  ✅ Individual bulb restoration validated: exact power, brightness, ct, and hue/sat restored per fixture!');

espnService.stopPolling();

console.log('\n🎉 ALL TESTS PASSED! Game Day Lights core engine is verified and ready.\n');
process.exit(0);


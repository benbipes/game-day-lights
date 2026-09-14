// lightService.js - Philips Hue and Home Assistant Lighting Controller & Sequence Orchestrator

import { TEAMS } from './config.js';

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

  async dispatchHueBridge(bodyPayload) {
    const hue = this.config.philipsHue;
    if (!hue || !hue.enabled) return { skipped: true, reason: 'Disabled' };

    const cleanIp = (hue.bridgeIp || '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const endpoint = hue.targetType === 'group'
      ? `http://${cleanIp}/api/${hue.username}/groups/${hue.targetId}/action`
      : `http://${cleanIp}/api/${hue.username}/lights/${hue.targetId}/state`;

    const startTime = Date.now();
    try {
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
        signal: AbortSignal.timeout(4000)
      });
      const latency = Date.now() - startTime;
      const data = await res.json().catch(() => null);
      const isOk = res.ok && (!Array.isArray(data) || !data[0]?.error);

      this.addLog('Philips Hue', 'BRIDGE_COMMAND', {
        target: `${hue.targetType} ${hue.targetId}`,
        payload: bodyPayload,
        response: data,
        status: res.status,
        latencyMs: latency
      }, isOk);
      return { success: isOk, data };
    } catch (err) {
      this.addLog('Philips Hue', 'BRIDGE_ERROR', { endpoint, error: err.message }, false);
      return { success: false, error: err.message };
    }
  }

  // --- Lighting Orchestration ---

  async setAmbientLighting(teamId = null) {
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
      xy: team.ambientXy
    });

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
    this.currentMode = 'celebration';
    this.flashStep = 0;

    // Clear existing celebration
    if (this.activeFlashInterval) clearInterval(this.activeFlashInterval);
    if (this.activeCelebrationTimer) clearTimeout(this.activeCelebrationTimer);

    const celebration = team.celebration;
    const celebrationColors = celebration.colors;
    const durationMs = (this.config.general.celebrationDurationSeconds || 12) * 1000;
    const flashIntervalMs = celebration.flashIntervalMs || 250;

    this.addLog('Lighting', 'GOAL_CELEBRATION_START', {
      team: team.name,
      title: celebration.celebrationTitle,
      event: scoreEvent,
      style: celebration.style,
      durationMs
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
      duration_seconds: Math.round(durationMs / 1000)
    });

    // Native Hue Alert Mode (lselect triggers a 15-second breathing flash)
    if (this.config.philipsHue.useAlertStrobe) {
      const firstCelebrationRgb = celebrationColors[0];
      const xy = rgbToXy(firstCelebrationRgb[0], firstCelebrationRgb[1], firstCelebrationRgb[2]);
      this.dispatchHueBridge({
        on: true,
        xy,
        bri: 254,
        alert: 'lselect'
      });
    }

    // Home Assistant REST Flash
    this.dispatchHomeAssistantService(celebrationColors[0], 254, 'long');

    // Virtual & Software Strobe Loop for real-time visualization and rapid hardware cycling
    this.activeFlashInterval = setInterval(() => {
      this.flashStep++;
      const colorIndex = this.flashStep % celebrationColors.length;
      this.currentLightColor = celebrationColors[colorIndex];
      this.notifyStateChange({
        flashStep: this.flashStep,
        celebrationTitle: celebration.celebrationTitle,
        celebrationTagline: celebration.celebrationTagline,
        audioKey: celebration.audioKey
      });
    }, flashIntervalMs);

    // Schedule celebration end & auto-restore to ambient
    this.activeCelebrationTimer = setTimeout(() => {
      this.endCelebration();
    }, durationMs);

    this.notifyStateChange({
      celebrationStarted: true,
      celebrationTitle: celebration.celebrationTitle,
      celebrationTagline: celebration.celebrationTagline,
      audioKey: celebration.audioKey,
      scoreEvent
    });
  }

  endCelebration() {
    if (this.activeFlashInterval) {
      clearInterval(this.activeFlashInterval);
      this.activeFlashInterval = null;
    }
    if (this.activeCelebrationTimer) {
      clearTimeout(this.activeCelebrationTimer);
      this.activeCelebrationTimer = null;
    }

    const team = TEAMS[this.currentTeamId];
    this.addLog('Lighting', 'CELEBRATION_RESTORE', {
      team: team.name,
      restoringAmbient: team.ambientRgb
    });

    // Reset alert on Philips Hue
    this.dispatchHueBridge({
      on: true,
      xy: team.ambientXy,
      bri: this.config.general.ambientBrightness || 220,
      alert: 'none'
    });

    this.setAmbientLighting(this.currentTeamId);
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

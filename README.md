# 🏒 Game Day Lights — Philips Hue & Home Assistant Smart Sync

**Game Day Lights** synchronizes your smart home lighting (Philips Hue & Home Assistant) with live sports game days. Select today's match for the **Carolina Hurricanes**, **NC State Wolfpack**, **Minnesota Vikings**, or **Tennessee Volunteers**, and the app sets your ambient lighting to the team's official colors. When a score occurs (via an ESPN webhook or built-in game simulator), it triggers high-energy celebration sequences: flashing emergency red for Carolina, energetic red & white for Wolfpack, majestic royal purple & gold for Minnesota, or electric orange & white for Tennessee.

---

## 🌟 Key Features

1. **Four Featured Teams & Authentic Lighting Profiles**:
   - **Carolina Hurricanes (Canes - NHL)**: Storm Red (`#C8102E` / RGB `[200, 16, 46]`) & Onyx ambient glow. Celebration: Rapid emergency red siren flashing, warning beacon pulse, and NHL brass goal horn.
   - **NC State Wolfpack (NCAA)**: Wolfpack Red (`#CC0000` / RGB `[204, 0, 0]`) & Clean White. Celebration: Red & white high-tempo touchdown burst strobe, collegiate fight siren.
   - **Minnesota Vikings (NFL)**: Vikings Royal Purple (`#4F2683` / RGB `[79, 38, 131]`) & Vikings Gold (`#FFC62F`). Celebration: Alternating purple & gold strobe flash, acoustic Gjallarhorn drone blast, and Skol chant boom.
   - **Tennessee Volunteers (Vols - NCAA Football)**: Rocky Top Orange (`#FF8200` / RGB `[255, 130, 0]`) & Smokey White. Celebration: High-energy orange & white strobe, synthesized Rocky Top fight song brass fanfare.

2. **Dual Smart Home Integration**:
   - **Home Assistant**: Direct webhook triggers (`POST /api/webhook/<webhook_id>`) or REST service calls (`POST /api/services/light/turn_on`), with pre-formatted, copy-paste ready `automations.yaml` snippets.
   - **Philips Hue Bridge**: Direct local REST control (`PUT /api/<username>/lights/<id>/state` or `/groups/<id>/action`) utilizing Hue's native hardware `lselect` 15-second breathing flash alert and CIE 1931 XY color precision.
   - **Auto-Restoration**: Celebrations automatically revert smoothly back to the team's ambient lighting state after the celebration duration expires.

3. **Interactive 3D / Realistic Smart Room Visualizer**:
   - Simulated living room environment featuring 2 ceiling pendant smart bulbs, a TV backlight LED strip (Hue Play gradient lightstrip), and 2 floor wash lamps.
   - Real-time CSS and SVG bloom rendering that mimics Hue room wash in ambient mode and celebration strobe mode.

4. **Web Audio API Celebration Synthesizer**:
   - Zero-dependency, client-side synthesized sound effects:
     - Canes: Dual detuned brass air horn chords + emergency warning siren sweep.
     - Vikings: Ancient resonant Gjallarhorn drone with war drum beat.
     - Wolfpack: Collegiate fight brass triad + howl siren.
     - Vols: Authentic synthesized "Rocky Top" collegiate brass fanfare.
   - Master volume and mute toggle controls.

5. **Live Scoreboard & Game Day Simulation Studio**:
   - Real-time scoreboard with team scores, game period/quarter, clock, and play-by-play ticker.
   - One-click simulator buttons (`+ Goal`, `+ Touchdown`, `+ Opponent Score`, `Reset Match`).
   - Inbound webhook tester with preset payloads to test live API integrations anytime.

6. **Live Telemetry & Activity Feed**:
   - Real-time log tracking inbound webhooks, outbound Hue Bridge calls, Home Assistant responses, status codes, and latency in milliseconds.

---

## 🚀 Quick Start

### 1. Start the Server
The application runs on native Node.js 24 with **zero external dependencies**:

```bash
node server/server.js
```

The server will start at:
- **Web App Dashboard**: [http://localhost:3300](http://localhost:3300)
- **Generic Score Webhook**: `http://localhost:3300/api/webhooks/score`
- **ESPN Webhook**: `http://localhost:3300/api/webhooks/espn`

### 2. Open the Web App
Open [http://localhost:3300](http://localhost:3300) in your browser:
1. Click on **Carolina Hurricanes**, **NC State Wolfpack**, **Minnesota Vikings**, or **Tennessee Volunteers** to sync your ambient lighting.
2. Click **⚡ Test Goal Celebration** or use the simulator controls (`+ Goal`, `+ Touchdown`) to trigger the flashing lights and celebration audio.

---

## 📡 Webhook Integration Guide

Point your sports webhook service, ESPN scraper, FotMob relay, or IFTTT applet to:

### Inbound Endpoint
`POST http://<your-server-ip>:3300/api/webhooks/score`

### Request Header
`Content-Type: application/json`

### Example Payloads

#### Carolina Hurricanes Goal:
```bash
curl -X POST http://localhost:3300/api/webhooks/score \
  -H "Content-Type: application/json" \
  -d '{
    "team": "canes",
    "event": "GOAL",
    "player": "Sebastian Aho",
    "scoreTeam": 4,
    "scoreOpponent": 2
  }'
```

#### Minnesota Vikings Touchdown:
```bash
curl -X POST http://localhost:3300/api/webhooks/score \
  -H "Content-Type: application/json" \
  -d '{
    "team": "vikings",
    "event": "TOUCHDOWN",
    "player": "Justin Jefferson",
    "points": 6
  }'
```

#### Tennessee Volunteers Touchdown:
```bash
curl -X POST http://localhost:3300/api/webhooks/score \
  -H "Content-Type: application/json" \
  -d '{
    "team": "vols",
    "event": "TOUCHDOWN",
    "player": "Squirrel White",
    "points": 6
  }'
```

---

## 🏠 Home Assistant Configuration

In the web app, navigate to the **Home Assistant Setup** tab to customize your entity IDs and copy your ready-to-use YAML configuration:

```yaml
- id: 'game_day_lights_webhook'
  alias: 'Game Day Lights - Score Celebration & Ambient Sync'
  trigger:
    - platform: webhook
      webhook_id: "game_day_score_celebration"
      allowed_methods:
        - POST
  action:
    - choose:
        # Score Celebration Flash
        - conditions:
            - condition: template
              value_template: "{{ trigger.json.event == 'score_celebration' }}"
          sequence:
            - service: light.turn_on
              target:
                entity_id: "light.living_room_lights"
              data:
                rgb_color: "{{ trigger.json.rgb_color }}"
                brightness: 255
                flash: long
            - delay:
                seconds: "{{ trigger.json.duration_seconds | default(12) }}"
            - service: light.turn_on
              target:
                entity_id: "light.living_room_lights"
              data:
                rgb_color: "{{ trigger.json.rgb_color }}"
                brightness: 220
                transition: 2

        # Ambient Game Day Sync
        - conditions:
            - condition: template
              value_template: "{{ trigger.json.event == 'ambient_sync' }}"
          sequence:
            - service: light.turn_on
              target:
                entity_id: "light.living_room_lights"
              data:
                rgb_color: "{{ trigger.json.rgb_color }}"
                brightness: "{{ trigger.json.brightness | default(220) }}"
                transition: 3
```

---

## 💡 Philips Hue Direct Bridge Setup

To connect directly to your Philips Hue Bridge without Home Assistant:
1. Open the **Philips Hue Bridge** tab in the dashboard.
2. Enter your Bridge IP (e.g. `192.168.1.50`).
3. Press the physical link button on your Hue Bridge, then run:
   ```bash
   curl -X POST http://<BRIDGE_IP>/api -d '{"devicetype":"game_day_lights#mac"}'
   ```
4. Paste the returned `username` into the Hue API Key field.
5. Enter your target Entertainment Group ID (e.g. `1`) or individual light ID.
6. Click **Save Hue Settings** and **Test Hue Flash**.

---

## 🧪 Running Automated Tests

Run the included verification suite:
```bash
node test/test_core.js
```
The test suite validates team configs, RGB-to-XY math, state transitions, celebration sequences, score delta detection, and telemetry logging.

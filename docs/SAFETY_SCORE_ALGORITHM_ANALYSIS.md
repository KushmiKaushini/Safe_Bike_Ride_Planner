# Safe Bike Ride Planner — Safety Score Algorithm Analysis 🚴‍♂️⚖️

> **Scope**: Mathematical evaluation formulas, European AQI 1–5 normalization, rider threshold adjustments, and mobile display contract.

---

## 1. Safety Score Architecture & Mobile Contract

In the distributed mobile architecture, the **cycling safety score is evaluated strictly on the backend** (`ride-safety-service`). The mobile client operates as a display-only consumer.

### Mobile Display Contract
- **Zero Client Calculation**: The mobile app does not calculate, modify, or override safety scores. This avoids inconsistencies between platforms.
- **Rendering Responsibilities**: The Flutter client receives the server response and renders:
  - Circular Score Gauge: 0–100 progress value.
  - Level Badge & Theme Color:
    - 🟢 **Safe**: Score $\ge 70$ (Color: `#22C55E`)
    - 🟡 **Caution**: Score $40 - 69$ (Color: `#F59E0B`)
    - 🔴 **Unsafe**: Score $< 40$ (Color: `#EF4444`)
  - Weather Cards: Temperature (°C), Wind Speed (m/s), Humidity (%).
  - Air Quality Pill: European AQI 1–5 (Good, Fair, Moderate, Poor, Very Poor).

---

## 2. Server-Side Composite Scoring Engine

The overall safety score $S_{\text{composite}}$ (bounded in range $[0, 100]$) is computed using weighted domain sub-scores:

$$S_{\text{composite}} = \max\Big(0, \min\big(100, \text{round}(0.40 \cdot S_{\text{weather}} + 0.40 \cdot S_{\text{aqi}} + 0.20 \cdot S_{\text{condition}})\big)\Big)$$

---

## 3. Sub-Score Formulas & Normalization

### 3.1 Weather Sub-Score ($S_{\text{weather}}$)
Evaluates thermal comfort, wind hazard, and moisture starting from a baseline score of 100 with deductions:

- **Temperature Deductions**:
  - $20^\circ\text{C} - 25^\circ\text{C}$: Ideal comfort ($0$ deduction).
  - $15^\circ\text{C} - 19^\circ\text{C}$ or $26^\circ\text{C} - 30^\circ\text{C}$: Minor discomfort ($-5$ deduction).
  - $10^\circ\text{C} - 14^\circ\text{C}$ or $31^\circ\text{C} - 35^\circ\text{C}$: Noticeable strain ($-15$ deduction).
  - $5^\circ\text{C} - 9^\circ\text{C}$ or $36^\circ\text{C} - 40^\circ\text{C}$: Severe thermal stress ($-30$ deduction).
  - $< 5^\circ\text{C}$ or $> 40^\circ\text{C}$: Dangerous conditions ($-50$ deduction).

- **Wind Speed Hazards (m/s)**:
  - $\le 4.0\text{ m/s}$: Light breeze ($0$ deduction).
  - $4.1 - 8.0\text{ m/s}$: Moderate wind ($-10$ deduction).
  - $8.1 - 11.0\text{ m/s}$: Strong breeze, cycling requires significant effort ($-25$ deduction).
  - $11.1 - 14.0\text{ m/s}$: High wind, bicycle handling compromised ($-45$ deduction).
  - $> 14.0\text{ m/s}$: Hazardous wind gusts ($-65$ deduction).

- **Humidity Factor**:
  - Humidity $> 85\%$ when temperature $> 28^\circ\text{C}$ applies an additional $-10$ heat-index penalty.

---

### 3.2 European AQI Sub-Score ($S_{\text{aqi}}$)
OpenWeatherMap returns air pollution data indexed to the European Air Quality Index (1–5 scale). The algorithm normalizes these values as follows:

| OWM AQI Index | Qualitative Level | Mobile UI Pill | Sub-Score ($S_{\text{aqi}}$) | Impact on Cycling |
| :---: | :---: | :---: | :---: | :--- |
| **1** | Good | 🟢 Good | **100** | Air quality is ideal for outdoor cycling. |
| **2** | Fair | 🟢 Fair | **80** | Minor pollution; acceptable for all cyclists. |
| **3** | Moderate | 🟡 Moderate | **60** | Sensitive cyclists may experience slight irritation. |
| **4** | Poor | 🟠 Poor | **30** | Unhealthy for extended cardiovascular exertion. |
| **5** | Very Poor | 🔴 Very Poor | **0** | Hazardous air quality; outdoor cycling not advised. |

---

### 3.3 Condition Sub-Score ($S_{\text{condition}}$)

| Condition String | Condition Severity | Sub-Score ($S_{\text{condition}}$) |
| :--- | :--- | :---: |
| `Clear` | Optimal clear skies | **100** |
| `Clouds` | Overcast / partly cloudy | **90** |
| `Mist` / `Fog` / `Haze` | Reduced visibility hazard | **60** |
| `Drizzle` | Light wet roads | **55** |
| `Rain` | Wet road braking hazard | **30** |
| `Snow` | Slippery traction hazard | **15** |
| `Thunderstorm` | Severe electrical / squall hazard | **0** |

---

## 4. Rider Threshold Profiles

Via mobile screen **SC5: Threshold Settings**, cyclists can select their riding profile, which is stored in MongoDB and applied during evaluations:

```
┌────────────────────────────────┬───────────────────────────────┐
│     BEGINNER PROFILE           │     EXPERIENCED PROFILE       │
├────────────────────────────────┼───────────────────────────────┤
│ • Max Wind Speed: 8.0 m/s      │ • Max Wind Speed: 12.0 m/s     │
│ • Min / Max Temp: 12°C - 32°C  │ • Min / Max Temp: 5°C - 38°C   │
│ • Max Acceptable AQI: 2 (Fair) │ • Max Acceptable AQI: 3 (Mod) │
│ • Rain Penalty: Strict         │ • Rain Penalty: Moderate      │
└────────────────────────────────┴───────────────────────────────┘
```

When conditions exceed a cyclist's configured thresholds, the backend applies an automatic $-20$ point safety override penalty and prefixes the summary message with a personalized alert.

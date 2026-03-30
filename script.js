/ ─────────────────────────────────────────────
// COMMON SENSES HEAT ALERT TOOL
// script.js
// ─────────────────────────────────────────────

// ── Sensor locations along the Blue Hill Ave corridor ──
// Coordinates are approximate neighborhood centroids.
// TODO: Replace lat/lon with actual Common Senses sensor
// coordinates once Juan Cruz provides the API endpoint.
// Expected endpoint format: GET /api/sensors → [{id, name, lat, lon, temp, humidity, ...}]
const LOCATIONS = {
  dudley:       { name: 'Dudley Town Common, Roxbury',              lat: 42.3280, lon: -71.0829 },
  nubian:       { name: 'Nubian Square, Roxbury',                   lat: 42.3305, lon: -71.0847 },
  uphams:       { name: "Upham's Corner, Dorchester",               lat: 42.3182, lon: -71.0666 },
  fourCorners:  { name: 'Four Corners, Dorchester',                 lat: 42.3064, lon: -71.0799 },
  blueHillMid:  { name: 'Blue Hill Ave & Quincy St, Dorchester',    lat: 42.3010, lon: -71.0831 },
  ashmont:      { name: 'Ashmont, Dorchester',                      lat: 42.2847, lon: -71.0640 },
  mattapanSq:   { name: 'Mattapan Square',                          lat: 42.2714, lon: -71.0932 },
  mattapanN:    { name: 'Mattapan (North)',                         lat: 42.2803, lon: -71.0891 },
  franklinPark: { name: 'Franklin Park, Roxbury/Dorchester',        lat: 42.3068, lon: -71.1006 },
  hydepark:     { name: 'Hyde Park',                                lat: 42.2559, lon: -71.1242 },
  jamaicaPlain: { name: 'Jamaica Plain',                            lat: 42.3106, lon: -71.1139 },
};

// ── State ──
let currentUnit = 'F';

// ── Unit helpers ──
function setUnit(u) {
  currentUnit = u;
  document.getElementById('btnF').classList.toggle('active', u === 'F');
  document.getElementById('btnC').classList.toggle('active', u === 'C');
  // Re-render if result is showing
  const sel = document.getElementById('locationSelect').value;
  if (sel && document.getElementById('result').innerHTML.trim()) checkHeat();
}

function toDisplay(tempF) {
  if (currentUnit === 'F') return Math.round(tempF) + '°F';
  return Math.round((tempF - 32) * 5 / 9) + '°C';
}

// ── Risk level logic ──
// Thresholds are based on "feels like" (apparent) temperature in °F.
// Adjust these if the Common Senses team has different local thresholds.
function getLevel(feelsLikeF) {
  if (feelsLikeF >= 100) return 'extreme';
  if (feelsLikeF >= 90)  return 'high';
  if (feelsLikeF >= 80)  return 'moderate';
  return 'low';
}

const LEVEL_LABELS = {
  low:      'Low Heat Risk',
  moderate: 'Moderate Heat Risk',
  high:     'High Heat Alert',
  extreme:  'Extreme Heat Emergency',
};

const LEVEL_DESCS = {
  low:      'Conditions are comfortable. Stay hydrated and enjoy your day.',
  moderate: 'It\'s getting warm out. Drink water regularly, especially if you\'re spending time outdoors.',
  high:     'Heat alert in effect. Limit outdoor activity during peak hours (12–4 PM). Check on elderly neighbors and anyone without AC.',
  extreme:  'Dangerous heat conditions. Stay indoors with AC if possible. Cooling centers are open in your area. Call 311 for assistance.',
};

const LEVEL_TIPS = {
  low: [
    'Stay hydrated throughout the day',
    'Enjoy outdoor activities with normal precautions',
    'Keep an eye on the forecast — conditions can change quickly in summer',
  ],
  moderate: [
    'Drink water every 20–30 minutes if you\'re outside',
    'Wear light, loose clothing and a hat',
    'Try to avoid being outdoors during peak heat hours (12–4 PM)',
    'Watch for early signs of heat exhaustion: dizziness, heavy sweating, weakness',
  ],
  high: [
    'Stay in air-conditioned spaces as much as possible',
    'Never leave children or pets in a parked car — even for a few minutes',
    'Check on elderly neighbors, family members, and anyone without AC',
    'Cooling centers are available — call 311 or visit boston.gov for the nearest location',
    'Wear sunscreen and avoid strenuous outdoor activity',
  ],
  extreme: [
    'Move to an air-conditioned space immediately if you feel overheated',
    'Call 911 for heat stroke symptoms: confusion, no sweating, very high body temperature',
    'Cooling centers are OPEN — call 311 for the nearest location',
    'Run cool water over your wrists and neck to bring your temperature down fast',
    'Do not leave anyone in a parked vehicle under any circumstances',
  ],
};

// ── Day label ──
function getDayLabel(offsetDays) {
  if (offsetDays === 0) return 'Today';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return days[d.getDay()];
}

// ── Main fetch + render ──
async function checkHeat() {
  const key = document.getElementById('locationSelect').value;
  if (!key) {
    document.getElementById('result').innerHTML =
      '<div class="card"><div class="error-msg">Please select a neighborhood first.</div></div>';
    return;
  }

  const loc = LOCATIONS[key];
  const btn = document.querySelector('#location-card .primary-btn');
  btn.disabled = true;
  btn.textContent = 'Loading...';
  document.getElementById('result').innerHTML =
    '<div class="card"><div class="loading">Fetching conditions for ' + loc.name + '...</div></div>';

  try {
    // ── TODO: Common Senses sensor API ──────────────────────────────────────
    // When Juan provides the endpoint, replace the Open-Meteo call below with:
    //
    // const csRes = await fetch('https://YOUR_BARI_API_ENDPOINT/sensors/' + key);
    // const csData = await csRes.json();
    // Then map csData fields to: feelsLikeF, actualF, humidity, windMph
    // ────────────────────────────────────────────────────────────────────────

    const url = [
      'https://api.open-meteo.com/v1/forecast',
      '?latitude=' + loc.lat,
      '&longitude=' + loc.lon,
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,uv_index',
      '&daily=apparent_temperature_max,temperature_2m_max',
      '&temperature_unit=fahrenheit',
      '&wind_speed_unit=mph',
      '&forecast_days=5',
      '&timezone=America%2FNew_York',
    ].join('');

    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather API error: ' + res.status);
    const data = await res.json();

    const c = data.current;
    const daily = data.daily;

    const feelsLikeF = c.apparent_temperature;
    const actualF    = c.temperature_2m;
    const humidity   = Math.round(c.relative_humidity_2m);
    const windMph    = Math.round(c.wind_speed_10m);
    const uvIndex    = Math.round(c.uv_index ?? 0);
    const level      = getLevel(feelsLikeF);

    const forecastHTML = daily.time.slice(0, 5).map((_, i) => {
      const t = daily.apparent_temperature_max[i];
      const l = getLevel(t);
      return `<div class="forecast-item">
        <div class="forecast-day">${getDayLabel(i)}</div>
        <div class="forecast-temp ${l}">${toDisplay(t)}</div>
      </div>`;
    }).join('');

    const tipsHTML = LEVEL_TIPS[level]
      .map(t => `<div class="tip-item"><span class="tip-dash">—</span>${t}</div>`)
      .join('');

    const now = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    document.getElementById('result').innerHTML = `
      <div class="card">
        <div class="location-name">
          <span class="status-dot ${level}"></span>
          ${loc.name}
        </div>
        <div class="alert-box ${level}">
          <div class="alert-level">${LEVEL_LABELS[level]}</div>
          <div class="alert-temp">${toDisplay(feelsLikeF)}</div>
          <div class="alert-feels">Feels like &nbsp;·&nbsp; Actual ${toDisplay(actualF)}</div>
          <div class="alert-desc">${LEVEL_DESCS[level]}</div>
        </div>
        <div class="meta-grid">
          <div class="meta-item">
            <div class="meta-label">Humidity</div>
            <div class="meta-value">${humidity}%</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Wind</div>
            <div class="meta-value">${windMph} mph</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">UV Index</div>
            <div class="meta-value">${uvIndex}</div>
          </div>
        </div>
        <div class="forecast-title">5-day outlook</div>
        <div class="forecast-row">${forecastHTML}</div>
        <div class="tips">
          <div class="tips-title">What to do</div>
          ${tipsHTML}
        </div>
        <div class="updated">Updated ${now} · Placeholder weather data · Common Senses sensor data coming soon</div>
      </div>
    `;

  } catch (err) {
    console.error(err);
    document.getElementById('result').innerHTML =
      '<div class="card"><div class="error-msg">Could not load weather data. Please check your connection and try again.</div></div>';
  }

  btn.disabled = false;
  btn.textContent = 'Check Conditions';
}

// ── Notification signup ──
// TODO: Replace the console.log below with a real backend call.
// Options: Formspree (free, no backend), EmailJS, or a BARI server endpoint.
// For SMS: integrate Twilio (needs a server) or a service like Textbelt.
function submitNotify() {
  const neighborhood = document.getElementById('notifyLocation').value;
  const email        = document.getElementById('notifyEmail').value.trim();
  const phone        = document.getElementById('notifyPhone').value.trim();
  const level        = document.getElementById('notifyLevel').value;
  const msgEl        = document.getElementById('notify-msg');

  // Basic validation
  if (!neighborhood) {
    showNotifyMsg('Please select a neighborhood.', 'error'); return;
  }
  if (!email && !phone) {
    showNotifyMsg('Please enter at least an email or phone number.', 'error'); return;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showNotifyMsg('Please enter a valid email address.', 'error'); return;
  }

  try {
    const res = await fetch('https://formspree.io/f/mwvwlgwn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        neighborhood: LOCATIONS[neighborhood]?.name || neighborhood,
        email,
        phone,
        alertLevel: level,
      }),
    });

    if (!res.ok) throw new Error('Formspree error: ' + res.status);

    showNotifyMsg("You're signed up! We'll alert you when heat conditions reach your selected level.", 'success');
    document.getElementById('notifyEmail').value = '';
    document.getElementById('notifyPhone').value = '';
    document.getElementById('notifyLocation').value = '';
  } catch (err) {
    console.error(err);
    showNotifyMsg('Something went wrong. Please try again or email info@commonsensesproject.org.', 'error');
  }
}

function showNotifyMsg(msg, type) {
  const el = document.getElementById('notify-msg');
  el.textContent = msg;
  el.className = type;
}

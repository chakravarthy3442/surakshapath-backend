/**
 * ═══════════════════════════════════════════════════════════
 *   api.js — SurakshaPath Frontend ↔ Backend Connector  v2
 *
 *   CHANGES FROM v1:
 *   - Added SP.getHospitals()         → for Member 2 hospital scan
 *   - Added SP.patientOnboard()       → "Patient Picked Up" button
 *   - Added SP.selectHospital()       → hospital selection
 *   - Added SP.getNextJob()           → loadNewJob() equivalent
 *   - triggerSOS() now returns timer, priority, title, sub
 *   - acceptJob() now returns those fields too
 *   - skip penalty now returns forcedOffline flag
 *
 *   HOW TO USE: Add <script src="api.js"></script> in HTML
 *   BEFORE script.js. Then call window.SP.functionName()
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

const API_BASE = 'http://localhost:3001/api';
const WS_URL   = 'ws://localhost:3001';

window.SP_SESSION = {
  user: null, driver: null, token: null, role: null, currentJobId: null
};

// ══════════════════════════════════════════════════════════
//   AUTH
// ══════════════════════════════════════════════════════════

async function callerLogin(phone) {
  try {
    const res  = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, role: 'caller' })
    });
    const data = await res.json();
    if (data.success) {
      window.SP_SESSION.user  = data.user;
      window.SP_SESSION.token = data.token;
      window.SP_SESSION.role  = 'caller';
    }
    return data;
  } catch { return { success: false, error: 'Cannot connect to server' }; }
}

async function driverLogin(phone, password) {
  try {
    const res  = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password, role: 'driver' })
    });
    const data = await res.json();
    if (data.success) {
      window.SP_SESSION.driver = data.driver;
      window.SP_SESSION.token  = data.token;
      window.SP_SESSION.role   = 'driver';
    }
    return data;
  } catch { return { success: false, error: 'Cannot connect to server' }; }
}

async function logout() {
  const driverId = window.SP_SESSION.driver?.id;
  if (driverId) {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId })
    }).catch(() => {});
  }
  window.SP_SESSION = { user: null, driver: null, token: null, role: null, currentJobId: null };
}

async function getLeaderboard() {
  const res = await fetch(`${API_BASE}/auth/leaderboard`);
  return res.json();
}

// ══════════════════════════════════════════════════════════
//   DISPATCH
// ══════════════════════════════════════════════════════════

/**
 * Caller presses SOS.
 * Returns: { success, jobId, driver, eta, title, sub, priority, priorityLabel, timerSeconds, nearbyUnits }
 */
async function triggerSOS(lat, lng, emergencyType = 'accident') {
  try {
    const s   = window.SP_SESSION;
    const res = await fetch(`${API_BASE}/dispatch/sos`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callerId: s.user?.id || 'guest', callerPhone: s.user?.phone || 'unknown',
        callerLat: lat, callerLng: lng, emergencyType, address: 'Location from GPS'
      })
    });
    const data = await res.json();
    if (data.success) window.SP_SESSION.currentJobId = data.jobId;
    return data;
  } catch {
    // Offline fallback — demo data matches Member 2's jobs[] format
    return {
      success: true, jobId: 'demo-job-' + Date.now(), status: 'dispatched',
      message: 'Ambulance dispatched! (Demo mode)',
      title: 'Road accident — your location', sub: 'Nearest Hosp → your location',
      priority: 'P1', priorityLabel: 'P1 Critical',
      timerSeconds: 30, dist: '2.8 km',
      driver: { id: 'drv-001', name: 'Rajan Kumar', vehicleNumber: 'KA-01-AB-1234', rating: 4.9, tier: 'Gold' },
      eta: { seconds: 300, formatted: '5 min 00 sec', display: '~5 min' }, distanceKm: '2.8'
    };
  }
}

async function getNearestAmbulances(lat, lng) {
  try {
    const res = await fetch(`${API_BASE}/dispatch/nearest?lat=${lat}&lng=${lng}`);
    return res.json();
  } catch {
    return {
      success: true, count: 3,
      units: [
        { id:'drv-001', name:'Rajan Kumar', distKm:'2.8', eta:'5 min', tier:'Gold', rating:4.9, lat:12.9352, lng:77.6245 },
        { id:'drv-002', name:'Meena Devi',  distKm:'4.1', eta:'9 min', tier:'Silver', rating:4.7, lat:12.9165, lng:77.6220 },
        { id:'drv-003', name:'Vijay Anand', distKm:'1.6', eta:'4 min', tier:'Gold', rating:4.8, lat:12.9784, lng:77.6408 }
      ]
    };
  }
}

async function getJobStatus(jobId) {
  try {
    const res = await fetch(`${API_BASE}/dispatch/job/${jobId}`);
    return res.json();
  } catch { return { success: false }; }
}

async function acceptJob(jobId, driverId) {
  try {
    const res = await fetch(`${API_BASE}/dispatch/accept`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, driverId })
    });
    return res.json();
  } catch { return { success: false }; }
}

/**
 * Driver skips job.
 * Returns: { success, penalised, forcedOffline, newScore, newSkipCount, message }
 * If forcedOffline = true → Member 2's autoDecline() forced-offline banner should show.
 */
async function skipJob(jobId, driverId) {
  try {
    const res = await fetch(`${API_BASE}/dispatch/skip`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, driverId })
    });
    return res.json();
  } catch { return { success: false }; }
}

async function markArrived(jobId, driverId) {
  try {
    const res = await fetch(`${API_BASE}/dispatch/arrived`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, driverId })
    });
    return res.json();
  } catch { return { success: false }; }
}

/**
 * NEW: Driver marks patient picked up.
 * Call when Member 2's patientPickedUp() button is clicked.
 * Returns: { success, status: 'patient_onboard', hospitals: [...] }
 * The hospitals array is what Member 2 renders in renderHospitalItem().
 */
async function patientOnboard(jobId, driverId) {
  try {
    const res = await fetch(`${API_BASE}/dispatch/patient-onboard`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, driverId })
    });
    return res.json();
  } catch {
    // Offline fallback — same shape as Member 2's HOSPITALS array
    return {
      success: true, status: 'patient_onboard',
      hospitals: [
        { id:'hosp-001', name:'Victoria Hospital', dist:'1.2 km', eta:'3 min', beds:'12 ICU beds', trauma:true, tier:'green', icon:'🏥', pos:{x:0.22,y:0.28} },
        { id:'hosp-002', name:'Manipal Hospital',  dist:'2.1 km', eta:'5 min', beds:'8 ICU beds',  trauma:true, tier:'green', icon:'🏥', pos:{x:0.75,y:0.22} },
        { id:'hosp-003', name:"St. John's Hospital", dist:'2.8 km', eta:'7 min', beds:'4 ICU beds', trauma:false, tier:'amber', icon:'🏥', pos:{x:0.80,y:0.72} },
        { id:'hosp-004', name:'Fortis Hospital',   dist:'3.4 km', eta:'9 min', beds:'2 ICU beds',  trauma:false, tier:'amber', icon:'🏥', pos:{x:0.18,y:0.75} }
      ]
    };
  }
}

/**
 * NEW: Driver selects hospital destination.
 * Call when Member 2's selectHospital() is clicked.
 * Returns: { success, hospital: { name, eta, dist, ... } }
 */
async function selectHospital(jobId, driverId, hospitalId) {
  try {
    const res = await fetch(`${API_BASE}/dispatch/select-hospital`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, driverId, hospitalId })
    });
    return res.json();
  } catch { return { success: false }; }
}

/**
 * NEW: Get next job for driver (after completing current one).
 * Equivalent to Member 2's loadNewJob() — but from backend, not hardcoded.
 * Returns: { success, timerSeconds: 30, job: { title, sub, dist, eta, priority, priorityLabel, ... } }
 */
async function getNextJob(driverId) {
  try {
    const res = await fetch(`${API_BASE}/dispatch/next-job/${driverId}`);
    const data = await res.json();
    if (data.success && data.job) {
      window.SP_SESSION.currentJobId = data.job.id;
    }
    return data;
  } catch {
    // Offline demo fallback — random job from Member 2's array
    const pool = [
      { title:'Cardiac arrest — Koramangala 5th Block', sub:"Manipal Hosp → 5th Block", dist:'2.8 km', eta:'~5 min', priority:'P1', priorityLabel:'P1 Critical' },
      { title:'Multi-vehicle accident — Silk Board',    sub:"St. John's Hosp → Silk Board Jn", dist:'4.1 km', eta:'~9 min', priority:'P1', priorityLabel:'P1 Critical' },
      { title:'Stroke patient — Indiranagar',           sub:'Hosmat Hosp → 100ft Road', dist:'1.6 km', eta:'~4 min', priority:'P2', priorityLabel:'P2 Urgent' },
      { title:'Pedestrian hit — Whitefield',            sub:'Narayana Hosp → ITPL Main Rd', dist:'5.3 km', eta:'~12 min', priority:'P1', priorityLabel:'P1 Critical' },
    ];
    return { success: true, timerSeconds: 30, job: { id: 'demo-' + Date.now(), ...pool[Math.floor(Math.random() * pool.length)] } };
  }
}

async function getDriverJob(driverId) {
  try {
    const res = await fetch(`${API_BASE}/dispatch/driver-job/${driverId}`);
    return res.json();
  } catch { return { success: false }; }
}

/**
 * Get full hospital list (for pre-loading in driver app)
 */
async function getHospitals() {
  try {
    const res = await fetch(`${API_BASE}/dispatch/hospitals`);
    return res.json();
  } catch {
    return {
      success: true,
      hospitals: [
        { id:'hosp-001', name:'Victoria Hospital', dist:'1.2 km', eta:'3 min', beds:'12 ICU beds', trauma:true, tier:'green', icon:'🏥', pos:{x:0.22,y:0.28} },
        { id:'hosp-002', name:'Manipal Hospital',  dist:'2.1 km', eta:'5 min', beds:'8 ICU beds',  trauma:true, tier:'green', icon:'🏥', pos:{x:0.75,y:0.22} },
        { id:'hosp-003', name:"St. John's Hospital", dist:'2.8 km', eta:'7 min', beds:'4 ICU beds', trauma:false, tier:'amber', icon:'🏥', pos:{x:0.80,y:0.72} },
        { id:'hosp-004', name:'Fortis Hospital',   dist:'3.4 km', eta:'9 min', beds:'2 ICU beds',  trauma:false, tier:'amber', icon:'🏥', pos:{x:0.18,y:0.75} }
      ]
    };
  }
}

// ══════════════════════════════════════════════════════════
//   GPS
// ══════════════════════════════════════════════════════════

async function updateDriverGPS(driverId, lat, lng, speed = 0) {
  try {
    const res = await fetch(`${API_BASE}/gps/update`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId, lat, lng, speed })
    });
    return res.json();
  } catch { return { success: false }; }
}

async function getAllDriverPositions() {
  try {
    const res = await fetch(`${API_BASE}/gps/drivers`);
    return res.json();
  } catch { return { success: false, drivers: [] }; }
}

// ══════════════════════════════════════════════════════════
//   WEBSOCKET
// ══════════════════════════════════════════════════════════

let ws = null;
let pollingTimer = null;

function connectJobTracking(jobId, role, onLocationUpdate, onArrived) {
  if (ws) ws.close();
  try {
    ws = new WebSocket(WS_URL);
    ws.onopen = () => ws.send(JSON.stringify({ type: 'JOIN', jobId, role }));
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'LOCATION')           onLocationUpdate?.(msg.lat, msg.lng, msg.etaSeconds);
        if (msg.type === 'AMBULANCE_ARRIVED') { onArrived?.(); ws.close(); }
      } catch {}
    };
    ws.onerror = () => startPolling(jobId, onLocationUpdate, onArrived);
  } catch {
    startPolling(jobId, onLocationUpdate, onArrived);
  }
}

function startPolling(jobId, onLocationUpdate, onArrived) {
  clearInterval(pollingTimer);
  pollingTimer = setInterval(async () => {
    const data = await getJobStatus(jobId);
    if (data.success && data.job) {
      if (data.job.driver) onLocationUpdate?.(data.job.driver.lat, data.job.driver.lng, data.job.etaSeconds);
      if (data.job.status === 'arrived') { clearInterval(pollingTimer); onArrived?.(); }
    }
  }, 5000);
}

function sendGPSUpdate(driverId, jobId, lat, lng, speed = 0) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'GPS_UPDATE', driverId, jobId, lat, lng, speed }));
  } else {
    updateDriverGPS(driverId, lat, lng, speed);
  }
}

function getCurrentLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ lat: 12.9352, lng: 77.6245 }); // Koramangala fallback
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()  => resolve({ lat: 12.9352, lng: 77.6245 })
    );
  });
}

async function checkBackendHealth() {
  try {
    const res  = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    console.log('🏥 Backend:', data.status, '| Drivers online:', data.drivers_online);
    return data;
  } catch {
    console.warn('⚠️  Backend offline — running in demo mode');
    return { status: 'offline' };
  }
}

checkBackendHealth();

// Expose everything
window.SP = {
  // Auth
  callerLogin, driverLogin, logout, getLeaderboard,
  // Dispatch (caller)
  triggerSOS, getNearestAmbulances, getJobStatus,
  // Dispatch (driver) — all functions Member 2's JS needs
  acceptJob, skipJob, markArrived, getDriverJob,
  patientOnboard,    // ← NEW: "Patient Picked Up" button
  selectHospital,    // ← NEW: hospital selection
  getNextJob,        // ← NEW: loadNewJob() from backend
  getHospitals,      // ← NEW: pre-load hospital list
  // GPS
  updateDriverGPS, getAllDriverPositions,
  // WebSocket
  connectJobTracking, sendGPSUpdate,
  // Utils
  getCurrentLocation, checkBackendHealth
};

console.log('%c SurakshaPath API v2 ✅', 'color:#22c55e;font-weight:bold;font-size:13px');
console.log('New functions: SP.patientOnboard(), SP.selectHospital(), SP.getNextJob(), SP.getHospitals()');
// SurakshaPath — Caller API connector
const SP_CALLER_API = 'http://localhost:3001/api';


async function fireSOS() {
  try {
    const pos = await new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ coords: { latitude: 12.9716, longitude: 77.5946 } });
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, () => {
        resolve({ coords: { latitude: 12.9716, longitude: 77.5946 } });
      }, { timeout: 3000 });
    });

    const res = await fetch(`${SP_CALLER_API}/dispatch/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callerPhone: '9999999999',
        callerLat:   pos.coords.latitude,
        callerLng:   pos.coords.longitude,
        emergencyType: 'accident'
      })
    });

    const data = await res.json();
    if (data.success) {
      SOS_JOB_ID = data.job?.id || data.jobId;
      console.log('🚨 SOS dispatched! Job:', SOS_JOB_ID);
      console.log('🚑 Driver assigned:', data.driver?.name);
      updateTrackingScreen(data);
      startETAPolling();
    }
  } catch (err) {
    console.error('SOS call failed:', err);
  }
}

function updateTrackingScreen(data) {
  const etaEl = document.getElementById('dstEta');
  if (etaEl && data.eta) {
    etaEl.textContent = Math.ceil(data.eta / 60) + ':00';
  }
  if (data.driver) {
    const etaSub = document.querySelector('.dst-eta-sub');
    if (etaSub) etaSub.textContent = `${data.driver.name} · ${data.driver.vehicleNumber} approaching`;
    const phoneEta = document.getElementById('phoneEta');
    if (phoneEta && data.eta) phoneEta.textContent = Math.ceil(data.eta / 60) + ':00';
  }
}

function startETAPolling() {
  if (!SOS_JOB_ID) return;
  ETA_INTERVAL = setInterval(async () => {
    try {
      const res  = await fetch(`${SP_CALLER_API}/dispatch/job/${SOS_JOB_ID}`);
      const data = await res.json();
      if (data.success && data.job) {
        const etaEl = document.getElementById('dstEta');
        if (etaEl && data.job.etaSeconds) {
          etaEl.textContent = Math.ceil(data.job.etaSeconds / 60) + ':00';
        }
        if (data.job.status === 'arrived') clearInterval(ETA_INTERVAL);
      }
    } catch (err) {}
  }, 5000);
}

window.addEventListener('load', () => {
  setTimeout(() => {
    const sosBtn = document.getElementById('dsSosBtn');
    if (!sosBtn) return;
    const observer = new MutationObserver(() => {
      if (sosBtn.style.background?.includes('16a34a')) fireSOS();
    });
    observer.observe(sosBtn, { attributes: true });
    console.log('✅ SOS backend hook ready');
  }, 500);
});
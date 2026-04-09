/**
 * ═══════════════════════════════════════════════════════════
 *   DATABASE (db.js) — v2, updated for Member 2 driver portal
 *
 *   Changes from v1:
 *   - Drivers now in Bangalore (not Chennai)
 *   - Added HOSPITALS array (matches Member 2's HOSPITALS)
 *   - Added JOB_POOL (matches Member 2's jobs[] demo data)
 *   - Job statuses: searching → dispatched → en_route →
 *                   patient_onboard → hospital_route → arrived
 *   - Jobs now have priority (P1/P2), title, sub fields
 *   - Timer = 30 seconds (matches Member 2's 30s countdown)
 *   - New functions: getHospitals, getRandomJob, setPatientOnboard
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

const { v4: uuid } = require('uuid');

// ── TABLE: Users (callers) ────────────────────────────────
const users = new Map();

// ── TABLE: Drivers ────────────────────────────────────────
const drivers = new Map();

// ── TABLE: Jobs ───────────────────────────────────────────
const jobs = new Map();

// ──────────────────────────────────────────────────────────
//  SEED DRIVERS — Bangalore locations (matches Member 2 UI)
// ──────────────────────────────────────────────────────────
const seedDrivers = [
  {
    id: 'drv-001',
    name: 'Rajan Kumar',
    phone: '9876543210',
    password: 'driver123',
    vehicleNumber: 'KA-01-AB-1234',
    operatorId: 'KA108-001',
    rating: 4.9,
    tier: 'Gold',
    totalJobs: 142,
    responseScore: 94,
    skipCount: 0,        // skips in current shift (3 = forced offline)
    isOnline: true,
    lat: 12.9352,        // Koramangala
    lng: 77.6245,
    speed: 0,
    currentJobId: null,
    earnings: { today: 850, month: 18500, bonus: 5000 },
    badges: ['⚡ Sub-8 Streak ×5', '🏅 Top Responder', '⭐ Gold Driver']
  },
  {
    id: 'drv-002',
    name: 'Meena Devi',
    phone: '9876543211',
    password: 'driver123',
    vehicleNumber: 'KA-01-CD-5678',
    operatorId: 'KA108-002',
    rating: 4.7,
    tier: 'Silver',
    totalJobs: 89,
    responseScore: 87,
    skipCount: 0,
    isOnline: true,
    lat: 12.9165,        // Silk Board
    lng: 77.6220,
    speed: 0,
    currentJobId: null,
    earnings: { today: 620, month: 14200, bonus: 2500 },
    badges: ['⭐ Silver Driver', '💨 Fast Responder']
  },
  {
    id: 'drv-003',
    name: 'Vijay Anand',
    phone: '9876543212',
    password: 'driver123',
    vehicleNumber: 'KA-02-EF-9012',
    operatorId: 'KA108-003',
    rating: 4.8,
    tier: 'Gold',
    totalJobs: 201,
    responseScore: 91,
    skipCount: 0,
    isOnline: true,
    lat: 12.9784,        // Indiranagar
    lng: 77.6408,
    speed: 0,
    currentJobId: null,
    earnings: { today: 940, month: 21000, bonus: 5000 },
    badges: ['⚡ Sub-8 Streak ×8', '🏅 Top Responder', '⭐ Gold Driver']
  },
  {
    id: 'drv-004',
    name: 'Priya Sundaram',
    phone: '9876543213',
    password: 'driver123',
    vehicleNumber: 'KA-03-GH-3456',
    operatorId: 'KA108-004',
    rating: 4.6,
    tier: 'Bronze',
    totalJobs: 34,
    responseScore: 78,
    skipCount: 0,
    isOnline: true,
    lat: 12.9698,        // Whitefield
    lng: 77.7499,
    speed: 0,
    currentJobId: null,
    earnings: { today: 480, month: 9800, bonus: 0 },
    badges: ['🌱 Rising Driver']
  },
  {
    id: 'drv-005',
    name: 'Suresh Babu',
    phone: '9876543214',
    password: 'driver123',
    vehicleNumber: 'KA-04-IJ-7890',
    operatorId: 'KA108-005',
    rating: 4.5,
    tier: 'Bronze',
    totalJobs: 28,
    responseScore: 72,
    skipCount: 0,
    isOnline: false,
    lat: 12.9250,
    lng: 77.5938,
    speed: 0,
    currentJobId: null,
    earnings: { today: 0, month: 6200, bonus: 0 },
    badges: ['🌱 Rising Driver']
  }
];

seedDrivers.forEach(d => drivers.set(d.id, d));

// ──────────────────────────────────────────────────────────
//  HOSPITALS — Exactly matches Member 2's HOSPITALS array
//  Returned by GET /api/dispatch/hospitals
// ──────────────────────────────────────────────────────────
const HOSPITALS = [
  {
    id: 'hosp-001',
    name: 'Victoria Hospital',
    dist: '1.2 km',
    eta: '3 min',
    beds: '12 ICU beds',
    trauma: true,
    tier: 'green',
    icon: '🏥',
    lat: 12.9641,
    lng: 77.5716,
    address: 'Fort Rd, Chamarajpet, Bengaluru',
    pos: { x: 0.22, y: 0.28 }   // matches Member 2 canvas positions
  },
  {
    id: 'hosp-002',
    name: 'Manipal Hospital',
    dist: '2.1 km',
    eta: '5 min',
    beds: '8 ICU beds',
    trauma: true,
    tier: 'green',
    icon: '🏥',
    lat: 12.9591,
    lng: 77.6480,
    address: 'HAL Airport Rd, Kodihalli, Bengaluru',
    pos: { x: 0.75, y: 0.22 }
  },
  {
    id: 'hosp-003',
    name: "St. John's Hospital",
    dist: '2.8 km',
    eta: '7 min',
    beds: '4 ICU beds',
    trauma: false,
    tier: 'amber',
    icon: '🏥',
    lat: 12.9335,
    lng: 77.6214,
    address: 'Sarjapur Rd, Koramangala, Bengaluru',
    pos: { x: 0.80, y: 0.72 }
  },
  {
    id: 'hosp-004',
    name: 'Fortis Hospital',
    dist: '3.4 km',
    eta: '9 min',
    beds: '2 ICU beds',
    trauma: false,
    tier: 'amber',
    icon: '🏥',
    lat: 12.9010,
    lng: 77.5960,
    address: 'Bannerghatta Rd, Banashankari, Bengaluru',
    pos: { x: 0.18, y: 0.75 }
  }
];

// ──────────────────────────────────────────────────────────
//  JOB POOL — Matches Member 2's jobs[] demo list
//  Used when driver needs next job (GET /api/dispatch/next-job)
// ──────────────────────────────────────────────────────────
const JOB_POOL = [
  {
    title: 'Cardiac arrest — Koramangala 5th Block',
    sub: 'Manipal Hosp → Koramangala 5th Block',
    address: 'Koramangala 5th Block, Bengaluru',
    dist: '2.8 km', eta: '~5 min',
    priority: 'P1', priorityLabel: 'P1 Critical',
    emergencyType: 'cardiac',
    callerLat: 12.9352, callerLng: 77.6245
  },
  {
    title: 'Multi-vehicle accident — Silk Board',
    sub: "St. John's Hosp → Silk Board Jn",
    address: 'Silk Board Junction, Bengaluru',
    dist: '4.1 km', eta: '~9 min',
    priority: 'P1', priorityLabel: 'P1 Critical',
    emergencyType: 'accident',
    callerLat: 12.9165, callerLng: 77.6220
  },
  {
    title: 'Stroke patient — Indiranagar',
    sub: 'Hosmat Hosp → 100ft Road',
    address: 'Indiranagar 100ft Road, Bengaluru',
    dist: '1.6 km', eta: '~4 min',
    priority: 'P2', priorityLabel: 'P2 Urgent',
    emergencyType: 'stroke',
    callerLat: 12.9784, callerLng: 77.6408
  },
  {
    title: 'Pedestrian hit — Whitefield',
    sub: 'Narayana Hosp → ITPL Main Rd',
    address: 'ITPL Main Road, Whitefield, Bengaluru',
    dist: '5.3 km', eta: '~12 min',
    priority: 'P1', priorityLabel: 'P1 Critical',
    emergencyType: 'trauma',
    callerLat: 12.9698, callerLng: 77.7499
  }
];

// ══════════════════════════════════════════════════════════
//   EXPORTED FUNCTIONS
// ══════════════════════════════════════════════════════════

// ── USER functions ─────────────────────────────────────
function createUser(phone, name, emergencyContact) {
  const user = {
    id: uuid(),
    phone,
    name: name || 'Unknown Caller',
    emergencyContact: emergencyContact || null,
    createdAt: new Date().toISOString()
  };
  users.set(phone, user);
  return user;
}

function getUser(phone) { return users.get(phone) || null; }

// ── DRIVER functions ──────────────────────────────────
function getDriver(driverId)      { return drivers.get(driverId) || null; }

function getDriverByPhone(phone) {
  for (const [, d] of drivers) {
    if (d.phone === phone) return d;
  }
  return null;
}

function getOnlineDrivers() {
  return Array.from(drivers.values()).filter(d => d.isOnline && !d.currentJobId);
}

function getAllDrivers() { return Array.from(drivers.values()); }

function setDriverOnline(driverId, online) {
  const d = drivers.get(driverId);
  if (d) {
    d.isOnline = online;
    if (!online) d.skipCount = 0; // reset skip count on logout
    drivers.set(driverId, d);
  }
}

function updateDriverLocation(driverId, lat, lng, speed = 0) {
  const d = drivers.get(driverId);
  if (d) { d.lat = lat; d.lng = lng; d.speed = speed; drivers.set(driverId, d); }
}

// ── JOB functions ─────────────────────────────────────

/**
 * Create a new job from SOS trigger.
 * Now includes priority field derived from emergencyType.
 */
function createJob({ callerId, callerPhone, callerLat, callerLng, emergencyType, address }) {
  const priority = emergencyType === 'cardiac' || emergencyType === 'accident' || emergencyType === 'trauma'
    ? 'P1' : 'P2';
  const priorityLabel = priority === 'P1' ? 'P1 Critical' : 'P2 Urgent';

  // Build title + sub matching Member 2's format
  const typeLabels = {
    cardiac:   'Cardiac arrest',
    accident:  'Road accident',
    trauma:    'Trauma patient',
    stroke:    'Stroke patient',
    breathing: 'Breathing difficulty',
    other:     'Medical emergency'
  };
  const titleLabel = typeLabels[emergencyType] || 'Medical emergency';

  const job = {
    id: uuid(),
    callerId,
    callerPhone,
    callerLat,
    callerLng,
    address: address || 'Location acquired via GPS',
    emergencyType,
    // Member 2 UI fields
    title: `${titleLabel} — ${address || 'your location'}`,
    sub:   `Nearest Hosp → ${address || 'patient location'}`,
    priority,
    priorityLabel,
    dist: null,    // filled when driver is assigned
    eta:  null,
    // Status flow: searching → dispatched → en_route → patient_onboard → hospital_route → arrived
    status: 'searching',
    driverId: null,
    hospitalId: null,       // set when driver selects hospital
    timerSeconds: 30,       // Member 2 uses 30s (not 12s)
    etaSeconds: null,
    createdAt: new Date().toISOString(),
    acceptedAt: null,
    patientOnboardAt: null, // new: when driver marks patient picked up
    hospitalSelectedAt: null,
    arrivedAt: null
  };
  jobs.set(job.id, job);
  return job;
}

function getJob(jobId)       { return jobs.get(jobId) || null; }

function getActiveJobs() {
  return Array.from(jobs.values()).filter(j =>
    ['searching', 'dispatched', 'en_route', 'patient_onboard', 'hospital_route'].includes(j.status)
  );
}

function assignDriverToJob(jobId, driverId) {
  const job = jobs.get(jobId);
  const driver = drivers.get(driverId);
  if (!job || !driver) return false;
  const distKm = haversine(driver.lat, driver.lng, job.callerLat, job.callerLng);
  job.status      = 'dispatched';
  job.driverId    = driverId;
  job.dist        = distKm.toFixed(1) + ' km';
  job.acceptedAt  = new Date().toISOString();
  jobs.set(jobId, job);
  driver.currentJobId = jobId;
  drivers.set(driverId, driver);
  return true;
}

function acceptJob(jobId, driverId) {
  const job = jobs.get(jobId);
  if (!job) return false;
  job.status = 'en_route';
  jobs.set(jobId, job);
  return true;
}

function updateJobETA(jobId, etaSeconds) {
  const job = jobs.get(jobId);
  if (job) { job.etaSeconds = etaSeconds; jobs.set(jobId, job); }
}

/**
 * NEW: Driver marks patient has been picked up.
 * Status → patient_onboard
 * Triggers hospital scan on driver UI.
 */
function setPatientOnboard(jobId) {
  const job = jobs.get(jobId);
  if (!job) return false;
  job.status           = 'patient_onboard';
  job.patientOnboardAt = new Date().toISOString();
  jobs.set(jobId, job);
  return true;
}

/**
 * NEW: Driver selects a hospital destination.
 * Status → hospital_route
 */
function selectHospital(jobId, hospitalId) {
  const job  = jobs.get(jobId);
  const hosp = HOSPITALS.find(h => h.id === hospitalId);
  if (!job || !hosp) return false;
  job.status             = 'hospital_route';
  job.hospitalId         = hospitalId;
  job.hospitalSelectedAt = new Date().toISOString();
  jobs.set(jobId, job);
  return true;
}

function completeJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status    = 'arrived';
  job.arrivedAt = new Date().toISOString();
  jobs.set(jobId, job);

  if (job.driverId) {
    const driver = drivers.get(job.driverId);
    if (driver) {
      driver.currentJobId  = null;
      driver.totalJobs    += 1;
      driver.skipCount     = 0;  // reset skips after successful job
      driver.responseScore = Math.min(100, driver.responseScore + 0.5);
      // Add earnings
      driver.earnings.today += 200;
      drivers.set(job.driverId, driver);
    }
  }
}

/**
 * NEW: Skip a job with proper penalty logic.
 * 3 skips in a shift → driver forced offline (matches original design doc).
 * Returns { penalised, forcedOffline, newScore, newSkipCount }
 */
function skipJob(jobId, driverId) {
  const driver = drivers.get(driverId);
  if (!driver) return null;

  driver.responseScore = Math.max(0, driver.responseScore - 5);
  driver.skipCount    += 1;

  let forcedOffline = false;
  if (driver.skipCount >= 3) {
    driver.isOnline   = false;
    driver.skipCount  = 0;
    forcedOffline     = true;
  }
  drivers.set(driverId, driver);

  // Reassign job to next nearest
  const job = jobs.get(jobId);
  if (job && (job.status === 'dispatched' || job.status === 'searching')) {
    job.driverId    = null;
    job.status      = 'searching';
    jobs.set(jobId, job);

    const others = getOnlineDrivers().filter(d => d.id !== driverId);
    if (others.length > 0) {
      const next = others
        .map(d => ({ ...d, distKm: haversine(job.callerLat, job.callerLng, d.lat, d.lng) }))
        .sort((a, b) => a.distKm - b.distKm)[0];
      assignDriverToJob(jobId, next.id);
    }
  }

  return {
    penalised:     true,
    forcedOffline,
    newScore:      driver.responseScore,
    newSkipCount:  driver.skipCount
  };
}

// ── HOSPITAL functions ────────────────────────────────
function getHospitals() { return HOSPITALS; }

function getHospital(hospitalId) {
  return HOSPITALS.find(h => h.id === hospitalId) || null;
}

// ── NEXT JOB for driver (random from pool) ────────────
function getNextJobForDriver(driverId) {
  const template = JOB_POOL[Math.floor(Math.random() * JOB_POOL.length)];
  const job = createJob({
    callerId:      'auto-' + uuid().slice(0, 8),
    callerPhone:   'auto',
    callerLat:     template.callerLat,
    callerLng:     template.callerLng,
    emergencyType: template.emergencyType,
    address:       template.address
  });
  // Override with pool's display fields
  job.title         = template.title;
  job.sub           = template.sub;
  job.dist          = template.dist;
  job.eta           = template.eta;
  job.priority      = template.priority;
  job.priorityLabel = template.priorityLabel;
  jobs.set(job.id, job);
  return job;
}

// ── Leaderboard ───────────────────────────────────────
function getLeaderboard() {
  return Array.from(drivers.values())
    .sort((a, b) => b.responseScore - a.responseScore)
    .map((d, i) => ({
      rank:          i + 1,
      id:            d.id,
      name:          d.name,
      responseScore: d.responseScore,
      totalJobs:     d.totalJobs,
      tier:          d.tier,
      rating:        d.rating
    }));
}

// ── Internal helper ───────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = {
  // Users
  createUser, getUser,
  // Drivers
  getDriver, getDriverByPhone, getOnlineDrivers, getAllDrivers,
  setDriverOnline, updateDriverLocation,
  // Jobs
  createJob, getJob, getActiveJobs,
  assignDriverToJob, acceptJob, updateJobETA,
  setPatientOnboard, selectHospital, completeJob,
  skipJob,
  getNextJobForDriver,
  // Hospitals
  getHospitals, getHospital,
  // Leaderboard
  getLeaderboard
};

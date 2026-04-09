/**
 * ═══════════════════════════════════════════════════════════
 *   DISPATCH ROUTES v2 — updated for Member 2 driver portal
 *
 *   NEW endpoints added:
 *   GET  /api/dispatch/hospitals       → List hospitals for driver to pick
 *   POST /api/dispatch/patient-onboard → Driver marks patient picked up
 *   POST /api/dispatch/select-hospital → Driver chooses hospital destination
 *   GET  /api/dispatch/next-job/:driverId → Driver gets next queued job
 *
 *   UPDATED:
 *   POST /api/dispatch/skip  → now tracks skipCount, forces offline at 3
 *   POST /api/dispatch/sos   → now returns priority, title, sub, timer=30
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

const router = require('express').Router();
const db     = require('../data/db');
const m4 = require('../m4')

// ── Helpers ───────────────────────────────────────────────
function distKm(lat1, lng1, lat2, lng2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    = Math.sin(dLat / 2) ** 2 +
               Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
               Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function etaSec(km, kmh = 40) { return Math.round((km / kmh) * 3600); }

function fmtETA(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m === 0) return `${s} sec`;
  return `${m} min ${String(s).padStart(2, '0')} sec`;
}

// ══════════════════════════════════════════════════════════
//  POST /api/dispatch/sos
//  Caller presses SOS → dispatch nearest ambulance
//  Body: { callerId, callerPhone, callerLat, callerLng, emergencyType, address }
// ══════════════════════════════════════════════════════════
router.post('/sos', (req, res) => {
  const { callerId, callerPhone, callerLat, callerLng,
          emergencyType = 'accident', address } = req.body;

  if (!callerLat || !callerLng) {
    return res.status(400).json({ error: 'callerLat and callerLng required' });
  }

  console.log(`🚨 SOS! Emergency: ${emergencyType} at [${callerLat}, ${callerLng}]`);

  const job = db.createJob({
    callerId:    callerId || 'anonymous',
    callerPhone: callerPhone || 'unknown',
    callerLat:   parseFloat(callerLat),
    callerLng:   parseFloat(callerLng),
    emergencyType,
    address
  });

  const online = db.getOnlineDrivers();

  if (online.length === 0) {
    console.log('⚠️  No drivers online — job queued');
    return res.status(202).json({
      success: true, jobId: job.id, status: 'queued',
      message: 'No ambulances available. Your call is queued. Also call 108.',
      fallback: true
    });
  }

  const ranked = online
    .map(d => ({ ...d, km: distKm(callerLat, callerLng, d.lat, d.lng) }))
    .sort((a, b) => a.km - b.km);

  const nearest = ranked[0];
  db.assignDriverToJob(job.id, nearest.id);
  db.updateJobETA(job.id, etaSec(nearest.km));

  const updatedJob = db.getJob(job.id);
  console.log(`✅ Dispatched → ${nearest.name} | ETA: ~${Math.round(nearest.km / 40 * 60)} min`);

  return res.status(201).json({
    success: true,
    jobId:   job.id,
    status:  'dispatched',
    message: `Ambulance dispatched! ${nearest.name} is on the way.`,
    // Fields matching Member 2's loadNewJob() display
    title:         updatedJob.title,
    sub:           updatedJob.sub,
    priority:      updatedJob.priority,
    priorityLabel: updatedJob.priorityLabel,
    dist:          nearest.km.toFixed(1) + ' km',
    timerSeconds:  30,    // Member 2 uses 30s timer
    driver: {
      id: nearest.id, name: nearest.name,
      vehicleNumber: nearest.vehicleNumber,
      rating: nearest.rating, tier: nearest.tier,
      phone: nearest.phone, lat: nearest.lat, lng: nearest.lng
    },
    eta: {
      seconds:   etaSec(nearest.km),
      formatted: fmtETA(etaSec(nearest.km)),
      display:   `~${Math.ceil(nearest.km / 40 * 60)} min`
    },
    distanceKm:  nearest.km.toFixed(2),
    nearbyUnits: ranked.slice(0, 5).map(d => ({
      id: d.id, name: d.name, lat: d.lat, lng: d.lng,
      distKm: d.km.toFixed(2), eta: fmtETA(etaSec(d.km)),
      tier: d.tier, rating: d.rating, assigned: d.id === nearest.id
    }))
  });
});

// ══════════════════════════════════════════════════════════
//  GET /api/dispatch/nearest?lat=&lng=
//  Preview nearby ambulances before SOS
// ══════════════════════════════════════════════════════════
router.get('/nearest', (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

  const units = db.getOnlineDrivers()
    .map(d => ({
      id: d.id, name: d.name, lat: d.lat, lng: d.lng,
      distKm:  distKm(lat, lng, d.lat, d.lng).toFixed(2),
      eta:     fmtETA(etaSec(distKm(lat, lng, d.lat, d.lng))),
      tier:    d.tier, rating: d.rating
    }))
    .sort((a, b) => parseFloat(a.distKm) - parseFloat(b.distKm));

  res.json({ success: true, count: units.length, units });
});

// ══════════════════════════════════════════════════════════
//  GET /api/dispatch/hospitals
//  Returns the hospital list for the driver to pick after
//  patient is on board. Matches Member 2's HOSPITALS array.
// ══════════════════════════════════════════════════════════
router.get('/hospitals', (req, res) => {
  res.json({ success: true, hospitals: db.getHospitals() });
});

// ══════════════════════════════════════════════════════════
//  POST /api/dispatch/accept
//  Driver confirms going. Body: { jobId, driverId }
// ══════════════════════════════════════════════════════════
router.post('/accept', (req, res) => {
  const { jobId, driverId } = req.body;
  if (!jobId || !driverId)
    return res.status(400).json({ error: 'jobId and driverId required' });

  const job    = db.getJob(jobId);
  const driver = db.getDriver(driverId);
  if (!job)    return res.status(404).json({ error: 'Job not found' });
  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  if (job.driverId !== driverId)
    return res.status(403).json({ error: 'This job was not assigned to you' });

  db.acceptJob(jobId, driverId);
  console.log(`🚑 ${driver.name} accepted job ${jobId}`);

  const j = db.getJob(jobId);
  res.json({
    success: true,
    message: 'Job accepted. Navigate to caller.',
    job: {
      id: j.id, status: j.status, title: j.title, sub: j.sub,
      callerLat: j.callerLat, callerLng: j.callerLng,
      address: j.address, emergencyType: j.emergencyType,
      priority: j.priority, priorityLabel: j.priorityLabel,
      etaSeconds: j.etaSeconds
    }
  });
});
// Send hospital pre-alert via M4
await m4.sendHospitalPrealert(
  jobId,
  'Manipal Hospital Bengaluru',  // later: use nearest hospital from job data
  job.emergencyType || 'Accident',
  Math.round((job.eta || 360) / 60)  // convert seconds to minutes
)

// ══════════════════════════════════════════════════════════
//  POST /api/dispatch/skip
//  Driver skips job. Penalty applied. 3 skips = forced offline.
//  Body: { jobId, driverId }
// ══════════════════════════════════════════════════════════
router.post('/skip', (req, res) => {
  const { jobId, driverId } = req.body;
  if (!jobId || !driverId)
    return res.status(400).json({ error: 'jobId and driverId required' });

  const result = db.skipJob(jobId, driverId);
  if (!result) return res.status(404).json({ error: 'Driver not found' });

  console.log(`⚠️  Driver ${driverId} skipped. Score: ${result.newScore}. Skips: ${result.newSkipCount}`);
  if (result.forcedOffline) console.log(`🚫 Driver ${driverId} forced offline (3 skips)`);

  res.json({
    success:      true,
    message:      result.forcedOffline
                    ? '3 skips reached — you have been marked offline for this shift.'
                    : `Job skipped. Score -5. (${result.newSkipCount}/3 skips this shift)`,
    penalised:    result.penalised,
    forcedOffline: result.forcedOffline,
    newScore:     result.newScore,
    newSkipCount: result.newSkipCount
  });
});
// Tell M4 about the skip — they track penalties and auto-offline
const skipResult = await m4.reportSkipPenalty(driverId, jobId)
console.log('M4 skip result:', skipResult)

// If M4 says OFFLINE — reflect that in our db too
if (skipResult === 'OFFLINE') {
  db.setDriverOnline(driverId, false)
}
// ══════════════════════════════════════════════════════════
//  POST /api/dispatch/patient-onboard
//  Driver marks "Patient Picked Up" → triggers hospital scan
//  Body: { jobId, driverId }
// ══════════════════════════════════════════════════════════
router.post('/patient-onboard', (req, res) => {
  const { jobId, driverId } = req.body;
  if (!jobId || !driverId)
    return res.status(400).json({ error: 'jobId and driverId required' });

  const ok = db.setPatientOnboard(jobId);
  if (!ok) return res.status(404).json({ error: 'Job not found' });

  console.log(`🧑‍⚕️ Patient on board — job ${jobId}`);

  // Return the hospitals list immediately (driver needs to pick one)
  res.json({
    success: true,
    message: 'Patient marked on board. Select destination hospital.',
    status:  'patient_onboard',
    hospitals: db.getHospitals()
  });
});

// ══════════════════════════════════════════════════════════
//  POST /api/dispatch/select-hospital
//  Driver selects destination hospital.
//  Body: { jobId, driverId, hospitalId }
// ══════════════════════════════════════════════════════════
router.post('/select-hospital', (req, res) => {
  const { jobId, driverId, hospitalId } = req.body;
  if (!jobId || !hospitalId)
    return res.status(400).json({ error: 'jobId and hospitalId required' });

  const hosp = db.getHospital(hospitalId);
  if (!hosp) return res.status(404).json({ error: 'Hospital not found' });

  db.selectHospital(jobId, hospitalId);
  console.log(`🏥 Driver routing to ${hosp.name} for job ${jobId}`);

  res.json({
    success:  true,
    message:  `Routing to ${hosp.name}. ER pre-alerted.`,
    status:   'hospital_route',
    hospital: hosp
  });
});

// ══════════════════════════════════════════════════════════
//  POST /api/dispatch/arrived
//  Driver marks arrival at scene or hospital.
//  Body: { jobId, driverId }
// ══════════════════════════════════════════════════════════
router.post('/arrived', (req, res) => {
  const { jobId, driverId } = req.body;
  const job    = db.getJob(jobId);
  const driver = db.getDriver(driverId);
  if (!job || !driver) return res.status(404).json({ error: 'Job or driver not found' });

  db.completeJob(jobId);
  console.log(`🏁 Arrived! Job ${jobId} complete.`);

  const d = db.getDriver(driverId);
  res.json({
    success: true,
    message: 'Marked as arrived. Great work!',
    driver:  { totalJobs: d.totalJobs, responseScore: d.responseScore, earnings: d.earnings }
  });
});
// Calculate score and badge — fire both together
const score  = await m4.calculateDriverScore(driverId)
const badge  = await m4.updateBadgeStreak(driverId)

console.log(`🏆 Driver score: ${score?.total_score} → ${score?.tier}`)
console.log(`🔥 Badge: ${badge}`)
// ══════════════════════════════════════════════════════════
//  GET /api/dispatch/next-job/:driverId
//  Driver has completed a job → get next queued job.
//  Matches Member 2's loadNewJob() which auto-loads after 2.5-3s.
// ══════════════════════════════════════════════════════════
router.get('/next-job/:driverId', (req, res) => {
  const driver = db.getDriver(req.params.driverId);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  if (!driver.isOnline)
    return res.status(403).json({ error: 'Driver is offline', forcedOffline: true });

  const job = db.getNextJobForDriver(req.params.driverId);
  console.log(`🔔 New job queued for driver ${driver.name}: ${job.title}`);

  res.json({
    success:      true,
    message:      'New job available',
    timerSeconds: 30,       // Member 2's 30-second accept window
    job: {
      id:            job.id,
      title:         job.title,
      sub:           job.sub,
      dist:          job.dist,
      eta:           job.eta,
      priority:      job.priority,
      priorityLabel: job.priorityLabel,
      emergencyType: job.emergencyType,
      callerLat:     job.callerLat,
      callerLng:     job.callerLng,
      address:       job.address
    }
  });
});

// ══════════════════════════════════════════════════════════
//  GET /api/dispatch/job/:id
//  Live job status (caller polls this)
// ══════════════════════════════════════════════════════════
router.get('/job/:id', (req, res) => {
  const job = db.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  let driverInfo = null;
  if (job.driverId) {
    const d = db.getDriver(job.driverId);
    if (d) driverInfo = {
      id: d.id, name: d.name, vehicleNumber: d.vehicleNumber,
      rating: d.rating, tier: d.tier, lat: d.lat, lng: d.lng, speed: d.speed
    };
  }

  let hospitalInfo = null;
  if (job.hospitalId) {
    hospitalInfo = db.getHospital(job.hospitalId);
  }

  res.json({
    success: true,
    job: {
      id: job.id, status: job.status,
      title: job.title, sub: job.sub,
      priority: job.priority, priorityLabel: job.priorityLabel,
      emergencyType: job.emergencyType,
      address: job.address, callerLat: job.callerLat, callerLng: job.callerLng,
      dist: job.dist, etaSeconds: job.etaSeconds,
      etaFormatted: job.etaSeconds ? fmtETA(job.etaSeconds) : null,
      timerSeconds: job.timerSeconds,
      createdAt: job.createdAt, acceptedAt: job.acceptedAt,
      patientOnboardAt: job.patientOnboardAt, arrivedAt: job.arrivedAt,
      driver:   driverInfo,
      hospital: hospitalInfo
    }
  });
});

// ══════════════════════════════════════════════════════════
//  GET /api/dispatch/driver-job/:driverId
//  Get active job for a driver (used on driver app load)
// ══════════════════════════════════════════════════════════
router.get('/driver-job/:driverId', (req, res) => {
  const driver = db.getDriver(req.params.driverId);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  if (!driver.currentJobId) return res.json({ success: true, job: null });

  const job = db.getJob(driver.currentJobId);
  res.json({
    success: true,
    job: job ? {
      id: job.id, status: job.status,
      title: job.title, sub: job.sub,
      priority: job.priority, priorityLabel: job.priorityLabel,
      emergencyType: job.emergencyType, address: job.address,
      callerLat: job.callerLat, callerLng: job.callerLng,
      dist: job.dist, etaSeconds: job.etaSeconds,
      callerPhone: job.callerPhone, timerSeconds: job.timerSeconds
    } : null
  });
});

// ══════════════════════════════════════════════════════════
//  GET /api/dispatch/active  (admin view)
// ══════════════════════════════════════════════════════════
router.get('/active', (req, res) => {
  const active = db.getActiveJobs();
  res.json({ success: true, count: active.length, jobs: active });
});

module.exports = router;

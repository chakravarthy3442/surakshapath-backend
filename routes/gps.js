/**
 * ═══════════════════════════════════════════════════════════
 *   GPS ROUTES (routes/gps.js)
 *
 *   Handles location updates from drivers.
 *   Also provides the map data for the caller's tracking view.
 *
 *   POST /api/gps/update    → Driver pushes their GPS position
 *   GET  /api/gps/drivers   → All driver positions (map markers)
 *   GET  /api/gps/driver/:id → Single driver position
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

const router = require('express').Router();
const db     = require('../data/db');

// ══════════════════════════════════════════════════════════
//  POST /api/gps/update
//
//  The driver's app sends its GPS coordinates every 3 seconds.
//  Body: { driverId, lat, lng, speed, heading }
// ══════════════════════════════════════════════════════════
router.post('/update', (req, res) => {
  const { driverId, lat, lng, speed = 0, heading = 0 } = req.body;

  if (!driverId || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'driverId, lat, and lng are required' });
  }

  const driver = db.getDriver(driverId);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  // Update location in DB
  db.updateDriverLocation(driverId, parseFloat(lat), parseFloat(lng), parseFloat(speed));

  // If driver is on a job, recalculate ETA
  let etaUpdate = null;
  if (driver.currentJobId) {
    const job = db.getJob(driver.currentJobId);
    if (job) {
      const dist = distanceKm(lat, lng, job.callerLat, job.callerLng);
      const avgSpeed = speed > 5 ? speed : 40; // use actual speed if moving
      const eta  = Math.round((dist / avgSpeed) * 3600);
      db.updateJobETA(job.id, eta);

      etaUpdate = {
        jobId:      job.id,
        distKm:     dist.toFixed(2),
        etaSeconds: eta
      };
    }
  }

  res.json({
    success: true,
    message: 'Location updated',
    eta: etaUpdate
  });
});

// ══════════════════════════════════════════════════════════
//  GET /api/gps/drivers
//  Returns all online driver positions for the live map.
//  The caller's app uses this to show ambulances on the map.
// ══════════════════════════════════════════════════════════
router.get('/drivers', (req, res) => {
  const drivers = db.getAllDrivers()
    .filter(d => d.isOnline)
    .map(d => ({
      id:         d.id,
      name:       d.name,
      lat:        d.lat,
      lng:        d.lng,
      speed:      d.speed,
      tier:       d.tier,
      rating:     d.rating,
      isAvailable: !d.currentJobId,
      vehicleNumber: d.vehicleNumber
    }));

  res.json({ success: true, count: drivers.length, drivers });
});

// ══════════════════════════════════════════════════════════
//  GET /api/gps/driver/:id
//  Single driver's current location (caller polls this)
// ══════════════════════════════════════════════════════════
router.get('/driver/:id', (req, res) => {
  const driver = db.getDriver(req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  res.json({
    success: true,
    location: {
      driverId: driver.id,
      lat:      driver.lat,
      lng:      driver.lng,
      speed:    driver.speed,
      isOnline: driver.isOnline
    }
  });
});

// ── Haversine helper (same as dispatch.js) ────────────────
function distanceKm(lat1, lng1, lat2, lng2) {
  const R    = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a    = Math.sin(dLat / 2) ** 2 +
               Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
               Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) { return deg * (Math.PI / 180); }

module.exports = router;

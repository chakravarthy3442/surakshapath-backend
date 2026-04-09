/**
 * ═══════════════════════════════════════════════════════════
 *   AUTH ROUTES (routes/auth.js)
 *
 *   BEGINNER EXPLANATION:
 *   A "route" is like a URL endpoint — when the frontend
 *   sends a request to a URL, this code runs and sends back
 *   a response.
 *
 *   POST /api/auth/register  → Create a new account
 *   POST /api/auth/login     → Log in (caller or driver)
 *   GET  /api/auth/driver/:id → Get driver profile
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

const router = require('express').Router();
const db     = require('../data/db');

// ══════════════════════════════════════════════════════════
//  POST /api/auth/register
//  Body: { phone, name, role, emergencyContact }
//  role = "caller" or "driver"
// ══════════════════════════════════════════════════════════
router.post('/register', (req, res) => {
  const { phone, name, role, emergencyContact } = req.body;

  // Validate inputs
  if (!phone || !role) {
    return res.status(400).json({ error: 'phone and role are required' });
  }

  if (role === 'caller') {
    // Check if already registered
    const existing = db.getUser(phone);
    if (existing) {
      return res.status(409).json({ error: 'Phone already registered. Please login.' });
    }

    const user = db.createUser(phone, name, emergencyContact);
    console.log(`✅ New caller registered: ${phone}`);

    return res.status(201).json({
      success: true,
      message: 'Registered successfully!',
      user: {
        id:    user.id,
        phone: user.phone,
        name:  user.name,
        role:  'caller'
      }
    });
  }

  // Drivers are pre-registered by admin (they exist in seed data)
  // So drivers "register" = we just confirm they exist
  if (role === 'driver') {
    return res.status(400).json({
      error: 'Driver accounts are created by admin. Please login with your operator credentials.'
    });
  }

  return res.status(400).json({ error: 'role must be caller or driver' });
});

// ══════════════════════════════════════════════════════════
//  POST /api/auth/login
//  Body: { phone, role, password? }
//  For callers — just phone (OTP would go here in production)
//  For drivers — phone + password
// ══════════════════════════════════════════════════════════
router.post('/login', (req, res) => {
  const { phone, role, password } = req.body;

  if (!phone || !role) {
    return res.status(400).json({ error: 'phone and role are required' });
  }

  // ── CALLER LOGIN ─────────────────────────────────────────
  if (role === 'caller') {
    let user = db.getUser(phone);

    // Auto-register callers on first login (common UX for emergency apps)
    if (!user) {
      user = db.createUser(phone, 'Emergency Caller', null);
      console.log(`🆕 Auto-registered caller: ${phone}`);
    }

    console.log(`🔑 Caller logged in: ${phone}`);
    return res.json({
      success: true,
      message: 'Login successful',
      token: `caller-token-${user.id}`,  // In production: use JWT
      user: {
        id:    user.id,
        phone: user.phone,
        name:  user.name,
        role:  'caller'
      }
    });
  }

  // ── DRIVER LOGIN ─────────────────────────────────────────
  if (role === 'driver') {
    const driver = db.getDriverByPhone(phone);

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found. Contact your operator.' });
    }

    // Check password (in production: use bcrypt hashing)
    if (driver.password !== password) {
      return res.status(401).json({ error: 'Wrong password' });
    }

    // Mark driver as online
    db.setDriverOnline(driver.id, true);
    console.log(`🚑 Driver logged in: ${driver.name} (${phone})`);

    return res.json({
      success: true,
      message: `Welcome back, ${driver.name}!`,
      token: `driver-token-${driver.id}`,  // In production: use JWT
      driver: {
        id:            driver.id,
        name:          driver.name,
        phone:         driver.phone,
        vehicleNumber: driver.vehicleNumber,
        rating:        driver.rating,
        tier:          driver.tier,
        totalJobs:     driver.totalJobs,
        responseScore: driver.responseScore,
        earnings:      driver.earnings,
        badges:        driver.badges,
        role:          'driver'
      }
    });
  }

  return res.status(400).json({ error: 'role must be caller or driver' });
});

// ══════════════════════════════════════════════════════════
//  POST /api/auth/logout
//  Body: { driverId }  (only matters for drivers — marks offline)
// ══════════════════════════════════════════════════════════
router.post('/logout', (req, res) => {
  const { driverId } = req.body;
  if (driverId) {
    db.setDriverOnline(driverId, false);
    console.log(`👋 Driver offline: ${driverId}`);
  }
  res.json({ success: true, message: 'Logged out' });
});

// ══════════════════════════════════════════════════════════
//  GET /api/auth/driver/:id
//  Get a driver's full profile (for the driver dashboard)
// ══════════════════════════════════════════════════════════
router.get('/driver/:id', (req, res) => {
  const driver = db.getDriver(req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  // Don't send password back
  const { password, ...safeDriver } = driver;
  res.json({ success: true, driver: safeDriver });
});

// ══════════════════════════════════════════════════════════
//  GET /api/auth/leaderboard
//  Returns all drivers sorted by response score
// ══════════════════════════════════════════════════════════
router.get('/leaderboard', (req, res) => {
  const board = db.getLeaderboard();
  res.json({ success: true, leaderboard: board });
});

module.exports = router;

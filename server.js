/**
 * ═══════════════════════════════════════════════════════════
 *   SURAKSHAPATH AI — BACKEND SERVER
 *   Member 3: Auth + Dispatch Engine + GPS Tracking
 * ═══════════════════════════════════════════════════════════
 *
 *  HOW THIS WORKS (for a complete beginner):
 *  - This is a Node.js server (like a waiter in a restaurant)
 *  - It listens on port 3001 for requests from the frontend
 *  - It has 3 main jobs:
 *    1. AUTH   → Login / Register for callers & drivers
 *    2. DISPATCH → Find nearest ambulance, assign a job
 *    3. GPS    → Real-time location updates via WebSocket
 *
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

const express  = require('express');
const cors     = require('cors');
const http     = require('http');
const { WebSocketServer } = require('ws');

const authRoutes     = require('./routes/auth');
const dispatchRoutes = require('./routes/dispatch');
const gpsRoutes      = require('./routes/gps');
const db             = require('./data/db');

const app    = express();
const server = http.createServer(app);

// ── Middleware ─────────────────────────────────────────────
app.use(cors());                        // allow frontend to talk to this server
app.use(express.json());                // parse JSON request bodies

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/gps',      gpsRoutes);

// ── Health Check ──────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'SurakshaPath API is running 🚑',
    time: new Date().toISOString(),
    drivers_online: db.getOnlineDrivers().length,
    active_jobs: db.getActiveJobs().length
  });
});

// ══════════════════════════════════════════════════════════
//   WEBSOCKET SERVER — Real-time GPS Updates
//   Think of WebSocket like a phone call (always connected)
//   vs normal HTTP which is like sending letters (one at a time)
// ══════════════════════════════════════════════════════════
const wss = new WebSocketServer({ server });

// Store connected clients: { jobId → [caller ws, driver ws] }
const rooms = new Map();

wss.on('connection', (ws) => {
  console.log('📡 New WebSocket connection');

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);

      // ── JOIN a job room ──────────────────────────────────
      // Both caller and driver join the same "room" using jobId
      if (msg.type === 'JOIN') {
        const { jobId, role } = msg; // role = 'caller' or 'driver'
        if (!rooms.has(jobId)) rooms.set(jobId, []);
        rooms.get(jobId).push(ws);
        ws._jobId = jobId;
        ws._role  = role;
        console.log(`👤 ${role} joined room ${jobId}`);
        ws.send(JSON.stringify({ type: 'JOINED', jobId }));
      }

      // ── DRIVER sends GPS update ──────────────────────────
      // Driver app sends { type:'GPS_UPDATE', jobId, lat, lng, speed }
      // We broadcast it to everyone in the same room (= the caller)
      if (msg.type === 'GPS_UPDATE') {
        const { jobId, lat, lng, speed } = msg;

        // Save to DB
        db.updateDriverLocation(msg.driverId, lat, lng);

        // Calculate ETA (simple straight-line estimate)
        const job = db.getJob(jobId);
        if (job) {
          const eta = calculateETA(lat, lng, job.callerLat, job.callerLng, speed);
          db.updateJobETA(jobId, eta);

          // Broadcast to everyone in the room
          const payload = JSON.stringify({
            type: 'LOCATION',
            lat, lng, speed,
            etaSeconds: eta,
            jobId
          });

          const clients = rooms.get(jobId) || [];
          clients.forEach(client => {
            if (client !== ws && client.readyState === 1) {
              client.send(payload);
            }
          });
        }
      }

      // ── DRIVER marks job ARRIVED ─────────────────────────
      if (msg.type === 'ARRIVED') {
        const { jobId } = msg;
        db.completeJob(jobId, 'arrived');
        const clients = rooms.get(jobId) || [];
        clients.forEach(c => {
          if (c.readyState === 1) c.send(JSON.stringify({ type: 'AMBULANCE_ARRIVED', jobId }));
        });
        rooms.delete(jobId);
        console.log(`✅ Job ${jobId} completed — ambulance arrived`);
      }

    } catch (e) {
      console.error('WebSocket message error:', e.message);
    }
  });

  ws.on('close', () => {
    // Clean up room
    if (ws._jobId && rooms.has(ws._jobId)) {
      const clients = rooms.get(ws._jobId).filter(c => c !== ws);
      if (clients.length === 0) rooms.delete(ws._jobId);
      else rooms.set(ws._jobId, clients);
    }
    console.log('📴 WebSocket disconnected');
  });
});

// ══════════════════════════════════════════════════════════
//   HELPER: Calculate ETA in seconds
//   Uses Haversine formula (distance between two GPS points)
// ══════════════════════════════════════════════════════════
function calculateETA(driverLat, driverLng, callerLat, callerLng, speedKmh = 40) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(callerLat - driverLat);
  const dLng = toRad(callerLng - driverLng);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(driverLat)) * Math.cos(toRad(callerLat)) *
            Math.sin(dLng / 2) ** 2;
  const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const avgSpeed   = speedKmh > 0 ? speedKmh : 40; // km/h default
  const etaSeconds = Math.round((distanceKm / avgSpeed) * 3600);
  return etaSeconds;
}

function toRad(deg) { return deg * (Math.PI / 180); }

// ── Start listening ───────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   🚑  SurakshaPath AI Backend v1.0       ║');
  console.log(`║   🌐  http://localhost:${PORT}              ║`);
  console.log('║   📡  WebSocket ready on same port       ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log('Available endpoints:');
  console.log(`  GET  /api/health`);
  console.log(`  POST /api/auth/register`);
  console.log(`  POST /api/auth/login`);
  console.log(`  POST /api/dispatch/sos`);
  console.log(`  GET  /api/dispatch/nearest`);
  console.log(`  POST /api/dispatch/accept`);
  console.log(`  GET  /api/gps/drivers`);
  console.log(`  POST /api/gps/update`);
  console.log('');
});

/**
 * m4.js — Member 4 Supabase Integration
 * Fires scoring, badges, skip penalties, and hospital pre-alerts
 * Called by dispatch.js at key moments in the job lifecycle
 */

const SUPABASE_URL = 'https://pszfswaxcykxvtvyzoce.supabase.co'
const ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzemZzd2F4Y3lreHZ0dnl6b2NlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MzMxOTUsImV4cCI6MjA5MTIwOTE5NX0.3KuxJeZptwbgGId1AumA8uueoa65uqLemW0lRH3-Mck'

// ── Core helper — calls any M4 Supabase function ──────────
async function callM4(functionName, body) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey':        ANON_KEY
      },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    console.log(`📊 M4 [${functionName}]:`, data)
    return data
  } catch (err) {
    // Never crash your dispatch if M4 is unreachable
    console.warn(`⚠️  M4 [${functionName}] failed (non-critical):`, err.message)
    return null
  }
}

// ── 1. Skip penalty — call when driver ignores 12s window ─
async function reportSkipPenalty(driverId, jobId) {
  return await callM4('handle_skip_penalty', {
    p_driver_id: driverId,
    p_job_id:    jobId
  })
  // Returns: "OFFLINE" | "WARNING — Skip 1 of 3" | "WARNING — Skip 2 of 3"
}

// ── 2. Hospital pre-alert — call when driver accepts job ──
async function sendHospitalPrealert(jobId, hospitalName, emergencyType, etaMinutes) {
  return await callM4('send_hospital_prealert', {
    p_job_id:         jobId,
    p_hospital_name:  hospitalName,
    p_emergency_type: emergencyType,  // "Accident" | "Heart Attack" | "Fire" | "Other"
    p_eta_minutes:    etaMinutes
  })
  // Returns: formatted pre-alert string
}

// ── 3. Score calculation — call when job is complete ──────
async function calculateDriverScore(driverId) {
  const now = new Date()
  return await callM4('calculate_driver_score', {
    p_driver_id: driverId,
    p_month:     now.getMonth() + 1,  // JS months are 0-indexed, so +1
    p_year:      now.getFullYear()
  })
  // Returns: { total_score, tier, bonus_amount, avg_response_time }
}

// ── 4. Badge streak — call right after score calculation ──
async function updateBadgeStreak(driverId) {
  return await callM4('update_badge_streak', {
    p_driver_id: driverId
  })
  // Returns: "Gold Streak" | "Silver Streak" | "Building Streak" | "No Streak"
}

module.exports = {
  reportSkipPenalty,
  sendHospitalPrealert,
  calculateDriverScore,
  updateBadgeStreak
}
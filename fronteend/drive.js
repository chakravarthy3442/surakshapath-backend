// ── SurakshaPath Driver Portal — connected to real backend ──

// Driver session (set after login)
let DRIVER_SESSION = null
let currentJobId = null
let timeLeft = 30   // matches your backend's 30-second window
let timer

window.onload = async function () {
  document.getElementById('loader').classList.add('gone')

  // Try to load a real job from backend
  await initDriver()
}

async function initDriver() {
  // For demo: use Rajan Kumar's credentials from your db.js seed data
  try {
    const res = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '9876543210',   // Rajan Kumar
        password: 'driver123',
        role: 'driver'
      })
    })
    const data = await res.json()

    if (data.success) {
      DRIVER_SESSION = data.driver
      console.log('🚑 Driver logged in:', DRIVER_SESSION.name)

      // Update UI with real driver data
      const nameEl = document.getElementById('driver-name')
      if (nameEl) nameEl.textContent = DRIVER_SESSION.name

      // Now load incoming job
      await loadNewJob()
    }
  } catch (err) {
    console.warn('Backend offline — running demo mode')
    simulateFallbackJob()
  }
}

async function loadNewJob() {
  if (!DRIVER_SESSION) return simulateFallbackJob()

  try {
    const res = await fetch(`http://localhost:3001/api/dispatch/next-job/${DRIVER_SESSION.id}`)
    const data = await res.json()

    if (data.success && data.job) {
      currentJobId = data.job.id

      const titleEl = document.getElementById('job-title')
      const subEl   = document.getElementById('job-sub')
      if (titleEl) titleEl.innerText = data.job.title || 'Emergency Pickup'
      if (subEl)   subEl.innerText   = data.job.sub   || 'Patient location received'

      timeLeft = data.timerSeconds || 30
      startTimer()
    } else {
      // No pending job yet — wait for SOS from caller
      console.log('No pending job. Waiting...')
      const titleEl = document.getElementById('job-title')
      if (titleEl) titleEl.innerText = 'Waiting for dispatch...'
    }
  } catch (err) {
    console.warn('Could not fetch job:', err.message)
    simulateFallbackJob()
  }
}

function simulateFallbackJob() {
  // Demo mode when backend is offline
  document.getElementById('job-title').innerText = 'Pickup: MG Road → Manipal Hospital'
  document.getElementById('job-sub').innerText   = 'Emergency · 1.2 km away'
  timeLeft = 30
  startTimer()
}

function startTimer() {
  clearInterval(timer)
  timer = setInterval(() => {
    const el = document.getElementById('timer')
    if (!el) return
    el.innerText = timeLeft
    el.classList.toggle('urgent', timeLeft <= 5)
    timeLeft--
    if (timeLeft < 0) {
      clearInterval(timer)
      document.getElementById('job-title').innerText = 'Request Expired'
      document.getElementById('timer').innerText = '!'
      setStatus('idle', 'Standby', 'Request expired', '—', 0)
    }
  }, 1000)
}

async function acceptJob() {
  clearInterval(timer)
  document.getElementById('timer').innerText = '✓'
  document.getElementById('timer').style.color = 'var(--green)'
  setStatus('active', 'En route', 'Moving to patient...', 'Now', 30)

  // Tell backend this driver accepted
  if (currentJobId && DRIVER_SESSION) {
    try {
      await fetch('http://localhost:3001/api/dispatch/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId:    currentJobId,
          driverId: DRIVER_SESSION.id
        })
      })
      console.log('✅ Job accepted on backend:', currentJobId)
    } catch (err) {
      console.warn('Accept call failed (demo mode)')
    }
  }

  startMovement()
}

async function rejectJob() {
  clearInterval(timer)

  if (currentJobId && DRIVER_SESSION) {
    try {
      const res = await fetch('http://localhost:3001/api/dispatch/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId:    currentJobId,
          driverId: DRIVER_SESSION.id
        })
      })
      const data = await res.json()

      if (data.forcedOffline) {
        document.getElementById('job-title').innerText = 'You are offline — 3 skips reached'
        document.getElementById('timer').innerText = '✗'
        setStatus('idle', 'Offline', 'Too many skips', '—', 0)
        return
      }
    } catch (err) {
      console.warn('Skip call failed (demo mode)')
    }
  }

  document.getElementById('job-title').innerText = 'Job Rejected'
  document.getElementById('timer').innerText = '✗'
  setStatus('idle', 'Standby', 'Job declined', '—', 0)
  setTimeout(loadNewJob, 2500)
}

function startMovement() {
  let steps = 5
  let i = 0
  function move() {
    if (i < steps) {
      setStatus('enroute', 'En route', 'Step ' + (i + 1) + ' of ' + steps, 'Now', Math.round((i / steps) * 80))
      i++
      setTimeout(move, 800)
    } else {
      setStatus('active', 'Patient picked up', 'Heading to hospital', 'Done', 100)
      const etaEl = document.getElementById('ov-eta')
      if (etaEl) etaEl.textContent = '0:00'
    }
  }
  move()
}

function setStatus(dotClass, name, sub, time, prog) {
  const dot  = document.getElementById('s-dot')
  const fill = document.getElementById('prog-fill')
  if (dot)  dot.className = 's-dot ' + dotClass
  document.getElementById('s-name').textContent = name
  document.getElementById('s-sub').textContent  = sub
  document.getElementById('s-time').textContent = time
  if (fill) fill.style.width = prog + '%'
}
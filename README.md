# 🚑 SurakshaPath AI — Member 3 Backend v2
### Updated for Member 2 (Driver Portal)

---

## 🆕 What Changed in v2 (vs v1)

| What | v1 | v2 |
|------|----|----|
| City | Chennai | **Bangalore** (matches Member 2's UI) |
| Accept timer | 12 seconds | **30 seconds** (matches Member 2's UI) |
| Patient pickup | Not supported | **`POST /api/dispatch/patient-onboard`** ✅ |
| Hospital select | Not supported | **`POST /api/dispatch/select-hospital`** ✅ |
| Next job loading | Not supported | **`GET /api/dispatch/next-job/:driverId`** ✅ |
| Skip penalty | -5 score | -5 score + **3 skips = forced offline** ✅ |
| Job status flow | 5 states | **6 states** (adds `patient_onboard`, `hospital_route`) |
| Hospitals API | ❌ | **`GET /api/dispatch/hospitals`** ✅ |

---

## ▶️ HOW TO RUN (same as before)

```bash
npm install
npm run dev
```
Server starts at `http://localhost:3001`

---

## 🔌 HOW MEMBER 2 CONNECTS (driver portal)

Add to `driver.html` before the closing `</body>`:
```html
<script src="api.js"></script>
<script src="driver.js"></script>
```

### Replace Member 2's hardcoded functions with these:

**Instead of hardcoded `loadNewJob()`:**
```js
async function loadNewJob() {
  const data = await SP.getNextJob(SP_SESSION.driver.id);
  if (data.success) {
    document.getElementById('job-title').textContent = data.job.title;
    document.getElementById('job-sub').textContent   = data.job.sub;
    document.getElementById('chip-dist').textContent = data.job.dist;
    document.getElementById('chip-eta').textContent  = data.job.eta;
    document.getElementById('chip-prio').textContent = data.job.priorityLabel;
    timeLeft = data.timerSeconds;  // 30
    startTimer();
  }
}
```

**Instead of hardcoded `acceptJob()`:**
```js
async function acceptJob() {
  const data = await SP.acceptJob(currentJobId, SP_SESSION.driver.id);
  if (data.success) {
    // proceed with your animation...
    startMovement();
  }
}
```

**For the "Patient Picked Up" button (`patientPickedUp()`):**
```js
async function patientPickedUp() {
  const data = await SP.patientOnboard(currentJobId, SP_SESSION.driver.id);
  if (data.success) {
    // data.hospitals is the same shape as your HOSPITALS array!
    // Render them using your existing renderHospitalItem()
    data.hospitals.forEach((h, i) => renderHospitalItem(h, i));
  }
}
```

**For hospital selection (`selectHospital()`):**
```js
async function selectHospital(idx, h) {
  const data = await SP.selectHospital(currentJobId, SP_SESSION.driver.id, h.id);
  if (data.success) {
    // data.hospital.eta, data.hospital.name etc — use your existing UI code
  }
}
```

**For skip with forced-offline check:**
```js
async function rejectJob() {
  const data = await SP.skipJob(currentJobId, SP_SESSION.driver.id);
  if (data.forcedOffline) {
    showToast('3 skips reached — you are offline for this shift');
    setStatus('idle', 'Offline', 'Too many skips', '—', 0);
  } else {
    showToast('Job declined. Score -5. (' + data.newSkipCount + '/3)');
    setTimeout(loadNewJob, 2500);
  }
}
```

---

## 📡 ALL API ENDPOINTS (v2)

| Method | URL | What it does |
|--------|-----|--------------|
| GET | /api/health | Server health check |
| POST | /api/auth/login | Login (caller or driver) |
| POST | /api/auth/logout | Go offline |
| GET | /api/auth/leaderboard | Driver rankings |
| POST | /api/dispatch/sos | 🚨 Trigger SOS |
| GET | /api/dispatch/nearest?lat=&lng= | Nearby ambulances |
| POST | /api/dispatch/accept | Driver accepts job |
| POST | /api/dispatch/skip | Skip + penalty |
| **POST** | **/api/dispatch/patient-onboard** | **Patient picked up → returns hospitals** |
| **POST** | **/api/dispatch/select-hospital** | **Driver picks destination hospital** |
| POST | /api/dispatch/arrived | Mark arrival |
| **GET** | **/api/dispatch/next-job/:driverId** | **Get next queued job** |
| **GET** | **/api/dispatch/hospitals** | **List all hospitals** |
| GET | /api/dispatch/job/:id | Job status |
| GET | /api/dispatch/driver-job/:driverId | Driver's current job |
| POST | /api/gps/update | Driver sends GPS |
| GET | /api/gps/drivers | All driver positions |

---

## 🚗 Demo Driver Logins (Bangalore)

| Name | Phone | Password | Area |
|------|-------|----------|------|
| Rajan Kumar | 9876543210 | driver123 | Koramangala |
| Meena Devi | 9876543211 | driver123 | Silk Board |
| Vijay Anand | 9876543212 | driver123 | Indiranagar |
| Priya Sundaram | 9876543213 | driver123 | Whitefield |

---

*Member 3 — SurakshaPath AI Backend v2 | Built for India 🇮🇳*

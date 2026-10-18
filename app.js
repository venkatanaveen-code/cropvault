// ==============================================================================
// CropVault – Cold Storage & Emergency Loan Linker
// JNTUA Innovation Conclave Prototype
// Main Application Logic (Modular ES6 + Firebase Firestore)
// ==============================================================================

import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

// Commodity Benchmark Pricing Table (in INR per kg) for Rayalaseema & AP
const COMMODITY_RATES = {
  "Red Chilli": 210,
  "Paddy (Rice)": 24,
  "Groundnut": 68,
  "Turmeric": 130,
  "Bengal Gram": 55,
  "Maize": 22,
  "Onion": 22,
  "Cotton": 72
};

// Application State
const state = {
  records: [],
  db: null,
  isFirebaseActive: false,
  currentReceipt: null,
  qrInstance: null,
  currentPhotoDataUrl: null,
  cameraStream: null,
  cameraFacingMode: "environment"
};

// LocalStorage key for offline/demo persistence
const STORAGE_KEY = "cropvault_records_cache";

/**
 * Generates an authentic, crisp SVG data URL for sample crop photos
 */
export function generateSampleCropSvg(cropType) {
  const type = cropType || "Red Chilli";
  let bgGradient = "linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)";
  let icon = "🌶️";
  let title = "RED CHILLI LOT";
  let sub = "TEJA G4 • FAQ GRADE A+";

  if (type.includes("Paddy") || type.includes("Rice")) {
    bgGradient = "linear-gradient(135deg, #d97706 0%, #92400e 100%)";
    icon = "🌾";
    title = "PADDY GRAIN LOT";
    sub = "SONA MASOORI • BPT 5204";
  } else if (type.includes("Groundnut") || type.includes("Peanut")) {
    bgGradient = "linear-gradient(135deg, #b45309 0%, #78350f 100%)";
    icon = "🥜";
    title = "GROUNDNUT POD LOT";
    sub = "KADIRI-6 • AFLATOXIN SAFE";
  } else if (type.includes("Turmeric")) {
    bgGradient = "linear-gradient(135deg, #eab308 0%, #a16207 100%)";
    icon = "🫚";
    title = "TURMERIC FINGERS";
    sub = "DUGGIRALA GOLD • CURCUMIN HIGH";
  } else if (type.includes("Onion")) {
    bgGradient = "linear-gradient(135deg, #9333ea 0%, #581c87 100%)";
    icon = "🧅";
    title = "BELLARY ONION BULB";
    sub = "CONTROLLED ATMOSPHERE LOT";
  } else if (type.includes("Cotton")) {
    bgGradient = "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)";
    icon = "☁️";
    title = "RAW SEED COTTON";
    sub = "LONG STAPLE • FAQ GRADE";
  } else if (type.includes("Bengal Gram")) {
    bgGradient = "linear-gradient(135deg, #ea580c 0%, #9a3412 100%)";
    icon = "🫘";
    title = "BENGAL GRAM CHANA";
    sub = "DESI BOLD • CLEAN SOUND";
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="240" viewBox="0 0 360 240">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#064e3b;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#022c22;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="360" height="240" fill="url(#grad)" rx="8"/>
    <rect x="8" y="8" width="344" height="224" fill="none" stroke="#34d399" stroke-width="1.5" stroke-dasharray="4 2" rx="6"/>
    <circle cx="180" cy="85" r="48" fill="#ffffff" fill-opacity="0.12" stroke="#6ee7b7" stroke-width="1"/>
    <text x="180" y="100" font-size="46" text-anchor="middle" dominant-baseline="central">${icon}</text>
    <text x="180" y="155" fill="#f0fdf4" font-family="-apple-system, sans-serif" font-weight="800" font-size="16" letter-spacing="1" text-anchor="middle">${title}</text>
    <text x="180" y="178" fill="#a7f3d0" font-family="-apple-system, sans-serif" font-weight="600" font-size="11" letter-spacing="0.5" text-anchor="middle">${sub}</text>
    <rect x="95" y="196" width="170" height="22" fill="#047857" rx="11"/>
    <text x="180" y="211" fill="#ecfdf5" font-family="-apple-system, sans-serif" font-weight="700" font-size="9.5" text-anchor="middle">✓ QC INSPECTION VERIFIED</text>
  </svg>`;

  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

// Dynamic Firebase module registry (Loaded on-demand only if configured)
const fb = {
  initializeApp: null,
  getFirestore: null,
  collection: null,
  addDoc: null,
  getDocs: null,
  query: null,
  orderBy: null,
  onSnapshot: null,
  doc: null,
  deleteDoc: null
};

async function loadFirebaseModules() {
  if (fb.initializeApp) return true;
  try {
    const appModule = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
    const firestoreModule = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    fb.initializeApp = appModule.initializeApp;
    fb.getFirestore = firestoreModule.getFirestore;
    fb.collection = firestoreModule.collection;
    fb.addDoc = firestoreModule.addDoc;
    fb.getDocs = firestoreModule.getDocs;
    fb.query = firestoreModule.query;
    fb.orderBy = firestoreModule.orderBy;
    fb.onSnapshot = firestoreModule.onSnapshot;
    fb.doc = firestoreModule.doc;
    fb.deleteDoc = firestoreModule.deleteDoc;
    return true;
  } catch (err) {
    console.warn("Could not load Firebase modules from CDN. Operating in local mode:", err);
    return false;
  }
}

// ==============================================================================
// INITIALIZATION
// ==============================================================================
document.addEventListener("DOMContentLoaded", () => {
  initDateDefaults();
  initNavigation();
  initFormInteractivity();
  initPhotoUploader();
  initLoanCalculator();
  initReceiptModal();
  initFirebaseOrLocal();
  setupEventHandlers();
});

/**
 * Sets today's date on date picker inputs
 */
function initDateDefaults() {
  const today = new Date().toISOString().split("T")[0];
  const depositDateInput = document.getElementById("deposit-date");
  const inspectionDateInput = document.getElementById("inspection-date");
  if (depositDateInput) depositDateInput.value = today;
  if (inspectionDateInput) inspectionDateInput.value = today;
}

/**
 * Initializes tab switching navigation
 */
function initNavigation() {
  const navButtons = document.querySelectorAll(".nav-item, .footer-nav-link");
  navButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = btn.getAttribute("data-target");
      if (targetId) {
        navigateTo(targetId);
      }
    });
  });

  // Action button listeners that jump views
  const btnViewAll = document.getElementById("btn-view-all-records");
  if (btnViewAll) {
    btnViewAll.addEventListener("click", () => navigateTo("records-view"));
  }

  const btnQuickDeposit = document.getElementById("btn-quick-new-deposit");
  if (btnQuickDeposit) {
    btnQuickDeposit.addEventListener("click", () => navigateTo("deposit-view"));
  }

  const btnNavDeposit = document.getElementById("btn-nav-to-deposit-from-records");
  if (btnNavDeposit) {
    btnNavDeposit.addEventListener("click", () => navigateTo("deposit-view"));
  }
}

/**
 * Navigates to a specific view section
 */
export function navigateTo(viewId) {
  const sections = document.querySelectorAll(".view-section");
  const navButtons = document.querySelectorAll(".nav-item");

  sections.forEach(sec => {
    sec.classList.remove("active");
  });

  navButtons.forEach(btn => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-target") === viewId) {
      btn.classList.add("active");
    }
  });

  const activeSection = document.getElementById(viewId);
  if (activeSection) {
    activeSection.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// ==============================================================================
// FIREBASE & DATA SYNCHRONIZATION
// ==============================================================================
async function initFirebaseOrLocal() {
  const statusPill = document.getElementById("firebase-status-pill");
  const statusDot = document.getElementById("firebase-status-dot");
  const statusText = document.getElementById("firebase-status-text");

  // Load from local storage cache first for instant rendering
  loadLocalRecords();
  renderDashboard();
  renderRecordsTable();
  populateLoanReceiptDropdown();
  renderLookupQuickChips();

  if (isFirebaseConfigured()) {
    const loaded = await loadFirebaseModules();
    if (loaded) {
      try {
        const app = fb.initializeApp(firebaseConfig);
        state.db = fb.getFirestore(app);
        state.isFirebaseActive = true;

        statusDot.classList.remove("offline");
        statusText.textContent = "Firestore Live";
        statusPill.hidden = false;
        statusPill.title = "Connected to Google Cloud Firestore database";
        showToast("Connected to Firebase Firestore cloud database", "success");

        // Subscribe to real-time updates from 'crop_deposits' collection
        subscribeToFirestore();
        return;
      } catch (err) {
        console.warn("Firebase initialization failed, falling back to local demo mode:", err);
      }
    }
  }

  // Fallback to Demo Mode
  activateDemoMode(statusDot, statusPill);
}

function activateDemoMode(dot, pill) {
  state.isFirebaseActive = false;
  if (dot) dot.classList.add("offline");
  if (pill) pill.hidden = true;

  // If no records in local storage either, preload sample data for first run
  if (state.records.length === 0) {
    preloadSampleData(false);
  }
}

/**
 * Real-time listener for Firestore collection
 */
function subscribeToFirestore() {
  if (!state.db || !fb.collection || !fb.onSnapshot) return;

  try {
    const colRef = fb.collection(state.db, "crop_deposits");
    const q = fb.query(colRef, fb.orderBy("createdAt", "desc"));

    fb.onSnapshot(q, (snapshot) => {
      const firestoreRecords = [];
      snapshot.forEach((docSnap) => {
        firestoreRecords.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });

      if (firestoreRecords.length > 0) {
        state.records = firestoreRecords;
        saveLocalRecords();
        renderDashboard();
        renderRecordsTable();
        populateLoanReceiptDropdown();
        renderLookupQuickChips();
      }
    }, (error) => {
      console.error("Firestore snapshot error:", error);
      showToast("Firestore query error. Using cached records.", "warning");
    });
  } catch (e) {
    console.warn("Error setting up snapshot listener:", e);
  }
}

/**
 * Loads records from LocalStorage
 */
function loadLocalRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      state.records = JSON.parse(raw);
    }
  } catch (e) {
    console.error("Error reading localStorage", e);
    state.records = [];
  }
}

/**
 * Saves records to LocalStorage
 */
function saveLocalRecords() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
  } catch (e) {
    console.error("Error writing to localStorage", e);
  }
}

// ==============================================================================
// FORM HANDLING & RECORD CREATION
// ==============================================================================
function initFormInteractivity() {
  const form = document.getElementById("crop-deposit-form");
  const weightInput = document.getElementById("total-weight-kg");
  const quintalsPreview = document.getElementById("quintals-preview-pill");
  const moistureInput = document.getElementById("moisture-pct");
  const moistureBadge = document.getElementById("moisture-badge");
  const foreignInput = document.getElementById("foreign-matter-pct");
  const foreignBadge = document.getElementById("foreign-badge");
  const damagedInput = document.getElementById("damaged-produce-pct");
  const damagedBadge = document.getElementById("damaged-badge");
  const btnAutoGrade = document.getElementById("btn-auto-grade");
  const btnFillSample = document.getElementById("btn-fill-sample-form");

  // Dynamic weight calculations
  if (weightInput && quintalsPreview) {
    weightInput.addEventListener("input", () => {
      const val = parseFloat(weightInput.value) || 0;
      const quintals = (val / 100).toFixed(2);
      const mt = (val / 1000).toFixed(2);
      quintalsPreview.innerHTML = `<i class="fa-solid fa-calculator"></i> = ${quintals} Quintals (${mt} Metric Tonnes)`;
    });
  }

  // Real-time quality metric badges
  if (moistureInput && moistureBadge) {
    moistureInput.addEventListener("input", () => {
      moistureBadge.textContent = `${moistureInput.value || 0}%`;
      updateMoistureColor(moistureInput.value, moistureBadge);
    });
  }

  if (foreignInput && foreignBadge) {
    foreignInput.addEventListener("input", () => {
      foreignBadge.textContent = `${foreignInput.value || 0}%`;
    });
  }

  if (damagedInput && damagedBadge) {
    damagedInput.addEventListener("input", () => {
      damagedBadge.textContent = `${damagedInput.value || 0}%`;
    });
  }

  // Auto-Suggest Quality Grade based on moisture & damaged produce
  if (btnAutoGrade) {
    btnAutoGrade.addEventListener("click", () => {
      const moisture = parseFloat(moistureInput.value) || 12;
      const foreign = parseFloat(foreignInput.value) || 1;
      const damaged = parseFloat(damagedInput.value) || 2;

      let suggestedGrade = "Grade A";
      if (moisture <= 10.5 && foreign <= 0.8 && damaged <= 1.5) {
        suggestedGrade = "Grade A+";
      } else if (moisture <= 12.5 && foreign <= 1.5 && damaged <= 3.0) {
        suggestedGrade = "Grade A";
      } else if (moisture <= 14.5 && foreign <= 3.0 && damaged <= 6.0) {
        suggestedGrade = "Grade B";
      } else {
        suggestedGrade = "Grade C";
      }

      const radio = document.querySelector(`input[name="quality-grade"][value="${suggestedGrade}"]`);
      if (radio) {
        radio.checked = true;
        showToast(`Auto-assigned ${suggestedGrade} based on test analysis`, "info");
      }
    });
  }

  // Fill sample Rayalaseema agricultural record
  if (btnFillSample) {
    btnFillSample.addEventListener("click", () => {
      fillSampleForm();
    });
  }

  // Form Submission
  if (form) {
    form.addEventListener("submit", handleFormSubmit);
  }
}

function updateMoistureColor(val, badge) {
  const num = parseFloat(val) || 0;
  if (num <= 11) {
    badge.style.background = "#d1fae5";
    badge.style.color = "#065f46";
  } else if (num <= 13) {
    badge.style.background = "#fef3c7";
    badge.style.color = "#92400e";
  } else {
    badge.style.background = "#fee2e2";
    badge.style.color = "#991b1b";
  }
}

/**
 * Prefills the deposit form with a realistic Rayalaseema Chilli deposit
 */
function fillSampleForm() {
  document.getElementById("farmer-name").value = "K. Venkata Ramana Reddy";
  document.getElementById("farmer-phone").value = "9848022334";
  document.getElementById("farmer-aadhaar").value = "7842";
  document.getElementById("crop-type").value = "Red Chilli";
  document.getElementById("crop-variety").value = "Teja (G4 Super)";
  document.getElementById("bag-count").value = "60";
  document.getElementById("total-weight-kg").value = "3000";
  document.getElementById("warehouse-name").value = "AP State Warehousing Corp - Anantapur Hub";
  document.getElementById("storage-condition").value = "Refrigerated Cold Chamber (2-4°C)";
  document.getElementById("moisture-pct").value = "10.2";
  document.getElementById("foreign-matter-pct").value = "0.6";
  document.getElementById("damaged-produce-pct").value = "1.0";
  document.getElementById("inspector-name").value = "R. Sundaram (QC Manager)";
  document.getElementById("inspection-notes").value = "High pungency, uniform deep red color. Double stitched sound gunny bags. Cold room Bay-04.";

  const gradeRadio = document.querySelector('input[name="quality-grade"][value="Grade A+"]');
  if (gradeRadio) gradeRadio.checked = true;

  // Attach authentic sample photo for Red Chilli
  setPhotoPreview(generateSampleCropSvg("Red Chilli"));

  // Trigger weight calculation preview
  const weightInput = document.getElementById("total-weight-kg");
  weightInput.dispatchEvent(new Event("input"));
  showToast("Rayalaseema sample data & inspection photo loaded!", "info");
}

/**
 * Initializes crop lot photo uploader, live camera viewfinder, and sample generator
 */
function initPhotoUploader() {
  const fileInput = document.getElementById("crop-photo-input");
  const btnTrigger = document.getElementById("btn-trigger-photo");
  const btnSample = document.getElementById("btn-sample-crop-photo");
  const btnRemove = document.getElementById("btn-remove-photo");
  const dropzone = document.getElementById("photo-dropzone-box");
  const btnOpenCamera = document.getElementById("btn-open-camera");
  const btnCloseCamera = document.getElementById("btn-close-camera-modal");
  const btnCancelCamera = document.getElementById("btn-cancel-camera");
  const btnSwitchCamera = document.getElementById("btn-switch-camera");
  const btnCaptureSnapshot = document.getElementById("btn-capture-snapshot");
  const cameraModal = document.getElementById("camera-modal-container");

  // Live Camera Trigger
  if (btnOpenCamera) {
    btnOpenCamera.addEventListener("click", () => openCameraModal());
  }

  // Camera modal close listeners
  if (btnCloseCamera) {
    btnCloseCamera.addEventListener("click", () => closeCameraModal());
  }
  if (btnCancelCamera) {
    btnCancelCamera.addEventListener("click", () => closeCameraModal());
  }
  if (cameraModal) {
    cameraModal.addEventListener("click", (e) => {
      if (e.target === cameraModal) closeCameraModal();
    });
  }

  // Switch between front/back camera
  if (btnSwitchCamera) {
    btnSwitchCamera.addEventListener("click", () => {
      state.cameraFacingMode = state.cameraFacingMode === "environment" ? "user" : "environment";
      startCameraStream(state.cameraFacingMode);
    });
  }

  // Snap photo from live camera feed
  if (btnCaptureSnapshot) {
    btnCaptureSnapshot.addEventListener("click", () => {
      captureCameraSnapshot();
    });
  }

  // File upload trigger
  if (btnTrigger && fileInput) {
    btnTrigger.addEventListener("click", () => fileInput.click());
  }

  if (dropzone && fileInput) {
    dropzone.addEventListener("click", (e) => {
      if (e.target.closest("#btn-remove-photo")) return;
      if (!state.currentPhotoDataUrl) openCameraModal();
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Scale down via HTML5 Canvas (max 360x270) for compact storage & print fidelity
          const canvas = document.createElement("canvas");
          const maxW = 360;
          const maxH = 270;
          let w = img.width;
          let h = img.height;

          if (w > h) {
            if (w > maxW) {
              h = Math.round(h * (maxW / w));
              w = maxW;
            }
          } else {
            if (h > maxH) {
              w = Math.round(w * (maxH / h));
              h = maxH;
            }
          }

          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);

          // Add QC timestamp watermark
          ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
          ctx.fillRect(0, h - 22, w, 22);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 10px monospace";
          ctx.fillText("CROPVAULT QC VERIFIED • " + new Date().toISOString().split("T")[0], 6, h - 7);

          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.75);
          setPhotoPreview(compressedDataUrl);
          showToast("Crop produce photo attached & verified!", "success");
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  if (btnSample) {
    btnSample.addEventListener("click", () => {
      const cropType = document.getElementById("crop-type").value || "Red Chilli";
      const sampleUrl = generateSampleCropSvg(cropType);
      setPhotoPreview(sampleUrl);
      showToast(`Loaded sample inspection photo for ${cropType}!`, "info");
    });
  }

  if (btnRemove) {
    btnRemove.addEventListener("click", (e) => {
      e.stopPropagation();
      clearPhotoPreview();
      showToast("Lot photo removed", "info");
    });
  }
}

/**
 * Opens Live Camera modal and connects webcam stream
 */
async function openCameraModal() {
  const modal = document.getElementById("camera-modal-container");
  const msg = document.getElementById("camera-status-msg");
  if (modal) modal.classList.add("active");
  if (msg) msg.textContent = "Connecting to device camera stream...";

  await startCameraStream(state.cameraFacingMode);
}

/**
 * Closes Live Camera modal and releases hardware resources
 */
function closeCameraModal() {
  const modal = document.getElementById("camera-modal-container");
  if (modal) modal.classList.remove("active");
  stopCameraStream();
}

/**
 * Requests video stream from user device
 */
async function startCameraStream(facingMode) {
  stopCameraStream();
  const video = document.getElementById("camera-stream-video");
  const msg = document.getElementById("camera-status-msg");

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (msg) msg.innerHTML = "<span style='color:#dc2626;'>Live camera API is unavailable in this environment. Please use the <strong>Upload File</strong> or <strong>Sample Photo</strong> button.</span>";
    return;
  }

  try {
    const constraints = {
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    state.cameraStream = stream;
    if (video) {
      video.srcObject = stream;
      await video.play();
    }
    if (msg) msg.textContent = "Align crop sample or bags in the box, then click 'Snap Photo'.";
  } catch (err) {
    console.warn("Live camera stream error:", err);
    if (msg) {
      msg.innerHTML = `<span style='color:#dc2626;'><i class='fa-solid fa-triangle-exclamation'></i> Camera access denied or not connected (${err.name}). You can still use the <strong>Upload File</strong> or <strong>Sample Photo</strong> button!</span>`;
    }
    showToast("Camera access unavailable. Use Upload or Sample Photo.", "warning");
  }
}

/**
 * Stops camera tracks to release webcam hardware
 */
function stopCameraStream() {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach(track => track.stop());
    state.cameraStream = null;
  }
  const video = document.getElementById("camera-stream-video");
  if (video) video.srcObject = null;
}

/**
 * Captures currently displayed frame from camera video feed into high-res canvas
 */
function captureCameraSnapshot() {
  const video = document.getElementById("camera-stream-video");
  if (!video || !video.videoWidth) {
    showToast("Camera video stream is not active yet.", "warning");
    return;
  }

  const canvas = document.createElement("canvas");
  const maxW = 480;
  let w = video.videoWidth || 640;
  let h = video.videoHeight || 480;

  if (w > maxW) {
    h = Math.round(h * (maxW / w));
    w = maxW;
  }

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, w, h);

  // Discrete timestamp watermark
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(0, h - 22, w, 22);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 10px monospace";
  ctx.fillText("LIVE CAMERA QC • " + new Date().toISOString().replace("T", " ").substring(0, 19), 6, h - 7);

  const snapshotDataUrl = canvas.toDataURL("image/jpeg", 0.78);
  setPhotoPreview(snapshotDataUrl);
  closeCameraModal();
  showToast("Live camera inspection photo captured!", "success");
}

function setPhotoPreview(dataUrl) {
  state.currentPhotoDataUrl = dataUrl;
  const placeholder = document.getElementById("photo-placeholder");
  const previewWrapper = document.getElementById("photo-preview-wrapper");
  const previewImg = document.getElementById("photo-preview-img");

  if (placeholder) placeholder.style.display = "none";
  if (previewWrapper) previewWrapper.style.display = "block";
  if (previewImg) previewImg.src = dataUrl;
}

function clearPhotoPreview() {
  state.currentPhotoDataUrl = null;
  const placeholder = document.getElementById("photo-placeholder");
  const previewWrapper = document.getElementById("photo-preview-wrapper");
  const previewImg = document.getElementById("photo-preview-img");
  const fileInput = document.getElementById("crop-photo-input");

  if (placeholder) placeholder.style.display = "block";
  if (previewWrapper) previewWrapper.style.display = "none";
  if (previewImg) previewImg.src = "";
  if (fileInput) fileInput.value = "";
}

/**
 * Handles Form Submission, validation, saving to Firestore / local, and showing receipt
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  const submitBtn = document.getElementById("btn-submit-deposit");
  const spinner = document.getElementById("btn-submit-spinner");
  const submitIcon = document.getElementById("btn-submit-icon");

  // Basic validation
  const farmerName = document.getElementById("farmer-name").value.trim();
  const cropType = document.getElementById("crop-type").value;
  const bagCount = parseInt(document.getElementById("bag-count").value) || 0;
  const totalWeightKg = parseFloat(document.getElementById("total-weight-kg").value) || 0;
  const warehouseName = document.getElementById("warehouse-name").value;
  const depositDate = document.getElementById("deposit-date").value;
  const storageCondition = document.getElementById("storage-condition").value;

  if (!farmerName || !cropType || bagCount <= 0 || totalWeightKg <= 0 || !warehouseName || !depositDate) {
    showToast("Please fill in all mandatory fields with valid values.", "error");
    return;
  }

  // Generate Unique Receipt ID (e.g. CV-2026-AP-8491)
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const receiptId = `CV-2026-AP-${randomSuffix}`;

  // Quality parameters
  const moisturePct = parseFloat(document.getElementById("moisture-pct").value) || 11.0;
  const foreignMatterPct = parseFloat(document.getElementById("foreign-matter-pct").value) || 0.8;
  const damagedProducePct = parseFloat(document.getElementById("damaged-produce-pct").value) || 1.2;
  const gradeRadio = document.querySelector('input[name="quality-grade"]:checked');
  const qualityGrade = gradeRadio ? gradeRadio.value : "Grade A";
  const inspectorName = document.getElementById("inspector-name").value.trim() || "QC Inspector";
  const inspectionDate = document.getElementById("inspection-date").value || depositDate;
  const inspectionNotes = document.getElementById("inspection-notes").value.trim();

  // Valuation & Emergency Loan Linker calculation
  const benchmarkRate = COMMODITY_RATES[cropType] || 40;
  const grossValue = Math.round(totalWeightKg * benchmarkRate);
  const maxLoanEligibility = Math.round(grossValue * 0.75); // 75% standard LTV

  const newRecord = {
    receiptId,
    farmerName,
    farmerPhone: document.getElementById("farmer-phone").value.trim() || "N/A",
    farmerAadhaar: document.getElementById("farmer-aadhaar").value.trim() || "N/A",
    cropType,
    cropVariety: document.getElementById("crop-variety").value.trim() || "Standard",
    cropPhoto: state.currentPhotoDataUrl || generateSampleCropSvg(cropType),
    bagCount,
    totalWeightKg,
    warehouseName,
    depositDate,
    storageCondition,
    moisturePct,
    foreignMatterPct,
    damagedProducePct,
    qualityGrade,
    inspectorName,
    inspectionDate,
    inspectionNotes: inspectionNotes || "Passed cold storage intake inspection.",
    benchmarkRate,
    grossValue,
    maxLoanEligibility,
    createdAt: new Date().toISOString()
  };

  // UI loading state
  if (submitBtn) submitBtn.disabled = true;
  if (spinner) spinner.style.display = "inline-block";
  if (submitIcon) submitIcon.style.display = "none";

  try {
    if (state.isFirebaseActive && state.db && fb.addDoc && fb.collection) {
      // Save directly to Firestore collection
      const docRef = await fb.addDoc(fb.collection(state.db, "crop_deposits"), newRecord);
      newRecord.id = docRef.id;
      showToast(`Record ${receiptId} saved to Cloud Firestore!`, "success");
    } else {
      // Local demo mode save
      state.records.unshift(newRecord);
      saveLocalRecords();
      renderDashboard();
      renderRecordsTable();
      populateLoanReceiptDropdown();
      renderLookupQuickChips();
      showToast(`Record ${receiptId} saved locally`, "success");
    }

    // Reset Form & Photo Preview
    document.getElementById("crop-deposit-form").reset();
    clearPhotoPreview();
    initDateDefaults();
    document.getElementById("quintals-preview-pill").innerHTML = `<i class="fa-solid fa-calculator"></i> = 0.00 Quintals (0.00 MT)`;

    // Automatically display the generated digital receipt!
    displayReceiptModal(newRecord);

  } catch (error) {
    console.error("Error saving deposit record:", error);
    showToast("Error saving record: " + error.message, "error");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (spinner) spinner.style.display = "none";
    if (submitIcon) submitIcon.style.display = "inline-block";
  }
}

// ==============================================================================
// DIGITAL RECEIPT MODAL & QR CODE GENERATION
// ==============================================================================
function initReceiptModal() {
  const modalOverlay = document.getElementById("receipt-modal-container");
  const btnClose = document.getElementById("btn-close-receipt-modal");
  const btnPrint = document.getElementById("btn-print-receipt");
  const btnCopy = document.getElementById("btn-copy-receipt-id");

  if (btnClose && modalOverlay) {
    btnClose.addEventListener("click", () => {
      modalOverlay.classList.remove("active");
    });

    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.classList.remove("active");
      }
    });
  }

  if (btnPrint) {
    btnPrint.addEventListener("click", () => {
      window.print();
    });
  }

  if (btnCopy) {
    btnCopy.addEventListener("click", () => {
      if (state.currentReceipt) {
        navigator.clipboard.writeText(state.currentReceipt.receiptId)
          .then(() => showToast(`Receipt ID ${state.currentReceipt.receiptId} copied to clipboard!`, "info"))
          .catch(() => showToast("Failed to copy receipt ID", "warning"));
      }
    });
  }

  // Config modal close handlers
  const configModal = document.getElementById("config-modal-container");
  const btnCloseConfig = document.getElementById("btn-close-config-modal");
  const btnDismissConfig = document.getElementById("btn-dismiss-config-modal");
  const statusPill = document.getElementById("firebase-status-pill");

  if (statusPill && configModal) {
    statusPill.addEventListener("click", () => {
      openConfigModal();
    });
  }

  if (btnCloseConfig && configModal) {
    btnCloseConfig.addEventListener("click", () => configModal.classList.remove("active"));
  }
  if (btnDismissConfig && configModal) {
    btnDismissConfig.addEventListener("click", () => configModal.classList.remove("active"));
  }
}

function openConfigModal() {
  const configModal = document.getElementById("config-modal-container");
  const alertBox = document.getElementById("config-status-alert");

  if (isFirebaseConfigured()) {
    alertBox.style.background = "#ecfdf5";
    alertBox.style.borderColor = "#a7f3d0";
    alertBox.style.color = "#065f46";
    alertBox.innerHTML = `
      <i class="fa-solid fa-circle-check"></i> <strong>Firebase credentials detected:</strong><br>
      Connected Project ID: <code>${firebaseConfig.projectId}</code><br>
      Real-time cloud database synchronization is active.
    `;
  } else {
    alertBox.style.background = "#fef3c7";
    alertBox.style.borderColor = "#fde68a";
    alertBox.style.color = "#92400e";
    alertBox.innerHTML = `
      <i class="fa-solid fa-circle-info"></i> <strong>Local storage is active:</strong><br>
      Records are saved in this browser. To link real-time Google Cloud Firestore, paste your credentials into <code>firebase-config.js</code>.
    `;
  }

  configModal.classList.add("active");
}

/**
 * Populates and reveals the Digital Receipt Voucher modal with scannable QR Code
 */
export function displayReceiptModal(record) {
  state.currentReceipt = record;

  const modalOverlay = document.getElementById("receipt-modal-container");
  const modalId = document.getElementById("receipt-modal-id");
  const modalDate = document.getElementById("receipt-modal-date");
  const modalFarmer = document.getElementById("receipt-modal-farmer");
  const modalPhone = document.getElementById("receipt-modal-phone");
  const modalCrop = document.getElementById("receipt-modal-crop");
  const modalBags = document.getElementById("receipt-modal-bags");
  const modalWeight = document.getElementById("receipt-modal-weight");
  const modalWarehouse = document.getElementById("receipt-modal-warehouse");
  const modalCondition = document.getElementById("receipt-modal-condition");
  const modalMoisture = document.getElementById("receipt-modal-moisture");
  const modalForeign = document.getElementById("receipt-modal-foreign");
  const modalDamaged = document.getElementById("receipt-modal-damaged");
  const modalGrade = document.getElementById("receipt-modal-grade");
  const modalLoanAmt = document.getElementById("receipt-modal-loan-amt");
  const modalNotes = document.getElementById("receipt-modal-notes");
  const sigFarmer = document.getElementById("receipt-sig-farmer");
  const sigManager = document.getElementById("receipt-sig-manager");
  const qrHash = document.getElementById("receipt-qr-hash");

  const quintals = (record.totalWeightKg / 100).toFixed(2);

  modalId.textContent = record.receiptId;
  modalDate.textContent = record.depositDate;
  modalFarmer.textContent = record.farmerName + (record.farmerAadhaar !== "N/A" ? ` (ID: ...${record.farmerAadhaar})` : "");
  modalPhone.textContent = record.farmerPhone || "N/A";
  modalCrop.textContent = `${record.cropType} (${record.cropVariety || "Standard"})`;
  modalBags.textContent = `${record.bagCount} Standard Gunny Bags`;
  modalWeight.textContent = `${Number(record.totalWeightKg).toLocaleString("en-IN")} kg (${quintals} Qtl)`;
  modalWarehouse.textContent = record.warehouseName;
  modalCondition.textContent = record.storageCondition;
  modalMoisture.textContent = `${record.moisturePct}%`;
  modalForeign.textContent = `${record.foreignMatterPct}%`;
  modalDamaged.textContent = `${record.damagedProducePct}%`;
  modalGrade.textContent = record.qualityGrade;
  modalLoanAmt.textContent = `₹${Number(record.maxLoanEligibility).toLocaleString("en-IN")}`;
  modalNotes.textContent = record.inspectionNotes || "Sound packaging. Passed cold storage QC.";

  sigFarmer.textContent = record.farmerName;
  sigManager.textContent = record.inspectorName || "R. Sundaram (QC Mgr)";
  qrHash.textContent = `ID: ${record.receiptId}`;

  // Generate QR Code containing the verification payload
  const qrContainer = document.getElementById("receipt-modal-qrcode");
  qrContainer.innerHTML = ""; // Clear previous QR

  // Compact payload structure for QR code
  const qrPayload = JSON.stringify({
    sys: "CropVault-JNTUA",
    rid: record.receiptId,
    farmer: record.farmerName,
    crop: record.cropType,
    wt_kg: record.totalWeightKg,
    grade: record.qualityGrade,
    dt: record.depositDate,
    val_inr: record.grossValue,
    loan_inr: record.maxLoanEligibility,
    wh: record.warehouseName,
    status: "VERIFIED_COLD_STORED"
  });

  try {
    if (typeof QRCode !== "undefined") {
      new QRCode(qrContainer, {
        text: qrPayload,
        width: 130,
        height: 130,
        colorDark: "#064e3b",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
    } else {
      qrContainer.innerHTML = `<div style="font-size:0.75rem; color:#dc2626;">QR Library Unavailable</div>`;
    }
  } catch (err) {
    console.error("QR Code generation error:", err);
    qrContainer.innerHTML = `<div style="font-size:0.75rem; color:#64748b;">[QR Code]</div>`;
  }

  // Display Verified Crop Lot Photo on Receipt Voucher
  const photoCard = document.getElementById("receipt-modal-photo-card");
  const photoImg = document.getElementById("receipt-modal-photo-img");
  if (photoCard && photoImg) {
    const photoSrc = record.cropPhoto || generateSampleCropSvg(record.cropType);
    photoImg.src = photoSrc;
    photoCard.style.display = "block";
  }

  modalOverlay.classList.add("active");
}

// ==============================================================================
// DASHBOARD RENDERING
// ==============================================================================
function renderDashboard() {
  const records = state.records;

  // Stat 1: Total deposits
  const totalDeposits = records.length;
  document.getElementById("stat-total-deposits").textContent = totalDeposits;

  // Stat 2: Total stored weight in kg and quintals
  const totalWeightKg = records.reduce((acc, r) => acc + (Number(r.totalWeightKg) || 0), 0);
  document.getElementById("stat-total-weight").innerHTML = `${totalWeightKg.toLocaleString("en-IN")} <span style="font-size: 1rem; font-weight: 500;">kg</span>`;
  const quintals = (totalWeightKg / 100).toFixed(1);
  const mt = (totalWeightKg / 1000).toFixed(1);
  document.getElementById("stat-weight-quintals").innerHTML = `<i class="fa-solid fa-boxes-stacked"></i> ${quintals} Quintals (${mt} MT)`;

  // Stat 3: Number of distinct farmers
  const uniqueFarmers = new Set(records.map(r => r.farmerName.toLowerCase().trim())).size;
  document.getElementById("stat-total-farmers").textContent = uniqueFarmers;

  // Stat 4: Total Collateral & Max Loan Potential
  const totalLoanPotential = records.reduce((acc, r) => acc + (Number(r.maxLoanEligibility) || 0), 0);
  document.getElementById("stat-collateral-val").textContent = `₹${totalLoanPotential.toLocaleString("en-IN")}`;

  // Recent deposits stream (latest 4)
  const recentContainer = document.getElementById("recent-deposits-container");
  if (!recentContainer) return;

  if (records.length === 0) {
    recentContainer.innerHTML = `
      <div class="empty-state" style="padding: 1.5rem;">
        <i class="fa-solid fa-inbox empty-state-icon" style="font-size: 2rem;"></i>
        <h4>No Deposits Recorded Yet</h4>
        <p style="font-size: 0.8rem;">Click 'Record Intake' to deposit crops or 'Load Sample Records' for demonstration data.</p>
      </div>
    `;
    return;
  }

  const recentList = records.slice(0, 4);
  let html = `<div style="display: flex; flex-direction: column; gap: 0.75rem;">`;

  recentList.forEach(rec => {
    const gradeBadgeClass = getGradeBadgeClass(rec.qualityGrade);
    html += `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: var(--slate-50); border: 1px solid var(--slate-200); border-radius: var(--radius-md); transition: transform 0.15s ease;" class="recent-row-hover">
        <div style="display: flex; align-items: center; gap: 0.85rem;">
          <div style="width: 38px; height: 38px; border-radius: 8px; background: #ecfdf5; color: #047857; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
            <i class="fa-solid fa-wheat-awn"></i>
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="receipt-id-tag" style="font-size: 0.72rem;">${rec.receiptId}</span>
              <strong style="font-size: 0.88rem; color: var(--slate-900);">${escapeHtml(rec.farmerName)}</strong>
            </div>
            <div style="font-size: 0.76rem; color: var(--slate-500); margin-top: 0.15rem;">
              ${escapeHtml(rec.cropType)} (${rec.bagCount} bags) • ${Number(rec.totalWeightKg).toLocaleString("en-IN")} kg • ${rec.depositDate}
            </div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span class="badge ${gradeBadgeClass}">${rec.qualityGrade}</span>
          <button class="btn btn-secondary btn-sm btn-recent-view" data-id="${rec.receiptId}" title="View Digital Receipt">
            <i class="fa-regular fa-file-lines"></i>
          </button>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  recentContainer.innerHTML = html;

  // Bind view buttons
  document.querySelectorAll(".btn-recent-view").forEach(btn => {
    btn.addEventListener("click", () => {
      const rid = btn.getAttribute("data-id");
      const found = state.records.find(r => r.receiptId === rid);
      if (found) displayReceiptModal(found);
    });
  });
}

function getGradeBadgeClass(grade) {
  if (grade === "Grade A+") return "badge-grade-a-plus";
  if (grade === "Grade A") return "badge-grade-a";
  if (grade === "Grade B") return "badge-grade-b";
  return "badge-grade-c";
}

// ==============================================================================
// SAVED RECORDS TABLE & FILTERS
// ==============================================================================
function renderRecordsTable() {
  const tbody = document.getElementById("records-table-body");
  const emptyState = document.getElementById("records-empty-state");
  const searchInput = document.getElementById("records-search-input");
  const filterCrop = document.getElementById("records-filter-crop");
  const filterGrade = document.getElementById("records-filter-grade");

  if (!tbody) return;

  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const selectedCrop = filterCrop ? filterCrop.value : "";
  const selectedGrade = filterGrade ? filterGrade.value : "";

  // Apply filters
  const filtered = state.records.filter(r => {
    const matchesSearch = !searchTerm ||
      r.receiptId.toLowerCase().includes(searchTerm) ||
      r.farmerName.toLowerCase().includes(searchTerm) ||
      r.cropType.toLowerCase().includes(searchTerm) ||
      (r.warehouseName && r.warehouseName.toLowerCase().includes(searchTerm));

    const matchesCrop = !selectedCrop || r.cropType === selectedCrop;
    const matchesGrade = !selectedGrade || r.qualityGrade === selectedGrade;

    return matchesSearch && matchesCrop && matchesGrade;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  let rowsHtml = "";
  filtered.forEach(rec => {
    const gradeBadge = getGradeBadgeClass(rec.qualityGrade);
    const quintals = (rec.totalWeightKg / 100).toFixed(1);

    rowsHtml += `
      <tr>
        <td>
          <span class="receipt-id-tag">${rec.receiptId}</span>
        </td>
        <td style="white-space: nowrap;">${rec.depositDate}</td>
        <td>
          <strong>${escapeHtml(rec.farmerName)}</strong>
          ${rec.farmerPhone !== "N/A" ? `<div style="font-size: 0.72rem; color: var(--slate-400);">${escapeHtml(rec.farmerPhone)}</div>` : ""}
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.55rem;">
            <img src="${rec.cropPhoto || generateSampleCropSvg(rec.cropType)}" class="table-crop-thumb" alt="${escapeHtml(rec.cropType)}">
            <div>
              <div>${escapeHtml(rec.cropType)}</div>
              <div style="font-size: 0.74rem; color: var(--slate-500);">${escapeHtml(rec.cropVariety || "FAQ")}</div>
            </div>
          </div>
        </td>
        <td>
          <div><strong>${Number(rec.totalWeightKg).toLocaleString("en-IN")} kg</strong></div>
          <div style="font-size: 0.72rem; color: var(--slate-500);">${rec.bagCount} bags (${quintals} Qtl)</div>
        </td>
        <td>
          <span class="badge ${gradeBadge}">${rec.qualityGrade}</span>
          <div style="font-size: 0.68rem; color: var(--slate-500); margin-top: 2px;">M: ${rec.moisturePct}%</div>
        </td>
        <td style="max-width: 220px; font-size: 0.8rem; color: var(--slate-600);">
          ${escapeHtml(rec.warehouseName)}
        </td>
        <td>
          <div style="color: #065f46; font-weight: 700; font-family: var(--font-mono);">₹${Number(rec.maxLoanEligibility).toLocaleString("en-IN")}</div>
          <div style="font-size: 0.68rem; color: var(--slate-400);">75% LTV</div>
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn btn-secondary btn-sm btn-table-view" data-id="${rec.receiptId}" title="View Official Receipt Voucher">
            <i class="fa-solid fa-file-invoice"></i> Receipt
          </button>
          <button class="btn btn-danger-outline btn-sm btn-table-delete" data-id="${rec.receiptId}" data-firestore-id="${rec.id || ""}" title="Delete Record">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = rowsHtml;

  // Bind table action buttons
  document.querySelectorAll(".btn-table-view").forEach(btn => {
    btn.addEventListener("click", () => {
      const rid = btn.getAttribute("data-id");
      const record = state.records.find(r => r.receiptId === rid);
      if (record) displayReceiptModal(record);
    });
  });

  document.querySelectorAll(".btn-table-delete").forEach(btn => {
    btn.addEventListener("click", async () => {
      const rid = btn.getAttribute("data-id");
      const firestoreId = btn.getAttribute("data-firestore-id");
      if (confirm(`Are you sure you want to delete deposit record ${rid}?`)) {
        await deleteRecord(rid, firestoreId);
      }
    });
  });
}

/**
 * Deletes a record from Firestore and local cache
 */
async function deleteRecord(receiptId, firestoreId) {
  try {
    if (state.isFirebaseActive && state.db && fb.deleteDoc && fb.doc && firestoreId) {
      await fb.deleteDoc(fb.doc(state.db, "crop_deposits", firestoreId));
    }
    // Update local state
    state.records = state.records.filter(r => r.receiptId !== receiptId);
    saveLocalRecords();
    renderDashboard();
    renderRecordsTable();
    populateLoanReceiptDropdown();
    renderLookupQuickChips();
    showToast(`Record ${receiptId} removed`, "info");
  } catch (err) {
    console.error("Error deleting record:", err);
    showToast("Error deleting record: " + err.message, "error");
  }
}

// ==============================================================================
// RECEIPT LOOKUP MODULE
// ==============================================================================
function setupEventHandlers() {
  // Search & Filter listeners
  const searchInput = document.getElementById("records-search-input");
  const filterCrop = document.getElementById("records-filter-crop");
  const filterGrade = document.getElementById("records-filter-grade");

  if (searchInput) searchInput.addEventListener("input", renderRecordsTable);
  if (filterCrop) filterCrop.addEventListener("change", renderRecordsTable);
  if (filterGrade) filterGrade.addEventListener("change", renderRecordsTable);

  // CSV Export
  const btnExport = document.getElementById("btn-export-csv");
  if (btnExport) btnExport.addEventListener("click", exportRecordsToCsv);

  // Preload sample data button on dashboard
  const btnSeed = document.getElementById("btn-seed-sample-data");
  if (btnSeed) btnSeed.addEventListener("click", () => preloadSampleData(true));

  // Receipt Lookup form
  const lookupForm = document.getElementById("lookup-form");
  if (lookupForm) {
    lookupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("lookup-receipt-input");
      const queryId = input ? input.value.trim().toUpperCase() : "";
      performReceiptLookup(queryId);
    });
  }
}

/**
 * Executes Receipt verification lookup and displays result card
 */
function performReceiptLookup(receiptId) {
  const container = document.getElementById("lookup-result-container");
  if (!container) return;

  if (!receiptId) {
    showToast("Please enter a Receipt ID to verify.", "warning");
    return;
  }

  const record = state.records.find(r => r.receiptId.toUpperCase() === receiptId);

  if (!record) {
    container.style.display = "block";
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 2.5rem 1.5rem; border-color: #fca5a5;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.5rem; color: #dc2626; margin-bottom: 0.75rem;"></i>
        <h3 style="color: #991b1b; margin-bottom: 0.3rem;">Receipt ID Not Found</h3>
        <p style="color: var(--slate-600); font-size: 0.88rem;">
          No cold storage deposit record matching <strong>${escapeHtml(receiptId)}</strong> exists in the database.
        </p>
      </div>
    `;
    return;
  }

  container.style.display = "block";
  const quintals = (record.totalWeightKg / 100).toFixed(2);
  const gradeBadge = getGradeBadgeClass(record.qualityGrade);

  container.innerHTML = `
    <div class="verification-card">
      <div class="verification-status-header">
        <div>
          <div style="font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.9;">CropVault Verification Portal</div>
          <h3 style="font-size: 1.25rem; font-weight: 800; margin-top: 0.15rem;">${escapeHtml(record.receiptId)}</h3>
        </div>
        <div class="status-badge-verified">
          <i class="fa-solid fa-circle-check"></i> AUTHENTICATED
        </div>
      </div>
      <div style="padding: 1.5rem;">
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.25rem; margin-bottom: 1.25rem;">
          <div>
            <div style="font-size: 0.8rem; color: var(--slate-500); font-weight: 600;">FARMER / PRODUCER</div>
            <div style="font-size: 1.1rem; font-weight: 800; color: var(--slate-900); margin-top: 0.2rem;">
              ${escapeHtml(record.farmerName)}
            </div>
            <div style="font-size: 0.84rem; color: var(--slate-600); margin-top: 0.2rem;">
              Phone: ${escapeHtml(record.farmerPhone)} • Aadhaar Tag: ...${escapeHtml(record.farmerAadhaar)}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.8rem; color: var(--slate-500); font-weight: 600;">QUALITY GRADE</div>
            <span class="badge ${gradeBadge}" style="font-size: 0.88rem; margin-top: 0.3rem;">${record.qualityGrade}</span>
          </div>
        </div>

        <div style="background: var(--slate-50); border: 1px solid var(--slate-200); border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem;">
          <div>
            <div style="font-size: 0.72rem; color: var(--slate-500); font-weight: 600;">COMMODITY</div>
            <div style="font-weight: 700; color: var(--slate-800);">${escapeHtml(record.cropType)}</div>
            <div style="font-size: 0.72rem; color: var(--slate-500);">${escapeHtml(record.cropVariety || "FAQ")}</div>
          </div>
          <div>
            <div style="font-size: 0.72rem; color: var(--slate-500); font-weight: 600;">TOTAL WEIGHT</div>
            <div style="font-weight: 700; color: var(--slate-800);">${Number(record.totalWeightKg).toLocaleString("en-IN")} kg</div>
            <div style="font-size: 0.72rem; color: var(--slate-500);">${quintals} Qtl (${record.bagCount} bags)</div>
          </div>
          <div>
            <div style="font-size: 0.72rem; color: var(--slate-500); font-weight: 600;">MOISTURE</div>
            <div style="font-weight: 700; color: #047857;">${record.moisturePct}%</div>
            <div style="font-size: 0.72rem; color: var(--slate-500);">Safe Cold Range</div>
          </div>
          <div>
            <div style="font-size: 0.72rem; color: var(--slate-500); font-weight: 600;">LOAN COLLATERAL</div>
            <div style="font-weight: 800; color: #92400e; font-family: var(--font-mono);">₹${Number(record.maxLoanEligibility).toLocaleString("en-IN")}</div>
            <div style="font-size: 0.72rem; color: var(--slate-500);">75% Max LTV</div>
          </div>
        </div>

        <div style="font-size: 0.82rem; color: var(--slate-600); margin-bottom: 1.25rem;">
          <strong>Storage Chamber:</strong> ${escapeHtml(record.warehouseName)}<br>
          <strong>Condition:</strong> ${escapeHtml(record.storageCondition)} • <strong>Deposit Date:</strong> ${record.depositDate}
        </div>

        <!-- Verified Produce Lot Evidence -->
        <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1.25rem; background: #ffffff; border: 1px solid var(--slate-200); border-radius: 8px; padding: 0.75rem;">
          <img src="${record.cropPhoto || generateSampleCropSvg(record.cropType)}" style="width: 84px; height: 60px; object-fit: cover; border-radius: 6px; border: 1.5px solid #059669;" alt="Inspection Sample">
          <div>
            <div style="font-size: 0.78rem; font-weight: 700; color: #047857;"><i class="fa-solid fa-camera"></i> Verified Visual Quality Lot Evidence</div>
            <div style="font-size: 0.72rem; color: var(--slate-500); margin-top: 0.15rem;">Sample photograph archived at warehouse entry gate and authenticated by QC manager.</div>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
          <button class="btn btn-secondary btn-sm" id="btn-lookup-loan-link" data-id="${record.receiptId}">
            <i class="fa-solid fa-calculator"></i> Calculate Loan
          </button>
          <button class="btn btn-primary btn-sm" id="btn-lookup-open-receipt" data-id="${record.receiptId}">
            <i class="fa-solid fa-file-invoice"></i> Open Digital Voucher
          </button>
        </div>
      </div>
    </div>
  `;

  // Bind actions
  document.getElementById("btn-lookup-open-receipt").addEventListener("click", () => {
    displayReceiptModal(record);
  });

  document.getElementById("btn-lookup-loan-link").addEventListener("click", () => {
    navigateTo("loan-view");
    const loanDropdown = document.getElementById("loan-select-receipt");
    if (loanDropdown) {
      loanDropdown.value = record.receiptId;
      loanDropdown.dispatchEvent(new Event("change"));
    }
  });

  showToast(`Receipt ${record.receiptId} verified successfully!`, "success");
}

function renderLookupQuickChips() {
  const chipsContainer = document.getElementById("lookup-quick-chips");
  if (!chipsContainer) return;

  if (state.records.length === 0) {
    chipsContainer.innerHTML = `<span style="color: var(--slate-400);">No receipts yet</span>`;
    return;
  }

  const sampleChips = state.records.slice(0, 3);
  let html = "";
  sampleChips.forEach(r => {
    html += `
      <button type="button" class="btn btn-secondary btn-sm lookup-chip" data-id="${r.receiptId}" style="padding: 0.15rem 0.5rem; font-size: 0.72rem; font-family: var(--font-mono);">
        ${r.receiptId}
      </button>
    `;
  });

  chipsContainer.innerHTML = html;

  chipsContainer.querySelectorAll(".lookup-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      const rid = btn.getAttribute("data-id");
      const input = document.getElementById("lookup-receipt-input");
      if (input) input.value = rid;
      performReceiptLookup(rid);
    });
  });
}

// ==============================================================================
// EMERGENCY LOAN LINKER SIMULATOR
// ==============================================================================
function initLoanCalculator() {
  const selectReceipt = document.getElementById("loan-select-receipt");
  const cropSelect = document.getElementById("loan-crop-select");
  const weightInput = document.getElementById("loan-weight-input");
  const ltvSelect = document.getElementById("loan-ltv-ratio");
  const tenureSelect = document.getElementById("loan-tenure-months");
  const btnSimulate = document.getElementById("btn-simulate-loan-apply");

  if (selectReceipt) {
    selectReceipt.addEventListener("change", () => {
      const rid = selectReceipt.value;
      if (!rid) return;
      const rec = state.records.find(r => r.receiptId === rid);
      if (rec) {
        if (cropSelect) cropSelect.value = rec.cropType;
        if (weightInput) weightInput.value = rec.totalWeightKg;
        recalculateLoan();
      }
    });
  }

  [cropSelect, weightInput, ltvSelect, tenureSelect].forEach(elem => {
    if (elem) elem.addEventListener("input", recalculateLoan);
  });

  if (btnSimulate) {
    btnSimulate.addEventListener("click", () => {
      const sanctionAmt = document.getElementById("loan-calc-sanction-val").textContent;
      showToast(`Simulated Sanction Note generated for ${sanctionAmt} against cold storage collateral!`, "success");
    });
  }

  recalculateLoan();
}

function populateLoanReceiptDropdown() {
  const selectReceipt = document.getElementById("loan-select-receipt");
  if (!selectReceipt) return;

  const currentVal = selectReceipt.value;
  selectReceipt.innerHTML = `<option value="">-- Choose from saved deposits or calculate custom --</option>`;

  state.records.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r.receiptId;
    opt.textContent = `${r.receiptId} - ${r.farmerName} (${r.cropType}, ${r.totalWeightKg}kg)`;
    selectReceipt.appendChild(opt);
  });

  if (currentVal) selectReceipt.value = currentVal;
}

function recalculateLoan() {
  const cropSelect = document.getElementById("loan-crop-select");
  const weightInput = document.getElementById("loan-weight-input");
  const ltvSelect = document.getElementById("loan-ltv-ratio");
  const tenureSelect = document.getElementById("loan-tenure-months");

  if (!cropSelect || !weightInput || !ltvSelect || !tenureSelect) return;

  const selectedOpt = cropSelect.selectedOptions[0];
  const ratePerKg = parseFloat(selectedOpt?.getAttribute("data-price")) || 40;
  const weightKg = parseFloat(weightInput.value) || 0;
  const ltv = parseFloat(ltvSelect.value) || 0.75;
  const tenureMonths = parseInt(tenureSelect.value) || 6;

  const grossMarketVal = Math.round(weightKg * ratePerKg);
  const eligibleLoan = Math.round(grossMarketVal * ltv);
  // 7% annual interest = 0.583% monthly
  const totalInterest = Math.round(eligibleLoan * (0.07 / 12) * tenureMonths);
  // Estimated 20% off season price gain
  const uplift = Math.round(grossMarketVal * 0.20);

  document.getElementById("loan-calc-gross-val").textContent = `₹${grossMarketVal.toLocaleString("en-IN")}`;
  document.getElementById("loan-calc-sanction-val").textContent = `₹${eligibleLoan.toLocaleString("en-IN")}`;
  document.getElementById("loan-calc-interest-val").textContent = `₹${totalInterest.toLocaleString("en-IN")} total (@ 7% p.a.)`;
  document.getElementById("loan-calc-uplift-val").textContent = `+ ₹${uplift.toLocaleString("en-IN")} (+20% Off-Season Gain)`;
}

// ==============================================================================
// SAMPLE DATA & CSV EXPORT
// ==============================================================================
/**
 * Preloads authentic Andhra Pradesh / Rayalaseema agricultural sample data
 */
export function preloadSampleData(notify = true) {
  const sampleRecords = [
    {
      receiptId: "CV-2026-AP-8841",
      farmerName: "K. Venkata Ramana Reddy",
      farmerPhone: "9848022334",
      farmerAadhaar: "7842",
      cropType: "Red Chilli",
      cropVariety: "Teja (G4 Super)",
      cropPhoto: generateSampleCropSvg("Red Chilli"),
      bagCount: 60,
      totalWeightKg: 3000,
      warehouseName: "AP State Warehousing Corp - Anantapur Hub",
      depositDate: "2026-03-12",
      storageCondition: "Refrigerated Cold Chamber (2-4°C)",
      moisturePct: 10.2,
      foreignMatterPct: 0.6,
      damagedProducePct: 1.0,
      qualityGrade: "Grade A+",
      inspectorName: "R. Sundaram (QC Manager)",
      inspectionDate: "2026-03-12",
      inspectionNotes: "High capsaicin, vibrant deep red color. Double stitched sound gunny bags.",
      benchmarkRate: 210,
      grossValue: 630000,
      maxLoanEligibility: 472500,
      createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
    },
    {
      receiptId: "CV-2026-AP-4920",
      farmerName: "S. Lakshmi Devi",
      farmerPhone: "9440155219",
      farmerAadhaar: "3190",
      cropType: "Paddy (Rice)",
      cropVariety: "BPT 5204 (Sona Masoori)",
      cropPhoto: generateSampleCropSvg("Paddy (Rice)"),
      bagCount: 100,
      totalWeightKg: 7500,
      warehouseName: "Rayalaseema Agri Cold Logistics - Tadipatri",
      depositDate: "2026-03-14",
      storageCondition: "Ventilated Dry Ambient",
      moisturePct: 11.8,
      foreignMatterPct: 0.9,
      damagedProducePct: 1.4,
      qualityGrade: "Grade A",
      inspectorName: "R. Sundaram (QC Manager)",
      inspectionDate: "2026-03-14",
      inspectionNotes: "Clean grains, well winnowed. Permissible chaff under 1%.",
      benchmarkRate: 24,
      grossValue: 180000,
      maxLoanEligibility: 135000,
      createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
    },
    {
      receiptId: "CV-2026-AP-3105",
      farmerName: "B. Chennakesavulu",
      farmerPhone: "9989012456",
      farmerAadhaar: "5512",
      cropType: "Groundnut",
      cropVariety: "K-6 (Kadiri-6 Bold)",
      cropPhoto: generateSampleCropSvg("Groundnut"),
      bagCount: 70,
      totalWeightKg: 2800,
      warehouseName: "AP State Warehousing Corp - Anantapur Hub",
      depositDate: "2026-03-15",
      storageCondition: "Refrigerated Cold Chamber (2-4°C)",
      moisturePct: 7.9,
      foreignMatterPct: 0.5,
      damagedProducePct: 0.8,
      qualityGrade: "Grade A+",
      inspectorName: "K. Nagaraju (Inspector)",
      inspectionDate: "2026-03-15",
      inspectionNotes: "Sound pods, optimal low moisture to eliminate aflatoxin risk.",
      benchmarkRate: 68,
      grossValue: 190400,
      maxLoanEligibility: 142800,
      createdAt: new Date(Date.now() - 3600000 * 18).toISOString()
    },
    {
      receiptId: "CV-2026-AP-9284",
      farmerName: "M. Obulapathi",
      farmerPhone: "8331099812",
      farmerAadhaar: "4421",
      cropType: "Turmeric",
      cropVariety: "Duggirala Gold",
      cropPhoto: generateSampleCropSvg("Turmeric"),
      bagCount: 40,
      totalWeightKg: 2000,
      warehouseName: "Kadapa Regional Commodity Vault",
      depositDate: "2026-03-16",
      storageCondition: "Controlled Atmosphere (CA - 0°C)",
      moisturePct: 9.4,
      foreignMatterPct: 0.7,
      damagedProducePct: 1.1,
      qualityGrade: "Grade A",
      inspectorName: "R. Sundaram (QC Manager)",
      inspectionDate: "2026-03-16",
      inspectionNotes: "Polished fingers with intense curcumin yellow core.",
      benchmarkRate: 130,
      grossValue: 260000,
      maxLoanEligibility: 195000,
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString()
    }
  ];

  state.records = sampleRecords;
  saveLocalRecords();
  renderDashboard();
  renderRecordsTable();
  populateLoanReceiptDropdown();
  renderLookupQuickChips();

  if (notify) {
    showToast("Loaded 4 authentic Rayalaseema agricultural sample records!", "success");
  }
}

/**
 * Exports current records table to CSV format
 */
function exportRecordsToCsv() {
  if (state.records.length === 0) {
    showToast("No records available to export.", "warning");
    return;
  }

  const headers = [
    "Receipt ID", "Deposit Date", "Farmer Name", "Phone", "Aadhaar Tag",
    "Crop Type", "Variety", "Bags", "Weight (Kg)", "Warehouse",
    "Storage Condition", "Moisture (%)", "Foreign Matter (%)", "Damaged (%)",
    "Quality Grade", "Inspector", "Gross Valuation (INR)", "Max Loan Eligibility (INR)"
  ];

  const rows = state.records.map(r => [
    `"${r.receiptId}"`,
    `"${r.depositDate}"`,
    `"${r.farmerName.replace(/"/g, '""')}"`,
    `"${r.farmerPhone}"`,
    `"${r.farmerAadhaar}"`,
    `"${r.cropType}"`,
    `"${(r.cropVariety || '').replace(/"/g, '""')}"`,
    r.bagCount,
    r.totalWeightKg,
    `"${(r.warehouseName || '').replace(/"/g, '""')}"`,
    `"${r.storageCondition}"`,
    r.moisturePct,
    r.foreignMatterPct,
    r.damagedProducePct,
    `"${r.qualityGrade}"`,
    `"${(r.inspectorName || '').replace(/"/g, '""')}"`,
    r.grossValue,
    r.maxLoanEligibility
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `CropVault_Deposits_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast("Exported records audit log to CSV!", "info");
}

// ==============================================================================
// TOAST NOTIFICATIONS & UTILITIES
// ==============================================================================
export function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  let icon = "fa-circle-info";
  if (type === "success") icon = "fa-circle-check";
  if (type === "error") icon = "fa-circle-exclamation";
  if (type === "warning") icon = "fa-triangle-exclamation";

  toast.innerHTML = `
    <i class="fa-solid ${icon}" style="font-size: 1.15rem; color: ${type === 'success' ? '#059669' : type === 'error' ? '#dc2626' : '#d97706'};"></i>
    <div style="flex: 1;">${escapeHtml(message)}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

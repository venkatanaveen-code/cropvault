# CropVault – Cold Storage & Emergency Loan Linker

CropVault is a digital agricultural fintech web platform that empowers smallholder farmers and cold storage warehouse managers. It addresses the critical issue of **post-harvest distress selling** by:
1. Recording crop intake with precise laboratory quality metrics (moisture, foreign matter, damaged kernels).
2. Issuing a digital warehouse receipt voucher with a dynamic, scannable **QR code**.
3. Storing records securely in **Google Firebase Firestore** with offline LocalStorage fallback.
4. Linking the stored commodity collateral to **emergency working capital credit** (up to 75% LTV) from simulated rural partner banks.

---
---

## 📁 Project Architecture & File Structure

```text
cropvault/
├── index.html           # Semantic, responsive HTML5 layout & modal templates
├── styles.css           # Premium agricultural fintech design system (green & white)
├── app.js               # Core logic, Firebase Modular SDK (v10), QR generator, reactive state
├── firebase-config.js   # Client-side Firebase credentials configuration
├── firestore.rules      # Cloud Firestore database security rules
└── README.md            # Comprehensive project documentation & evaluation guide
```

---

## 🚀 Key Features Demonstrated

### 1. Operations Dashboard
- **Total Deposits**: Active warehouse lots stored.
- **Total Stored Weight**: Displayed in Kilograms, Quintals, and Metric Tonnes.
- **Registered Farmers**: Count of unique agricultural producers served.
- **Collateral Loan Potential**: Auto-calculated based on AP state commodity benchmark prices.
- **Cold Chamber Capacity**: Visual breakdown of cold room allocation (Chillies, Food Grains, Bulbs).

### 2. Crop Deposit Form (Part A)
- Farmer Full Name & Contact Phone Number (10 digits).
- Farmer ID / Aadhaar Last 4 digits (for KYC simulation).
- Commodity selection (Red Chilli, Paddy, Groundnut, Turmeric, Bengal Gram, Maize, Onion, Cotton).
- Crop Variety / Hybrid specification (e.g., Teja, Sona Masoori BPT 5204, Kadiri-6).
- Bag count & Total Weight in kg with dynamic quintal conversion.
- Warehouse location and storage condition (Refrigerated Cold Chamber 2-4°C, Controlled Atmosphere, Deep Freeze, Dry Ambient).
- **1-Click "Fill Rayalaseema Sample Record"** button for fast live demonstration.

### 3. Crop Quality Inspection Form (Part B)
- Moisture Percentage (%) with real-time safe storage threshold indicator.
- Foreign Matter Percentage (chaff, weed seeds, dust).
- Damaged / Discolored Kernels (%).
- Manager-assigned Grade (Grade A+ [Export/Premium], Grade A [Standard FAQ], Grade B [Commercial], Grade C [Industrial]).
- **"Auto-Suggest Grade"** algorithmic button based on moisture and damage parameters.
- **Live Device Camera Viewfinder:** Real-time webcam/mobile camera modal with alignment reticle, front/back camera switching, and 1-click snapshot capture.
- **Produce Lot Photo Upload & Camera Snap:** Attach visual quality proof of crop samples/gunny bags with client-side canvas compression and discrete timestamp watermark.
- **"Use Sample Photo"** button for 1-click photo generation.
- Warehouse Manager signature & inspection notes.

### 4. Official Digital Receipt Voucher
- Unique auto-generated Receipt ID (e.g., `CV-2026-AP-8841`).
- **Verified Lot Sample Photo Card:** Embedded visual evidence stamped on the receipt voucher.
- Dynamic Scannable **QR Code** generated using `qrcodejs` encoding verified lot metadata.
- Emergency Loan Linkage badge showing calculated maximum collateral loan credit (75% LTV).
- **Print & Save as PDF** support with custom clean `@media print` styles that strip extraneous web elements.
- Prominent regulatory demo warning banner.

### 5. Saved Records & Audit Log
- Synced directly with **Firebase Firestore**.
- Instant search by Receipt ID, Farmer Name, Crop Commodity, or Warehouse Facility.
- Filter by Quality Grade and Crop Type.
- View Digital Receipt or delete records with confirmation.
- **Export to CSV** for warehouse inventory records.

### 6. Receipt Verification & Lookup Portal
- Enter any Receipt ID to authenticate stored batch parameters.
- Quick-fill chips for one-click lookup testing.
- Displays verified document stamp with cold chamber metrics.

### 7. Emergency Loan Linker
- Demonstrates how warehouse receipts act as pledgeable financial collateral.
- Dynamic Loan-to-Value (LTV) calculation at 70%, 75%, and 80%.
- Calculates interest savings under subsidized agricultural credit (7% p.a.).
- Simulates bank sanction slip from rural lenders (Andhra Pragathi Grameena Bank / NABARD).

---

## 🛠️ Step-by-Step Setup Guide

### Step 1: Open the Project in VS Code
1. Open Visual Studio Code.
2. Go to **File -> Open Folder...**
3. Select the folder containing the CropVault project files.

### Step 2: Run with VS Code Live Server
Because the application uses modern **ES6 JavaScript Modules** (`import` / `export`), it must be served over `http://` (not `file://`):

1. In VS Code, install the extension: **Live Server** (by Ritwick Dey) from the Extensions marketplace (`Ctrl+Shift+X`).
2. Open `index.html`.
3. Right-click anywhere in `index.html` and choose **"Open with Live Server"** (or click **"Go Live"** in the bottom status bar).
4. Your browser will automatically open at `http://127.0.0.1:5500/index.html`.

> **Local storage:** Until Firebase is configured, records are stored only in the current browser and are not available on other devices. Sample records are provided for trying the interface.

---

## ☁️ Step 3: Configuring Google Firebase Firestore

To sync records in the cloud across different devices:

The published GitHub Pages site also requires a configured Firebase project for cross-device sync. The checked-in `firebase-config.js` contains placeholders, so the site currently saves records only in each visitor's browser. After configuring Firebase and Firestore, redeploy the updated `firebase-config.js` to GitHub Pages.

### 1. Create a Firebase Project
1. Navigate to [Firebase Console](https://console.firebase.google.com/) and sign in with your Google account.
2. Click **Add Project**, name it (e.g., `cropvault-jntua`), and complete setup.

### 2. Register a Web App
1. In the Project Overview dashboard, click the **Web icon** (`</>`).
2. App nickname: `CropVault Web`.
3. Uncheck Firebase Hosting (optional) and click **Register app**.
4. You will see a `firebaseConfig` object like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyD-YourActualApiKeyHere",
     authDomain: "cropvault-jntua.firebaseapp.com",
     projectId: "cropvault-jntua",
     storageBucket: "cropvault-jntua.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef123456"
   };
   ```

### 3. Paste Credentials into `firebase-config.js`
Open `firebase-config.js` in VS Code and paste the copied values into `firebaseConfig`:
```javascript
export const firebaseConfig = {
  apiKey: "AIzaSyD-YourActualApiKeyHere",
  authDomain: "cropvault-jntua.firebaseapp.com",
  projectId: "cropvault-jntua",
  storageBucket: "cropvault-jntua.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};
```

### 4. Enable Cloud Firestore
1. In the Firebase Console left menu, click **Build -> Firestore Database**.
2. Click **Create Database**.
3. Choose a location (e.g., `asia-south1` [Mumbai] for low latency in India).
4. Create the database.
5. Click **Enable**.

### 5. Deploy Security Rules (Optional but Recommended)
The rules in `firestore.rules` allow public reads and writes for prototype testing. Only use non-sensitive sample data with these rules. Do not store real farmer names, phone numbers, or identity details until access is protected with Firebase Authentication and appropriately restricted Firestore rules.

In Firebase Console -> Firestore Database -> **Rules** tab, review and publish the rules for your use case:
```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /crop_deposits/{depositId} {
      allow read: if true;
      allow create: if request.resource.data.receiptId is string
                    && request.resource.data.totalWeightKg > 0;
      allow update, delete: if true;
    }
  }
}
```
Click **Publish**.

### 6. Verify Connection
Refresh your browser. The top-right badge will turn green and display:
**`● Firestore Live`**.

---

## 🔒 Security Best Practice
- **Client-Side API Keys:** The `apiKey` in `firebase-config.js` is a public client identifier used to identify your project to Google APIs.
- **No Private Keys:** As strictly required, **NO** Firebase Admin credentials, private keys, or service account JSON secrets are included in the frontend code. All authorization is governed by Cloud Firestore security rules.

---

## 🎯 Conclave Presentation Walkthrough Script
For presenting to the judges at JNTUA Innovation Conclave:

1. **The Problem:** Explain how post-harvest commodity gluts cause Andhra Pradesh farmers (especially in Rayalaseema) to make distress sales at below-MSP prices due to urgent cash needs.
2. **Dashboard:** Show the 4 stat cards summarizing active deposits and stored tonnage.
3. **New Deposit Intake:**
   - Click the button **"Fill Rayalaseema Sample Record"** to populate realistic Guntur/Anantapur Teja Chilli data.
   - Show how changing moisture adjusts the safe storage threshold.
   - Click **"Auto-Suggest Grade"** to showcase algorithmic quality assessment.
   - Click **"Save Record & Generate Digital Receipt"**.
4. **Digital Receipt & QR Code:**
   - Showcase the generated receipt voucher with receipt ID `CV-2026-AP-XXXX`.
   - Point to the dynamic QR code and scan it with a smartphone camera to demonstrate the encoded JSON verification payload.
   - Click **"Print & Save as PDF"** to demonstrate clean A4 certificate output.
   - Highlight the mandatory regulatory disclaimer.
5. **Saved Records & Cloud Sync:** Show how the record appears in the table with search/filtering and can be exported as an audit CSV.
6. **Receipt Lookup:** Switch to the Lookup tab, enter or click a receipt ID, and verify the cold storage certificate.
7. **Loan Linker:** Demonstrate how the 75% LTV emergency credit protects the farmer's margin until market prices recover.

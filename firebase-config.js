// ==============================================================================
// CropVault - Cold Storage & Emergency Loan Linker
// Firebase Configuration (Modular SDK v10/v11)
// JNTUA Innovation Conclave Prototype
// ==============================================================================

/**
 * Replace the placeholder values below with your Firebase project credentials.
 * Obtain these from the Firebase Console (https://console.firebase.google.com/):
 * 1. Go to Project Settings -> General -> Your apps -> Web app (</>)
 * 2. Copy the firebaseConfig object properties and paste them here.
 * 
 * NOTE: Firebase Web API keys are identifiers for your client app in Firebase.
 * They are public by design, but NEVER store Admin SDK service account private
 * keys or database secrets in client-side code!
 */
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

/**
 * Helper to determine if actual Firebase credentials have been configured
 * or if the application should run in demo/offline local storage mode.
 */
export function isFirebaseConfigured() {
  return (
    firebaseConfig.apiKey !== "YOUR_API_KEY" &&
    firebaseConfig.projectId !== "YOUR_PROJECT_ID" &&
    firebaseConfig.apiKey.length > 5
  );
}

// Autentisering för TrelleMasters 2026
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

import { firebaseConfig } from './firebase-config.js';

// Initiera Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

/**
 * Initierar autentiseringslyssnare.
 * @param {Function} onLogin  - Anropas med användarobjektet vid inloggning.
 * @param {Function} onLogout - Anropas utan argument vid utloggning.
 */
export function initAuth(onLogin, onLogout) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      onLogin(user);
    } else {
      onLogout();
    }
  });
}

/**
 * Loggar in en användare med e-post och lösenord.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import('firebase/auth').User>} Användarobjektet.
 */
export async function login(email, password) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  } catch (error) {
    throw new Error(mapFirebaseError(error.code));
  }
}

/**
 * Loggar ut den aktuella användaren.
 * @returns {Promise<void>}
 */
export async function logout() {
  await signOut(auth);
}

/**
 * Returnerar den aktuella inloggade användaren eller null.
 * @returns {import('firebase/auth').User|null}
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Översätter vanliga Firebase-autentiseringsfel till svenska meddelanden.
 * @param {string} code - Felkod från Firebase.
 * @returns {string} Svenskt felmeddelande.
 */
function mapFirebaseError(code) {
  const messages = {
    'auth/invalid-email':              'Ogiltig e-postadress.',
    'auth/user-disabled':              'Detta konto har inaktiverats.',
    'auth/user-not-found':             'Fel e-post eller lösenord.',
    'auth/wrong-password':             'Fel e-post eller lösenord.',
    'auth/invalid-credential':         'Fel e-post eller lösenord.',
    'auth/too-many-requests':          'För många misslyckade försök. Försök igen senare.',
    'auth/network-request-failed':     'Nätverksfel. Kontrollera din internetanslutning.',
    'auth/invalid-login-credentials':  'Fel e-post eller lösenord.',
    'auth/email-already-in-use':       'E-postadressen används redan.',
    'auth/weak-password':              'Lösenordet är för svagt. Använd minst 6 tecken.',
    'auth/operation-not-allowed':      'Denna inloggningsmetod är inte aktiverad.',
    'auth/internal-error':              'Ett internt fel uppstod. Försök igen senare.'
  };

  return messages[code] || 'Ett okänt fel uppstod vid inloggningen.';
}

export { app, auth };

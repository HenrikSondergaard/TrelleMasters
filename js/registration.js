// ============================================================
// Anmälningsformulär – TrelleMasters 2026
// ============================================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

import { firebaseConfig } from './firebase-config.js';

// -----------------------------------------------------------
// DOM-element
// -----------------------------------------------------------
const loadingEl       = document.getElementById('registration-loading');
const statusEl        = document.getElementById('registration-status');
const statusTextEl    = document.getElementById('registration-status-text');
const formContainerEl = document.getElementById('registration-form-container');
const formEl          = document.getElementById('registration-form');
const formErrorEl     = document.getElementById('form-error');
const formSuccessEl   = document.getElementById('form-success');

const nameInput     = document.getElementById('reg-name');
const handicapInput = document.getElementById('reg-handicap');
const emailInput    = document.getElementById('reg-email');
const phoneInput    = document.getElementById('reg-phone');
const codeInput     = document.getElementById('reg-code');

// -----------------------------------------------------------
// Initiera Firebase
// -----------------------------------------------------------
let db;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (err) {
  console.error('Firebase-initiering misslyckades:', err);
  showError('Kunde inte ansluta till servern. Försök igen senare.');
}

// -----------------------------------------------------------
// Hjälpfunktioner
// -----------------------------------------------------------
function hideEl(el) { el.classList.add('hidden'); }
function showEl(el) { el.classList.remove('hidden'); }

function showError(msg) {
  hideEl(loadingEl);
  hideEl(formContainerEl);
  showEl(statusEl);
  statusTextEl.textContent = msg;
}

function showFormError(msg) {
  formErrorEl.textContent = msg;
  formErrorEl.classList.remove('hidden');
}

function clearFormError() {
  formErrorEl.textContent = '';
  formErrorEl.classList.add('hidden');
}

/**
 * Validerar formulärets fält.
 * @returns {string|null} Felmeddelande eller null om allt är giltigt.
 */
function validateForm() {
  const name     = nameInput.value.trim();
  const handicap = handicapInput.value;
  const email    = emailInput.value.trim();
  const code     = codeInput.value.trim();

  if (!name || name.length < 2) {
    return 'Namn måste vara minst 2 tecken.';
  }

  if (handicap === '' || isNaN(Number(handicap))) {
    return 'Handicap måste anges som ett nummer.';
  }

  const hcpNum = parseFloat(handicap);
  if (hcpNum < 0 || hcpNum > 54) {
    return 'Handicap måste vara mellan 0 och 54.';
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Ogiltig e-postadress.';
  }

  if (!code) {
    return 'Hemlig kod är obligatorisk.';
  }

  return null;
}

// -----------------------------------------------------------
// Sidinitiering – kontrollera om anmälan är öppen
// -----------------------------------------------------------
async function init() {
  if (!db) return;

  try {
    const settingsSnap = await getDoc(doc(db, 'settings', 'tournament'));

    if (!settingsSnap.exists()) {
      showError('Inställningar saknas. Kontakta Henrik.');
      return;
    }

    const settings = settingsSnap.data();

    hideEl(loadingEl);

    if (settings.registrationOpen === true) {
      showEl(formContainerEl);
    } else {
      showEl(statusEl);
      statusTextEl.textContent =
        'Anmälan är stängd. Kontakta Henrik om du vill vara med.';
    }
  } catch (err) {
    console.error('Kunde inte läsa inställningar:', err);
    showError('Kunde inte hämta tävlingsinställningar. Försök igen senare.');
  }
}

// -----------------------------------------------------------
// Formulärhantering
// -----------------------------------------------------------
formEl.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearFormError();

  // 1. Klientvalidering
  const validationError = validateForm();
  if (validationError) {
    showFormError(validationError);
    return;
  }

  const name     = nameInput.value.trim();
  const handicap = parseFloat(handicapInput.value);
  const email    = emailInput.value.trim();
  const phone    = phoneInput.value.trim();
  const code     = codeInput.value.trim();

  // Avaktivera knappen under bearbetning
  const submitBtn = formEl.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Skickar…';

  try {
    // 2. Hämta hemlig kod från Firestore
    const settingsSnap = await getDoc(doc(db, 'settings', 'tournament'));

    if (!settingsSnap.exists()) {
      showFormError('Kunde inte verifiera koden. Försök igen.');
      resetButton(submitBtn);
      return;
    }

    const secretCode = settingsSnap.data().secretCode || '';

    // 3. Jämför koder (case-insensitive, trim)
    if (code.toLowerCase() !== secretCode.trim().toLowerCase()) {
      showFormError('Fel hemlig kod. Fråga Henrik!');
      resetButton(submitBtn);
      return;
    }

    // 4. Skapa deltagardokument
    await addDoc(collection(db, 'participants'), {
      name,
      handicap,
      email: email || null,
      phone: phone || null,
      status: 'pending',
      registeredAt: serverTimestamp()
    });

    // 5. Visa bekräftelse
    hideEl(formContainerEl);
    showEl(formSuccessEl);

  } catch (err) {
    console.error('Kunde inte skicka anmälan:', err);
    showFormError('Något gick fel. Försök igen senare.');
    resetButton(submitBtn);
  }
});

function resetButton(btn) {
  btn.disabled = false;
  btn.textContent = 'Skicka anmälan';
}

// -----------------------------------------------------------
// Rensa fel vid ny input
// -----------------------------------------------------------
formEl.addEventListener('input', () => {
  clearFormError();
});

// -----------------------------------------------------------
// Hamburger-meny (enkel toggle)
// -----------------------------------------------------------
const hamburger = document.querySelector('.hamburger');
const header    = document.querySelector('.site-header');

if (hamburger) {
  hamburger.addEventListener('click', () => {
    header.classList.toggle('nav-open');
    const expanded = header.classList.contains('nav-open');
    hamburger.setAttribute('aria-expanded', expanded);
  });
}

// -----------------------------------------------------------
// Starta
// -----------------------------------------------------------
init();

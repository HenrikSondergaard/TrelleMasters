// ============================================================
// Deltagarlista (realtid) – TrelleMasters 2026
// ============================================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

import { firebaseConfig } from './firebase-config.js';

// -----------------------------------------------------------
// DOM-element
// -----------------------------------------------------------
const loadingEl     = document.getElementById('participants-loading');
const errorEl       = document.getElementById('participants-error');
const retryBtn      = document.getElementById('retry-btn');
const sectionEl     = document.getElementById('participants-section');
const countEl       = document.getElementById('participant-count');
const approvedBody  = document.getElementById('approved-body');
const approvedCount = document.getElementById('approved-count');
const noApproved    = document.getElementById('no-approved');
const pendingBody   = document.getElementById('pending-body');
const pendingCount  = document.getElementById('pending-count');
const noPending     = document.getElementById('no-pending');

// -----------------------------------------------------------
// Initiera Firebase
// -----------------------------------------------------------
let db;
let unsubscribeApproved = null;
let unsubscribePending  = null;

function initFirebase() {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (err) {
    console.error('Firebase-initiering misslyckades:', err);
    showError();
  }
}

// -----------------------------------------------------------
// Hjälpfunktioner
// -----------------------------------------------------------
function hideEl(el) { el.classList.add('hidden'); }
function showEl(el) { el.classList.remove('hidden'); }

function showError() {
  hideEl(loadingEl);
  hideEl(sectionEl);
  showEl(errorEl);
}

function showContent() {
  hideEl(loadingEl);
  hideEl(errorEl);
  showEl(sectionEl);
}

/**
 * Formaterar en Firestore-timestamp eller Date till ett kort datum.
 * @param {import('firebase/firestore').Timestamp|Date|string|null} ts
 * @returns {string}
 */
function formatDate(ts) {
  if (!ts) return '—';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short'
  });
}

/**
 * Renderar deltagarrader i en tbody.
 * @param {HTMLTableSectionElement} tbody
 * @param {Array<{name: string, handicap: number, registeredAt: import('firebase/firestore').Timestamp}>} participants
 */
function renderRows(tbody, participants) {
  tbody.innerHTML = '';

  participants.forEach((p, i) => {
    const tr = document.createElement('tr');

    // Hcp display — one decimal
    const hcpStr = typeof p.handicap === 'number'
      ? p.handicap.toFixed(1)
      : '—';

    tr.innerHTML =
      `<td>${i + 1}</td>` +
      `<td class="font-semibold">${escapeHtml(p.name)}</td>` +
      `<td>${hcpStr}</td>` +
      `<td>${formatDate(p.registeredAt)}</td>`;

    tbody.appendChild(tr);
  });
}

/**
 * Escapes HTML to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// -----------------------------------------------------------
// Realtidslyssnare – Godkända deltagare
// -----------------------------------------------------------
function listenApproved() {
  // Sort client-side to avoid Firestore composite index requirement
  const q = query(
    collection(db, 'participants'),
    where('status', '==', 'approved')
  );

  unsubscribeApproved = onSnapshot(q, (snap) => {
    const participants = [];
    snap.forEach((doc) => participants.push({ id: doc.id, ...doc.data() }));
    participants.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'sv'));

    renderRows(approvedBody, participants);
    approvedCount.textContent = `${participants.length} st`;

    if (participants.length === 0) {
      showEl(noApproved);
    } else {
      hideEl(noApproved);
    }

    updateTotalCount();
    showContent();
  }, (err) => {
    console.error('Fel vid hämtning av godkända deltagare:', err);
    showError();
  });
}

// -----------------------------------------------------------
// Realtidslyssnare – Väntande deltagare
// -----------------------------------------------------------
function listenPending() {
  // Sort client-side to avoid Firestore composite index requirement
  const q = query(
    collection(db, 'participants'),
    where('status', '==', 'pending')
  );

  unsubscribePending = onSnapshot(q, (snap) => {
    const participants = [];
    snap.forEach((doc) => participants.push({ id: doc.id, ...doc.data() }));
    participants.sort((a, b) => {
      const ta = a.registeredAt?.seconds || 0;
      const tb = b.registeredAt?.seconds || 0;
      return tb - ta;
    });

    renderRows(pendingBody, participants);
    pendingCount.textContent = `${participants.length} st`;

    if (participants.length === 0) {
      showEl(noPending);
    } else {
      hideEl(noPending);
    }

    updateTotalCount();
    showContent();
  }, (err) => {
    console.error('Fel vid hämtning av väntande deltagare:', err);
    showError();
  });
}

// -----------------------------------------------------------
// Uppdatera totalräknare i sidhuvudet
// -----------------------------------------------------------
function updateTotalCount() {
  const approved = approvedBody.querySelectorAll('tr').length;
  const pending  = pendingBody.querySelectorAll('tr').length;
  const total    = approved + pending;

  if (total === 0) {
    countEl.textContent = 'Inga anmälningar ännu';
  } else {
    countEl.textContent = `${total} anmälan${total !== 1 ? 'r' : ''} (${approved} godkända)`;
  }
}

// -----------------------------------------------------------
// Försök igen-knapp
// -----------------------------------------------------------
retryBtn.addEventListener('click', () => {
  showEl(loadingEl);
  hideEl(errorEl);
  hideEl(sectionEl);
  startListeners();
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
// Starta lyssnare
// -----------------------------------------------------------
function startListeners() {
  // Avregistrera tidigare lyssnare om de finns
  if (unsubscribeApproved) unsubscribeApproved();
  if (unsubscribePending)  unsubscribePending();

  listenApproved();
  listenPending();
}

// -----------------------------------------------------------
// Initiera
// -----------------------------------------------------------
initFirebase();
if (db) {
  startListeners();
}

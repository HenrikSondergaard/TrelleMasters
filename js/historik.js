// ============================================================
// HISTORIK — TrelleMasters (dynamisk historik från Firestore)
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';
import {
  EVENT_COLUMNS,
  FALLBACK_HISTORY_2025,
  sortHistoryDescending
} from './historik-data.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============================================================
// HAMBURGER
// ============================================================
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('nav-links').classList.toggle('nav-open');
});

// ============================================================
// LOAD + RENDER
// ============================================================
loadHistory();

async function loadHistory() {
  try {
    const snap = await getDocs(collection(db, 'history'));
    const firestoreDocs = snap.docs.map(d => d.data());

    document.getElementById('loading').classList.add('hidden');

    // Om Firestore är tomt (och hämtningen gick bra) — visa empty-state
    if (firestoreDocs.length === 0) {
      document.getElementById('history-empty').classList.remove('hidden');
      return;
    }

    const sorted = sortHistoryDescending(firestoreDocs);
    document.getElementById('history-content').classList.remove('hidden');
    renderHistory(sorted);
  } catch {
    // Firestore misslyckades — visa 2025-fallback som säkerhetsnät
    const sorted = sortHistoryDescending([FALLBACK_HISTORY_2025]);
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('history-content').classList.remove('hidden');
    renderHistory(sorted);
  }
}

function renderHistory(docs) {
  const container = document.getElementById('history-cards');
  container.innerHTML = docs.map(renderYearCard).join('');
}

function renderYearCard(doc) {
  const participants = doc.participants || [];
  const count = doc.participantCount != null
    ? doc.participantCount
    : participants.length;

  const dateLabel = doc.date ? ` — ${formatDate(doc.date)}` : '';

  return `
    <div class="card" style="margin-top: 1.5rem;">
      <div class="card-header">
        <h2>TrelleMasters ${esc(doc.year)}${esc(dateLabel)}</h2>
      </div>
      ${doc.winner
        ? `<p><strong>Vinnare:</strong> ${esc(doc.winner)} 🏆 — ${count} deltagare</p>`
        : `<p>${count} deltagare</p>`
      }
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Namn</th>
              <th>Hcp</th>
              ${EVENT_COLUMNS.map(col => `<th>${col.label}</th>`).join('')}
              <th>Totalt</th>
            </tr>
          </thead>
          <tbody>
            ${participants.map(renderParticipantRow).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderParticipantRow(p) {
  const isLeader = p.rank === 1;
  const rowClass = isLeader ? 'leader' : '';
  const rankText = isLeader ? '🏆 1' : esc(p.rank);

  // Stöd både nytt format (breakdown/handicap) och gammalt (scores/hcp)
  const breakdown = p.breakdown || p.scores || {};
  const hcp = p.handicap != null ? p.handicap : (p.hcp != null ? p.hcp : '–');

  const cells = EVENT_COLUMNS.map(col => {
    const pts = breakdown[col.id];
    return `<td>${pts != null ? esc(pts) : '–'}</td>`;
  }).join('');

  return `<tr class="${rowClass}">
    <td>${rankText}</td>
    <td>${esc(p.name)}</td>
    <td>${esc(hcp)}</td>
    ${cells}
    <td><strong>${esc(p.total)}</strong></td>
  </tr>`;
}

// ============================================================
// HELPERS
// ============================================================
function esc(str) {
  if (str == null) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' });
  } catch {
    return dateStr;
  }
}

// ============================================================
// SCOREBOARD — TrelleMasters 2026 (Live realtidsresultattavla)
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc, onSnapshot, query, orderBy, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Event column definitions
const EVENT_COLUMNS = [
  { id: 'putt', label: 'Putt' },
  { id: 'chip_spel', label: 'Chip' },
  { id: 'chip_hink', label: 'Hink' },
  { id: 'cttp_56', label: '56m' },
  { id: 'cttp_124', label: '124m' },
  { id: 'drive', label: 'Drive' },
  { id: 'scramble', label: 'Scramble' },
  { id: 'roliga_skott', label: 'Rolig' }
];

// ============================================================
// HAMBURGER
// ============================================================
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('nav-links').classList.toggle('nav-open');
});

// ============================================================
// STATE
// ============================================================
let participants = [];
let scores = [];
let events = [];
let currentEvent = null;

// ============================================================
// LISTENERS
// ============================================================

// Participants (approved only)
onSnapshot(
  query(collection(db, 'participants'), where('status', '==', 'approved'), orderBy('name')),
  (snap) => {
    participants = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderScoreboard();
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('scoreboard-content').classList.remove('hidden');
  },
  () => {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error-state').classList.remove('hidden');
  }
);

// Scores
onSnapshot(
  collection(db, 'scores'),
  () => { loadAndRender(); },
  () => {}
);

// Settings for active event
onSnapshot(
  doc(db, 'settings', 'tournament'),
  (snap) => {
    if (snap.exists()) {
      currentEvent = snap.data().currentEvent || null;
      updateActiveEventBanner();
    }
  },
  () => {}
);

// Events list (for active event name)
onSnapshot(
  query(collection(db, 'events'), orderBy('order')),
  (snap) => {
    events = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    updateActiveEventBanner();
  },
  () => {}
);

async function loadAndRender() {
  const snap = await getDocs(collection(db, 'scores'));
  scores = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderScoreboard();
}

// ============================================================
// RENDER
// ============================================================
function renderScoreboard() {
  if (participants.length === 0) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('scoreboard-content').classList.remove('hidden');
    document.getElementById('scoreboard-body').innerHTML =
      '<tr><td colspan="11" class="text-center text-light">Inga godkända deltagare ännu.</td></tr>';
    return;
  }

  // Build per-participant score map
  const scoreMap = {}; // participantId -> { eventId -> tournamentPoints }
  scores.forEach(s => {
    if (!scoreMap[s.participantId]) scoreMap[s.participantId] = {};
    scoreMap[s.participantId][s.eventId] = s.tournamentPoints;
  });

  // Calculate totals
  const leaderboard = participants.map(p => {
    const evScores = {};
    let total = 0;
    EVENT_COLUMNS.forEach(col => {
      const pts = (scoreMap[p.id] && scoreMap[p.id][col.id]) ?? null;
      evScores[col.id] = pts;
      if (pts !== null) total += pts;
    });
    return { ...p, evScores, total };
  });

  // Sort: total DESC, name ASC
  leaderboard.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  // Assign ranks with ties
  let rank = 1;
  leaderboard.forEach((p, i) => {
    if (i > 0 && p.total === leaderboard[i - 1].total) {
      p.rank = leaderboard[i - 1].rank;
    } else {
      p.rank = i + 1;
    }
  });

  renderDesktopTable(leaderboard);
  renderMobileCards(leaderboard);
}

function renderDesktopTable(leaderboard) {
  const header = document.getElementById('scoreboard-header');
  const body = document.getElementById('scoreboard-body');

  // Header
  header.innerHTML = `<tr>
    <th>#</th><th>Namn</th>
    ${EVENT_COLUMNS.map(col => {
      const isActive = currentEvent === col.id;
      return `<th class="${isActive ? 'active-event-col' : ''}">${col.label}</th>`;
    }).join('')}
    <th>Totalt</th>
  </tr>`;

  // Body
  body.innerHTML = leaderboard.map(p => {
    const isLeader = p.rank === 1 && p.total > 0;
    const rowClass = isLeader ? 'leader' : '';
    return `<tr class="${rowClass}">
      <td>${isLeader ? '👑' : p.rank}</td>
      <td class="name-cell">${esc(p.name)}${p.name === 'Henrik S' ? ' <small>🏆</small>' : ''}</td>
      ${EVENT_COLUMNS.map(col => {
        const isActive = currentEvent === col.id;
        const pts = p.evScores[col.id];
        return `<td class="${isActive ? 'active-event-col' : ''}">${pts !== null ? pts : '–'}</td>`;
      }).join('')}
      <td><strong>${p.total}</strong></td>
    </tr>`;
  }).join('');
}

function renderMobileCards(leaderboard) {
  const container = document.getElementById('mobile-scoreboard');
  container.innerHTML = leaderboard.map(p => {
    const isLeader = p.rank === 1 && p.total > 0;
    return `<div class="card ${isLeader ? 'leader' : ''}" style="padding:1rem; margin-bottom:0.75rem;">
      <div class="flex-between mb-1">
        <span>${isLeader ? '👑' : '#' + p.rank} <strong>${esc(p.name)}</strong>${p.name === 'Henrik S' ? ' 🏆' : ''}</span>
        <span style="font-size:1.2rem; font-weight:bold;">${p.total} p</span>
      </div>
      <div class="grid" style="grid-template-columns:repeat(4, 1fr); gap:0.25rem; font-size:0.85rem;">
        ${EVENT_COLUMNS.map(col => {
          const pts = p.evScores[col.id];
          return `<div style="text-align:center; padding:0.25rem; background:${currentEvent === col.id ? 'var(--color-accent-light)' : 'var(--color-bg)'}; border-radius:4px;">
            <small class="text-light">${EVENT_COLUMNS.find(c => c.id === col.id).label}</small><br>
            <strong>${pts !== null ? pts : '–'}</strong>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}

function updateActiveEventBanner() {
  const banner = document.getElementById('active-event-banner');
  const nameEl = document.getElementById('active-event-name');
  if (currentEvent && events.length > 0) {
    const ev = events.find(e => e.id === currentEvent);
    if (ev) {
      nameEl.textContent = ev.name;
      banner.classList.remove('hidden');
      return;
    }
  }
  banner.classList.add('hidden');
}

// ============================================================
// RESPONSIVE: Switch desktop/mobile
// ============================================================
function handleResize() {
  const desktop = document.getElementById('desktop-scoreboard');
  const mobile = document.getElementById('mobile-scoreboard');
  if (window.innerWidth < 768) {
    desktop.classList.add('hidden');
    mobile.classList.remove('hidden');
  } else {
    desktop.classList.remove('hidden');
    mobile.classList.add('hidden');
  }
}
window.addEventListener('resize', handleResize);
handleResize();

// ============================================================
// HELPERS
// ============================================================
function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

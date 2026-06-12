// ============================================================
// ADMIN DASHBOARD — TrelleMasters 2026
// ============================================================
import { auth, initAuth, login, logout } from './auth.js';
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc,
  deleteDoc, addDoc, onSnapshot, query, where, orderBy, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { calculateTournamentPoints, calculateScramblePoints } from './scoring.js';
import { generateTeams, recalculateAverages, movePlayerBetweenTeams } from './team-generator.js';

const db = getFirestore();

// Unsubscribe handles for real-time listeners
let unsubPending = null;
let unsubApproved = null;
let unsubEvents = null;
let unsubSettings = null;
let unsubTeams = null;

// Local state
let localTeams = null;
let localParticipants = [];
let localEvents = [];

// ============================================================
// AUTH
// ============================================================
initAuth(
  (user) => {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('dashboard-section').classList.remove('hidden');
    startListeners();
  },
  () => {
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('dashboard-section').classList.add('hidden');
    stopListeners();
  }
);

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');
  try {
    await login(
      document.getElementById('login-email').value,
      document.getElementById('login-password').value
    );
  } catch (err) {
    errEl.textContent = err.message || 'Kunde inte logga in.';
    errEl.classList.remove('hidden');
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await logout();
});

// ============================================================
// HAMBURGER
// ============================================================
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('nav-links').classList.toggle('nav-open');
});

// ============================================================
// TABS
// ============================================================
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ============================================================
// LISTENERS
// ============================================================
function startListeners() {
  // Pending participants
  unsubPending = onSnapshot(
    query(collection(db, 'participants'), where('status', '==', 'pending'), orderBy('registeredAt', 'desc')),
    (snap) => { renderPending(snap.docs); },
    () => { document.getElementById('pending-list').innerHTML = '<p class="error-message">Kunde inte ladda anmälningar.</p>'; }
  );

  // Approved participants
  unsubApproved = onSnapshot(
    query(collection(db, 'participants'), where('status', '==', 'approved'), orderBy('name')),
    (snap) => {
      localParticipants = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderApproved();
    },
    () => { document.getElementById('approved-list').innerHTML = '<p class="error-message">Kunde inte ladda deltagare.</p>'; }
  );

  // Events
  unsubEvents = onSnapshot(
    query(collection(db, 'events'), orderBy('order')),
    (snap) => {
      localEvents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      populateEventDropdowns();
    },
    () => {}
  );

  // Settings
  unsubSettings = onSnapshot(
    doc(db, 'settings', 'tournament'),
    (snap) => {
      if (snap.exists()) {
        const s = snap.data();
        document.getElementById('setting-registration-open').checked = !!s.registrationOpen;
        document.getElementById('setting-secret-code').value = s.secretCode || '';
        document.getElementById('setting-active-event').value = s.currentEvent || '';
      }
    },
    () => {}
  );

  // Teams
  unsubTeams = onSnapshot(
    collection(db, 'teams'),
    (snap) => {
      if (!localTeams) {
        // Only set from Firestore on first load if no local edits
        localTeams = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    },
    () => {}
  );
}

function stopListeners() {
  [unsubPending, unsubApproved, unsubEvents, unsubSettings, unsubTeams].forEach(fn => { if (fn) fn(); });
  unsubPending = unsubApproved = unsubEvents = unsubSettings = unsubTeams = null;
}

// ============================================================
// RENDER: PENDING REGISTRATIONS
// ============================================================
function renderPending(docs) {
  const list = document.getElementById('pending-list');
  const count = document.getElementById('pending-count');
  count.textContent = `${docs.length} anmäl${docs.length === 1 ? 'an' : 'ningar'}`;

  if (docs.length === 0) {
    list.innerHTML = '<p class="text-center text-light">Inga väntande anmälningar.</p>';
    return;
  }

  list.innerHTML = docs.map(d => {
    const p = d.data();
    const date = p.registeredAt ? new Date(p.registeredAt.seconds * 1000).toLocaleDateString('sv-SE') : '—';
    return `
      <div class="card mb-2" style="padding:1rem;">
        <div class="flex-between">
          <div>
            <strong>${esc(p.name)}</strong> <span class="text-light">(hcp ${p.handicap})</span><br>
            <small class="text-light">${esc(p.email || '—')} | ${esc(p.phone || '—')} | ${date}</small>
          </div>
          <div class="flex" style="gap:0.5rem;">
            <button class="btn btn-success btn-sm" data-approve="${d.id}">Godkänn</button>
            <button class="btn btn-danger btn-sm" data-reject="${d.id}">Neka</button>
          </div>
        </div>
      </div>`;
  }).join('');

  list.querySelectorAll('[data-approve]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await updateDoc(doc(db, 'participants', btn.dataset.approve), { status: 'approved' });
    });
  });

  list.querySelectorAll('[data-reject]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('Är du säker på att du vill neka denna anmälan?')) {
        await updateDoc(doc(db, 'participants', btn.dataset.reject), { status: 'rejected' });
      }
    });
  });
}

// ============================================================
// RENDER: APPROVED PARTICIPANTS
// ============================================================
function renderApproved() {
  const list = document.getElementById('approved-list');
  if (localParticipants.length === 0) {
    list.innerHTML = '<p class="text-center text-light">Inga godkända deltagare.</p>';
    return;
  }

  list.innerHTML = `<table class="table">
    <thead><tr><th>Namn</th><th>Hcp</th><th>Åtgärd</th></tr></thead>
    <tbody>${localParticipants.map(p => `
      <tr id="row-${p.id}">
        <td class="participant-name">${esc(p.name)}</td>
        <td class="participant-hcp">${p.handicap}</td>
        <td>
          <button class="btn btn-sm btn-secondary edit-btn" data-id="${p.id}">Redigera</button>
          <button class="btn btn-sm btn-danger delete-btn" data-id="${p.id}">Ta bort</button>
        </td>
      </tr>
      <tr id="edit-${p.id}" class="hidden">
        <td><input type="text" class="form-input edit-name" value="${esc(p.name)}"></td>
        <td><input type="number" class="form-input edit-hcp" step="0.1" min="0" max="54" value="${p.handicap}"></td>
        <td>
          <button class="btn btn-sm btn-primary save-edit-btn" data-id="${p.id}">Spara</button>
          <button class="btn btn-sm btn-secondary cancel-edit-btn" data-id="${p.id}">Avbryt</button>
        </td>
      </tr>
    `).join('')}</tbody></table>`;

  // Edit buttons
  list.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('row-' + btn.dataset.id).classList.add('hidden');
      document.getElementById('edit-' + btn.dataset.id).classList.remove('hidden');
    });
  });

  list.querySelectorAll('.cancel-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('row-' + btn.dataset.id).classList.remove('hidden');
      document.getElementById('edit-' + btn.dataset.id).classList.add('hidden');
    });
  });

  list.querySelectorAll('.save-edit-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const row = document.getElementById('edit-' + btn.dataset.id);
      const name = row.querySelector('.edit-name').value.trim();
      const hcp = parseFloat(row.querySelector('.edit-hcp').value);
      if (name.length < 2 || isNaN(hcp) || hcp < 0 || hcp > 54) {
        alert('Ogiltiga värden. Kontrollera namn (min 2 tecken) och handicap (0–54).');
        return;
      }
      await updateDoc(doc(db, 'participants', btn.dataset.id), { name, handicap: hcp });
    });
  });

  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const p = localParticipants.find(x => x.id === btn.dataset.id);
      if (confirm(`Ta bort ${p.name}? Detta går inte att ångra.`)) {
        await deleteDoc(doc(db, 'participants', btn.dataset.id));
      }
    });
  });
}

// Add participant manually
document.getElementById('add-participant-btn').addEventListener('click', () => {
  document.getElementById('add-participant-form').classList.toggle('hidden');
});

document.getElementById('add-participant-save').addEventListener('click', async () => {
  const name = document.getElementById('add-name').value.trim();
  const hcp = parseFloat(document.getElementById('add-handicap').value);
  if (name.length < 2 || isNaN(hcp) || hcp < 0 || hcp > 54) {
    alert('Ogiltiga värden.');
    return;
  }
  await addDoc(collection(db, 'participants'), {
    name, handicap: hcp, status: 'approved', registeredAt: serverTimestamp(),
    email: '', phone: ''
  });
  document.getElementById('add-name').value = '';
  document.getElementById('add-handicap').value = '';
  document.getElementById('add-participant-form').classList.add('hidden');
});

// ============================================================
// POPULATE EVENT DROPDOWNS
// ============================================================
function populateEventDropdowns() {
  // Scoring dropdown
  const sel = document.getElementById('scoring-event-select');
  const curVal = sel.value;
  sel.innerHTML = '<option value="">Välj moment...</option>';
  localEvents.forEach(ev => {
    sel.innerHTML += `<option value="${ev.id}">${ev.name}</option>`;
  });
  sel.value = curVal;

  // Settings active event dropdown
  const aSel = document.getElementById('setting-active-event');
  const curActive = aSel.value;
  aSel.innerHTML = '<option value="">Inget</option>';
  localEvents.forEach(ev => {
    aSel.innerHTML += `<option value="${ev.id}">${ev.name}</option>`;
  });
  aSel.value = curActive;
}

// ============================================================
// SCORING TAB
// ============================================================
document.getElementById('scoring-event-select').addEventListener('change', async (e) => {
  const eventId = e.target.value;
  const content = document.getElementById('scoring-content');
  const actions = document.getElementById('scoring-actions');
  const result = document.getElementById('scoring-result');

  actions.classList.add('hidden');
  result.classList.add('hidden');

  if (!eventId) {
    content.innerHTML = '<p class="text-center text-light">Välj ett moment för att mata in poäng.</p>';
    return;
  }

  const ev = localEvents.find(x => x.id === eventId);

  // Special handling per event type
  if (eventId === 'scramble') {
    await renderScrambleScoring(content);
  } else if (eventId === 'roliga_skott') {
    renderRoligaSkottScoring(content);
  } else {
    renderIndividualScoring(content, ev);
  }

  actions.classList.remove('hidden');
});

function renderIndividualScoring(container, ev) {
  if (localParticipants.length === 0) {
    container.innerHTML = '<p class="text-center text-light">Inga godkända deltagare.</p>';
    return;
  }

  container.innerHTML = `
    <table class="table">
      <thead><tr><th>Namn</th><th>Hcp</th><th>Poäng</th><th>Deltar ej</th></tr></thead>
      <tbody>${localParticipants.map(p => `
        <tr>
          <td>${esc(p.name)}</td>
          <td>${p.handicap}</td>
          <td><input type="number" class="form-input score-input" data-pid="${p.id}" style="width:80px;" step="any"></td>
          <td><input type="checkbox" class="dnp-checkbox" data-pid="${p.id}"></td>
        </tr>
      `).join('')}</tbody>
    </table>`;

  // Load existing scores
  loadExistingScores(ev.id);
}

function renderRoligaSkottScoring(container) {
  if (localParticipants.length === 0) {
    container.innerHTML = '<p class="text-center text-light">Inga godkända deltagare.</p>';
    return;
  }

  container.innerHTML = `
    <p class="text-light mb-2">Använd +/- för att ställa in antal roliga skott per deltagare.</p>
    <table class="table">
      <thead><tr><th>Namn</th><th>Roliga skott</th></tr></thead>
      <tbody>${localParticipants.map(p => `
        <tr>
          <td>${esc(p.name)}</td>
          <td class="flex" style="gap:0.5rem; align-items:center;">
            <button class="btn btn-sm btn-secondary funny-minus" data-pid="${p.id}">−</button>
            <span class="funny-count" data-pid="${p.id}" style="min-width:30px; text-align:center;">0</span>
            <button class="btn btn-sm btn-primary funny-plus" data-pid="${p.id}">+</button>
          </td>
        </tr>
      `).join('')}</tbody>
    </table>`;

  container.querySelectorAll('.funny-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const span = container.querySelector(`.funny-count[data-pid="${btn.dataset.pid}"]`);
      span.textContent = Math.max(0, parseInt(span.textContent) - 1);
    });
  });

  container.querySelectorAll('.funny-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const span = container.querySelector(`.funny-count[data-pid="${btn.dataset.pid}"]`);
      span.textContent = parseInt(span.textContent) + 1;
    });
  });

  loadExistingScores('roliga_skott');
}

async function renderScrambleScoring(container) {
  const teamsSnap = await getDocs(collection(db, 'teams'));
  const teams = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (teams.length === 0) {
    container.innerHTML = '<p class="text-center text-light">Inga lag skapade ännu. Gå till Lag-tabben först.</p>';
    document.getElementById('scoring-actions').classList.add('hidden');
    return;
  }

  container.innerHTML = `
    <table class="table">
      <thead><tr><th>Lag</th><th>Spelare</th><th>Snitt Hcp</th><th>Resultat</th></tr></thead>
      <tbody>${teams.map(t => `
        <tr>
          <td><strong>${esc(t.name)}</strong></td>
          <td>${(t.memberIds || []).length} spelare</td>
          <td>${(t.averageHandicap || 0).toFixed(1)}</td>
          <td><input type="number" class="form-input scramble-score" data-team-id="${t.id}" style="width:80px;" step="any"></td>
        </tr>
      `).join('')}</tbody>
    </table>`;
}

async function loadExistingScores(eventId) {
  const snap = await getDocs(query(collection(db, 'scores'), where('eventId', '==', eventId)));
  snap.forEach(d => {
    const s = d.data();
    const scoreInput = document.querySelector(`.score-input[data-pid="${s.participantId}"]`);
    if (scoreInput) {
      scoreInput.value = s.rawScore;
    }
    const dnpCheck = document.querySelector(`.dnp-checkbox[data-pid="${s.participantId}"]`);
    if (dnpCheck && s.didNotParticipate) {
      dnpCheck.checked = true;
      const scoreField = document.querySelector(`.score-input[data-pid="${s.participantId}"]`);
      if (scoreField) scoreField.disabled = true;
    }
    // Funny scores
    const funnySpan = document.querySelector(`.funny-count[data-pid="${s.participantId}"]`);
    if (funnySpan) funnySpan.textContent = s.rawScore || 0;
  });

  // DNP checkbox toggles score field
  document.querySelectorAll('.dnp-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      const inp = document.querySelector(`.score-input[data-pid="${cb.dataset.pid}"]`);
      if (inp) {
        inp.disabled = cb.checked;
        if (cb.checked) inp.value = '';
      }
    });
  });
}

// Calculate & Save scores
document.getElementById('calculate-scores-btn').addEventListener('click', async () => {
  const eventId = document.getElementById('scoring-event-select').value;
  if (!eventId) return;

  const N = localParticipants.length;
  const ev = localEvents.find(x => x.id === eventId);
  const resultEl = document.getElementById('scoring-result');

  try {
    if (eventId === 'scramble') {
      await saveScrambleScores(N, resultEl);
    } else if (eventId === 'roliga_skott') {
      await saveRoligaSkottScores(N, resultEl);
    } else {
      await saveIndividualScores(eventId, ev, N, resultEl);
    }

    // Mark event as completed
    await updateDoc(doc(db, 'events', eventId), { status: 'completed' });
  } catch (err) {
    resultEl.innerHTML = `<p class="error-message">Fel: ${err.message}</p>`;
    resultEl.classList.remove('hidden');
  }
});

async function saveIndividualScores(eventId, ev, N, resultEl) {
  const entries = [];
  document.querySelectorAll('.score-input').forEach(inp => {
    const pid = inp.dataset.pid;
    const dnp = document.querySelector(`.dnp-checkbox[data-pid="${pid}"]`);
    const isDNP = dnp ? dnp.checked : false;
    entries.push({
      participantId: pid,
      rawScore: isDNP ? null : parseFloat(inp.value),
      didNotParticipate: isDNP
    });
  });

  const results = calculateTournamentPoints(entries, N, ev.scoreDirection || 'higher_is_better');

  // Batch write scores
  const batch = writeBatch(db);
  // Delete existing scores for this event
  const existingSnap = await getDocs(query(collection(db, 'scores'), where('eventId', '==', eventId)));
  existingSnap.forEach(d => batch.delete(d.ref));

  results.forEach(r => {
    const ref = doc(collection(db, 'scores'));
    batch.set(ref, {
      eventId,
      participantId: r.participantId,
      rawScore: r.rawScore,
      rank: r.rank,
      tournamentPoints: r.tournamentPoints,
      didNotParticipate: r.didNotParticipate,
      enteredAt: serverTimestamp()
    });
  });

  await batch.commit();

  // Show results
  const names = {};
  localParticipants.forEach(p => names[p.id] = p.name);
  resultEl.innerHTML = `<h3>Beräknade poäng</h3>
    <table class="table"><thead><tr><th>Namn</th><th>Råpoäng</th><th>Rank</th><th>Tour-poäng</th></tr></thead>
    <tbody>${results.sort((a, b) => (a.rank || 999) - (b.rank || 999)).map(r => `
      <tr><td>${esc(names[r.participantId] || '?')}</td><td>${r.rawScore ?? '—'}</td>
      <td>${r.rank ?? '—'}</td><td><strong>${r.tournamentPoints}</strong></td></tr>
    `).join('')}</tbody></table>`;
  resultEl.classList.remove('hidden');
}

async function saveRoligaSkottScores(N, resultEl) {
  const entries = [];
  document.querySelectorAll('.funny-count').forEach(span => {
    entries.push({
      participantId: span.dataset.pid,
      rawScore: parseInt(span.textContent),
      didNotParticipate: false
    });
  });

  const results = calculateTournamentPoints(entries, N, 'higher_is_better');

  const batch = writeBatch(db);
  const existingSnap = await getDocs(query(collection(db, 'scores'), where('eventId', '==', 'roliga_skott')));
  existingSnap.forEach(d => batch.delete(d.ref));

  results.forEach(r => {
    const ref = doc(collection(db, 'scores'));
    batch.set(ref, {
      eventId: 'roliga_skott',
      participantId: r.participantId,
      rawScore: r.rawScore,
      rank: r.rank,
      tournamentPoints: r.tournamentPoints,
      didNotParticipate: false,
      enteredAt: serverTimestamp()
    });
  });

  await batch.commit();

  const names = {};
  localParticipants.forEach(p => names[p.id] = p.name);
  resultEl.innerHTML = `<h3>Beräknade poäng — Roligaste skott</h3>
    <table class="table"><thead><tr><th>Namn</th><th>Roliga skott</th><th>Rank</th><th>Tour-poäng</th></tr></thead>
    <tbody>${results.sort((a, b) => (a.rank || 999) - (b.rank || 999)).map(r => `
      <tr><td>${esc(names[r.participantId] || '?')}</td><td>${r.rawScore}</td>
      <td>${r.rank ?? '—'}</td><td><strong>${r.tournamentPoints}</strong></td></tr>
    `).join('')}</tbody></table>`;
  resultEl.classList.remove('hidden');
}

async function saveScrambleScores(N, resultEl) {
  const teamsSnap = await getDocs(collection(db, 'teams'));
  const teams = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  document.querySelectorAll('.scramble-score').forEach(inp => {
    const t = teams.find(x => x.id === inp.dataset.teamId);
    if (t) t.scrambleResult = parseFloat(inp.value);
  });

  const ranked = calculateScramblePoints(teams.filter(t => t.scrambleResult != null), N);

  const batch = writeBatch(db);
  const existingSnap = await getDocs(query(collection(db, 'scores'), where('eventId', '==', 'scramble')));
  existingSnap.forEach(d => batch.delete(d.ref));

  ranked.forEach(team => {
    (team.memberIds || []).forEach(pid => {
      const ref = doc(collection(db, 'scores'));
      batch.set(ref, {
        eventId: 'scramble',
        participantId: pid,
        rawScore: team.scrambleResult,
        rank: team.scrambleRank,
        tournamentPoints: team.scramblePoints,
        didNotParticipate: false,
        teamId: team.id,
        teamName: team.name,
        enteredAt: serverTimestamp()
      });
    });

    // Update team doc
    batch.update(doc(db, 'teams', team.id), {
      scrambleResult: team.scrambleResult,
      scrambleRank: team.scrambleRank,
      scramblePoints: team.scramblePoints
    });
  });

  await batch.commit();

  resultEl.innerHTML = `<h3>Scramble-resultat</h3>
    <table class="table"><thead><tr><th>Lag</th><th>Resultat</th><th>Rank</th><th>Poäng per spelare</th></tr></thead>
    <tbody>${ranked.sort((a, b) => (a.scrambleRank || 999) - (b.scrambleRank || 999)).map(t => `
      <tr><td>${esc(t.name)}</td><td>${t.scrambleResult}</td>
      <td>${t.scrambleRank}</td><td><strong>${t.scramblePoints}</strong></td></tr>
    `).join('')}</tbody></table>`;
  resultEl.classList.remove('hidden');
}

// ============================================================
// TEAMS TAB
// ============================================================
document.getElementById('generate-teams-btn').addEventListener('click', () => {
  const numTeams = parseInt(document.getElementById('num-teams-select').value);
  if (localParticipants.length < 2) {
    alert('Behöver minst 2 deltagare för att skapa lag.');
    return;
  }

  localTeams = generateTeams(
    localParticipants.map(p => ({ id: p.id, name: p.name, handicap: p.handicap })),
    numTeams
  );

  renderTeams();
});

function renderTeams() {
  const container = document.getElementById('teams-content');
  const actions = document.getElementById('teams-actions');

  if (!localTeams || localTeams.length === 0) {
    container.innerHTML = '<p class="text-center text-light">Klicka på "Generera lag" för att skapa balanserade lag.</p>';
    actions.classList.add('hidden');
    return;
  }

  container.innerHTML = `<div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:1rem;">
    ${localTeams.map((team, ti) => `
      <div class="card" style="padding:1rem;">
        <div class="form-group" style="margin-bottom:0.5rem;">
          <input type="text" class="form-input team-name" data-idx="${ti}" value="${esc(team.name)}" style="font-weight:bold;">
        </div>
        <p class="text-light" style="font-size:0.85rem;">Snitt hcp: <strong>${(team.averageHandicap || 0).toFixed(1)}</strong></p>
        <ul style="list-style:none; padding:0; margin:0.5rem 0 0;">
          ${team.members.map((m, mi) => `
            <li class="flex-between" style="padding:0.3rem 0; border-bottom:1px solid var(--color-bg);">
              <span>${esc(m.name)} <small class="text-light">(${m.handicap})</small></span>
              <select class="form-input move-select" data-team="${ti}" data-member="${mi}" style="width:auto; padding:2px;">
                <option value="">Flytta...</option>
                ${localTeams.map((_, oi) => `<option value="${oi}" ${oi === ti ? 'disabled' : ''}>→ ${localTeams[oi].name}</option>`).join('')}
              </select>
            </li>
          `).join('')}
        </ul>
      </div>
    `).join('')}
  </div>`;

  actions.classList.remove('hidden');

  // Team name changes
  container.querySelectorAll('.team-name').forEach(inp => {
    inp.addEventListener('change', () => {
      localTeams[parseInt(inp.dataset.idx)].name = inp.value.trim();
    });
  });

  // Move players
  container.querySelectorAll('.move-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const fromTeam = parseInt(sel.dataset.team);
      const memberIdx = parseInt(sel.dataset.member);
      const toTeam = parseInt(sel.value);
      if (isNaN(toTeam) || toTeam === fromTeam) { sel.value = ''; return; }

      const player = localTeams[fromTeam].members[memberIdx];
      localTeams = movePlayerBetweenTeams(localTeams, player.id, fromTeam, toTeam);
      renderTeams();
    });
  });
}

document.getElementById('save-teams-btn').addEventListener('click', async () => {
  if (!localTeams) return;
  if (!confirm('Spara lag? Detta ersätter befintliga lag.')) return;

  const batch = writeBatch(db);

  // Delete old teams
  const oldTeams = await getDocs(collection(db, 'teams'));
  oldTeams.forEach(d => batch.delete(d.ref));

  // Save new teams
  localTeams.forEach(team => {
    const ref = doc(collection(db, 'teams'));
    batch.set(ref, {
      name: team.name,
      memberIds: team.members.map(m => m.id),
      averageHandicap: team.averageHandicap,
      scrambleResult: null,
      scrambleRank: null,
      scramblePoints: null
    });
  });

  await batch.commit();
  alert('Lag sparade!');
});

// ============================================================
// SETTINGS TAB
// ============================================================
document.getElementById('save-settings-btn').addEventListener('click', async () => {
  const msgEl = document.getElementById('settings-message');
  try {
    await setDoc(doc(db, 'settings', 'tournament'), {
      year: 2026,
      date: '2026-07-11',
      dropinTime: '11:00',
      startTime: '13:00',
      registrationOpen: document.getElementById('setting-registration-open').checked,
      currentEvent: document.getElementById('setting-active-event').value || null,
      secretCode: document.getElementById('setting-secret-code').value.trim() || 'trelle2026'
    }, { merge: true });
    msgEl.innerHTML = '<p class="success-message">Inställningar sparade!</p>';
    msgEl.classList.remove('hidden');
  } catch (err) {
    msgEl.innerHTML = `<p class="error-message">Kunde inte spara: ${err.message}</p>`;
    msgEl.classList.remove('hidden');
  }
  setTimeout(() => msgEl.classList.add('hidden'), 3000);
});

document.getElementById('init-tournament-btn').addEventListener('click', async () => {
  const msgEl = document.getElementById('settings-message');
  if (!confirm('Initiera tävling? Detta skapar tävlingsmoment i databasen.')) return;

  try {
    // Check if already initialized
    const settingsSnap = await getDoc(doc(db, 'settings', 'tournament'));
    if (settingsSnap.exists()) {
      alert('Tävlingen är redan initierad.');
      return;
    }

    const batch = writeBatch(db);

    // Settings
    batch.set(doc(db, 'settings', 'tournament'), {
      year: 2026, date: '2026-07-11', dropinTime: '11:00', startTime: '13:00',
      registrationOpen: true, currentEvent: null, secretCode: 'trelle2026'
    });

    // Events
    const events = [
      { id: 'putt', name: 'Putt-tävling', order: 1, type: 'individual', scoreDirection: 'higher_is_better', status: 'upcoming', description: '5 puttar var, bästa 3 räknas.', handicapRule: 'Fler försök med högt hcp, bästa 3 räknas' },
      { id: 'chip_spel', name: 'Chipping-spel', order: 2, type: 'individual', scoreDirection: 'higher_is_better', status: 'upcoming', description: '6 chip var, alla räknas.', handicapRule: 'Fler omgångar med högt hcp, bäst omgång räknas' },
      { id: 'chip_hink', name: 'Chip i hink', order: 3, type: 'individual', scoreDirection: 'higher_is_better', status: 'upcoming', description: '5 chip var. Boll i hinken = 1 poäng.', handicapRule: 'Fler försök med högt hcp' },
      { id: 'cttp_56', name: 'Closest to the pin 56m', order: 4, type: 'individual', scoreDirection: 'lower_is_better', status: 'upcoming', description: '3 försök var. Närmast vinner.', handicapRule: 'Fler omgångar med högt hcp, bäst omgång räknas' },
      { id: 'cttp_124', name: 'Closest to the pin 124m', order: 5, type: 'individual', scoreDirection: 'lower_is_better', status: 'upcoming', description: '3 försök var. Närmast vinner.', handicapRule: 'Fler omgångar med högt hcp, bäst omgång räknas' },
      { id: 'drive', name: 'Longest drive', order: 6, type: 'individual', scoreDirection: 'higher_is_better', status: 'upcoming', description: '4 försök var. Längst vinner.', handicapRule: 'Fler omgångar med högt hcp, längst räknas' },
      { id: 'scramble', name: 'Scramble', order: 7, type: 'team', scoreDirection: 'higher_is_better', status: 'upcoming', description: 'Lag tävlar mot varandra.', handicapRule: '' },
      { id: 'roliga_skott', name: 'Roligaste skott', order: 8, type: 'audience_vote', scoreDirection: 'higher_is_better', status: 'upcoming', description: 'Rösta fram roliga skott.', handicapRule: '' }
    ];

    events.forEach(ev => {
      const { id, ...data } = ev;
      batch.set(doc(db, 'events', id), data);
    });

    await batch.commit();
    msgEl.innerHTML = '<p class="success-message">Tävling initierad! Alla moment skapade.</p>';
    msgEl.classList.remove('hidden');
  } catch (err) {
    msgEl.innerHTML = `<p class="error-message">Fel: ${err.message}</p>`;
    msgEl.classList.remove('hidden');
  }
});

// ============================================================
// HELPERS
// ============================================================
function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

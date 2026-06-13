// ============================================================
// Hcp-fördelningssida – TrelleMasters 2026
// ============================================================
import { HCP_BANDS, MOMENTS, getBandFromInput } from './hcp-tables.js';

// ─── Rendera tabeller ─────────────────────────────────
function renderTables() {
  const container = document.getElementById('tables-container');
  if (!container) return;

  const html = MOMENTS.map((moment) => {
    const rows = HCP_BANDS.map((band, i) => {
      const attempts = moment.attempts[i];
      const hcpRange = band.id === 'A'
        ? `+5 till 5`
        : `${band.min} till ${band.max}`;
      return `
        <tr>
          <td><span>${band.emoji}</span> ${band.label}</td>
          <td class="text-muted">${hcpRange}</td>
          <td class="text-center"><strong>${attempts}</strong></td>
        </tr>`;
    }).join('');

    return `
      <div class="card" style="margin-bottom: 1rem;">
        <h3 style="color: var(--color-primary); margin-bottom: 0.5rem;">
          ${moment.emoji} ${moment.name}
        </h3>
        <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 0.75rem;">
          ${moment.rule}
        </p>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Band</th>
                <th>Hcp</th>
                <th class="text-center">Försök</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = html;
}

// ─── Hcp-kalkylator ──────────────────────────────────
function setupCalculator() {
  const input = document.getElementById('hcp-input');
  const btn = document.getElementById('hcp-calc-btn');
  const result = document.getElementById('hcp-result');
  if (!input || !btn || !result) return;

  function calculate() {
    const hcpStr = input.value.trim();
    if (!hcpStr) {
      result.innerHTML = '<p class="text-muted">Skriv in din handicap ovan.</p>';
      return;
    }

    const band = getBandFromInput(hcpStr);
    if (!band) {
      result.innerHTML = '<p class="error-message">Ogiltig handicap. Skriv t.ex. 22.3 eller +2.4</p>';
      return;
    }

    // Visa band + försök per moment
    let attemptsHtml = MOMENTS.map((moment) => {
      const bandIndex = HCP_BANDS.findIndex((b) => b.id === band.id);
      const attempts = moment.attempts[bandIndex];
      return `<tr><td>${moment.emoji} ${moment.name}</td><td class="text-center"><strong>${attempts}</strong></td></tr>`;
    }).join('');

    result.innerHTML = `
      <div class="card" style="background: var(--color-bg); padding: 1rem;">
        <p style="font-weight: 700; color: var(--color-primary); margin-bottom: 0.5rem;">
          ${band.emoji} Ditt band: ${band.label}
        </p>
        <table>
          <thead><tr><th>Moment</th><th class="text-center">Försök</th></tr></thead>
          <tbody>${attemptsHtml}</tbody>
        </table>
      </div>`;
  }

  btn.addEventListener('click', calculate);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') calculate();
  });
}

// ─── Initiera ────────────────────────────────────────
renderTables();
setupCalculator();

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
          <td class="hcp-band"><span class="hcp-band-emoji" aria-hidden="true">${band.emoji}</span> ${band.label}</td>
          <td class="text-muted">${hcpRange}</td>
          <td class="text-center"><span class="hcp-attempts">${attempts}</span></td>
        </tr>`;
    }).join('');

    return `
      <div class="card hcp-moment">
        <div class="hcp-moment-head">
          <span class="hcp-moment-emoji" aria-hidden="true">${moment.emoji}</span>
          <div>
            <h3>${moment.name}</h3>
            <p class="hcp-moment-rule">${moment.rule}</p>
          </div>
        </div>
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
      return `<tr><td>${moment.emoji} ${moment.name}</td><td class="text-center"><span class="hcp-attempts">${attempts}</span></td></tr>`;
    }).join('');

    result.innerHTML = `
      <div class="card hcp-result-card">
        <p class="hcp-result-band"><span aria-hidden="true">${band.emoji}</span> Ditt band: ${band.label}</p>
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

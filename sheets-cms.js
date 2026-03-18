// DDD Google Sheets CMS Integration
// Henter data fra Bodils Google Sheet og renderer dynamisk
const SHEET_ID = '1ARr6nkDp6z1JCiyb8TNlAq2TvGwxSBXy';
const BASE = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=`;

function parseSheetJSON(raw) {
  const json = JSON.parse(raw.substring(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
  const headers = json.table.cols.map(c => c.label || '');
  return json.table.rows.map(r => {
    const obj = {};
    r.c.forEach((cell, i) => { obj[headers[i]] = cell ? (cell.v || '') : ''; });
    return obj;
  });
}

async function fetchSheet(name) {
  try {
    const res = await fetch(BASE + encodeURIComponent(name));
    const text = await res.text();
    return parseSheetJSON(text);
  } catch (e) {
    console.error(`Fejl ved hentning af ${name}:`, e);
    return [];
  }
}

async function loadAll() {
  const [vagtskema, profiler, priser, events] = await Promise.all([
    fetchSheet('Vagtskema'),
    fetchSheet('Profiler'),
    fetchSheet('Priser'),
    fetchSheet('Events')
  ]);

  // Render vagtskema
  const vEl = document.getElementById('vagtskema');
  if (vEl && vagtskema.length) {
    const rows = vagtskema
      .filter(r => r['Dag'] && r['Tidsrum'])
      .map(r => {
        const navne = [r['Navn 1'], r['Navn 2'], r['Navn 3']].filter(Boolean).join(' & ');
        return `<div class="schedule-row">
          <div class="schedule-day">${r['Dag']}${r['Dato'] ? ' ' + r['Dato'] : ''}</div>
          <div class="schedule-time">${r['Tidsrum']}</div>
          <div class="schedule-names">${navne}</div>
          ${r['Noter'] ? '<div class="schedule-notes">' + r['Noter'] + '</div>' : ''}
        </div>`;
      }).join('');
    vEl.innerHTML = rows || '<p>Intet vagtskema lige nu.</p>';
  }

  // Render profiler
  const pEl = document.getElementById('profiler');
  if (pEl && profiler.length) {
    const cards = profiler
      .filter(r => r['Navn'] && String(r['Aktiv (ja/nej)']).toLowerCase() === 'ja')
      .map(r => `<div class="profile-card">
        <h3>${r['Navn']}${r['Alder'] ? ', ' + r['Alder'] : ''}</h3>
        <p>${r['Beskrivelse'] || ''}</p>
      </div>`).join('');
    pEl.innerHTML = cards || '<p>Ingen profiler lige nu.</p>';
  }

  // Render priser
  const prEl = document.getElementById('priser');
  if (prEl && priser.length) {
    const rows = priser
      .filter(r => r['Ydelse'])
      .map(r => {
        let html = `<div class="price-row">
          <span class="price-service">${r['Ydelse']}</span>
          <span class="price-duration">${r['Varighed'] || ''}</span>
          <span class="price-amount">${r['Pris (kr)'] ? r['Pris (kr)'] + ' kr' : ''}</span>
        </div>`;
        if (r['Tilvalg']) {
          html += `<div class="price-row addon">
            <span class="price-service">+ ${r['Tilvalg']}</span>
            <span class="price-amount">${r['Tilvalg pris (kr)'] ? r['Tilvalg pris (kr)'] + ' kr' : ''}</span>
          </div>`;
        }
        return html;
      }).join('');
    prEl.innerHTML = rows || '<p>Ingen priser lige nu.</p>';
  }

  // Render events
  const eEl = document.getElementById('events');
  if (eEl && events.length) {
    const cards = events
      .filter(r => r['Dato'] && String(r['Aktiv (ja/nej)']).toLowerCase() === 'ja')
      .map(r => `<div class="event-card">
        <div class="event-date">${r['Dag'] || ''} ${r['Dato']}</div>
        <div class="event-time">${r['Tidsrum'] || ''}</div>
        <div class="event-desc">${r['Beskrivelse'] || ''}</div>
        ${r['Pris (kr)'] ? '<div class="event-price">' + r['Pris (kr)'] + ' kr</div>' : ''}
      </div>`).join('');
    eEl.innerHTML = cards || '';
  }

  // Hide loading
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', loadAll);

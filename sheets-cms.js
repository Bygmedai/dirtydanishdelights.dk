const SHEET_ID = '1ARr6nkDp6z1JCiyb8TNlAq2TvGwxSBXy';
const BASE = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=`;

function parseSheet(raw) {
  const json = JSON.parse(raw.substring(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
  const headers = json.table.cols.map(c => c.label || '');
  return { headers, rows: json.table.rows.map(r => {
    const obj = {};
    r.c.forEach((cell, i) => { obj[headers[i]] = cell ? (cell.v || '') : ''; });
    return obj;
  })};
}

async function fetchSheet(name) {
  try {
    const res = await fetch(BASE + encodeURIComponent(name));
    return parseSheet(await res.text());
  } catch (e) { console.error(e); return { headers: [], rows: [] }; }
}

async function loadAll() {
  const [vagt, prof, pris, evt] = await Promise.all([
    fetchSheet('Vagtskema'), fetchSheet('Profiler'),
    fetchSheet('Priser'), fetchSheet('Events')
  ]);

  // Vagtskema - dynamisk: alle kolonner efter "Tidsrum" er navne
  const vEl = document.getElementById('vagtskema');
  if (vEl && vagt.rows.length) {
    const nameColumns = vagt.headers.filter(h => h && h !== 'Dag' && h !== 'Dato' && h !== 'Tidsrum' && h !== 'Noter');
    const html = vagt.rows.filter(r => r['Dag']).map(r => {
      const present = nameColumns.filter(name => r[name] && String(r[name]).trim());
      if (!present.length) return '';
      const nameList = present.map(name => `<span class="name-badge">${name} <em>${r[name]}</em></span>`).join('');
      return `<div class="schedule-row">
        <div class="schedule-day">${r['Dag']}${r['Dato'] ? ' <span class="schedule-date">' + r['Dato'] + '</span>' : ''}</div>
        <div class="schedule-names">${nameList}</div>
      </div>`;
    }).filter(Boolean).join('');
    vEl.innerHTML = html || '<p>Intet vagtskema lige nu.</p>';
  }

  // Profiler
  const pEl = document.getElementById('profiler');
  if (pEl && prof.rows.length) {
    const cards = prof.rows
      .filter(r => r['Navn'] && String(r['Aktiv (ja/nej)']).toLowerCase() === 'ja')
      .map(r => `<div class="profile-card">
        <h3>${r['Navn']}${r['Alder'] ? ', ' + r['Alder'] : ''}</h3>
        <p>${r['Beskrivelse'] || ''}</p>
      </div>`).join('');
    pEl.innerHTML = cards || '<p>Ingen profiler lige nu.</p>';
  }

  // Priser
  const prEl = document.getElementById('priser');
  if (prEl && pris.rows.length) {
    const html = pris.rows.filter(r => r['Ydelse']).map(r => {
      let out = `<div class="price-row">
        <span class="price-service">${r['Ydelse']}</span>
        <span class="price-amount">${r['Pris (kr)'] ? r['Pris (kr)'] + ' kr' : ''}</span>
      </div>`;
      if (r['Tilvalg']) {
        out += `<div class="price-row addon">
          <span class="price-service">+ ${r['Tilvalg']}</span>
          <span class="price-amount">${r['Tilvalg pris (kr)'] ? r['Tilvalg pris (kr)'] + ' kr' : ''}</span>
        </div>`;
      }
      return out;
    }).join('');
    prEl.innerHTML = html || '<p>Ingen priser lige nu.</p>';
  }

  // Events
  const eEl = document.getElementById('events');
  if (eEl && evt.rows.length) {
    const cards = evt.rows
      .filter(r => r['Dato'] && String(r['Aktiv (ja/nej)']).toLowerCase() === 'ja')
      .map(r => `<div class="event-card">
        <div class="event-date">${r['Dag'] || ''} ${r['Dato']}</div>
        <div class="event-time">${r['Tidsrum'] || ''}</div>
        <div class="event-desc">${r['Beskrivelse'] || ''}</div>
        ${r['Pris (kr)'] ? '<div class="event-price">' + r['Pris (kr)'] + '</div>' : ''}
      </div>`).join('');
    eEl.innerHTML = cards || '';
    if (!cards) document.getElementById('events-section').style.display = 'none';
  }

  document.getElementById('loading').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', loadAll);

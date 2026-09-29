// Plain vanilla JS frontend — no build step needed. Talks to the JSON API
// defined in server/routes.ts.

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// ---- Tabs -----------------------------------------------------------

$$('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('.tab').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    $$('.panel').forEach((p) => p.classList.add('hidden'));
    $(`#tab-${btn.dataset.tab}`).classList.remove('hidden');
    if (btn.dataset.tab === 'review') loadLeads();
    if (btn.dataset.tab === 'coverage') loadCoverage();
  });
});

async function api(path, opts) {
  const res = await fetch(path, opts);
  // Session expired or missing: go back to the login page
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Please log in.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function describeOutcome(o) {
  switch (o.kind) {
    case 'duplicate': return `Already covered (${o.existingStatus}) — skipped.`;
    case 'crawl_error': return `Crawl failed: ${o.error}`;
    case 'draft_error': return `Draft failed: ${o.error}`;
    case 'opted_out': return `Skipped — contact is on the do-not-contact list.`;
    case 'drafted': return `Drafted — check the Review Queue.`;
    case 'invalid': return `Invalid row: ${o.error}`;
    default: return JSON.stringify(o);
  }
}

// ---- Add: paste URL ---------------------------------------------------

$('#url-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const website = $('#url-input').value.trim();
  const businessName = $('#url-name').value.trim() || undefined;
  $('#url-result').textContent = 'Running crawl -> draft pipeline...';
  try {
    const outcome = await api('/api/leads/url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ website, businessName }),
    });
    $('#url-result').textContent = describeOutcome(outcome);
    $('#url-input').value = '';
    $('#url-name').value = '';
  } catch (err) {
    $('#url-result').textContent = `Error: ${err.message}`;
  }
});

// ---- Add: CSV import ---------------------------------------------------

$('#csv-submit').addEventListener('click', async () => {
  const file = $('#csv-file').files[0];
  if (!file) {
    $('#csv-result').textContent = 'Choose a CSV file first.';
    return;
  }
  const text = await file.text();
  $('#csv-result').textContent = 'Importing and running pipeline on every row (this can take a while — one Gemini call per lead)...';
  try {
    const result = await api('/api/leads/csv', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: text,
    });
    const lines = result.outcomes.map((o) => `${o.row}: ${describeOutcome(o)}`);
    $('#csv-result').textContent = `Imported ${result.imported} rows (${result.skipped} skipped for missing a website).\n\n${lines.join('\n')}`;
  } catch (err) {
    $('#csv-result').textContent = `Error: ${err.message}`;
  }
});

// ---- Add: auto-search ---------------------------------------------------

api('/api/search/categories').then((cats) => {
  $('#known-categories').textContent = cats.join(', ');
}).catch(() => {});

$('#search-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const city = $('#search-city').value.trim();
  const category = $('#search-category').value.trim();
  $('#search-result').textContent = 'Searching OpenStreetMap...';
  try {
    const result = await runSearch(city, category, false);
    renderSearchResult(result);
  } catch (err) {
    $('#search-result').textContent = `Error: ${err.message}`;
  }
});

async function runSearch(city, category, force) {
  return api('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ city, category, force }),
  });
}

function renderSearchResult(result) {
  if (result.repeat) {
    $('#search-result').innerHTML = '';
    const p = document.createElement('p');
    p.textContent = result.message;
    const btn = document.createElement('button');
    btn.textContent = 'Run it again anyway';
    btn.addEventListener('click', async () => {
      const city = $('#search-city').value.trim();
      const category = $('#search-category').value.trim();
      $('#search-result').textContent = 'Searching again...';
      const forced = await runSearch(city, category, true);
      renderSearchResult(forced);
    });
    $('#search-result').appendChild(p);
    $('#search-result').appendChild(btn);
    return;
  }
  const lines = result.outcomes.map((o) => `${o.business} (${o.website}): ${describeOutcome(o)}`);
  $('#search-result').textContent = `Found ${result.found} businesses with a website.\n\n${lines.join('\n')}`;
}

// ---- Review queue ---------------------------------------------------

$('#status-filter').addEventListener('change', loadLeads);
$('#refresh-leads').addEventListener('click', loadLeads);

async function loadLeads() {
  const status = $('#status-filter').value;
  const leads = await api(`/api/leads${status ? `?status=${encodeURIComponent(status)}` : ''}`);
  const container = $('#leads-list');
  container.innerHTML = '';
  if (leads.length === 0) {
    container.innerHTML = '<p class="hint">Nothing here yet.</p>';
    return;
  }
  for (const lead of leads) container.appendChild(renderLeadCard(lead));
}

function renderLeadCard(lead) {
  const card = document.createElement('div');
  card.className = 'lead-card';

  const header = document.createElement('div');
  header.className = 'lead-header';
  header.innerHTML = `<h3>${escapeHtml(lead.businessName || lead.domain)}</h3><span class="status-badge status-${lead.status}">${lead.status}</span>`;
  card.appendChild(header);

  const meta = document.createElement('div');
  meta.className = 'hint';
  meta.textContent = `${lead.website} · source: ${lead.source} · updated ${lead.updatedAt}`;
  card.appendChild(meta);

  if (lead.error) {
    const err = document.createElement('p');
    err.className = 'hint';
    err.style.color = 'var(--bad)';
    err.textContent = `Error: ${lead.error}`;
    card.appendChild(err);
  }

  if (lead.evidence) {
    const ev = document.createElement('div');
    ev.className = 'evidence';
    ev.innerHTML = `<strong>Evidence found on the site:</strong><ul>${lead.evidence.issues.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>` +
      (lead.evidence.emails.length ? `<div>Emails found: ${lead.evidence.emails.map(escapeHtml).join(', ')}</div>` : '');
    card.appendChild(ev);
  }

  if (lead.status === 'drafted' || lead.status === 'approved') {
    const subjectInput = document.createElement('input');
    subjectInput.type = 'text';
    subjectInput.value = lead.draftSubject || '';
    card.appendChild(subjectInput);

    const bodyArea = document.createElement('textarea');
    bodyArea.value = lead.draftBody || '';
    card.appendChild(bodyArea);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save edits';
    saveBtn.addEventListener('click', async () => {
      await patchLead(lead.id, { draftSubject: subjectInput.value, draftBody: bodyArea.value });
    });
    actions.appendChild(saveBtn);

    if (lead.status === 'drafted') {
      const approveBtn = document.createElement('button');
      approveBtn.className = 'approve';
      approveBtn.textContent = 'Approve';
      approveBtn.addEventListener('click', async () => {
        await patchLead(lead.id, { draftSubject: subjectInput.value, draftBody: bodyArea.value, action: 'approve' });
        loadLeads();
      });
      actions.appendChild(approveBtn);

      const rejectBtn = document.createElement('button');
      rejectBtn.className = 'reject';
      rejectBtn.textContent = 'Reject';
      rejectBtn.addEventListener('click', async () => {
        await patchLead(lead.id, { action: 'reject' });
        loadLeads();
      });
      actions.appendChild(rejectBtn);
    }

    if (lead.status === 'approved') {
      const email = lead.evidence?.emails?.[0] || '';
      const mailtoLink = document.createElement('a');
      mailtoLink.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subjectInput.value)}&body=${encodeURIComponent(bodyArea.value)}`;
      mailtoLink.textContent = 'Open in mail client';
      mailtoLink.target = '_blank';
      const openBtn = document.createElement('button');
      openBtn.textContent = 'Open in mail client';
      openBtn.addEventListener('click', () => window.open(mailtoLink.href, '_blank'));
      actions.appendChild(openBtn);

      const copyBtn = document.createElement('button');
      copyBtn.textContent = 'Copy email text';
      copyBtn.addEventListener('click', async () => {
        await navigator.clipboard.writeText(`Subject: ${subjectInput.value}\n\n${bodyArea.value}`);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => (copyBtn.textContent = 'Copy email text'), 1500);
      });
      actions.appendChild(copyBtn);

      const sentBtn = document.createElement('button');
      sentBtn.textContent = "I've sent this";
      sentBtn.addEventListener('click', async () => {
        await patchLead(lead.id, { action: 'mark_sent' });
        loadLeads();
      });
      actions.appendChild(sentBtn);
    }

    card.appendChild(actions);
  }

  return card;
}

async function patchLead(id, patch) {
  return api(`/api/leads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---- Coverage ---------------------------------------------------

async function loadCoverage() {
  const stats = await api('/api/coverage');
  $('#coverage-stats').innerHTML = `
    <h2>Coverage</h2>
    <div class="stat-grid">
      <div class="stat"><div class="n">${stats.totalBusinesses}</div><div class="l">Businesses tracked</div></div>
      <div class="stat"><div class="n">${stats.sent}</div><div class="l">Sent</div></div>
      <div class="stat"><div class="n">${stats.drafted}</div><div class="l">Awaiting review</div></div>
      <div class="stat"><div class="n">${stats.rejected}</div><div class="l">Rejected</div></div>
      <div class="stat"><div class="n">${stats.searchesRun}</div><div class="l">Searches run</div></div>
      <div class="stat"><div class="n">${stats.citiesCovered}</div><div class="l">Cities covered</div></div>
    </div>`;

  const tbody = $('#search-history tbody');
  tbody.innerHTML = '';
  for (const s of stats.searches) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(s.city)}</td><td>${escapeHtml(s.category)}</td><td>${s.createdAt}</td><td>${s.resultCount}</td>`;
    tbody.appendChild(tr);
  }

  const optouts = await api('/api/optouts');
  const list = $('#optout-list');
  list.innerHTML = optouts.length ? optouts.map((e) => `<li>${escapeHtml(e)}</li>`).join('') : '<li class="hint">None yet.</li>';
}

$('#optout-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('#optout-email').value.trim();
  await api('/api/optouts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  $('#optout-email').value = '';
  loadCoverage();
});

document.getElementById('logout-btn')?.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' }).catch(() => {});
  window.location.href = '/login';
});

import { fetchIncidents, ack } from './api.js';

const REFRESH_MS = 2000; // R4

const board = document.querySelector('[data-testid="board"]');
const list = document.querySelector('[data-testid="incident-list"]');
const loader = document.querySelector('[data-testid="loader"]');
const empty = document.querySelector('[data-testid="empty"]');
const status = document.querySelector('.status');

/** Every incident seen tonight, by id. A `since` page may carry only what is new, so pages are merged, never swapped. */
const incidents = new Map();
/** One <li> per incident id, kept across refreshes, so a click in progress and the acked mark survive a refresh. */
const rows = new Map();
const acked = new Map(); // id → ackedAt

// R5: the viewer's own zone and locale order (en-GB, de-DE, en-NZ → dd/mm; en-US → mm/dd).
const fmt = new Intl.DateTimeFormat(undefined, {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  timeZoneName: 'short',
});
const localTime = (iso) => fmt.format(new Date(iso));
const clock = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

function el(tag, attrs = {}, text) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text !== undefined) e.textContent = text; // text only: incident fields never become HTML
  return e;
}

function markAcked(li, at) {
  const cell = li.querySelector('.act');
  cell.replaceChildren(el('span', { 'data-testid': 'acked', class: 'acked', title: localTime(at) }, `acked ${clock.format(new Date(at))}`));
}

function makeRow(i) {
  const li = el('li', { 'data-testid': 'incident-row', 'data-id': i.id, class: `row ${i.severity}` });
  li.append(
    el('span', { class: 'id' }, i.id),
    el('span', { class: 'sev' }, i.severity),
    el('span', { class: 'what' }, `${i.service} · ${i.region} · ${i.summary}`),
    el('time', { datetime: i.openedAt, title: i.openedAt }, localTime(i.openedAt)),
  );
  const act = el('span', { class: 'act' });
  const btn = el('button', { type: 'button', 'data-testid': 'ack' }, 'Ack');
  btn.addEventListener('click', () => onAck(i.id, li, btn));
  act.append(btn);
  li.append(act);
  if (acked.has(i.id)) markAcked(li, acked.get(i.id));
  return li;
}

async function onAck(id, li, btn) {
  btn.disabled = true;
  btn.textContent = 'Acking…';
  try {
    const reply = await ack(id); // R2: api.js sends the latest cursor and keeps the receipt
    acked.set(id, reply.ackedAt);
    markAcked(li, reply.ackedAt);
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Ack';
    showStatus(`Ack failed for ${id}: ${e.message}`);
  }
}

function showStatus(text) {
  status.textContent = text;
  status.hidden = !text;
}

function render() {
  // R1: newest first. Existing rows are moved, not rebuilt; new ones are created.
  const sorted = [...incidents.values()].sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  sorted.forEach((i, n) => {
    let li = rows.get(i.id);
    if (!li) rows.set(i.id, (li = makeRow(i)));
    if (list.children[n] !== li) list.insertBefore(li, list.children[n] ?? null);
  });
  empty.hidden = sorted.length > 0;
  list.hidden = sorted.length === 0;
}

async function refresh() {
  try {
    const page = await fetchIncidents();
    for (const i of page.incidents) incidents.set(i.id, i);
    render();
    loader.hidden = true; // R3: gone once incidents are on screen
    board.setAttribute('aria-busy', 'false');
    showStatus('');
    board.dataset.updatedAt = page.updatedAt;
  } catch (e) {
    showStatus(`Could not load incidents (${e.message}). Retrying…`);
  } finally {
    setTimeout(refresh, REFRESH_MS); // R4: one request at a time, every 2 s
  }
}

refresh();

// 808 現場導覽：時程、嘉賓、Dealer 三頁，場次開始提醒，加到主畫面。資料由 build.py 嵌在 #gdata。

// 語言：QR code 連到中文版；第一次打開時依手機語言自動換成對應語言版（自己選過就照選的）
(function pickLang() {
  const here = document.body.dataset.lang;
  const langs = document.body.dataset.langs.split(',');
  let saved = null;
  try { saved = localStorage.getItem('m8g-lang'); } catch (e) { /* 無痕模式 */ }
  document.querySelectorAll('.glangs a').forEach((a) => a.addEventListener('click', () => {
    try { localStorage.setItem('m8g-lang', a.getAttribute('hreflang')); } catch (e) { /* 無痕模式 */ }
    a.href += location.search + location.hash;
  }));
  if (here !== langs[0]) return;
  let want = saved;
  if (!want) {
    for (const l of navigator.languages || [navigator.language]) {
      const code = (l || '').toLowerCase();
      if (code.startsWith('zh')) { want = langs[0]; break; }
      const hit = langs.find((x) => code === x || code.startsWith(x + '-') || (x === 'fil' && code.startsWith('tl')));
      if (hit) { want = hit; break; }
    }
    if (!want) want = 'en';
  }
  if (want && want !== here && langs.includes(want)) location.replace(`${want}/guide.html${location.search}${location.hash}`);
})();
const D = JSON.parse(document.getElementById('gdata').textContent);
const t = (k, v) => (D.t[k] || '').replace(/\{(\w+)\}/g, (_, x) => (v && x in v ? v[x] : ''));
const main = document.getElementById('gmain');
const byId = Object.fromEntries(D.sessions.map((s) => [s.id, s]));
const guestByNo = Object.fromEntries(D.guests.map((g) => [g.no, g]));
const store = {
  get(k, d) { try { const v = localStorage.getItem('m8g-' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('m8g-' + k, JSON.stringify(v)); } catch (e) { /* 無痕模式 */ } },
};

// 現在時間；網址加 ?now=2027-03-06T09:25 可以模擬（台北時間）
const fake = new URLSearchParams(location.search).get('now');
const offset = fake ? Date.parse(fake + ':00' + D.tz) - Date.now() : 0;
const now = () => Date.now() + offset;
const at = (date, hm) => (date && hm ? Date.parse(`${date}T${hm}:00${D.tz}`) : NaN);
const startOf = (s) => at(s.date, s.start);
const endOf = (s) => (s.end ? at(s.date, s.end) : startOf(s) + 30 * 60000);
const todayStr = () => new Date(now() + 8 * 3600000).toISOString().slice(0, 10);

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== '') el.append(kid.nodeType ? kid : String(kid));
  return el;
}

function where(s) {
  return [s.floor && h('span', { class: 'gfloor' }, s.floor), s.room].filter(Boolean);
}

function statusOf(s) {
  const a = startOf(s), b = endOf(s), n = now();
  if (isNaN(a)) return '';
  if (n >= b) return 'past';
  if (n >= a) return 'now';
  return '';
}

// ── 時程 ─────────────────────────────────────────
function nowCard() {
  const timed = D.sessions.filter((s) => !isNaN(startOf(s))).sort((a, b) => startOf(a) - startOf(b));
  const n = now();
  const current = timed.filter((s) => n >= startOf(s) && n < endOf(s));
  const next = timed.find((s) => startOf(s) > n);
  const box = h('section', { class: 'gnow' });
  if (!timed.length) return null;
  if (n < startOf(timed[0]) - 86400000) {
    const days = Math.ceil((at(D.start, '00:00') - n) / 86400000);
    box.append(h('p', { class: 'gnow__big' }, t('g_days_left', { n: days })));
  }
  for (const s of current) box.append(nowRow(t('g_now'), s, true));
  if (next) {
    const mins = Math.round((startOf(next) - n) / 60000);
    const when = mins < 60 ? t('g_in_min', { n: mins }) : mins < 24 * 60 ? t('g_in_hm', { h: Math.floor(mins / 60), m: mins % 60 }) : next.time;
    box.append(nowRow(`${t('g_next')} · ${when}`, next, false));
  } else if (!current.length) {
    box.append(h('p', { class: 'gnow__big' }, t('g_done')));
  }
  return box;
}

function nowRow(label, s, live) {
  return h('a', { class: 'gnow__row' + (live ? ' is-live' : ''), href: '#s=' + s.id },
    h('span', { class: 'gnow__lbl' }, label),
    h('b', { class: 'gnow__title' }, s.title),
    h('span', { class: 'gnow__where' }, where(s)));
}

function pickDay() {
  const today = D.days.find((d) => d.date === todayStr());
  return store.get('day', null) && D.days.some((d) => d.day === store.get('day')) && !today ? store.get('day') : (today || D.days[0]).day;
}

function renderSchedule() {
  const day = pickDay();
  const chips = h('div', { class: 'gdays', role: 'tablist' }, D.days.map((d) => h('button', {
    type: 'button', role: 'tab', class: 'gday', 'aria-selected': String(d.day === day),
    onclick: () => { store.set('day', d.day); render(); },
  }, h('span', { class: 'gday__n' }, d.label), h('span', { class: 'gday__d' }, d.short))));
  const d = D.days.find((x) => x.day === day);
  const list = h('ul', { class: 'glist' }, d.sessions.map((id) => {
    const s = byId[id];
    return h('li', { class: 'gitem gitem--' + s.type + ' ' + statusOf(s) },
      h('a', { href: '#s=' + s.id },
        h('span', { class: 'gitem__time' }, s.start || '—'),
        h('span', { class: 'gitem__body' },
          h('b', null, s.title),
          h('span', { class: 'gitem__where' }, where(s)))));
  }));
  return [nowCard(), chips, list];
}

function sectionDiagram(rid, inhall, only) {
  if (!inhall) return h('p', { class: 'gnote' }, t('g_other_bldg'), ' ', h('a', { href: D.root + 'venue.html' }, '→'));
  return h('div', { class: 'gsect', 'aria-label': t('g_section') },
    h('p', { class: 'gsect__hall' }, D.hall),
    D.levels.map((lv) => {
      const on = !only || lv.floor === only;
      const hit = on && lv.rooms.some((r) => r.id === rid);
      return h('div', { class: 'gsect__lv' + (hit ? ' is-hit' : '') },
        h('span', { class: 'gsect__f' }, lv.floor),
        h('span', { class: 'gsect__rooms' }, lv.rooms.map((r) => h('span', { class: 'gsect__room' + (on && r.id === rid ? ' is-hit' : '') },
          r.name, on && r.id === rid ? h('i', null, ' ● ' + t('g_here')) : ''))));
    }));
}

function plans(floors) {
  const out = [];
  for (const f of floors) {
    if (D.plans[f]) {
      out.push(h('figure', { class: 'gplan' }, h('figcaption', null, t('g_plan', { f })),
        h('img', { src: D.plans[f], alt: t('g_plan', { f }), loading: 'lazy' })));
    }
  }
  if (!out.length && floors.length) out.push(h('p', { class: 'gnote' }, t('g_plan_tba')));
  return out;
}

function renderSession(s) {
  const muted = store.get('mute', []);
  const on = !muted.includes(s.id);
  const ppl = s.guests.map((no) => guestByNo[no]).filter(Boolean);
  const floors = s.inhall ? (s.floor || '').split('·').filter(Boolean) : [];
  return [
    back(),
    h('p', { class: 'gtag gtag--' + s.type }, s.tag),
    h('h1', { class: 'gh1' }, s.title),
    h('dl', { class: 'gfacts' },
      h('dt', null, t('g_when')), h('dd', null, h('b', null, s.time), h('span', null, dayShort(s.day))),
      h('dt', null, t('g_where')), h('dd', null, h('b', null, where(s)), s.hall ? h('span', null, s.hall) : '')),
    s.note ? h('p', { class: 'gnote' }, s.note) : '',
    s.signup ? h('a', { class: 'gbtn gbtn--paper', href: D.root + s.signup }, t('signup'), ' →') : '',
    s.has_ppl ? h('section', { class: 'gblock' }, h('h2', null, s.ppl),
      ppl.length ? h('ul', { class: 'gpeople' }, ppl.map(personRow)) : h('p', { class: 'gnote' }, t('g_ppl_tba'))) : '',
    s.start ? h('button', {
      type: 'button', class: 'gbtn ' + (on ? 'gbtn--night' : 'gbtn--line'),
      onclick: () => { store.set('mute', on ? [...muted, s.id] : muted.filter((x) => x !== s.id)); render(); },
    }, t(on ? 'g_rem_on' : 'g_rem_off')) : '',
    s.room ? h('section', { class: 'gblock' }, h('h2', null, t('g_section')), sectionDiagram(s.rid, s.inhall, floors.length === 1 ? floors[0] : null), plans(floors)) : '',
  ];
}

function dayShort(n) {
  const d = D.days.find((x) => x.day === n);
  return d ? `${d.label} · ${d.short}` : '';
}

// ── 嘉賓 ─────────────────────────────────────────
function personRow(g) {
  return h('li', null, h('a', { class: 'gperson', href: '#g=' + g.no },
    g.photo ? h('img', { src: g.photo, alt: '', loading: 'lazy' }) : h('span', { class: 'gperson__ph' }),
    h('span', null, h('b', null, g.name), g.other || g.title ? h('small', null, g.other || g.title) : '')));
}

function renderGuests() {
  return [
    h('ul', { class: 'gpeople gpeople--big' }, D.guests.map(personRow)),
    D.tba_guests ? h('p', { class: 'gnote' }, t('g_more_guests', { n: D.tba_guests })) : '',
  ];
}

function renderGuest(g) {
  const mine = D.sessions.filter((s) => s.guests.includes(g.no));
  return [
    back(),
    h('div', { class: 'gguest' },
      g.photo ? h('img', { src: g.photo, alt: g.name }) : '',
      h('div', null, h('h1', { class: 'gh1' }, g.name), g.other ? h('p', { class: 'gsub' }, g.other) : '',
        g.title ? h('p', { class: 'gsub' }, g.title) : '')),
    h('section', { class: 'gblock' }, h('h2', null, t('g_sessions')),
      mine.length ? h('ul', { class: 'glist' }, mine.map((s) => h('li', { class: 'gitem gitem--' + s.type + ' ' + statusOf(s) },
        h('a', { href: '#s=' + s.id },
          h('span', { class: 'gitem__time' }, h('small', null, dayShort(s.day).split(' · ')[0]), s.start || '—'),
          h('span', { class: 'gitem__body' }, h('b', null, s.title),
            h('span', { class: 'gitem__where' }, h('span', null, dayShort(s.day).split(' · ')[1]), where(s)))))))
        : h('p', { class: 'gnote' }, t('g_sessions_tba'))),
    g.bio ? h('p', { class: 'gbio' }, g.bio) : '',
  ];
}

// ── Dealer ───────────────────────────────────────
function hoursBlock() {
  const n = now();
  return h('ul', { class: 'ghours' }, D.hours.map((x) => {
    const a = at(x.date, x.open), b = x.close ? at(x.date, x.close) : at(x.date, '22:00');
    const open = !isNaN(a) && n >= a && n < b;
    const today = x.date === todayStr();
    return h('li', { class: open ? 'is-open' : '' }, h('span', null, x.day), h('b', null, x.time),
      today ? h('i', null, t(open ? 'g_open' : 'g_closed')) : '');
  }));
}

function renderDealers() {
  const out = [
    h('section', { class: 'gblock' }, h('h2', null, t('g_hours')), hoursBlock()),
    h('section', { class: 'gblock' }, h('h2', null, t('g_where')), h('p', { class: 'gbig' }, D.dealer_where),
      sectionDiagram('corridor', true)),
  ];
  if (!D.dealers.length) {
    out.push(h('p', { class: 'gnote gnote--big' }, t('g_dealers_tba')));
  } else {
    const floors = [...D.dealer_floors, ''];
    for (const f of floors) {
      const list = D.dealers.map((d, i) => [d, i]).filter(([d]) => (d.floor || '') === f || (!f && !D.dealer_floors.includes(d.floor)));
      if (!list.length) continue;
      out.push(h('section', { class: 'gblock' },
        h('h2', null, f ? h('span', { class: 'gfloor' }, f) : t('g_floor_tba'), f ? ' ' + D.dealer_room : ''),
        h('ul', { class: 'gdealers' }, list.map(([d, i]) => h('li', null, h('a', { href: '#d=' + i },
          h('b', null, d.name), d.booth ? h('span', { class: 'gbooth' }, d.booth) : ''))))));
    }
  }
  out.push(...plans(D.dealer_floors));
  return out;
}

function renderDealer(d) {
  return [
    back(),
    h('h1', { class: 'gh1' }, d.name),
    d.region ? h('p', { class: 'gsub' }, d.region) : '',
    h('dl', { class: 'gfacts' },
      h('dt', null, t('g_where')), h('dd', null, h('b', null, d.floor ? h('span', { class: 'gfloor' }, d.floor) : t('g_floor_tba'),
        ' ', D.dealer_room), ''),
      d.booth ? h('dt', null, t('g_booth')) : '', d.booth ? h('dd', null, h('b', null, d.booth)) : ''),
    d.products ? h('p', { class: 'gbio' }, d.products) : '',
    d.url ? h('a', { class: 'gbtn gbtn--paper', href: d.url, target: '_blank', rel: 'noopener' }, t('website'), ' ↗') : '',
    h('section', { class: 'gblock' }, h('h2', null, t('g_section')), sectionDiagram('corridor', true, d.floor), plans(d.floor ? [d.floor] : [])),
  ];
}

// ── 路由 ─────────────────────────────────────────
let lastTab = 'schedule';
function back() {
  return h('button', { type: 'button', class: 'gback', onclick: () => (history.length > 1 && sessionStorage.getItem('m8g-in') ? history.back() : (location.hash = lastTab)) },
    '← ', t('g_back'));
}

function render() {
  const hash = decodeURIComponent(location.hash.slice(1));
  let view, tab;
  const [k, v] = hash.split('=');
  if (k === 's' && byId[v]) { view = renderSession(byId[v]); tab = 'schedule'; }
  else if (k === 'g' && guestByNo[v]) { view = renderGuest(guestByNo[v]); tab = 'guests'; }
  else if (k === 'd' && D.dealers[v]) { view = renderDealer(D.dealers[v]); tab = 'dealers'; }
  else {
    tab = ['guests', 'dealers'].includes(hash) ? hash : 'schedule';
    lastTab = tab;
    view = tab === 'guests' ? renderGuests() : tab === 'dealers' ? renderDealers() : renderSchedule();
  }
  main.replaceChildren(...[view].flat().filter(Boolean));
  document.querySelectorAll('.gtab').forEach((a) => a.toggleAttribute('aria-current', a.dataset.tab === tab));
}

let first = true;
window.addEventListener('hashchange', () => {
  try { sessionStorage.setItem('m8g-in', '1'); } catch (e) { /* 無痕模式 */ }
  render();
  if (!first) window.scrollTo(0, 0);
});
render();
first = false;

// ── 提醒：開始前 10 分鐘、開始時（導覽開著時一定會跳；有通知權限就送系統通知） ──
const toast = document.querySelector('.gtoast');
let toastTimer;
function showToast(label, s) {
  toast.replaceChildren(h('a', { href: '#s=' + s.id, onclick: () => (toast.hidden = true) },
    h('span', null, label), h('b', null, s.title), h('span', null, where(s))));
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.hidden = true), 60000);
  if (navigator.vibrate && navigator.userActivation?.hasBeenActive) navigator.vibrate([200, 100, 200]);
}

async function notify(label, s) {
  showToast(label, s);
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const opts = { body: `${s.time} · ${[s.floor, s.room].filter(Boolean).join(' ')}`, tag: s.id, icon: D.root + 'static/icons/icon-192.png',
    badge: D.root + 'static/icons/icon-192.png', data: { url: location.pathname + '#s=' + s.id } };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) reg.showNotification(`${label} ${s.title}`, opts);
    else new Notification(`${label} ${s.title}`, opts);
  } catch (e) { /* 通知失敗就只顯示畫面上的提醒 */ }
}

function tick() {
  const n = now();
  const fired = store.get('fired', {});
  const muted = store.get('mute', []);
  for (const s of D.sessions) {
    const a = startOf(s);
    if (isNaN(a) || muted.includes(s.id)) continue;
    for (const [key, when, label] of [['soon', a - 10 * 60000, t('g_soon')], ['now', a, t('g_start')]]) {
      const id = s.id + ':' + key;
      if (!fired[id] && n >= when && n < when + 5 * 60000) {
        fired[id] = 1;
        notify(label, s);
      }
    }
  }
  store.set('fired', fired);
  if (!location.hash.includes('=')) render();  // 更新「進行中／下一場」
}
setInterval(tick, 20000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
tick();

// ── 提醒設定、加到主畫面的面板 ──────────────────────
const ua = navigator.userAgent;
const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isSafari = isIOS && !/CriOS|FxiOS|EdgiOS|Line|FBAN|FBAV|Instagram/i.test(ua);
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

function openSheet(name) {
  const el = document.getElementById('sheet-' + name);
  if (!el) return;
  if (name === 'remind') updateNotifyStatus();
  if (name === 'install') {
    el.querySelector('[data-ios]').hidden = !(isIOS && isSafari);
    el.querySelector('[data-ios-other]').hidden = !(isIOS && !isSafari);
    el.querySelector('[data-android]').hidden = isIOS;
    el.querySelector('[data-install]').hidden = !deferredPrompt;
  }
  el.hidden = false;
  el.querySelector('button, a')?.focus();
}
document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => openSheet(b.dataset.open)));
document.querySelectorAll('.gsheet').forEach((sh) => {
  sh.addEventListener('click', (ev) => { if (ev.target === sh || ev.target.closest('[data-close]')) sh.hidden = true; });
});
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') document.querySelectorAll('.gsheet').forEach((s) => (s.hidden = true)); });

const notifyBtn = document.querySelector('[data-notify]');
const notifyStatus = document.querySelector('[data-notify-status]');
function updateNotifyStatus() {
  const can = 'Notification' in window;
  if (isIOS && !standalone) { notifyBtn.hidden = true; notifyStatus.textContent = t('g_remind_ios'); return; }
  notifyBtn.hidden = !can || Notification.permission !== 'default';
  notifyStatus.textContent = !can ? t('g_remind_ios') : Notification.permission === 'granted' ? t('g_remind_ok')
    : Notification.permission === 'denied' ? t('g_remind_denied') : '';
}
notifyBtn.addEventListener('click', async () => {
  try { await Notification.requestPermission(); } catch (e) { /* 舊瀏覽器 */ }
  updateNotifyStatus();
});

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (ev) => { ev.preventDefault(); deferredPrompt = ev; });
document.querySelector('[data-install]').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  document.getElementById('sheet-install').hidden = true;
});

const banner = document.querySelector('.ginstall');
if (!standalone && !store.get('install-x', false)) banner.hidden = false;
banner.querySelector('.ginstall__x').addEventListener('click', () => { banner.hidden = true; store.set('install-x', true); });
window.addEventListener('appinstalled', () => { banner.hidden = true; });

// 離線也能打開：service worker 放在網站根目錄
if ('serviceWorker' in navigator) navigator.serviceWorker.register(D.root + 'sw.js').catch(() => {});

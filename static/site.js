// 808 魔術大會網站：選單、語言選單、議程分頁、倒數、Dealer 篩選。沒有 JS 時頁面內容仍完整可讀。
const body = document.body;

// 手機選單
const menuBtn = document.querySelector('.nav__menu');
const menu = document.getElementById('menu');
if (menuBtn && menu) {
  menuBtn.addEventListener('click', () => {
    const open = menuBtn.getAttribute('aria-expanded') === 'true';
    // 選單的可捲動高度 = 螢幕高度 − 導覽列高度（在選單展開前量）
    if (!open) document.documentElement.style.setProperty('--nav-h', document.querySelector('.nav__in').getBoundingClientRect().height + 'px');
    menuBtn.setAttribute('aria-expanded', String(!open));
    menuBtn.setAttribute('aria-label', open ? body.dataset.menuOpen : body.dataset.menuClose);
    menu.hidden = open;
  });
}

// 導覽列放不下時收進選單按鈕（各語言文字長度不同，所以用量的，不寫死斷點）
const nav = document.querySelector('.nav');
const navIn = document.querySelector('.nav__in');
function fitNav() {
  if (!nav || !navIn) return;
  nav.classList.remove('nav--compact');
  if (navIn.scrollWidth > navIn.clientWidth + 1) nav.classList.add('nav--compact');
}
fitNav();
window.addEventListener('resize', fitNav);
if (document.fonts) document.fonts.ready.then(fitNav);

// 語言選單
const langBtn = document.querySelector('.lang__btn');
const langMenu = document.getElementById('langmenu');
function closeLang() {
  if (!langMenu || langMenu.hidden) return;
  langMenu.hidden = true;
  langBtn.setAttribute('aria-expanded', 'false');
}
if (langBtn && langMenu) {
  langBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const open = !langMenu.hidden;
    langMenu.hidden = open;
    langBtn.setAttribute('aria-expanded', String(!open));
  });
  document.addEventListener('click', (ev) => { if (!langMenu.contains(ev.target)) closeLang(); });
}

document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Escape') return;
  if (langMenu && !langMenu.hidden) { closeLang(); langBtn.focus(); }
  else if (menu && !menu.hidden) { menuBtn.click(); menuBtn.focus(); }
});

// 分頁籤（大會流程、嘉賓、參賽者；左右方向鍵可切換）
const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab) {
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    const panel = document.getElementById(t.getAttribute('aria-controls'));
    // 大會流程：桌機三天並排，只有手機版依天切換（用 class，不用 hidden）
    if (panel.classList.contains('sday')) panel.classList.toggle('is-on', on);
    else panel.hidden = !on;
  });
}
tabs.forEach((tab, i) => {
  tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (ev) => {
    const step = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    const next = tabs[(i + step + tabs.length) % tabs.length];
    selectTab(next);
    next.focus();
  });
});

// 倒數天數（只有在 content 填了開始日期時才會出現 data-start；文字模板來自 i18n）
const countdown = document.querySelector('.countdown[data-start]');
if (countdown) {
  const start = new Date(countdown.dataset.start + 'T00:00:00+08:00');
  const days = Math.ceil((start - Date.now()) / 86400000);
  countdown.textContent = days > 0 ? countdown.dataset.days.replace('{n}', days)
    : days === 0 ? countdown.dataset.today : countdown.dataset.past;
}

// Dealer 關鍵字篩選
const dq = document.getElementById('dealer-q');
if (dq) {
  const cards = [...document.querySelectorAll('.dcard')];
  const count = document.querySelector('.dfilter__count');
  const none = document.querySelector('.dempty');
  dq.addEventListener('input', () => {
    const q = dq.value.trim().toLowerCase();
    let n = 0;
    cards.forEach((c) => { const hit = !q || c.dataset.search.includes(q); c.hidden = !hit; n += hit; });
    count.textContent = count.dataset.unit.replace('{n}', n);
    none.hidden = n > 0;
  });
}

const pages = [...document.querySelectorAll('.page')];
const brandTitle = document.getElementById('brandTitle');
const pageTitle = document.getElementById('pageTitle');
const topLogo = document.getElementById('topLogo');
const btnBack = document.getElementById('btnBack');
const toast = document.getElementById('toast');
const sopPage = document.getElementById('pageSop');
const sopScore = document.getElementById('sopScore');
const sopBar = document.getElementById('sopBar');
let toastTimer;

function show(name) {
  const page = pages.find(p => p.dataset.page === name) || pages[0];
  const home = page === pages[0];
  pages.forEach(p => p.classList.toggle('active', p === page));
  document.querySelectorAll('[data-nav]').forEach(n => n.classList.toggle('active', n.dataset.nav === page.dataset.page));
  brandTitle.hidden = !home;
  topLogo.hidden = !home;
  pageTitle.hidden = home;
  btnBack.hidden = home;
  pageTitle.textContent = page.dataset.title;
  document.title = home ? 'Rutinin' : page.dataset.title + ' | Rutinin';
  window.scrollTo(0, 0);
}

function notify(text) {
  toast.textContent = text;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2000);
}

function tick() {
  const now = new Date();
  const date = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('today').textContent = date;
  document.getElementById('stampDate').textContent = date;
  document.getElementById('stampTime').textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function updateScore() {
  const panel = sopPage.querySelector('.tab-panel:not([hidden])');
  const total = panel.querySelectorAll('.check-row').length;
  const done = panel.querySelectorAll('.check-row.on').length;
  const pct = total ? Math.round(done / total * 100) : 0;
  sopScore.textContent = pct + '%';
  sopBar.style.width = pct + '%';
}

document.querySelectorAll('.seg').forEach(seg => {
  seg.addEventListener('click', e => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    seg.querySelectorAll('.seg-btn').forEach(b => {
      b.classList.toggle('on', b === btn);
      b.setAttribute('aria-pressed', b === btn);
      if (b.dataset.tab) document.getElementById(b.dataset.tab).hidden = b !== btn;
    });
    if (seg.closest('#pageSop')) updateScore();
  });
});

document.addEventListener('click', e => {
  const row = e.target.closest('.check-row');
  if (row) {
    row.classList.toggle('on');
    row.setAttribute('aria-pressed', row.classList.contains('on'));
    updateScore();
    return;
  }
  if (e.target.closest('[data-soon]')) notify('Fitur belum aktif');
});

btnBack.addEventListener('click', () => { location.hash = 'home'; });
window.addEventListener('hashchange', () => show(location.hash.slice(1)));

show(location.hash.slice(1));
tick();
setInterval(tick, 30000);
updateScore();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}

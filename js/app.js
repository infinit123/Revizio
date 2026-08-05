import { registerServiceWorker, STORES, FORECASTING, ANALYTICS } from './config.js';
import { dbInit, dbGetAll, dbAdd } from './db/database.js';
import { computeSafeToSpend } from './engine/analytics.js';
import { computeForecast } from './engine/forecasting.js';
import { detectHabits } from './engine/habits.js';
import { triggerHapticShort, triggerHapticSuccess, triggerHapticError } from './utils/haptics.js';
import { exportBackup } from './backup/exporter.js';
import { importBackup } from './backup/importer.js';
import { securityInit, securityRegisterActivity } from './core/security.js';

const screens = {};
let currentScreen = 'summary';
let settingsCache = null;
let transactionsCache = [];
let recurringCache = [];
let goalsCache = [];

async function init() {
  registerServiceWorker();
  await dbInit();
  await loadInitialData();
  initUIReferences();
  initNavigation();
  initTransactionSheet();
  initSettings();
  initBackup();
  securityInit(onSecurityLock, onSecurityUnlock);
  updateAllViews();
}

async function loadInitialData() {
  const [transactions, recurring, goals, settings] = await Promise.all([
    dbGetAll(STORES.TRANSACTIONS),
    dbGetAll(STORES.RECURRING),
    dbGetAll(STORES.GOALS),
    dbGetAll(STORES.SETTINGS)
  ]);

  transactionsCache = transactions || [];
  recurringCache = recurring || [];
  goalsCache = goals || [];
  settingsCache = settings && settings.length ? settings[0] : {
    currency: 'RON',
    theme: 'auto',
    monthlyBudget: 0
  };

  applyTheme(settingsCache.theme);
}

function initUIReferences() {
  document.querySelectorAll('.screen').forEach(el => {
    const key = el.getAttribute('data-screen');
    screens[key] = el;
  });
}

function initNavigation() {
  const navItems = document.querySelectorAll('.bottom-nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      if (target && target !== currentScreen) {
        securityRegisterActivity();
        switchScreen(target);
        triggerHapticShort();
      }
    });
  });
}

function switchScreen(target) {
  Object.entries(screens).forEach(([key, el]) => {
    el.hidden = key !== target;
  });
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    const itemTarget = item.getAttribute('data-target');
    item.classList.toggle('is-active', itemTarget === target);
  });
  currentScreen = target;
}

function initTransactionSheet() {
  const sheet = document.getElementById('transaction-sheet');
  const openBtn = document.getElementById('add-transaction-btn');
  const cancelBtn = document.getElementById('transaction-cancel-btn');
  const form = document.getElementById('transaction-form');

  openBtn.addEventListener('click', () => {
    securityRegisterActivity();
    sheet.open();
    triggerHapticShort();
    const dateInput = document.getElementById('transaction-date');
    if (dateInput) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      dateInput.value = `${yyyy}-${mm}-${dd}`;
    }
  });

  cancelBtn.addEventListener('click', () => {
    sheet.close();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    securityRegisterActivity();

    const type = form.elements['type'].value;
    const amount = parseFloat(form.elements['amount'].value || '0');
    const dateStr = form.elements['date'].value;
    const merchant = String(form.elements['merchant'].value || '').trim();
    const category = String(form.elements['category'].value || '').trim();
    const isRecurring = form.elements['isRecurring'].checked;

    if (!dateStr || !merchant || Number.isNaN(amount) || amount <= 0) {
      triggerHapticError();
      return;
    }

    const date = new Date(dateStr);
    const transaction = {
      id: crypto.randomUUID(),
      type,
      amount,
      date: date.toISOString(),
      merchant,
      category,
      isRecurring,
      createdAt: new Date().toISOString()
    };

    try {
      await dbAdd(STORES.TRANSACTIONS, transaction);
      transactionsCache.push(transaction);

      if (isRecurring) {
        const habitResult = detectHabits(transactionsCache);
        recurringCache = habitResult.recurring;
      }

      updateAllViews();
      sheet.close();
      form.reset();
      triggerHapticSuccess();
    } catch {
      triggerHapticError();
    }
  });
}

function initSettings() {
  const currencyEl = document.getElementById('settings-currency');
  const themeEl = document.getElementById('settings-theme');
  const budgetEl = document.getElementById('settings-monthly-budget');
  const saveBtn = document.getElementById('settings-save-btn');

  currencyEl.value = settingsCache.currency;
  themeEl.value = settingsCache.theme;
  budgetEl.value = settingsCache.monthlyBudget || '';

  saveBtn.addEventListener('click', async () => {
    securityRegisterActivity();
    const newSettings = {
      id: settingsCache.id || 'singleton',
      currency: currencyEl.value || 'RON',
      theme: themeEl.value || 'auto',
      monthlyBudget: parseFloat(budgetEl.value || '0')
    };

    try {
      await dbAdd(STORES.SETTINGS, newSettings);
      settingsCache = newSettings;
      applyTheme(settingsCache.theme);
      updateAllViews();
      triggerHapticSuccess();
    } catch {
      triggerHapticError();
    }
  });
}

function initBackup() {
  const exportBtn = document.getElementById('backup-export-btn');
  const importBtn = document.getElementById('backup-import-btn');
  const importInput = document.getElementById('backup-import-input');

  exportBtn.addEventListener('click', async () => {
    securityRegisterActivity();
    try {
      const backupBlob = await exportBackup();
      await shareOrDownloadBackup(backupBlob);
      triggerHapticSuccess();
    } catch {
      triggerHapticError();
    }
  });

  importBtn.addEventListener('click', () => {
    securityRegisterActivity();
    importInput.click();
  });

  importInput.addEventListener('change', async () => {
    securityRegisterActivity();
    const file = importInput.files && importInput.files[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      await importBackup(text);
      await loadInitialData();
      updateAllViews();
      triggerHapticSuccess();
    } catch {
      triggerHapticError();
    } finally {
      importInput.value = '';
    }
  });
}

async function shareOrDownloadBackup(blob) {
  const filename = `${BACKUP.EXPORT_FILENAME_PREFIX}-${new Date()
    .toISOString()
    .replace(/[:.]/g, '-')}.json`;

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'application/json' })] })) {
    const file = new File([blob], filename, { type: 'application/json' });
    await navigator.share({
      title: 'Finora Backup',
      text: 'Backup date Finora',
      files: [file]
    });
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'auto') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

function updateAllViews() {
  updateSummaryView();
  updateForecastView();
  updateTransactionsView();
}

function updateSummaryView() {
  const today = new Date();
  const safe = computeSafeToSpend({
    today,
    transactions: transactionsCache,
    recurring: recurringCache,
    goals: goalsCache,
    monthlyBudget: settingsCache.monthlyBudget || 0
  });

  const currency = settingsCache.currency || 'RON';

  setMetricValue('sts-today', safe.today, currency);
  setMetricValue('sts-daily', safe.dailyBudget, currency);
  setMetricValue('sts-remaining', safe.remainingMonth, currency);

  const goalsList = document.getElementById('goals-list');
  if (!goalsCache.length) {
    goalsList.textContent = 'Nu există încă obiective. Adaugă unul din Settings.';
  } else {
    goalsList.textContent = '';
    const ul = document.createElement('ul');
    ul.style.listStyle = 'none';
    ul.style.margin = '0';
    ul.style.padding = '0';
    goalsCache.forEach(goal => {
      const li = document.createElement('li');
      li.style.padding = '6px 0';
      li.style.borderBottom = '1px solid var(--color-border-subtle)';
      const name = document.createElement('div');
      name.textContent = goal.name;
      const meta = document.createElement('div');
      meta.style.fontSize = '0.8rem';
      meta.style.color = 'var(--color-text-muted)';
      meta.textContent = `Alocat: ${goal.allocated.toFixed(2)} ${currency}`;
      li.appendChild(name);
      li.appendChild(meta);
      ul.appendChild(li);
    });
    goalsList.appendChild(ul);
  }
}

function updateForecastView() {
  const forecast = computeForecast({
    transactions: transactionsCache,
    alpha: FORECASTING.EWMA_ALPHA,
    minPoints: FORECASTING.MIN_POINTS
  });

  const currency = settingsCache.currency || 'RON';

  setMetricValue('forecast-daily', forecast.dailyRate, currency);
  setMetricValue('forecast-month', forecast.monthTotal, currency);
  setMetricValue('forecast-confidence', forecast.confidence * 100, '%');

  const details = document.getElementById('forecast-details');
  if (!forecast.points || !forecast.points.length) {
    details.textContent = 'Se calculează după ce adaugi câteva tranzacții.';
  } else {
    details.textContent = '';
    const p = document.createElement('p');
    p.style.fontSize = '0.9rem';
    p.style.color = 'var(--color-text-secondary)';
    p.textContent = `Prognoza se bazează pe ${forecast.points.length} zile cu tranzacții.`;
    details.appendChild(p);
  }
}

function updateTransactionsView() {
  const list = document.getElementById('transactions-list');
  list.textContent = '';
  const currency = settingsCache.currency || 'RON';

  const sorted = [...transactionsCache].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (!sorted.length) {
    const li = document.createElement('li');
    li.className = 'transaction-item';
    const span = document.createElement('span');
    span.textContent = 'Nu există tranzacții încă.';
    span.style.color = 'var(--color-text-muted)';
    li.appendChild(span);
    list.appendChild(li);
    return;
  }

  sorted.slice(0, 50).forEach(tx => {
    const li = document.createElement('li');
    li.className = 'transaction-item';

    const main = document.createElement('div');
    main.className = 'transaction-main';

    const merchantEl = document.createElement('div');
    merchantEl.className = 'transaction-merchant';
    merchantEl.textContent = tx.merchant;

    const metaEl = document.createElement('div');
    metaEl.className = 'transaction-meta';
    const date = new Date(tx.date);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    metaEl.textContent = `${dd}.${mm}.${yyyy}${tx.category ? ' · ' + tx.category : ''}${tx.isRecurring ? ' · Recurring' : ''}`;

    main.appendChild(merchantEl);
    main.appendChild(metaEl);

    const amountEl = document.createElement('div');
    amountEl.className = 'transaction-amount ' + tx.type;
    const sign = tx.type === 'expense' ? '-' : '+';
    amountEl.textContent = `${sign}${tx.amount.toFixed(2)} ${currency}`;

    li.appendChild(main);
    li.appendChild(amountEl);
    list.appendChild(li);
  });
}

function setMetricValue(key, value, unit) {
  const metric = document.querySelector(`fn-metric[data-key="${key}"]`);
  if (!metric) return;
  metric.setAttribute('value', Number.isFinite(value) ? value.toFixed(2) : '0.00');
  metric.setAttribute('unit', unit);
}

function onSecurityLock() {
  const lock = document.getElementById('security-lock');
  lock.hidden = false;
}

function onSecurityUnlock() {
  const lock = document.getElementById('security-lock');
  lock.hidden = true;
  securityRegisterActivity();
}

window.addEventListener('load', () => {
  init().catch(() => {
    // if init fails, app will not function, but we avoid crashing UI
  });
});


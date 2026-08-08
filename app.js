// 1. Înregistrare Service Worker PWA & Verificare Actualizări
let newWorker;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateModal();
          }
        });
      });
    }).catch(() => {});

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

function showUpdateModal() {
  const modal = document.getElementById('update-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

// Helpers pentru operare pe date fără erori de Timezone UTC
function getTodayISOString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateFormatted(isoDateString) {
  if (!isoDateString) return '';
  const [year, month, day] = isoDateString.split('-');
  if (!year || !month || !day) return isoDateString;
  
  const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
  return dateObj.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

// Global Numeric Motion Engine (Interpolare Smooth pentru Suma Afișată)
const numericAnimState = new WeakMap();

function animateNumber(element, targetValue, isCurrency = true) {
  if (!element) return;
  
  const startValue = numericAnimState.has(element) 
    ? numericAnimState.get(element) 
    : 0;

  numericAnimState.set(element, targetValue);

  if (Math.abs(startValue - targetValue) < 0.01) {
    element.innerText = isCurrency ? formatCurrency(targetValue) : targetValue.toFixed(2);
    return;
  }

  const duration = 400; // ms
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Cubic decelerate easing
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentValue = startValue + (targetValue - startValue) * easeProgress;

    element.innerText = isCurrency ? formatCurrency(currentValue) : currentValue.toFixed(2);

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.innerText = isCurrency ? formatCurrency(targetValue) : targetValue.toFixed(2);
    }
  }

  requestAnimationFrame(update);
}

// 2. Stare Aplicație & Date
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let savingsGoal = JSON.parse(localStorage.getItem('savingsGoal')) || { title: 'Vacanță', target: 2000, current: 0 };
let currentTheme = localStorage.getItem('appTheme') || 'auto';

// Stare Navigare Lunarã
const nowInitial = new Date();
let selectedYear = nowInitial.getFullYear();
let selectedMonth = nowInitial.getMonth();
let selectedDayISO = getTodayISOString();

document.addEventListener('DOMContentLoaded', () => {
  const btnUpdateApp = document.getElementById('btn-update-app');
  if (btnUpdateApp) {
    btnUpdateApp.addEventListener('click', () => {
      if (newWorker) {
        newWorker.postMessage({ action: 'skipWaiting' });
      } else {
        window.location.reload();
      }
    });
  }

  // --- LOGICĂ SCHIMBARE TEMĂ ---
  const themeBtns = document.querySelectorAll('.theme-btn');
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function applyTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('appTheme', theme);

    themeBtns.forEach(btn => {
      if (btn.getAttribute('data-theme-val') === theme) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (theme === 'auto') {
      const systemIsDark = mediaQuery.matches;
      document.documentElement.setAttribute('data-theme', systemIsDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  mediaQuery.addEventListener('change', (e) => {
    if (currentTheme === 'auto') {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    }
  });

  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      applyTheme(btn.getAttribute('data-theme-val'));
    });
  });

  applyTheme(currentTheme);

  // --- LOGICĂ OBIECTIV ECONOMISIRE ---
  const goalTitleText = document.getElementById('goal-title-text');
  const goalProgressText = document.getElementById('goal-progress-text');
  const goalProgressFill = document.getElementById('goal-progress-fill');
  const btnEditGoal = document.getElementById('btn-edit-goal');
  const goalDisplay = document.getElementById('goal-display');
  const goalForm = document.getElementById('goal-form');
  const goalNameInput = document.getElementById('goal-name-input');
  const goalTargetInput = document.getElementById('goal-target-input');
  const btnCancelGoal = document.getElementById('btn-cancel-goal');
  const btnAddToGoal = document.getElementById('btn-add-to-goal');
  const btnSubFromGoal = document.getElementById('btn-sub-from-goal');
  const goalAddAmount = document.getElementById('goal-add-amount');

  function updateGoalUI() {
    if (!goalTitleText) return;
    goalTitleText.innerText = savingsGoal.title;
    if (goalProgressText) {
      goalProgressText.innerText = `${formatCurrency(savingsGoal.current)} / ${formatCurrency(savingsGoal.target)}`;
    }
    
    let percentage = (savingsGoal.current / savingsGoal.target) * 100;
    if (percentage > 100) percentage = 100;
    if (percentage < 0) percentage = 0;
    if (goalProgressFill) {
      goalProgressFill.style.width = `${percentage}%`;
    }

    localStorage.setItem('savingsGoal', JSON.stringify(savingsGoal));
  }

  if (btnEditGoal) {
    btnEditGoal.addEventListener('click', () => {
      goalNameInput.value = savingsGoal.title;
      goalTargetInput.value = savingsGoal.target;
      goalDisplay.style.display = 'none';
      goalForm.style.display = 'block';
    });
  }

  if (btnCancelGoal) {
    btnCancelGoal.addEventListener('click', () => {
      goalForm.style.display = 'none';
      goalDisplay.style.display = 'block';
    });
  }

  if (goalForm) {
    goalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      savingsGoal.title = goalNameInput.value.trim() || 'Obiectiv';
      savingsGoal.target = parseFloat(goalTargetInput.value) || 100;
      updateGoalUI();
      goalForm.style.display = 'none';
      goalDisplay.style.display = 'block';
    });
  }

  if (btnAddToGoal) {
    btnAddToGoal.addEventListener('click', () => {
      const val = parseFloat(goalAddAmount.value);
      if (!isNaN(val) && val > 0) {
        savingsGoal.current += val;
        goalAddAmount.value = '';
        updateGoalUI();
      }
    });
  }

  if (btnSubFromGoal) {
    btnSubFromGoal.addEventListener('click', () => {
      const val = parseFloat(goalAddAmount.value);
      if (!isNaN(val) && val > 0) {
        savingsGoal.current = Math.max(0, savingsGoal.current - val);
        goalAddAmount.value = '';
        updateGoalUI();
      }
    });
  }

  updateGoalUI();

  // Elemente DOM Dashboard
  const balanceEl = document.getElementById('balance');
  const balanceCardEl = document.getElementById('balance-card');
  const balanceStatusEl = document.getElementById('balance-status');
  const totalIncomeEl = document.getElementById('total-income');
  const totalExpensesEl = document.getElementById('total-expenses');
  const categoryBreakdownEl = document.getElementById('category-breakdown');

  const form = document.getElementById('transaction-form');
  const txTypeInput = document.getElementById('tx-type');
  const txDescInput = document.getElementById('tx-description');
  const txAmountInput = document.getElementById('tx-amount');
  const txCategoryInput = document.getElementById('tx-category');
  const txDateInput = document.getElementById('tx-date');

  const transactionListEl = document.getElementById('transaction-list');
  const filterCategoryEl = document.getElementById('filter-category');
  const btnReset = document.getElementById('btn-reset');
  const currentDateEl = document.getElementById('current-date');

  // Elemente Calendar
  const calMonthIncomeEl = document.getElementById('cal-month-income');
  const calMonthExpensesEl = document.getElementById('cal-month-expenses');
  const calendarDaysGridEl = document.getElementById('calendar-days-grid');
  const selectedDayTitleEl = document.getElementById('selected-day-title');
  const btnAddTxForDay = document.getElementById('btn-add-tx-for-day');
  const dayTotalIncomeEl = document.getElementById('day-total-income');
  const dayTotalExpensesEl = document.getElementById('day-total-expenses');
  const dayTotalNetEl = document.getElementById('day-total-net');
  const dayTransactionsListEl = document.getElementById('day-transactions-list');

  if (currentDateEl) {
    const now = new Date();
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    currentDateEl.innerText = now.toLocaleDateString('ro-RO', options).toUpperCase();
  }

  if (txDateInput) {
    txDateInput.value = getTodayISOString();
  }

  // --- LOGICĂ NAVIGARE LUNARĂ UNIFICATĂ ---
  function updateMonthDisplay() {
    const dateObj = new Date(selectedYear, selectedMonth, 1);
    const monthName = dateObj.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
    const formattedStr = (monthName.charAt(0).toUpperCase() + monthName.slice(1)).toUpperCase();
    
    document.querySelectorAll('.current-month-display-text').forEach(el => {
      el.innerText = formattedStr;
    });
  }

  document.querySelectorAll('.btn-prev-month-action').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedMonth--;
      if (selectedMonth < 0) {
        selectedMonth = 11;
        selectedYear--;
      }
      updateMonthDisplay();
      updateUI();
    });
  });

  document.querySelectorAll('.btn-next-month-action').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedMonth++;
      if (selectedMonth > 11) {
        selectedMonth = 0;
        selectedYear++;
      }
      updateMonthDisplay();
      updateUI();
    });
  });

  function getMonthlyTransactions() {
    return transactions.filter(t => {
      if (!t.date) return false;
      const [y, m] = t.date.split('-').map(Number);
      return y === selectedYear && (m - 1) === selectedMonth;
    });
  }

  // --- NAVIGARE TAB-URI ---
  const navButtons = document.querySelectorAll('.nav-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  navButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.getAttribute('data-target');

      navButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.classList.add('active');
      }

      if (targetId === 'sec-add' && txDateInput && !txDateInput.value) {
        txDateInput.value = selectedDayISO || getTodayISOString();
      }
    });
  });

  // --- COMUTATOR TIP TRANZACȚIE ---
  const pickExpenseBtn = document.getElementById('pick-expense');
  const pickIncomeBtn = document.getElementById('pick-income');

  if (pickExpenseBtn && pickIncomeBtn) {
    pickExpenseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      txTypeInput.value = 'expense';
      pickExpenseBtn.classList.add('active');
      pickIncomeBtn.classList.remove('active');
      txCategoryInput.value = 'Mâncare & Cumpărături';
    });

    pickIncomeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      txTypeInput.value = 'income';
      pickIncomeBtn.classList.add('active');
      pickExpenseBtn.classList.remove('active');
      txCategoryInput.value = 'Venituri & Salariu';
    });
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' })
      .format(amount)
      .replace('RON', 'LEI');
  }

  // --- ACTUALIZARE UI PRINCIPALĂ CU ANIMAȚII NUMERICE ---
  function updateUI() {
    const monthlyData = getMonthlyTransactions();

    const income = monthlyData
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);

    const expenses = monthlyData
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);

    const balance = income - expenses;

    // Animație lină pe numere
    animateNumber(balanceEl, balance);
    animateNumber(totalIncomeEl, income);
    animateNumber(totalExpensesEl, expenses);

    animateNumber(calMonthIncomeEl, income);
    animateNumber(calMonthExpensesEl, expenses);

    if (balanceCardEl && balanceStatusEl) {
      if (balance < 0) {
        balanceCardEl.classList.add('negative');
        balanceStatusEl.innerText = 'Buget depășit în această lună';
      } else {
        balanceCardEl.classList.remove('negative');
        balanceStatusEl.innerText = 'Buget stabil';
      }
    }

    updateCategoryBreakdown(monthlyData);
    renderTransactionList();
    renderCalendar();
    renderDayDetails();
  }

  function updateCategoryBreakdown(monthlyData) {
    if (!categoryBreakdownEl) return;
    const expenses = monthlyData.filter(t => t.type === 'expense');
    
    if (expenses.length === 0) {
      categoryBreakdownEl.innerHTML = '<p class="empty-text">Nicio cheltuială înregistrată în această lună.</p>';
      return;
    }

    const categoryTotals = {};
    expenses.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    categoryBreakdownEl.innerHTML = '';
    Object.keys(categoryTotals).forEach(cat => {
      const row = document.createElement('div');
      row.className = 'category-row';
      row.innerHTML = `
        <span class="cat-name">${cat}</span>
        <span class="cat-val numeric-accent">${formatCurrency(categoryTotals[cat])}</span>
      `;
      categoryBreakdownEl.appendChild(row);
    });
  }

  function renderTransactionList() {
    if (!transactionListEl) return;
    const selectedFilter = filterCategoryEl ? filterCategoryEl.value : 'all';
    
    const filteredTransactions = transactions.filter(t => {
      if (selectedFilter === 'all') return true;
      return t.category === selectedFilter;
    });

    transactionListEl.innerHTML = '';

    if (filteredTransactions.length === 0) {
      transactionListEl.innerHTML = '<li class="empty-text">Nicio tranzacție de afișat.</li>';
      return;
    }

    filteredTransactions.forEach(t => {
      const li = createTransactionListItem(t);
      transactionListEl.appendChild(li);
    });

    attachDeleteEvents();
  }

  // --- RENDER CALENDAR ---
  function renderCalendar() {
    if (!calendarDaysGridEl) return;
    calendarDaysGridEl.innerHTML = '';

    const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
    const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;

    const daysInMonth = lastDayOfMonth.getDate();
    const prevMonthLastDay = new Date(selectedYear, selectedMonth, 0).getDate();

    const todayISO = getTodayISOString();

    // 1. Zile din luna anterioară
    for (let i = startDayOfWeek; i > 0; i--) {
      const dayNum = prevMonthLastDay - i + 1;
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cal-day-cell other-month';
      cell.innerText = dayNum;
      calendarDaysGridEl.appendChild(cell);
    }

    // 2. Zilele lunii curente
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const monthStr = String(selectedMonth + 1).padStart(2, '0');
      const currentCellISO = `${selectedYear}-${monthStr}-${dayStr}`;

      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cal-day-cell';
      cell.innerText = d;

      if (currentCellISO === todayISO) {
        cell.classList.add('today');
      }

      if (currentCellISO === selectedDayISO) {
        cell.classList.add('selected');
      }

      const dayTxs = transactions.filter(t => t.date === currentCellISO);
      const hasIncome = dayTxs.some(t => t.type === 'income');
      const hasExpense = dayTxs.some(t => t.type === 'expense');

      if (hasIncome || hasExpense) {
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'cal-dots-container';

        if (hasIncome) {
          const dot = document.createElement('span');
          dot.className = 'cal-dot income';
          dotsContainer.appendChild(dot);
        }

        if (hasExpense) {
          const dot = document.createElement('span');
          dot.className = 'cal-dot expense';
          dotsContainer.appendChild(dot);
        }

        cell.appendChild(dotsContainer);
      }

      cell.addEventListener('click', () => {
        selectedDayISO = currentCellISO;
        renderCalendar();
        renderDayDetails();
      });

      calendarDaysGridEl.appendChild(cell);
    }

    // 3. Zile din luna următoare
    const totalCells = startDayOfWeek + daysInMonth;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let j = 1; j <= remainingCells; j++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cal-day-cell other-month';
      cell.innerText = j;
      calendarDaysGridEl.appendChild(cell);
    }
  }

  // --- RENDER DETALII ZI SELECTATĂ ---
  function renderDayDetails() {
    if (!selectedDayTitleEl || !dayTransactionsListEl) return;

    selectedDayTitleEl.innerText = formatDateFormatted(selectedDayISO).toUpperCase();

    const dayTxs = transactions.filter(t => t.date === selectedDayISO);

    const income = dayTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expenses = dayTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const net = income - expenses;

    animateNumber(dayTotalIncomeEl, income);
    animateNumber(dayTotalExpensesEl, expenses);
    animateNumber(dayTotalNetEl, net);

    if (dayTotalNetEl) {
      dayTotalNetEl.className = 'day-sum-val numeric-accent ' + (net >= 0 ? 'color-income' : 'color-expense');
    }

    dayTransactionsListEl.innerHTML = '';

    if (dayTxs.length === 0) {
      dayTransactionsListEl.innerHTML = '<li class="empty-text">Nicio activitate financiară în această zi.</li>';
      return;
    }

    dayTxs.forEach(t => {
      const li = createTransactionListItem(t);
      dayTransactionsListEl.appendChild(li);
    });

    attachDeleteEvents();
  }

  function createTransactionListItem(t) {
    const li = document.createElement('li');
    li.className = 'ios-list-item';

    const isIncome = t.type === 'income';
    const amountClass = isIncome ? 'color-income' : 'color-expense';
    const sign = isIncome ? '+' : '-';
    const displayDate = t.date ? formatDateFormatted(t.date) : 'Dată necunoscută';

    li.innerHTML = `
      <div class="item-left">
        <span class="item-title">${t.description}</span>
        <span class="item-category">${t.category}</span>
        <span class="item-date">${displayDate}</span>
      </div>
      <div class="item-right">
        <span class="item-amount numeric-accent ${amountClass}">${sign}${formatCurrency(t.amount)}</span>
        <button class="btn-delete-item" data-id="${t.id}" title="Șterge">&times;</button>
      </div>
    `;

    return li;
  }

  function attachDeleteEvents() {
    document.querySelectorAll('.btn-delete-item').forEach(btn => {
      btn.onclick = (e) => {
        const id = Number(e.currentTarget.getAttribute('data-id'));
        transactions = transactions.filter(t => t.id !== id);
        saveData();
        updateUI();
      };
    });
  }

  // --- ACTION: ADĂUGARE TRANZACȚIE PENTRU ZIUA SELECTATĂ ---
  if (btnAddTxForDay) {
    btnAddTxForDay.addEventListener('click', () => {
      if (txDateInput) txDateInput.value = selectedDayISO;
      const addTab = document.querySelector('[data-target="sec-add"]');
      if (addTab) addTab.click();
    });
  }

  // --- STOCARE & SUBMIT ---
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const description = txDescInput.value.trim();
      const amount = parseFloat(txAmountInput.value);
      const type = txTypeInput.value;
      const category = txCategoryInput.value;
      const date = txDateInput ? txDateInput.value : getTodayISOString();

      if (!description || isNaN(amount) || amount <= 0 || !date) return;

      const newTransaction = {
        id: Date.now(),
        description,
        amount,
        type,
        category,
        date
      };

      transactions.unshift(newTransaction);
      saveData();

      const [y, m] = date.split('-').map(Number);
      selectedYear = y;
      selectedMonth = m - 1;
      selectedDayISO = date;

      updateMonthDisplay();
      updateUI();

      txDescInput.value = '';
      txAmountInput.value = '';
      if (txDateInput) txDateInput.value = selectedDayISO;

      const calTab = document.querySelector('[data-target="sec-calendar"]');
      if (calTab) calTab.click();
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Resetezi toate datele înregistrate?')) {
        transactions = [];
        saveData();
        updateUI();
      }
    });
  }

  if (filterCategoryEl) {
    filterCategoryEl.addEventListener('change', renderTransactionList);
  }

  function saveData() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }

  updateMonthDisplay();
  updateUI();
});

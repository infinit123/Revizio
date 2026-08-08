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

// Helper pentru obținerea datei curente în format ISO YYYY-MM-DD
function getTodayISOString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper pentru formatare localizată a datei (ex: "08 august 2026")
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

// 2. Stare Aplicație & Date
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let savingsGoal = JSON.parse(localStorage.getItem('savingsGoal')) || { title: 'Vacanță', target: 2000, current: 0 };
let currentTheme = localStorage.getItem('appTheme') || 'auto';

// Stare Navigare Lunarã (An și Lună selectate implicit = luna curentă)
const nowInitial = new Date();
let selectedYear = nowInitial.getFullYear();
let selectedMonth = nowInitial.getMonth(); // 0 = Ianuarie, 11 = Decembrie

// 3. Execuție după încărcarea completă a structurii DOM
document.addEventListener('DOMContentLoaded', () => {
  // Event listener buton actualizare din Pop-Up
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

  // --- LOGICĂ SCHIMBARE TEMĂ (DARK / LIGHT / SYSTEM) ---
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
      const selectedTheme = btn.getAttribute('data-theme-val');
      applyTheme(selectedTheme);
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
    goalProgressText.innerText = `${formatCurrency(savingsGoal.current)} / ${formatCurrency(savingsGoal.target)}`;
    
    let percentage = (savingsGoal.current / savingsGoal.target) * 100;
    if (percentage > 100) percentage = 100;
    if (percentage < 0) percentage = 0;
    goalProgressFill.style.width = `${percentage}%`;

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

  // Elemente DOM Dashboard & Formular
  const balanceEl = document.getElementById('balance');
  const balanceCardEl = document.getElementById('balance-card');
  const balanceStatusEl = document.getElementById('balance-status');
  const totalIncomeEl = document.getElementById('total-income');
  const totalExpensesEl = document.getElementById('total-expenses');
  const categoryBreakdownEl = document.getElementById('category-breakdown');

  const btnPrevMonth = document.getElementById('btn-prev-month');
  const btnNextMonth = document.getElementById('btn-next-month');
  const currentMonthDisplay = document.getElementById('current-month-display');

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

  if (currentDateEl) {
    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'short' };
    currentDateEl.innerText = now.toLocaleDateString('ro-RO', options);
  }

  if (txDateInput) {
    txDateInput.value = getTodayISOString();
  }

  // --- LOGICĂ NAVIGARE LUNARĂ ---
  function updateMonthDisplay() {
    if (!currentMonthDisplay) return;
    const dateObj = new Date(selectedYear, selectedMonth, 1);
    const monthName = dateObj.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
    currentMonthDisplay.innerText = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  }

  if (btnPrevMonth) {
    btnPrevMonth.addEventListener('click', () => {
      selectedMonth--;
      if (selectedMonth < 0) {
        selectedMonth = 11;
        selectedYear--;
      }
      updateMonthDisplay();
      updateUI();
    });
  }

  if (btnNextMonth) {
    btnNextMonth.addEventListener('click', () => {
      selectedMonth++;
      if (selectedMonth > 11) {
        selectedMonth = 0;
        selectedYear++;
      }
      updateMonthDisplay();
      updateUI();
    });
  }

  // Helper filtrare tranzacții pentru luna curentă selectată
  function getMonthlyTransactions() {
    return transactions.filter(t => {
      if (!t.date) return false;
      const [y, m] = t.date.split('-').map(Number);
      return y === selectedYear && (m - 1) === selectedMonth;
    });
  }

  // 4. Navigare Tab-uri
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
        txDateInput.value = getTodayISOString();
      }
    });
  });

  // 5. Comutator Tip Tranzacție
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

  // 6. Actualizare Interfață Dashboard & Istoric
  function updateUI() {
    const monthlyData = getMonthlyTransactions();

    const income = monthlyData
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);

    const expenses = monthlyData
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);

    const balance = income - expenses;

    if (balanceEl) balanceEl.innerText = formatCurrency(balance);
    if (totalIncomeEl) totalIncomeEl.innerText = formatCurrency(income);
    if (totalExpensesEl) totalExpensesEl.innerText = formatCurrency(expenses);

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
        <span class="cat-val">${formatCurrency(categoryTotals[cat])}</span>
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
          <span class="item-amount ${amountClass}">${sign}${formatCurrency(t.amount)}</span>
          <button class="btn-delete-item" data-id="${t.id}" title="Șterge">&times;</button>
        </div>
      `;

      transactionListEl.appendChild(li);
    });

    document.querySelectorAll('.btn-delete-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = Number(e.target.getAttribute('data-id'));
        transactions = transactions.filter(t => t.id !== id);
        saveData();
        updateUI();
      });
    });
  }

  // 7. Adăugare Tranzacție
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

      // Setează automat luna vizualizată la luna în care s-a adăugat tranzacția
      const [y, m] = date.split('-').map(Number);
      selectedYear = y;
      selectedMonth = m - 1;

      updateMonthDisplay();
      updateUI();

      txDescInput.value = '';
      txAmountInput.value = '';
      if (txDateInput) txDateInput.value = getTodayISOString();

      const defaultTab = document.querySelector('[data-target="sec-dashboard"]');
      if (defaultTab) defaultTab.click();
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Ștergi toate datele?')) {
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
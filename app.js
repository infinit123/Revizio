// 1. Înregistrare Service Worker pentru PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

// 2. Stare Aplicație & Date
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

// Elemente DOM
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

const transactionListEl = document.getElementById('transaction-list');
const filterCategoryEl = document.getElementById('filter-category');
const btnReset = document.getElementById('btn-reset');
const currentDateEl = document.getElementById('current-date');

// 3. Inițializare Dată Curentă (Format iOS)
function initDate() {
  const now = new Date();
  const options = { weekday: 'long', day: 'numeric', month: 'short' };
  currentDateEl.innerText = now.toLocaleDateString('ro-RO', options);
}

// 4. Navigare Tab-uri (Segmented Control)
const navButtons = document.querySelectorAll('.seg-btn');
const tabContents = document.querySelectorAll('.tab-content');

navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-target');

    navButtons.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById(target).classList.add('active');
  });
});

// 5. Comutator Tip Tranzacție (Cheltuială / Venit)
const pickExpenseBtn = document.getElementById('pick-expense');
const pickIncomeBtn = document.getElementById('pick-income');

pickExpenseBtn.addEventListener('click', () => {
  txTypeInput.value = 'expense';
  pickExpenseBtn.classList.add('active');
  pickIncomeBtn.classList.remove('active');
  txCategoryInput.value = 'Mâncare & Cumpărături';
});

pickIncomeBtn.addEventListener('click', () => {
  txTypeInput.value = 'income';
  pickIncomeBtn.classList.add('active');
  pickExpenseBtn.classList.remove('active');
  txCategoryInput.value = 'Venituri & Salariu';
});

// 6. Formatare Valute (LEI)
function formatCurrency(amount) {
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' })
    .format(amount)
    .replace('RON', 'LEI');
}

// 7. Calculat și Actualizat Interfață (UI)
function updateUI() {
  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const expenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = income - expenses;

  // Actualizare Carduri Sumar
  balanceEl.innerText = formatCurrency(balance);
  totalIncomeEl.innerText = formatCurrency(income);
  totalExpensesEl.innerText = formatCurrency(expenses);

  // Alertă Vizuală Balanță Negativă
  if (balance < 0) {
    balanceCardEl.classList.add('negative');
    balanceStatusEl.innerText = 'Buget depășit (Atentie)';
  } else {
    balanceCardEl.classList.remove('negative');
    balanceStatusEl.innerText = 'Buget stabil';
  }

  updateCategoryBreakdown();
  renderTransactionList();
}

// 8. Generare Breakdown pe Categorii
function updateCategoryBreakdown() {
  const expenses = transactions.filter(t => t.type === 'expense');
  
  if (expenses.length === 0) {
    categoryBreakdownEl.innerHTML = '<p class="empty-text">Nicio cheltuială înregistrată.</p>';
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

// 9. Randare Listă Tranzacții (+ Filtrare)
function renderTransactionList() {
  const selectedFilter = filterCategoryEl.value;
  
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

    li.innerHTML = `
      <div class="item-left">
        <span class="item-title">${t.description}</span>
        <span class="item-category">${t.category}</span>
      </div>
      <div class="item-right">
        <span class="item-amount ${amountClass}">${sign}${formatCurrency(t.amount)}</span>
        <button class="btn-delete-item" onclick="removeTransaction(${t.id})" title="Șterge">&times;</button>
      </div>
    `;

    transactionListEl.appendChild(li);
  });
}

// 10. Adăugare Tranzacție
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const description = txDescInput.value.trim();
  const amount = parseFloat(txAmountInput.value);
  const type = txTypeInput.value;
  const category = txCategoryInput.value;

  if (!description || isNaN(amount) || amount <= 0) return;

  const newTransaction = {
    id: Date.now(),
    description,
    amount,
    type,
    category
  };

  transactions.unshift(newTransaction);
  saveData();
  updateUI();

  // Resetare câmpuri formular
  txDescInput.value = '';
  txAmountInput.value = '';

  // Comutare automată pe tab-ul "General" pentru a vedea rezultatul
  document.querySelector('[data-target="sec-dashboard"]').click();
});

// 11. Ștergere o Tranzacție
window.removeTransaction = function(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveData();
  updateUI();
};

// 12. Resetare Toate Datele
btnReset.addEventListener('click', () => {
  if (confirm('Ești sigur că vrei să ștergi toate datele înregistrate?')) {
    transactions = [];
    saveData();
    updateUI();
  }
});

// 13. Filtru Schimbat
filterCategoryEl.addEventListener('change', renderTransactionList);

// Salvare în LocalStorage
function saveData() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Lansare
initDate();
updateUI();
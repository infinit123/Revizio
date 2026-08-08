// Service Worker PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

// Elemente DOM
const form = document.getElementById('transaction-form');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const typeInput = document.getElementById('type');
const categoryInput = document.getElementById('category');

const totalIncomeEl = document.getElementById('total-income');
const totalExpensesEl = document.getElementById('total-expenses');
const balanceEl = document.getElementById('balance');
const transactionListEl = document.getElementById('transaction-list');

// Preluare date
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

// Comutator Segmented Control (Venit / Cheltuială)
window.setType = function(selectedType) {
  typeInput.value = selectedType;
  
  const btnExpense = document.getElementById('btn-expense');
  const btnIncome = document.getElementById('btn-income');

  if (selectedType === 'expense') {
    btnExpense.classList.add('active');
    btnIncome.classList.remove('active');
    categoryInput.value = 'Variabile';
  } else {
    btnIncome.classList.add('active');
    btnExpense.classList.remove('active');
    categoryInput.value = 'Venit';
  }
};

// Formatare Monedă
function formatCurrency(amount) {
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' })
    .format(amount)
    .replace('RON', 'LEI');
}

// Actualizare Interfață
function updateUI() {
  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const expenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = income - expenses;

  totalIncomeEl.innerText = formatCurrency(income);
  totalExpensesEl.innerText = formatCurrency(expenses);
  balanceEl.innerText = formatCurrency(balance);

  transactionListEl.innerHTML = '';

  if (transactions.length === 0) {
    transactionListEl.innerHTML = '<li class="empty-state">Nicio tranzacție adăugată.</li>';
    return;
  }

  transactions.forEach((t) => {
    const li = document.createElement('li');
    li.className = 'transaction-item';

    const isIncome = t.type === 'income';
    const amountClass = isIncome ? 'color-income' : 'color-expense';
    const sign = isIncome ? '+' : '-';

    li.innerHTML = `
      <div class="tx-info">
        <span class="tx-title">${t.description}</span>
        <span class="tx-category">${t.category}</span>
      </div>
      <div class="tx-right">
        <span class="tx-amount ${amountClass}">${sign}${formatCurrency(t.amount)}</span>
        <button class="btn-delete" onclick="removeTransaction(${t.id})">&times;</button>
      </div>
    `;

    transactionListEl.appendChild(li);
  });
}

// Adăugare Tranzacție
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const description = descriptionInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const type = typeInput.value;
  const category = categoryInput.value;

  if (!description || isNaN(amount) || amount <= 0) return;

  const transaction = {
    id: Date.now(),
    description,
    amount,
    type,
    category
  };

  transactions.unshift(transaction);
  localStorage.setItem('transactions', JSON.stringify(transactions));
  
  updateUI();

  // Resetare câmpuri
  descriptionInput.value = '';
  amountInput.value = '';
});

// Ștergere Tranzacție
window.removeTransaction = function(id) {
  transactions = transactions.filter(t => t.id !== id);
  localStorage.setItem('transactions', JSON.stringify(transactions));
  updateUI();
};

// Inițializare
updateUI();

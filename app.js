// 1. Inregistrare Service Worker PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('PWA Service Worker activat.'))
      .catch((err) => console.error('Eroare PWA:', err));
  });
}

// 2. Elemente DOM
const form = document.getElementById('transaction-form');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const typeInput = document.getElementById('type');
const categoryInput = document.getElementById('category');

const totalIncomeEl = document.getElementById('total-income');
const totalExpensesEl = document.getElementById('total-expenses');
const balanceEl = document.getElementById('balance');
const transactionListEl = document.getElementById('transaction-list');

// 3. Preluare tranzactii din LocalStorage
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

// Formatează numerele în LEI
function formatCurrency(amount) {
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' })
    .format(amount)
    .replace('RON', 'LEI');
}

// 4. Actualizează rezumatul și lista din interfață
function updateUI() {
  const amounts = transactions.map(t => t.type === 'income' ? t.amount : -t.amount);
  
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

  // Generare lista
  transactionListEl.innerHTML = '';

  if (transactions.length === 0) {
    transactionListEl.innerHTML = '<li class="empty-state">Nicio tranzacție înregistrată.</li>';
    return;
  }

  transactions.forEach((t) => {
    const li = document.createElement('li');
    li.classList.add('transaction-item');

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

// 5. Adaugare tranzactie
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

  transactions.unshift(transaction); // Adaugă la începutul listei
  saveData();
  updateUI();

  // Resetare câmpuri
  descriptionInput.value = '';
  amountInput.value = '';
  descriptionInput.focus();
});

// 6. Stergere tranzactie
window.removeTransaction = function(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveData();
  updateUI();
};

// 7. Salvare in localStorage
function saveData() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Ințializare la lansare
updateUI();

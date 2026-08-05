import { Database } from './db/database.js';

class AppController {
    constructor() {
        this.cacheDOM();
        this.bindEvents();
        this.init();
    }

    cacheDOM() {
        this.form = document.getElementById('transaction-form');
        this.titleInput = document.getElementById('tx-title');
        this.amountInput = document.getElementById('tx-amount');
        this.typeInput = document.getElementById('tx-type');
        this.errorMsg = document.getElementById('form-error');
        this.list = document.getElementById('transaction-list');
        this.balanceDisplay = document.getElementById('net-balance');
        this.submitBtn = document.getElementById('submit-btn');
    }

    bindEvents() {
        this.form.addEventListener('submit', this.handleSubmission.bind(this));
    }

    async init() {
        await this.refreshUI();
        this.registerServiceWorker();
    }

    async handleSubmission(e) {
        e.preventDefault();
        this.errorMsg.classList.add('hidden');
        this.submitBtn.disabled = true;

        const title = this.titleInput.value.trim();
        const amount = parseFloat(this.amountInput.value);
        const type = this.typeInput.value;

        // Strict validation
        if (!title || isNaN(amount) || amount <= 0 || !['income', 'expense'].includes(type)) {
            this.showError('Please provide a valid title and amount greater than 0.');
            this.submitBtn.disabled = false;
            return;
        }

        try {
            await Database.addTransaction({ title, amount, type });
            this.form.reset();
            await this.refreshUI();
        } catch (error) {
            console.error('[DB Error]', error);
            this.showError('Failed to save transaction. Please try again.');
        } finally {
            this.submitBtn.disabled = false;
        }
    }

    async refreshUI() {
        try {
            const transactions = await Database.getAllTransactions();
            let balance = 0;
            this.list.innerHTML = '';

            const frag = document.createDocumentFragment();

            transactions.forEach(tx => {
                if (tx.type === 'income') {
                    balance += tx.amount;
                } else {
                    balance -= tx.amount;
                }

                const li = document.createElement('li');
                li.className = 'list-item';
                
                const formatOpts = { style: 'currency', currency: 'USD' };
                const formattedAmount = new Intl.NumberFormat('en-US', formatOpts).format(tx.amount);
                const sign = tx.type === 'income' ? '+' : '-';
                
                li.innerHTML = `
                    <span class="tx-name">${this.escapeHTML(tx.title)}</span>
                    <span class="val-${tx.type}">${sign}${formattedAmount}</span>
                `;
                frag.appendChild(li);
            });

            this.list.appendChild(frag);
            
            const formatOpts = { style: 'currency', currency: 'USD' };
            this.balanceDisplay.textContent = new Intl.NumberFormat('en-US', formatOpts).format(balance);
            this.balanceDisplay.style.color = balance < 0 ? 'var(--danger-color)' : 'inherit';

        } catch (error) {
            console.error('[UI Error]', error);
        }
    }

    showError(msg) {
        this.errorMsg.textContent = msg;
        this.errorMsg.classList.remove('hidden');
    }

    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js').catch(err => {
                    console.warn('[SW] Registration failed:', err);
                });
            });
        }
    }
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => new AppController());

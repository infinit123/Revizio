import { CONFIG } from './config.js';
import { FinoraDB } from './db/database.js';
import { SecurityController } from './core/security.js';
import { BackupExporter } from './backup/exporter.js';
import { BackupImporter } from './backup/importer.js';
import { calculateSafeToSpend } from './engine/analytics.js';
import { detectRecurringPatterns } from './engine/habits.js';
import { forecastMonthlySpend } from './engine/forecasting.js';
import { Haptics } from './utils/haptics.js';

import './ui/components/fn-button.js';
import './ui/components/fn-card.js';
import './ui/components/fn-metric.js';
import './ui/components/fn-sheet.js';

class App {
  constructor() {
    this.db = new FinoraDB();
    this.security = new SecurityController();
    this.currentTab = 'summary';
  }

  async init() {
    try {
      await this.db.open();
      this.registerServiceWorker();
      this.setupNavigation();
      this.attachGlobalFormHandler();
      await this.loadTab(this.currentTab);
    } catch (err) {
      console.error('Core App Init Failure:', err);
    }
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW registration bypassed:', e));
    }
  }

  setupNavigation() {
    const navItems = document.querySelectorAll('.fn-nav-item');
    navItems.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab && tab !== this.currentTab) {
          navItems.forEach((i) => i.classList.remove('active'));
          btn.classList.add('active');
          this.switchTab(tab);
        }
      });
    });
  }

  async switchTab(tab) {
    this.currentTab = tab;
    Haptics.selection();
    await this.loadTab(tab);
  }

  attachGlobalFormHandler() {
    document.addEventListener('submit', async (e) => {
      if (e.target && e.target.id === 'tx-form') {
        e.preventDefault();
        const amountInput = document.getElementById('tx-amount');
        const merchantInput = document.getElementById('tx-merchant');
        const typeInput = document.getElementById('tx-type');

        const amount = parseFloat(amountInput.value);
        const merchant = merchantInput.value.trim();
        const type = typeInput.value;

        if (isNaN(amount) || amount <= 0 || !merchant) {
          Haptics.error();
          alert('Please enter a valid amount and merchant.');
          return;
        }

        await this.db.put('transactions', {
          id: Date.now().toString(),
          amount,
          merchant,
          type,
          category: 'General',
          date: new Date().toISOString()
        });

        Haptics.success();
        const modal = document.getElementById('global-tx-modal');
        if (modal) modal.removeAttribute('open');

        e.target.reset();
        await this.loadTab(this.currentTab);
      }
    });
  }

  async loadTab(tab) {
    const viewport = document.getElementById('main-viewport');
    if (!viewport) return;

    const [transactions, recurring, goals] = await Promise.all([
      this.db.getAll('transactions'),
      this.db.getAll('recurring'),
      this.db.getAll('goals')
    ]);

    if (tab === 'summary') {
      const analytics = calculateSafeToSpend({
        transactions,
        recurring,
        goals,
        monthlyBudget: CONFIG.DEFAULT_MONTHLY_BUDGET
      });

      const habits = detectRecurringPatterns(transactions);

      viewport.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h1 style="font-size: 26px; font-weight: 700;">Summary</h1>
            <p style="color: var(--fn-text-secondary); font-size:13px;">Local Safe-to-Spend Pool</p>
          </div>
          <fn-button id="btn-open-modal" variant="primary">+ Add Tx</fn-button>
        </div>
        
        <fn-card>
          <fn-metric 
            label="Safe-to-Spend" 
            value="${CONFIG.DEFAULT_CURRENCY}${analytics.safeToSpendTotal}" 
            status="${analytics.safeToSpendTotal > 0 ? 'success' : 'danger'}" 
            description="Daily limit: ${CONFIG.DEFAULT_CURRENCY}${analytics.dailySafeToSpend} (${analytics.daysRemaining} days left)">
          </fn-metric>
        </fn-card>

        ${habits.length > 0 ? `
          <fn-card title="Detected Subscriptions">
            ${habits.map((h) => `
              <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--fn-border-color);">
                <div>
                  <strong>${h.merchant}</strong>
                  <div style="font-size:12px; color:var(--fn-text-secondary);">${h.estimatedFrequency.toUpperCase()} · ${h.confidenceScore}% confidence</div>
                </div>
                <div style="font-weight:bold;">~${CONFIG.DEFAULT_CURRENCY}${h.avgAmount}</div>
              </div>
            `).join('')}
          </fn-card>
        ` : ''}

        <fn-sheet id="global-tx-modal" title="New Transaction">
          <form id="tx-form" style="display:flex; flex-direction:column; gap:12px;">
            <input type="number" id="tx-amount" placeholder="Amount (${CONFIG.DEFAULT_CURRENCY})" step="0.01" required style="width:100%; padding:12px; border-radius:10px; border:1px solid var(--fn-border-color); font-size:16px; background:var(--fn-bg-surface); color:var(--fn-text-primary);" />
            <input type="text" id="tx-merchant" placeholder="Merchant or Title" required style="width:100%; padding:12px; border-radius:10px; border:1px solid var(--fn-border-color); font-size:16px; background:var(--fn-bg-surface); color:var(--fn-text-primary);" />
            <select id="tx-type" style="width:100%; padding:12px; border-radius:10px; border:1px solid var(--fn-border-color); font-size:16px; background:var(--fn-bg-surface); color:var(--fn-text-primary);">
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <fn-button type="submit" variant="primary" full-width>Save Entry</fn-button>
          </form>
        </fn-sheet>
      `;

      document.getElementById('btn-open-modal').onclick = () => {
        document.getElementById('global-tx-modal').setAttribute('open', '');
      };

    } else if (tab === 'forecast') {
      const forecast = forecastMonthlySpend(transactions, CONFIG.DEFAULT_MONTHLY_BUDGET);

      viewport.innerHTML = `
        <h1 style="font-size: 26px; font-weight: 700; margin-bottom: 2px;">Forecast</h1>
        <p style="color: var(--fn-text-secondary); margin-bottom: 16px; font-size:13px;">EWMA Weighted Projection</p>

        <fn-card>
          <fn-metric 
            label="Projected Month End" 
            value="${CONFIG.DEFAULT_CURRENCY}${forecast.projectedTotalSpend}" 
            status="${forecast.status === 'on_track' ? 'success' : 'danger'}"
            description="Spending velocity: ${CONFIG.DEFAULT_CURRENCY}${forecast.dailyVelocity} / day">
          </fn-metric>
        </fn-card>

        <fn-card title="Projection Details">
          <div style="display:flex; flex-direction:column; gap:10px; font-size:14px;">
            <div style="display:flex; justify-content:space-between;"><span>Spent So Far:</span><strong>${CONFIG.DEFAULT_CURRENCY}${forecast.spentSoFar}</strong></div>
            <div style="display:flex; justify-content:space-between;"><span>Projected Remaining:</span><strong>${CONFIG.DEFAULT_CURRENCY}${forecast.projectedRemainingSpend}</strong></div>
            <div style="display:flex; justify-content:space-between;"><span>Budget Delta:</span><strong style="color:${forecast.budgetDelta >= 0 ? 'var(--fn-color-success)' : 'var(--fn-color-danger)'};">${CONFIG.DEFAULT_CURRENCY}${forecast.budgetDelta}</strong></div>
          </div>
        </fn-card>
      `;

    } else if (tab === 'transactions') {
      viewport.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h1 style="font-size: 26px; font-weight: 700;">Transactions</h1>
        </div>
        ${transactions.length === 0 ? '<p style="color:var(--fn-text-secondary); text-align:center; margin-top:32px;">No recorded transactions found.</p>' : ''}
        ${transactions.map((t) => `
          <div style="background:var(--fn-bg-surface); padding:14px; border-radius:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; border:1px solid var(--fn-border-color);">
            <div>
              <strong>${t.merchant}</strong>
              <div style="font-size:12px; color:var(--fn-text-secondary); margin-top:2px;">${new Date(t.date).toLocaleDateString()}</div>
            </div>
            <div style="font-weight:bold; color:${t.type === 'expense' ? 'var(--fn-color-danger)' : 'var(--fn-color-success)'};">
              ${t.type === 'expense' ? '-' : '+'}${CONFIG.DEFAULT_CURRENCY}${t.amount}
            </div>
          </div>
        `).join('')}
      `;

    } else if (tab === 'settings') {
      viewport.innerHTML = `
        <h1 style="font-size: 26px; font-weight: 700; margin-bottom: 16px;">Settings</h1>
        <fn-card title="Data Management">
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <fn-button id="btn-export-data" variant="primary" full-width>Export Backup JSON</fn-button>
            <fn-button id="btn-import-trigger" variant="secondary" full-width>Restore Backup File</fn-button>
            <input type="file" id="file-import-input" accept=".json" style="display: none;" />
          </div>
        </fn-card>
      `;

      const exporter = new BackupExporter(this.db);
      const importer = new BackupImporter(this.db);

      document.getElementById('btn-export-data').onclick = async () => {
        try {
          await exporter.exportData();
        } catch (e) {
          alert('Export failed: ' + e.message);
        }
      };

      const importTrigger = document.getElementById('btn-import-trigger');
      const fileInput = document.getElementById('file-import-input');

      importTrigger.onclick = () => fileInput.click();
      fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            const res = await importer.importFromFile(file);
            alert(`Restore Successful! Restored ${res.recordCounts.transactions} transactions.`);
            await this.switchTab('summary');
          } catch (err) {
            alert('Restore Error: ' + err.message);
          }
        }
      };
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});

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
      this.renderLayout();
      await this.loadTab(this.currentTab);
    } catch (err) {
      console.error('Eroare la inițializare:', err);
    }
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  renderLayout() {
    const appShell = document.getElementById('app');
    appShell.innerHTML = `
      <header class="fn-header" style="padding: 14px 16px; font-weight: 700; font-size: 22px; display:flex; justify-content:space-between; align-items:center;">
        <span>Finora</span>
        <span style="font-size: 12px; font-weight: 500; opacity: 0.6;">v1.0.0</span>
      </header>
      <main class="fn-viewport" id="main-viewport"></main>
      <nav class="fn-navigation" style="display: flex; justify-content: space-around; padding: 14px 8px; background: var(--fn-bg-surface); border-top: 1px solid var(--fn-border-color);">
        <button id="nav-summary" style="background:none; border:none; color:var(--fn-color-primary); font-weight:600; font-size:14px;">Summary</button>
        <button id="nav-forecast" style="background:none; border:none; color:var(--fn-text-secondary); font-size:14px;">Prognoză</button>
        <button id="nav-tx" style="background:none; border:none; color:var(--fn-text-secondary); font-size:14px;">Tranzacții</button>
        <button id="nav-settings" style="background:none; border:none; color:var(--fn-text-secondary); font-size:14px;">Setări</button>
      </nav>

      <fn-sheet id="tx-modal" title="Adaugă Tranzacție">
        <form id="tx-form" style="display:flex; flex-direction:column; gap:12px;">
          <input type="number" id="tx-amount" placeholder="Sumă (€)" step="0.01" required style="width:100%; padding:12px; border-radius:10px; border:1px solid var(--fn-border-color); font-size:16px;" />
          <input type="text" id="tx-merchant" placeholder="Comerciant / Descriere" required style="width:100%; padding:12px; border-radius:10px; border:1px solid var(--fn-border-color); font-size:16px;" />
          <select id="tx-type" style="width:100%; padding:12px; border-radius:10px; border:1px solid var(--fn-border-color); font-size:16px;">
            <option value="expense">Cheltuială</option>
            <option value="income">Venit</option>
          </select>
          <fn-button type="submit" variant="primary" full-width>Salvează</fn-button>
        </form>
      </fn-sheet>
    `;

    document.getElementById('nav-summary').onclick = () => this.switchTab('summary');
    document.getElementById('nav-forecast').onclick = () => this.switchTab('forecast');
    document.getElementById('nav-tx').onclick = () => this.switchTab('tx');
    document.getElementById('nav-settings').onclick = () => this.switchTab('settings');

    this.attachFormHandler();
  }

  attachFormHandler() {
    const form = document.getElementById('tx-form');
    if (!form) return;

    form.onsubmit = async (e) => {
      e.preventDefault();
      const amount = document.getElementById('tx-amount').value;
      const merchant = document.getElementById('tx-merchant').value;
      const type = document.getElementById('tx-type').value;

      await this.db.put('transactions', {
        id: Date.now().toString(),
        amount: Number(amount),
        merchant: merchant,
        type: type,
        category: 'General',
        date: new Date().toISOString()
      });

      Haptics.success();
      document.getElementById('tx-modal').removeAttribute('open');
      form.reset();
      this.loadTab(this.currentTab);
    };
  }

  async switchTab(tab) {
    this.currentTab = tab;
    Haptics.selection();
    document.querySelectorAll('.fn-navigation button').forEach(b => b.style.color = 'var(--fn-text-secondary)');
    document.getElementById(`nav-${tab}`).style.color = 'var(--fn-color-primary)';
    await this.loadTab(tab);
  }

  async loadTab(tab) {
    const viewport = document.getElementById('main-viewport');
    const transactions = await this.db.getAll('transactions');
    const recurring = await this.db.getAll('recurring');
    const goals = await this.db.getAll('goals');

    if (tab === 'summary') {
      const analytics = calculateSafeToSpend({
        transactions,
        recurring,
        goals,
        monthlyBudget: 2000
      });

      const habits = detectRecurringPatterns(transactions);

      viewport.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h1 style="font-size: 28px; font-weight: 700;">Summary</h1>
            <p style="color: var(--fn-text-secondary); font-size:14px;">Buget Calculat Local</p>
          </div>
          <fn-button id="btn-open-tx" variant="primary">+ Adaugă</fn-button>
        </div>
        
        <fn-card>
          <fn-metric 
            label="Safe-to-Spend" 
            value="€${analytics.safeToSpendTotal}" 
            status="${analytics.safeToSpendTotal > 0 ? 'success' : 'danger'}" 
            description="Limita zilnică: €${analytics.dailySafeToSpend} (${analytics.daysRemaining} zile rămase)">
          </fn-metric>
        </fn-card>

        ${habits.length > 0 ? `
          <fn-card title="Abonamente Detectate Automatic">
            ${habits.map(h => `
              <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--fn-border-color);">
                <div>
                  <strong>${h.merchant}</strong>
                  <div style="font-size:12px; color:gray;">Frecvență: ${h.estimatedFrequency} (Scor: ${h.confidenceScore}%)</div>
                </div>
                <div style="font-weight:bold;">~€${h.avgAmount}</div>
              </div>
            `).join('')}
          </fn-card>
        ` : ''}
      `;

      document.getElementById('btn-open-tx').onclick = () => {
        document.getElementById('tx-modal').setAttribute('open', '');
      };

    } else if (tab === 'forecast') {
      const forecast = forecastMonthlySpend(transactions, 2000);

      viewport.innerHTML = `
        <h1 style="font-size: 28px; font-weight: 700; margin-bottom: 4px;">Prognoză EWMA</h1>
        <p style="color: var(--fn-text-secondary); margin-bottom: 16px;">Predicție cheltuieli lunare</p>

        <fn-card>
          <fn-metric 
            label="Estimare Final Lună" 
            value="€${forecast.projectedTotalSpend}" 
            status="${forecast.status === 'on_track' ? 'success' : 'danger'}"
            description="Viteza actuală de cheltuire: €${forecast.dailyVelocity} / zi">
          </fn-metric>
        </fn-card>

        <fn-card title="Statistici Prognoză">
          <div style="display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between;"><span>Cheltuit până azi:</span><strong>€${forecast.spentSoFar}</strong></div>
            <div style="display:flex; justify-content:space-between;"><span>Estimare rămasă:</span><strong>€${forecast.projectedRemainingSpend}</strong></div>
            <div style="display:flex; justify-content:space-between;"><span>Diferență Buget (2000€):</span><strong style="color:${forecast.budgetDelta >= 0 ? 'green' : 'red'};">€${forecast.budgetDelta}</strong></div>
          </div>
        </fn-card>
      `;

    } else if (tab === 'tx') {
      viewport.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h1 style="font-size: 28px; font-weight: 700;">Tranzacții</h1>
          <fn-button id="btn-open-tx-2" variant="primary">+ Adaugă</fn-button>
        </div>
        ${transactions.length === 0 ? '<p style="color:gray;">Nicio tranzacție salvată în IndexedDB.</p>' : ''}
        ${transactions.map(t => `
          <div style="background:var(--fn-bg-surface); padding:14px; border-radius:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; border:1px solid var(--fn-border-color);">
            <div>
              <strong>${t.merchant}</strong>
              <div style="font-size:12px; color:gray;">${new Date(t.date).toLocaleDateString()}</div>
            </div>
            <div style="font-weight:bold; color:${t.type === 'expense' ? 'var(--fn-color-danger)' : 'var(--fn-color-success)'};">
              ${t.type === 'expense' ? '-' : '+'}€${t.amount}
            </div>
          </div>
        `).join('')}
      `;

      document.getElementById('btn-open-tx-2').onclick = () => {
        document.getElementById('tx-modal').setAttribute('open', '');
      };

    } else if (tab === 'settings') {
      viewport.innerHTML = `
        <h1 style="font-size: 28px; font-weight: 700; margin-bottom: 16px;">Setări & Backup</h1>
        <fn-card title="Gestionare Date">
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <fn-button id="btn-export-data" variant="primary" full-width>Export Backup JSON (SHA-256)</fn-button>
            <fn-button id="btn-import-trigger" variant="secondary" full-width>Restaurare din Fișier</fn-button>
            <input type="file" id="file-import-input" accept=".json" style="display: none;" />
          </div>
        </fn-card>
      `;

      const exporter = new BackupExporter(this.db);
      const importer = new BackupImporter(this.db);

      document.getElementById('btn-export-data').onclick = () => exporter.exportData();
      document.getElementById('btn-import-trigger').onclick = () => document.getElementById('file-import-input').click();
      document.getElementById('file-import-input').onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            const res = await importer.importFromFile(file);
            alert(`Restaurare reușită! S-au importat ${res.recordCounts.transactions} tranzacții.`);
            this.switchTab('summary');
          } catch (err) {
            alert('Eroare la restaurare: ' + err.message);
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

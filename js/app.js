import { FinoraDB } from './db/database.js';
import { SecurityController } from './core/security.js';
import { BackupExporter } from './backup/exporter.js';
import { BackupImporter } from './backup/importer.js';
import { calculateSafeToSpend } from './engine/analytics.js';

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
      console.error('Initialization error:', err);
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
      <header class="fn-header" style="padding: 12px 16px; font-weight: 700; font-size: 20px;">Finora</header>
      <main class="fn-viewport" id="main-viewport"></main>
      <nav class="fn-navigation" style="display: flex; justify-content: space-around; padding: 12px; background: var(--fn-bg-surface); border-top: 1px solid var(--fn-border-color);">
        <button id="nav-summary" style="background:none; border:none; color:var(--fn-color-primary); font-weight:600;">Summary</button>
        <button id="nav-tx" style="background:none; border:none; color:var(--fn-text-secondary);">Tranzacții</button>
        <button id="nav-settings" style="background:none; border:none; color:var(--fn-text-secondary);">Setări</button>
      </nav>
    `;

    document.getElementById('nav-summary').onclick = () => this.switchTab('summary');
    document.getElementById('nav-tx').onclick = () => this.switchTab('tx');
    document.getElementById('nav-settings').onclick = () => this.switchTab('settings');
  }

  async switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.fn-navigation button').forEach(b => b.style.color = 'var(--fn-text-secondary)');
    document.getElementById(`nav-${tab}`).style.color = 'var(--fn-color-primary)';
    await this.loadTab(tab);
  }

  async loadTab(tab) {
    const viewport = document.getElementById('main-viewport');
    
    if (tab === 'summary') {
      const transactions = await this.db.getAll('transactions');
      const recurring = await this.db.getAll('recurring');
      const goals = await this.db.getAll('goals');

      const analytics = calculateSafeToSpend({
        transactions,
        recurring,
        goals,
        monthlyBudget: 2000
      });

      viewport.innerHTML = `
        <h1 style="font-size: 28px; font-weight: 700;">Summary</h1>
        <p style="color: var(--fn-text-secondary); margin-bottom: 16px;">Personal Companion</p>
        
        <fn-card>
          <fn-metric 
            label="Safe-to-Spend" 
            value="€${analytics.safeToSpendTotal}" 
            status="${analytics.safeToSpendTotal > 0 ? 'success' : 'danger'}" 
            description="Zilnic: €${analytics.dailySafeToSpend} (${analytics.daysRemaining} zile rămase)">
          </fn-metric>
        </fn-card>

        <fn-card title="Adaugă Tranzacție Rapidă">
          <input type="number" id="tx-amount" placeholder="Sumă (€)" style="width:100%; padding:10px; margin-bottom:8px; border-radius:8px; border:1px solid #ccc;" />
          <input type="text" id="tx-merchant" placeholder="Comerciant / Detalii" style="width:100%; padding:10px; margin-bottom:12px; border-radius:8px; border:1px solid #ccc;" />
          <fn-button id="btn-add-tx" variant="primary" full-width>Salvează Cheltuială</fn-button>
        </fn-card>
      `;

      document.getElementById('btn-add-tx').onclick = async () => {
        const amount = document.getElementById('tx-amount').value;
        const merchant = document.getElementById('tx-merchant').value;
        if (!amount) return;

        await this.db.put('transactions', {
          id: Date.now().toString(),
          amount: Number(amount),
          merchant: merchant || 'General',
          type: 'expense',
          date: new Date().toISOString()
        });

        this.loadTab('summary');
      };

    } else if (tab === 'tx') {
      const transactions = await this.db.getAll('transactions');
      viewport.innerHTML = `
        <h1 style="font-size: 28px; font-weight: 700; margin-bottom: 16px;">Tranzacții</h1>
        ${transactions.length === 0 ? '<p>Nicio tranzacție salvată.</p>' : ''}
        ${transactions.map(t => `
          <div style="background:var(--fn-bg-surface); padding:12px; border-radius:8px; margin-bottom:8px; display:flex; justify-between;">
            <div>
              <strong>${t.merchant}</strong>
              <div style="font-size:12px; color:gray;">${new Date(t.date).toLocaleDateString()}</div>
            </div>
            <div style="font-weight:bold; color:var(--fn-color-danger);">-€${t.amount}</div>
          </div>
        `).join('')}
      `;

    } else if (tab === 'settings') {
      viewport.innerHTML = `
        <h1 style="font-size: 28px; font-weight: 700; margin-bottom: 16px;">Setări & Backup</h1>
        <fn-card title="Gestionare Date">
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <fn-button id="btn-export-data" variant="primary" full-width>Export Backup JSON</fn-button>
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
          await importer.importFromFile(file);
          alert('Restaurare completă!');
          this.switchTab('summary');
        }
      };
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});

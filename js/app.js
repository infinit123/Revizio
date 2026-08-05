import { FinoraDB } from './db/database.js';
import { SecurityController } from './core/security.js';
import { BackupExporter } from './backup/exporter.js';
import { BackupImporter } from './backup/importer.js';

import './ui/components/fn-button.js';
import './ui/components/fn-card.js';
import './ui/components/fn-metric.js';
import './ui/components/fn-sheet.js';

class App {
  constructor() {
    this.db = new FinoraDB();
    this.security = new SecurityController();
  }

  async init() {
    try {
      await this.db.open();
      this.registerServiceWorker();
      this.renderAppShell();
      console.log('Finora Apple-Native Engine Initialized.');
    } catch (err) {
      console.error('Initialization error:', err);
    }
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('Finora SW Registered'))
        .catch((err) => console.error('SW Registration Error:', err));
    }
  }

  renderAppShell() {
    const viewport = document.getElementById('main-viewport');
    viewport.innerHTML = `
      <div style="padding-bottom: 30px;">
        <h1 style="font-size: 34px; font-weight: 700; letter-spacing: -0.5px;">Summary</h1>
        <p style="color: var(--fn-text-secondary); margin-top: 4px; font-size: 15px;">Personal Companion</p>
        
        <div style="margin-top: 20px;">
          <fn-card>
            <fn-metric 
              label="Safe-to-Spend" 
              value="€1,420.00" 
              status="success" 
              description="Calculated locally for remaining 26 days">
            </fn-metric>
          </fn-card>

          <fn-card title="System Actions">
            <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
              <fn-button id="btn-export-data" variant="primary" full-width>Export Backup Payload</fn-button>
              <fn-button id="btn-import-trigger" variant="secondary" full-width>Restore from File</fn-button>
              <input type="file" id="file-import-input" accept=".json" style="display: none;" />
            </div>
          </fn-card>
        </div>
      </div>
    `;

    this.attachBackupHandlers();
  }

  attachBackupHandlers() {
    const exporter = new BackupExporter(this.db);
    const importer = new BackupImporter(this.db);

    const exportBtn = document.getElementById('btn-export-data');
    const importTrigger = document.getElementById('btn-import-trigger');
    const fileInput = document.getElementById('file-import-input');

    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        try {
          await exporter.exportData();
        } catch (e) {
          alert('Export failed: ' + e.message);
        }
      });
    }

    if (importTrigger && fileInput) {
      importTrigger.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            const res = await importer.importFromFile(file);
            alert(`Restore Successful! Imported ${res.recordCounts.transactions} transactions.`);
            window.location.reload();
          } catch (err) {
            alert('Restore Error: ' + err.message);
          }
        }
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});

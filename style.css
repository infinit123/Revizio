/* Import font Inter din Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  /* Culori - Minimalist Tech */
  --color-bg: #FAFAFA;
  --color-surface: #FFFFFF;
  --color-border: #E4E4E7;
  
  --color-text-main: #09090B;
  --color-text-muted: #71717A;
  
  --color-primary: #18181B;
  --color-primary-hover: #27272A;
  --color-income: #16A34A;
  --color-expense: #DC2626;

  --radius-sm: 8px;
  --radius-md: 12px;
  --shadow-subtle: 0 1px 3px rgba(0, 0, 0, 0.05);
}

*, *::before, *::after {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent; /* Elimină efectul de blur pe mobil la tap */
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background-color: var(--color-bg);
  color: var(--color-text-main);
  margin: 0;
  padding: 0;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  user-select: none; /* Aspect de aplicație nativă */
}

.app-container {
  max-width: 480px; /* Optimizat pentru ecran de mobil / PWA */
  margin: 0 auto;
  padding: 20px 16px 40px 16px;
}

/* Header */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.app-header h1 {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.02em;
}

.status-tag {
  font-size: 11px;
  font-weight: 600;
  background: #F4F4F5;
  color: var(--color-text-muted);
  padding: 4px 8px;
  border-radius: 20px;
  border: 1px solid var(--color-border);
}

/* Cards & Grid */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
  box-shadow: var(--shadow-subtle);
  margin-bottom: 16px;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.summary-card {
  padding: 12px;
}

.summary-card.primary-card {
  grid-column: span 2;
  background: var(--color-primary);
  color: #FFFFFF;
  border-color: var(--color-primary);
}

.card-label {
  font-size: 12px;
  color: var(--color-text-muted);
  display: block;
  margin-bottom: 4px;
}

.primary-card .card-label {
  color: #A1A1AA;
}

.card-value {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.primary-card .card-value {
  font-size: 22px;
}

.color-income { color: var(--color-income); }
.color-expense { color: var(--color-expense); }

/* Formular */
.form-section h2, .list-section h2 {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 16px 0;
}

.form-group {
  margin-bottom: 12px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

input, select {
  width: 100%;
  padding: 10px 12px;
  font-size: 16px; /* Setează 16px pentru a preveni auto-zoom pe iOS Safari */
  font-family: inherit;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-main);
  outline: none;
  transition: border-color 0.15s;
}

input:focus, select:focus {
  border-color: var(--color-primary);
  background: #FFFFFF;
}

.btn-primary {
  width: 100%;
  background: var(--color-primary);
  color: #FFFFFF;
  border: none;
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  border-radius: var(--radius-sm);
  cursor: pointer;
  margin-top: 8px;
}

.btn-primary:active {
  background: var(--color-primary-hover);
}

/* Lista Tranzactii */
.transaction-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.transaction-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border);
}

.transaction-item:last-child {
  border-bottom: none;
}

.tx-info {
  display: flex;
  flex-direction: column;
}

.tx-title {
  font-size: 14px;
  font-weight: 500;
}

.tx-category {
  font-size: 12px;
  color: var(--color-text-muted);
}

.tx-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tx-amount {
  font-size: 14px;
  font-weight: 600;
}

.btn-delete {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
}

.btn-delete:hover {
  color: var(--color-expense);
}

.empty-state {
  font-size: 13px;
  color: var(--color-text-muted);
  text-align: center;
  padding: 12px 0;
}

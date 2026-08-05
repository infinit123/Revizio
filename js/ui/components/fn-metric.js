export class FnMetric extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  static get observedAttributes() {
    return ['label', 'value', 'trend', 'status', 'description'];
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const label = this.getAttribute('label') || '';
    const value = this.getAttribute('value') || '€0.00';
    const trend = this.getAttribute('trend');
    const status = this.getAttribute('status') || 'normal';
    const description = this.getAttribute('description');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .label {
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          color: var(--fn-text-secondary, #8E8E93);
        }

        .value-container {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-top: 6px;
        }

        .value {
          font-size: 34px;
          font-weight: 700;
          letter-spacing: -0.8px;
          line-height: 1.1;
        }

        .status-normal { color: var(--fn-text-primary, #000000); }
        .status-success { color: var(--fn-color-success, #34C759); }
        .status-warning { color: var(--fn-color-warning, #FF9500); }
        .status-danger { color: var(--fn-color-danger, #FF3B30); }

        .trend {
          font-size: 15px;
          font-weight: 600;
        }

        .description {
          font-size: 13px;
          color: var(--fn-text-secondary, #8E8E93);
          margin-top: 6px;
        }
      </style>
      <div>
        ${label ? `<div class="label">${label}</div>` : ''}
        <div class="value-container">
          <span class="value status-${status}">${value}</span>
          ${trend ? `<span class="trend status-${status}">${trend}</span>` : ''}
        </div>
        ${description ? `<div class="description">${description}</div>` : ''}
      </div>
    `;
  }
}

customElements.define('fn-metric', FnMetric);

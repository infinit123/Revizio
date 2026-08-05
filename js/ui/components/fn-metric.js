const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
    }
    .metric {
      border-radius: 14px;
      border: 1px solid var(--color-border-subtle);
      padding: 8px 10px;
      background-color: var(--color-bg);
    }
    .label {
      font-size: var(--metric-label-size);
      color: var(--color-text-muted);
      margin-bottom: 4px;
    }
    .value-row {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }
    .value {
      font-size: var(--metric-value-size);
      font-weight: 600;
    }
    .unit {
      font-size: 0.8rem;
      color: var(--color-text-secondary);
    }
  </style>
  <div class="metric">
    <div class="label"></div>
    <div class="value-row">
      <div class="value"></div>
      <div class="unit"></div>
    </div>
  </div>
`;

export class FnMetric extends HTMLElement {
  static get observedAttributes() {
    return ['label', 'value', 'unit'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this._labelEl = this.shadowRoot.querySelector('.label');
    this._valueEl = this.shadowRoot.querySelector('.value');
    this._unitEl = this.shadowRoot.querySelector('.unit');
  }

  connectedCallback() {
    this._upgradeProperty('label');
    this._upgradeProperty('value');
    this._upgradeProperty('unit');
    this._render();
  }

  _upgradeProperty(prop) {
    if (Object.prototype.hasOwnProperty.call(this, prop)) {
      const value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
  }

  attributeChangedCallback() {
    this._render();
  }

  _render() {
    const label = this.getAttribute('label') || '';
    const value = this.getAttribute('value') || '0';
    const unit = this.getAttribute('unit') || '';

    this._labelEl.textContent = label;
    this._valueEl.textContent = value;
    this._unitEl.textContent = unit;
  }
}

customElements.define('fn-metric', FnMetric);


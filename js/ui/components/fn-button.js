const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: inline-block;
    }
    button {
      border-radius: 999px;
      border: 1px solid var(--color-border-subtle);
      padding: 8px 14px;
      font-size: 0.85rem;
      font-family: inherit;
      cursor: pointer;
      background-color: var(--color-bg-elevated);
      color: var(--color-text-primary);
      transition: background-color var(--transition-fast), transform var(--transition-fast),
        box-shadow var(--transition-fast), border-color var(--transition-fast);
      min-width: 72px;
    }
    button.primary {
      background-color: var(--color-accent);
      color: #ffffff;
      border-color: var(--color-accent);
      box-shadow: 0 8px 18px rgba(79, 156, 255, 0.35);
    }
    button.secondary {
      background-color: var(--color-bg);
      color: var(--color-text-secondary);
    }
    button:active {
      transform: scale(0.97);
      box-shadow: none;
    }
    button:disabled {
      opacity: 0.5;
      cursor: default;
      box-shadow: none;
    }
  </style>
  <button type="button"><slot></slot></button>
`;

export class FnButton extends HTMLElement {
  static get observedAttributes() {
    return ['variant', 'disabled', 'type'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this._button = this.shadowRoot.querySelector('button');
  }

  connectedCallback() {
    this._upgradeProperty('variant');
    this._upgradeProperty('disabled');
    this._upgradeProperty('type');
    this._applyVariant();
    this._applyDisabled();
    this._applyType();
    this._button.addEventListener('click', event => {
      if (this.disabled) {
        event.stopImmediatePropagation();
        return;
      }
      this.dispatchEvent(new Event('click', { bubbles: true, composed: true }));
    });
  }

  _upgradeProperty(prop) {
    if (Object.prototype.hasOwnProperty.call(this, prop)) {
      const value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
  }

  attributeChangedCallback(name) {
    if (name === 'variant') {
      this._applyVariant();
    } else if (name === 'disabled') {
      this._applyDisabled();
    } else if (name === 'type') {
      this._applyType();
    }
  }

  _applyVariant() {
    const variant = this.getAttribute('variant') || 'secondary';
    this._button.classList.toggle('primary', variant === 'primary');
    this._button.classList.toggle('secondary', variant === 'secondary');
  }

  _applyDisabled() {
    this._button.disabled = this.hasAttribute('disabled');
  }

  _applyType() {
    const type = this.getAttribute('type') || 'button';
    this._button.type = type;
  }

  get disabled() {
    return this.hasAttribute('disabled');
  }

  set disabled(value) {
    if (value) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }
}

customElements.define('fn-button', FnButton);


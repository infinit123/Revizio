const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      display: block;
      pointer-events: none;
      z-index: 30;
    }
    .backdrop {
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(10px);
      opacity: 0;
      transition: opacity var(--transition-medium);
      pointer-events: none;
    }
    .sheet {
      position: fixed;
      left: 0;
      right: 0;
      bottom: calc(0px + var(--safe-bottom));
      transform: translateY(100%);
      transition: transform var(--transition-medium);
      padding: 0 16px;
      pointer-events: none;
    }
    .sheet-inner {
      margin: 0 auto;
      max-width: 480px;
      background-color: var(--color-bg-sheet);
      border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
      box-shadow: var(--shadow-soft);
      border: 1px solid var(--color-border-strong);
      padding: 10px 14px 16px;
    }
    .handle {
      width: 40px;
      height: 4px;
      border-radius: 999px;
      background-color: var(--color-border-subtle);
      margin: 4px auto 8px;
    }
    .title {
      text-align: center;
      font-size: 0.95rem;
      margin-bottom: 8px;
    }
    .body {
      font-size: 0.9rem;
    }
    :host([open]) .backdrop {
      opacity: 1;
      pointer-events: auto;
    }
    :host([open]) .sheet {
      transform: translateY(0);
      pointer-events: auto;
    }
  </style>
  <div class="backdrop"></div>
  <div class="sheet">
    <div class="sheet-inner">
      <div class="handle"></div>
      <div class="title"></div>
      <div class="body">
        <slot name="body"></slot>
      </div>
    </div>
  </div>
`;

export class FnSheet extends HTMLElement {
  static get observedAttributes() {
    return ['title', 'open'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this._titleEl = this.shadowRoot.querySelector('.title');
    this._backdrop = this.shadowRoot.querySelector('.backdrop');
  }

  connectedCallback() {
    this._upgradeProperty('title');
    this._renderTitle();
    this._backdrop.addEventListener('click', () => {
      this.close();
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
    if (name === 'title') {
      this._renderTitle();
    }
  }

  _renderTitle() {
    const title = this.getAttribute('title') || '';
    this._titleEl.textContent = title;
  }

  open() {
    this.setAttribute('open', '');
  }

  close() {
    this.removeAttribute('open');
  }
}

customElements.define('fn-sheet', FnSheet);


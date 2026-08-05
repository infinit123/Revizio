// modules/theme-manager.js
export class ThemeManager {
  init() {
    const stored = window.localStorage.getItem("rp-theme");
    if (stored === "light" || stored === "dark") {
      document.body.classList.remove("rp-theme-auto");
      document.body.classList.add(`rp-theme-${stored}`);
    } else {
      document.body.classList.add("rp-theme-auto");
    }
  }

  setTheme(mode) {
    document.body.classList.remove("rp-theme-light", "rp-theme-dark", "rp-theme-auto");
    if (mode === "light" || mode === "dark") {
      document.body.classList.add(`rp-theme-${mode}`);
      window.localStorage.setItem("rp-theme", mode);
    } else {
      document.body.classList.add("rp-theme-auto");
      window.localStorage.removeItem("rp-theme");
    }
  }

  createToggle() {
    const wrapper = document.createElement("div");
    wrapper.className = "rp-card";

    const label = document.createElement("div");
    label.textContent = "Theme";
    wrapper.appendChild(label);

    const select = document.createElement("select");
    ["auto", "light", "dark"].forEach(mode => {
      const opt = document.createElement("option");
      opt.value = mode;
      opt.textContent = mode;
      select.appendChild(opt);
    });

    select.addEventListener("change", () => this.setTheme(select.value));
    wrapper.appendChild(select);

    return wrapper;
  }
}


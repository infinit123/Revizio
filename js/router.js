// js/router.js
const routes = new Map();

/**
 * Înregistrează un ecran.
 * @param {string} path
 * @param {Function} factory
 */
export function registerRoute(path, factory) {
  routes.set(path, factory);
}

/**
 * Navighează către un ecran.
 * @param {string} path
 */
export function navigate(path) {
  if (!routes.has(path)) {
    console.warn("Route not found:", path);
    return;
  }
  window.location.hash = path;
}

function renderCurrent() {
  const path = window.location.hash.replace("#", "") || "/dashboard";
  const factory = routes.get(path);
  if (!factory) return;

  const root = document.getElementById("rp-root");
  root.innerHTML = "";
  const screenNode = factory();
  root.appendChild(screenNode);
}

export function initRouter() {
  window.addEventListener("hashchange", renderCurrent);
  renderCurrent();
}

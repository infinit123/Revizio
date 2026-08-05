// components/tab-bar.js
import { navigate } from "../js/router.js";

const TABS = [
  { id: "dashboard", label: "Overview", icon: "🏠", path: "/dashboard" },
  { id: "analytics", label: "Insights", icon: "📊", path: "/analytics" },
  { id: "settings", label: "Settings", icon: "⚙️", path: "/settings" }
];

export function initTabBar() {
  const nav = document.getElementById("rp-tab-bar");
  nav.classList.add("rp-tab-bar");

  TABS.forEach(tab => {
    const btn = document.createElement("button");
    btn.className = "rp-tab-item";
    btn.type = "button";
    btn.textContent = `${tab.icon} ${tab.label}`;
    btn.addEventListener("click", () => navigate(tab.path));
    nav.appendChild(btn);
  });
}


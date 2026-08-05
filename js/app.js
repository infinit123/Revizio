// js/app.js
import { initRouter, registerRoute } from "./router.js";
import { initTabBar } from "../components/tab-bar.js";
import { createShell } from "../screens/shell.js";
import { ThemeManager } from "../modules/theme-manager.js";
import { PwaManager } from "../modules/pwa-manager.js";
import { DbService } from "../services/db-service.js";

async function bootstrap() {
  const themeManager = new ThemeManager();
  themeManager.init();

  const pwaManager = new PwaManager();
  pwaManager.registerServiceWorker();

  const db = new DbService();
  await db.init();

  // routes de bază (fără funcții financiare)
  registerRoute("/dashboard", () => {
    const { container, content } = createShell("Revizio Premium");
    const intro = document.createElement("p");
    intro.textContent = "Personal finance, reimaginat. Configurare inițială în curând.";
    content.appendChild(intro);
    return container;
  });

  registerRoute("/settings", () => {
    const { container, content } = createShell("Setări");
    const themeToggle = themeManager.createToggle();
    content.appendChild(themeToggle);
    return container;
  });

  initTabBar();
  initRouter();
}

bootstrap().catch(err => {
  console.error("Bootstrap error", err);
});


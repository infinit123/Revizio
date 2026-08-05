// js/app.js
import { initRouter, registerRoute } from "./router.js";
import { initTabBar } from "../components/tab-bar.js";
import { createShell } from "../screens/shell.js";

function bootstrap() {
  // Rute minime
  registerRoute("/dashboard", () => {
    const { container, content } = createShell("Revizio Premium");
    content.textContent = "Dashboard inițial";
    return container;
  });

  registerRoute("/settings", () => {
    const { container, content } = createShell("Setări");
    content.textContent = "Setări inițiale";
    return container;
  });

  registerRoute("/analytics", () => {
    const { container, content } = createShell("Analytics");
    content.textContent = "Analytics inițial";
    return container;
  });

  // Inițializare UI
  initTabBar();
  initRouter();
}

bootstrap();

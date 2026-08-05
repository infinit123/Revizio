// screens/shell.js
export function createShell(title) {
  const container = document.createElement("div");
  container.className = "rp-shell";

  const header = document.createElement("div");
  header.className = "rp-shell-header";
  header.textContent = title;

  const content = document.createElement("div");
  content.className = "rp-shell-content";

  container.appendChild(header);
  container.appendChild(content);

  return { container, content };
}


// Înregistrare Service Worker pentru PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('PWA Service Worker înregistrat cu succes.'))
      .catch(err => console.error('Eroare înregistrare PWA:', err));
  });
}

// Aici va urma logica pentru salvarea și calculul finanțelor

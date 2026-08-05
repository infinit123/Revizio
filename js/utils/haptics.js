export const Haptics = {
  selection() {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(10); } catch (_) {}
    }
  },
  success() {
    if ('vibrate' in navigator) {
      try { navigator.vibrate([10, 30, 20]); } catch (_) {}
    }
  },
  warning() {
    if ('vibrate' in navigator) {
      try { navigator.vibrate([30, 50, 10]); } catch (_) {}
    }
  },
  error() {
    if ('vibrate' in navigator) {
      try { navigator.vibrate([50, 100, 50, 100, 50]); } catch (_) {}
    }
  }
};

export const Haptics = {
  selection() {
    if ('vibrate' in navigator) navigator.vibrate(10);
  },
  success() {
    if ('vibrate' in navigator) navigator.vibrate([10, 30, 20]);
  },
  warning() {
    if ('vibrate' in navigator) navigator.vibrate([30, 50, 10]);
  },
  error() {
    if ('vibrate' in navigator) navigator.vibrate([50, 100, 50, 100, 50]);
  }
};

import { UI } from '../config.js';

function canVibrate() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function triggerHapticShort() {
  if (!canVibrate()) return;
  navigator.vibrate(UI.HAPTIC_SHORT);
}

export function triggerHapticMedium() {
  if (!canVibrate()) return;
  navigator.vibrate(UI.HAPTIC_MEDIUM);
}

export function triggerHapticSuccess() {
  if (!canVibrate()) return;
  navigator.vibrate(UI.HAPTIC_SUCCESS);
}

export function triggerHapticError() {
  if (!canVibrate()) return;
  navigator.vibrate(UI.HAPTIC_ERROR);
}


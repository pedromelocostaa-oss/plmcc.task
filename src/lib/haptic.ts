// Haptic feedback via Vibration API (supported on Android Chrome, some PWA contexts)

export function hapticLight() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(8);
  }
}

export function hapticMedium() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(15);
  }
}

export function hapticHeavy() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([20, 5, 20]);
  }
}

export function hapticSuccess() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([8, 4, 12]);
  }
}

export function hapticError() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([20, 8, 20, 8, 20]);
  }
}

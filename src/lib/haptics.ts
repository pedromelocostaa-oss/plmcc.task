export const haptics = {
  light:   () => "vibrate" in navigator && navigator.vibrate(8),
  medium:  () => "vibrate" in navigator && navigator.vibrate(15),
  success: () => "vibrate" in navigator && navigator.vibrate([8, 30, 8]),
  warning: () => "vibrate" in navigator && navigator.vibrate([15, 50, 15]),
};

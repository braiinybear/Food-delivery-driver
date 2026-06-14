export const Palette = {
  gold: "#D4AF37",
  cream: "#FFFFFF",
  navy: "#0D1B2A",
  navyLight: "#1B263B",
  navyLighter: "#415A77",
  white: "#FFFFFF",
  black: "#000000",
  alabaster: "#FAF9F6",
  champagne: "#F5F2E9",
};

export const LightTheme = {
  background: "#FFFFFF",
  surface: "#FFFFFF",
  primary: Palette.gold,
  primaryLight: Palette.cream,
  secondary: Palette.navy,
  text: "#1B263B",
  textSecondary: "#415A77",
  muted: "#778DA9",
  border: "#E0E1DD",
  light: "#F0F0F0",
  success: "#4CAF50",
  warning: "#FB8C00",
  danger: "#CF6679",
  white: "#FFFFFF",
  black: "#000000",
};

export const DarkTheme = {
  background: "#0D1B2A",
  surface: "#1B263B",
  primary: Palette.gold,
  primaryLight: "#162A3D",
  secondary: "#FAF9F6",
  text: "#FAF9F6",
  textSecondary: "#778DA9",
  muted: "#415A77",
  border: "#1B263B",
  light: "#1B263B",
  success: "#4CAF50",
  warning: "#FB8C00",
  danger: "#CF6679",
  white: "#FFFFFF",
  black: "#000000",
};

// Default export for legacy compatibility
export const Colors = LightTheme;

export type ThemeType = typeof LightTheme;
const DEFAULT_THEME_COLOR = "#7c3aed";

function toHsl(color: string): { hsl: string; luminance: number } | null {
  const match = /^#([0-9a-f]{6})$/i.exec(color);
  if (!match) return null;

  const value = match[1];
  const red = parseInt(value.slice(0, 2), 16) / 255;
  const green = parseInt(value.slice(2, 4), 16) / 255;
  const blue = parseInt(value.slice(4, 6), 16) / 255;
  const linearize = (channel: number) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  const luminance =
    0.2126 * linearize(red) +
    0.7152 * linearize(green) +
    0.0722 * linearize(blue);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;

  if (max !== min) {
    const delta = max - min;
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return {
    hsl: `${Math.round(hue)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`,
    luminance,
  };
}

export function applyUserThemeColor(color?: string | null) {
  const root = document.documentElement;
  const parsed = toHsl(color || DEFAULT_THEME_COLOR);
  if (!parsed) return;

  const { hsl, luminance } = parsed;
  const darkMode = root.classList.contains("dark");
  const foreground = luminance > 0.179 ? "228 31% 8%" : "0 0% 100%";
  const hue = hsl.split(" ")[0];
  const accentForeground = darkMode ? "0 0% 94%" : `${hue} 55% 34%`;

  root.style.setProperty("--primary", hsl);
  root.style.setProperty("--primary-foreground", foreground);
  root.style.setProperty("--ring", hsl);
  root.style.setProperty("--chart-1", hsl);
  root.style.setProperty("--sidebar-primary", hsl);
  root.style.setProperty("--sidebar-primary-foreground", foreground);
  root.style.setProperty("--sidebar-ring", hsl);
  root.style.setProperty("--accent", `${hue} ${darkMode ? "34% 17%" : "65% 94%"}`);
  root.style.setProperty("--accent-foreground", accentForeground);
  root.style.setProperty("--sidebar-accent", `${hue} ${darkMode ? "34% 17%" : "75% 93%"}`);
  root.style.setProperty("--sidebar-accent-foreground", accentForeground);
}

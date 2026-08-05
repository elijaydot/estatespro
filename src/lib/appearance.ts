export function applyAccentColor(accentColor: string) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(accentColor);
  if (!match) return;

  const red = parseInt(match[1], 16);
  const green = parseInt(match[2], 16);
  const blue = parseInt(match[3], 16);
  const normalizedRed = red / 255;
  const normalizedGreen = green / 255;
  const normalizedBlue = blue / 255;
  const maximum = Math.max(normalizedRed, normalizedGreen, normalizedBlue);
  const minimum = Math.min(normalizedRed, normalizedGreen, normalizedBlue);
  const lightness = (maximum + minimum) / 2;
  let hue = 0;
  let saturation = 0;

  if (maximum !== minimum) {
    const delta = maximum - minimum;
    saturation = lightness > 0.5 ? delta / (2 - maximum - minimum) : delta / (maximum + minimum);

    if (maximum === normalizedRed) {
      hue = ((normalizedGreen - normalizedBlue) / delta + (normalizedGreen < normalizedBlue ? 6 : 0)) / 6;
    } else if (maximum === normalizedGreen) {
      hue = ((normalizedBlue - normalizedRed) / delta + 2) / 6;
    } else {
      hue = ((normalizedRed - normalizedGreen) / delta + 4) / 6;
    }
  }

  const hsl = `${Math.round(hue * 360)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
  const perceivedBrightness = ((red * 299) + (green * 587) + (blue * 114)) / 1000;
  const foreground = perceivedBrightness >= 128 ? '222.2 84% 4.9%' : '210 40% 98%';
  const root = document.documentElement;

  root.style.setProperty('--accent', hsl);
  root.style.setProperty('--accent-foreground', foreground);
  root.style.setProperty('--primary', hsl);
  root.style.setProperty('--primary-foreground', foreground);
  root.style.setProperty('--ring', hsl);
  root.style.setProperty('--sidebar-primary', hsl);
  root.style.setProperty('--sidebar-primary-foreground', foreground);
  root.style.setProperty('--sidebar-ring', hsl);
}
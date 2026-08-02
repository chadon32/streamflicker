const FALLBACK_TEXT = '#f4f4f5';
const DARK_TEXT = '#18181b';

function toLinearChannel(value: number) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

export function getReadableTextColor(backgroundColor: string) {
  const match = /^#([0-9a-f]{6})$/i.exec(backgroundColor.trim());
  if (!match) return FALLBACK_TEXT;

  const value = match[1];
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  const luminance =
    0.2126 * toLinearChannel(red) +
    0.7152 * toLinearChannel(green) +
    0.0722 * toLinearChannel(blue);

  const darkContrast = (luminance + 0.05) / 0.05;
  const lightContrast = 1.05 / (luminance + 0.05);

  return darkContrast >= lightContrast ? DARK_TEXT : FALLBACK_TEXT;
}

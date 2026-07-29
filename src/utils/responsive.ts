/**
 * Returns a font size that fits within maxWidth.
 */
export function fitFontSize(
  text: string,
  maxWidth: number,
  maxFontSize: number,
  minFontSize = 12
): number {
  const charWidth = (fontSize: number) => fontSize * 0.6;
  let size = maxFontSize;
  while (size > minFontSize && text.length * charWidth(size) > maxWidth) {
    size -= 1;
  }
  return size;
}

/**
 * Truncates a string to fit within maxChars.
 */
export function truncateModelId(modelId: string, maxChars = 30): string {
  if (modelId.length <= maxChars) return modelId;
  const parts = modelId.split('/');
  if (parts.length === 2) {
    return parts[1].length <= maxChars ? parts[1] : parts[1].substring(0, maxChars - 1) + '…';
  }
  return modelId.substring(0, maxChars - 1) + '…';
}

/**
 * Safe percentage: clamps value between 0 and 100.
 */
export function safePercent(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, Math.max(0, (value / total) * 100));
}

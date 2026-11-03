export function formatWithUnderscore(str: string) {
  return str
    .trim()
    .replace(/'/g, '')
    .replace(/[-\s]+/g, '_');
}

export function formatHr(value: number): string {
  return `${value.toFixed(2)} HR`;
}

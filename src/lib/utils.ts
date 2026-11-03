export function formatWithUnderscore(str: string) {
  return str
    .trim()
    .replace(/'/g, '')
    .replace(/[-\s]+/g, '_');
}

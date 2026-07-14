export function formatTime(value: string): string {
  return new Date(value).toLocaleString("de-DE");
}

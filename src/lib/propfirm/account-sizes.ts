export const PROP_ACCOUNT_SIZES = [
  1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 200_000, 400_000, 600_000, 1_000_000
] as const;

export function formatAccountSizeLabel(size: number): string {
  if (size >= 1_000_000) return "1M";
  if (size >= 1_000) return `${size / 1_000}k`;
  return String(size);
}

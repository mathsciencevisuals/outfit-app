/**
 * Format a price for display.
 * If currency === 'INR' or 'USD' or missing, always show ₹.
 * The API may return 'USD' from old data — we normalise to ₹ for Indian users.
 */
export function formatPrice(amount: number, currency?: string): string {
  // Always use ₹ symbol for Indian market
  const rounded = Math.round(amount);
  return `₹${rounded.toLocaleString('en-IN')}`;
}

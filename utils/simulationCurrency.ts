/** Static FX rates for simulation config only — mirrors api/src/tabs/simulation/helpers/currency.ts */
const USD_PER_UNIT: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  CAD: 0.74,
  AUD: 0.65,
  JPY: 0.0067,
  CHF: 1.12,
  INR: 0.012,
  MXN: 0.055,
  BRL: 0.18,
};

export function convertAmountToUsd(
  amount: number | undefined,
  currency: string,
): number | undefined {
  if (amount === undefined || !Number.isFinite(amount)) return undefined;
  const code = currency.trim().toUpperCase();
  const rate = USD_PER_UNIT[code] || 1;
  return amount * rate;
}

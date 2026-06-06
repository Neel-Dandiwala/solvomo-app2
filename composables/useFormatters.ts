export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(value: number, digits = 2) {
  return `${value.toFixed(digits)}%`;
}

export function formatMultiplier(value: number, digits = 1) {
  return `${value.toFixed(digits)}x`;
}

export function formatCurrency(value: number, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatCompactNumber(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 100000 ? 0 : 1)}k`;
  return formatNumber(value);
}

export function formatCompactCurrency(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(value >= 100000 ? 0 : 1)}k`;
  return formatCurrency(value);
}

export function channelVariant(channel: string): "info" | "success" | "warning" | "neutral" {
  switch (channel) {
    case "Meta Ads":
      return "info";
    case "Google Ads":
      return "success";
    case "LinkedIn":
      return "warning";
    default:
      return "neutral";
  }
}

export function statusVariant(label: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (["Scaling", "Efficient", "Top performer", "On plan"].includes(label)) return "success";
  if (["Stable", "Monitoring", "Under review"].includes(label)) return "info";
  if (["Under target", "Fatiguing", "Underpacing"].includes(label)) return "warning";
  if (["Needs refresh", "Overpacing"].includes(label)) return "danger";
  return "neutral";
}

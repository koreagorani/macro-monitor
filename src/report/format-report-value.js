const EMPTY_VALUE = "—";

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function formatMagnitude(value, digits, { useGrouping = false } = {}) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping
  }).format(Math.abs(value));
}

function formatSigned(value, digits, { useGrouping = false } = {}) {
  if (!isFiniteNumber(value)) return EMPTY_VALUE;
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatMagnitude(value, digits, { useGrouping })}`;
}

function formatDate(value) {
  return typeof value === "string" && value !== "" ? value : EMPTY_VALUE;
}

function formatScore(value) {
  if (!isFiniteNumber(value)) return EMPTY_VALUE;
  const sign = value < 0 ? "-" : "";
  return `${sign}${formatMagnitude(value, 2)}`;
}

function formatPercentageChange(value) {
  if (!isFiniteNumber(value)) return EMPTY_VALUE;
  const oneDecimalMagnitude = Number(formatMagnitude(value, 1));
  const digits = value !== 0 && oneDecimalMagnitude === 0 ? 2 : 1;
  return `${formatSigned(value, digits)}%`;
}

function formatBasisPointChange(value) {
  if (!isFiniteNumber(value)) return EMPTY_VALUE;
  return `${formatSigned(value, 1)}bp`;
}

function formatIndicatorChange(value, unit) {
  if (!isFiniteNumber(value)) return EMPTY_VALUE;
  if (unit === "bp") return formatBasisPointChange(value);
  if (unit === "%") return formatPercentageChange(value);
  return `${formatSigned(value, 1)}${unit ? ` ${unit}` : ""}`;
}

function formatCorePceValue(value, unit = "% MoM") {
  if (!isFiniteNumber(value)) return EMPTY_VALUE;
  return `${formatMagnitude(value, 2)}${unit.startsWith("%") ? unit : ` ${unit}`}`;
}

function formatIndicatorCurrentValue(indicator) {
  const value = indicator?.currentValue;
  if (!isFiniteNumber(value)) return EMPTY_VALUE;

  const formatters = {
    us2y: () => `${formatMagnitude(value, 2)}%`,
    wti: () => `${formatMagnitude(value, 1)} ${indicator.unit}`,
    usdkrw: () => `${formatMagnitude(value, 1, { useGrouping: true })} ${indicator.unit}`,
    btc: () => `${formatMagnitude(value, 0, { useGrouping: true })} ${indicator.unit}`,
    sp500: () => `${formatMagnitude(value, 1, { useGrouping: true })} ${indicator.unit}`
  };

  const formatter = formatters[indicator?.indicatorId];
  return formatter
    ? formatter()
    : `${formatMagnitude(value, 1, { useGrouping: true })}${indicator?.unit ? ` ${indicator.unit}` : ""}`;
}

export {
  EMPTY_VALUE,
  formatBasisPointChange,
  formatCorePceValue,
  formatDate,
  formatIndicatorChange,
  formatIndicatorCurrentValue,
  formatPercentageChange,
  formatScore
};

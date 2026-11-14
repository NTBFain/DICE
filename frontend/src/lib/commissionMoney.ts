/** Decimal arithmetic keeps estimates and deposits consistent with server ROUND_HALF_UP. */
type Fraction = { numerator: bigint; denominator: bigint };
const ZERO = BigInt(0);
const TEN = BigInt(10);
const HUNDRED = BigInt(100);

function decimal(value: number): Fraction {
  if (!Number.isFinite(value)) throw new Error('Price must be finite');
  const [coefficient, exponent = '0'] = String(value).toLowerCase().split('e');
  const negative = coefficient.startsWith('-');
  const [whole, fraction = ''] = coefficient.replace(/^-/, '').split('.');
  let numerator = BigInt(whole + fraction) * (negative ? -BigInt(1) : BigInt(1));
  const scale = fraction.length - Number(exponent);
  if (scale < 0) numerator *= TEN ** BigInt(-scale);
  return { numerator, denominator: scale > 0 ? TEN ** BigInt(scale) : BigInt(1) };
}

function sum(values: readonly number[]): Fraction {
  return values.map(decimal).reduce((a, b) => ({
    numerator: a.numerator * b.denominator + b.numerator * a.denominator,
    denominator: a.denominator * b.denominator,
  }), { numerator: ZERO, denominator: BigInt(1) });
}

function round(value: Fraction): number {
  const negative = value.numerator < ZERO;
  const scaled = (negative ? -value.numerator : value.numerator) * HUNDRED;
  let cents = scaled / value.denominator;
  if ((scaled % value.denominator) * BigInt(2) >= value.denominator) cents += BigInt(1);
  return Number(negative ? -cents : cents) / 100;
}

export function roundMoney(value: number): number {
  return round(decimal(value));
}

export function calculateCommissionPrice(
  basePrice: number,
  fixedFees: readonly number[] = [],
  percentages: readonly number[] = [],
  includeBase = true,
): number {
  const fixed = sum(includeBase ? [basePrice, ...fixedFees] : fixedFees);
  const base = decimal(basePrice);
  const rates = sum(percentages);
  const percentage = { numerator: base.numerator * rates.numerator, denominator: base.denominator * rates.denominator * HUNDRED };
  return round({
    numerator: fixed.numerator * percentage.denominator + percentage.numerator * fixed.denominator,
    denominator: fixed.denominator * percentage.denominator,
  });
}

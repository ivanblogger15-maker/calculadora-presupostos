import type { Currency } from '../types';

export function toCents(value: number): number {
  return Math.round(value * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * Parses user input into a positive amount with at most 2 decimals.
 * Accepts both "12,50" and "12.50" (and "1.234,56").
 */
export function parseAmount(raw: string): number | null {
  let value = raw.trim().replace(/\s/g, '').replace(/[€$£]/g, '');
  if (!value) return null;

  if (value.includes(',') && value.includes('.')) {
    value = value.replace(/\./g, '').replace(',', '.');
  } else {
    value = value.replace(',', '.');
  }

  if (!/^\d*\.?\d*$/.test(value)) return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;

  return Math.round(parsed * 100) / 100;
}

export function formatMoney(
  cents: number,
  currency: Currency,
  locale: string,
  withDecimals = true,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  }).format(cents / 100);
}

export function currencySymbol(currency: Currency, locale: string): string {
  const parts = new Intl.NumberFormat(locale, { style: 'currency', currency }).formatToParts(0);
  return parts.find((part) => part.type === 'currency')?.value ?? currency;
}

export function formatNumber(value: number, locale: string, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
}

export function formatPercent(value: number, locale: string): string {
  return `${formatNumber(value, locale, 1)}%`;
}

/**
 * Splits an integer amount (cents) proportionally to the given weights,
 * guaranteeing that the parts always add up exactly to `totalCents`.
 * The largest-remainder method keeps the result fair and deterministic.
 */
export function distributeCents(totalCents: number, weights: number[]): number[] {
  if (totalCents <= 0 || weights.length === 0) return weights.map(() => 0);

  const totalWeight = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  if (totalWeight <= 0) return weights.map(() => 0);

  const safeWeights = weights.map((weight) => Math.max(0, weight));
  const raw = safeWeights.map((weight) => (totalCents * weight) / totalWeight);
  const parts = raw.map((value) => Math.floor(value));

  let remainder = totalCents - parts.reduce((sum, part) => sum + part, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  let cursor = 0;
  while (remainder > 0 && order.length > 0) {
    parts[order[cursor % order.length].index] += 1;
    remainder -= 1;
    cursor += 1;
  }

  return parts;
}

export function splitEqually(totalCents: number, count: number): number[] {
  return distributeCents(totalCents, Array.from({ length: count }, () => 1));
}

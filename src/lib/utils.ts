import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number | string | { toString(): string; toNumber?(): number } | null | undefined
): string {
  if (amount === null || amount === undefined) {
    return '₹0.00';
  }

  let numericAmount: number;

  if (typeof amount === 'number') {
    numericAmount = amount;
  } else if (typeof amount === 'string') {
    const trimmed = amount.trim();
    if (trimmed === '') return '₹0.00';
    numericAmount = Number(trimmed);
  } else if (typeof amount === 'bigint') {
    numericAmount = Number(amount);
  } else if (typeof (amount as any)?.toNumber === 'function') {
    // Handle Prisma Decimal or Decimal.js instances
    numericAmount = (amount as any).toNumber();
  } else if (typeof amount === 'object' && typeof amount.toString === 'function') {
    const str = amount.toString().trim();
    if (str === '' || str === '[object Object]') return '₹0.00';
    numericAmount = Number(str);
  } else {
    numericAmount = Number(amount);
  }

  if (typeof numericAmount !== 'number' || isNaN(numericAmount) || !isFinite(numericAmount)) {
    return '₹0.00';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
    .replace(/\-\-+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')          // Trim - from start of text
    .replace(/-+$/, '');         // Trim - from end of text
}

export function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ZYV-${year}${month}${day}-${randomSuffix}`;
}

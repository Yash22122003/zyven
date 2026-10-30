export const RESERVED_SLUGS = new Set([
  'account',
  'admin',
  'api',
  'app',
  'auth',
  'cart',
  'checkout',
  'customer',
  'dashboard',
  'docs',
  'explore',
  'help',
  'login',
  'logout',
  'marketplace',
  'orders',
  'plans',
  'pricing',
  'privacy',
  'register',
  'settings',
  'shop',
  'signin',
  'signup',
  'status',
  'support',
  'terms',
  'verify',
  'zyven',
]);

export function isReservedSlug(slug: string): boolean {
  if (!slug) return true;
  const normalized = slug.trim().toLowerCase();
  return RESERVED_SLUGS.has(normalized);
}

export function isValidSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug) return { valid: false, error: 'Slug is required' };
  const normalized = slug.trim().toLowerCase();
  if (normalized.length < 3) {
    return { valid: false, error: 'Slug must be at least 3 characters long' };
  }
  if (normalized.length > 50) {
    return { valid: false, error: 'Slug cannot exceed 50 characters' };
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    return { valid: false, error: 'Slug can only contain lowercase letters, numbers, and single hyphens' };
  }
  if (isReservedSlug(normalized)) {
    return { valid: false, error: `"${normalized}" is a reserved system route and cannot be used` };
  }
  return { valid: true };
}

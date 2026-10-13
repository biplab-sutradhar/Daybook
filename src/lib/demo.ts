export const DEMO_USER_LIMIT = 10;
export const DEMO_BYTE_LIMIT = 100 * 1024 * 1024;
export const DEMO_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface DemoStatus {
  spots_used: number;
  spots_limit: number;
  bytes_used: number;
  bytes_limit: number;
  expires_at: string | null;
}

export function expiresAtFrom(signedUpAt: string) {
  return new Date(new Date(signedUpAt).getTime() + DEMO_TTL_MS).toISOString();
}

export function daysRemaining(expiresAt: string, now = Date.now()) {
  const remaining = new Date(expiresAt).getTime() - now;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / (24 * 60 * 60 * 1000));
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function spotsLeft(status: DemoStatus) {
  return Math.max(0, status.spots_limit - status.spots_used);
}

export function demoExpiryLabel(expiresAt: string, now = Date.now()) {
  const days = daysRemaining(expiresAt, now);
  if (days <= 0) return 'This account expires today.';
  if (days === 1) return 'This account is deleted in 1 day.';
  return `This account is deleted in ${days} days.`;
}

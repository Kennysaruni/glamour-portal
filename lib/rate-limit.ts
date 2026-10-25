/**
 * API Rate Limiting Utility (Sliding Window In-Memory Store)
 * Protects login mutations, auth routes, and password reset endpoints.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale keys every 10 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      // Remove timestamps older than 2 hours
      const freshTimestamps = record.timestamps.filter((ts) => now - ts < 2 * 60 * 60 * 1000);
      if (freshTimestamps.length === 0) {
        rateLimitStore.delete(key);
      } else {
        rateLimitStore.set(key, { timestamps: freshTimestamps });
      }
    }
  }, 10 * 60 * 1000).unref?.();
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  limit: number;
  resetInSeconds: number;
}

/**
 * Checks and records a rate-limit event for a given key.
 *
 * @param key Unique identifier (e.g. `login:192.168.1.1` or `pwd_reset:user@example.com`)
 * @param limit Maximum allowed hits within the window
 * @param windowSeconds Window duration in seconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const cutoff = now - windowMs;

  const record = rateLimitStore.get(key) || { timestamps: [] };
  // Filter timestamps within current sliding window
  const activeTimestamps = record.timestamps.filter((ts) => ts > cutoff);

  if (activeTimestamps.length >= limit) {
    const oldest = activeTimestamps[0];
    const resetInSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return {
      success: false,
      remaining: 0,
      limit,
      resetInSeconds,
    };
  }

  // Record this attempt
  activeTimestamps.push(now);
  rateLimitStore.set(key, { timestamps: activeTimestamps });

  const remaining = Math.max(0, limit - activeTimestamps.length);
  const oldest = activeTimestamps[0] || now;
  const resetInSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));

  return {
    success: true,
    remaining,
    limit,
    resetInSeconds,
  };
}

/**
 * Login Rate Limit: Max 10 attempts per 15 minutes per IP
 */
export function checkLoginRateLimit(ip: string = "unknown"): RateLimitResult {
  const key = `login:ip:${ip}`;
  return checkRateLimit(key, 10, 15 * 60); // 10 attempts / 15 minutes
}

/**
 * Password Reset Rate Limit: Max 5 requests per hour per IP and per Email
 */
export function checkPasswordResetRateLimit(
  ip: string = "unknown",
  email?: string
): RateLimitResult {
  // Check IP limit
  const ipResult = checkRateLimit(`pwd_reset:ip:${ip}`, 5, 60 * 60);
  if (!ipResult.success) {
    return ipResult;
  }

  // Check Email limit if provided
  if (email) {
    const cleanEmail = email.trim().toLowerCase();
    const emailResult = checkRateLimit(`pwd_reset:email:${cleanEmail}`, 5, 60 * 60);
    if (!emailResult.success) {
      return emailResult;
    }
  }

  return ipResult;
}

/**
 * Extracts client IP address from headers safely.
 */
export function getClientIpFromHeaders(headersList: {
  get: (name: string) => string | null;
}): string {
  const forwardedFor = headersList.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0].trim();
    if (firstIp) return firstIp;
  }
  const realIp = headersList.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfConnectingIp = headersList.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();
  return "127.0.0.1";
}

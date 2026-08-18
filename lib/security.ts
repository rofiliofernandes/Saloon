import crypto from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_BUCKETS = 5000;

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Reject cross-site requests when the browser supplies an Origin header.
 * Requests without Origin are allowed for same-origin/server-to-server flows.
 */
export async function assertSameOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (!origin) return;

  const normalizedOrigin = normalizeOrigin(origin);
  const host = h.get("host");
  const forwardedProto = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto || (host?.includes("localhost") ? "http" : "https");

  if (!normalizedOrigin || !host || normalizedOrigin !== `${proto}://${host}`) {
    throw new SecurityError("CSRF validation failed.");
  }
}

export class SecurityError extends Error {
  status = 403;
  constructor(message: string) {
    super(message);
    this.name = "SecurityError";
  }
}

function getClientIp(h: Headers) {
  // Only trust the first address when the app is deployed behind a trusted proxy.
  // This is the normal configuration on Vercel/Cloudflare/etc.
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function keyFor(scope: string, subject: string) {
  const secret = process.env.RATE_LIMIT_SECRET || process.env.NEXT_PUBLIC_SUPABASE_URL || "local-development";
  return crypto.createHmac("sha256", secret).update(`${scope}:${subject}`).digest("hex");
}

/**
 * Small process-local limiter. It is intentionally a defense-in-depth layer,
 * not a replacement for a distributed WAF/edge limiter in production.
 */
export async function enforceRateLimit(
  scope: string,
  limit: number,
  windowMs: number,
  subject?: string,
) {
  const h = await headers();
  const identity = subject || getClientIp(h);
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const key = keyFor(scope, identity);

  // Prefer the database-backed limiter so all server instances share a bucket.
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (!error && data === false) {
      throw new RateLimitError(windowSeconds);
    }
    if (!error && data === true) return;
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    // The process-local fallback preserves protection if the migration has not
    // yet been applied or the database rate-limit function is temporarily unavailable.
    console.error("Distributed rate limiter unavailable; using local fallback", error);
  }

  const now = Date.now();
  const bucket = Math.floor(now / windowMs);
  const localKey = `${key}:${bucket}`;
  const existing = buckets.get(localKey);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [k, v] of buckets) {
        if (v.resetAt <= now) buckets.delete(k);
        if (buckets.size < MAX_BUCKETS) break;
      }
    }
    buckets.set(localKey, { count: 1, resetAt: (bucket + 1) * windowMs });
    return;
  }

  existing.count += 1;
  if (existing.count > limit) {
    throw new RateLimitError(Math.max(1, Math.ceil((existing.resetAt - now) / 1000)));
  }
}

export class RateLimitError extends Error {
  status = 429;
  retryAfter: number;
  constructor(retryAfter: number) {
    super("Too many requests. Please try again later.");
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

export function securityErrorResponse(error: unknown, fallback = "Request could not be completed.") {
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: error.message },
      { status: 429, headers: { "Retry-After": String(error.retryAfter) } },
    );
  }

  if (error instanceof SecurityError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  return NextResponse.json({ error: fallback }, { status: 500 });
}

export function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function safeAuthError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  if (["UNAUTHENTICATED", "FORBIDDEN"].includes(message)) return message;
  return fallback;
}

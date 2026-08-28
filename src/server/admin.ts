'use server';

import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

/**
 * Optimistic admin gate.
 *
 * The password lives in `ADMIN_PASSWORD` and is compared on the server, so it
 * is never sent to the browser — only a boolean comes back. Putting the literal
 * in client code would ship it in the JS bundle for anyone to read.
 *
 * This is a shared-secret gate, not user accounts: everyone with the password is
 * the same "admin", there are no sessions, and nothing is logged. It raises the
 * bar past "anyone can overwrite the sound library", which is what it is for.
 */
const passwordSchema = z.string().min(1).max(200);

/** Hash first so the comparison is over equal-length buffers. */
const digest = (value: string): Buffer =>
  createHash('sha256').update(value, 'utf8').digest();

export async function isAdminPassword(candidate: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;

  const parsed = passwordSchema.safeParse(candidate);
  if (!parsed.success) return false;

  // Constant-time, so a wrong password cannot be narrowed down by timing.
  return timingSafeEqual(digest(parsed.data), digest(expected));
}

/** Whether an admin gate is configured at all, for the UI to hide the entry point. */
export async function isAdminConfigured(): Promise<boolean> {
  return Boolean(process.env.ADMIN_PASSWORD);
}

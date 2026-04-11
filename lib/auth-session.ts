import { randomUUID } from 'node:crypto';

export const AUTH_COOKIE_NAME = 'vynra_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type SessionRecord = {
  email: string;
  expiresAt: number;
};

const sessionTable = new Map<string, SessionRecord>();

export function createAuthSession(email: string) {
  const id = randomUUID();
  sessionTable.set(id, {
    email: email.trim().toLowerCase(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return { id, maxAgeSeconds: Math.floor(SESSION_TTL_MS / 1000) };
}

export function getSessionById(sessionId?: string) {
  if (!sessionId) return null;
  const session = sessionTable.get(sessionId);
  if (!session) return null;

  if (session.expiresAt <= Date.now()) {
    sessionTable.delete(sessionId);
    return null;
  }

  return session;
}

export function clearSession(sessionId?: string) {
  if (!sessionId) return;
  sessionTable.delete(sessionId);
}

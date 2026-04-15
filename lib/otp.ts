import { randomInt } from 'crypto';

const OTP_TTL_MS = 15 * 60 * 1000;

export type OtpRecord = {
  email: string;
  otp: string;
  expiresAt: number;
  failedAttempts: number;
};

const otpTable = new Map<string, OtpRecord>();

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function generateOtpCode() {
  return String(randomInt(100000, 1000000));
}

export function saveOtp(email: string, otp: string) {
  const normalizedEmail = normalizeEmail(email);
  const record: OtpRecord = {
    email: normalizedEmail,
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
    failedAttempts: 0,
  };

  otpTable.set(normalizedEmail, record);
  return record;
}

export function findOtpByEmail(email: string) {
  return otpTable.get(normalizeEmail(email)) ?? null;
}

export function incrementOtpAttempts(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const record = otpTable.get(normalizedEmail);

  if (!record) return null;

  const updated: OtpRecord = {
    ...record,
    failedAttempts: record.failedAttempts + 1,
  };

  otpTable.set(normalizedEmail, updated);
  return updated;
}

export function removeOtp(email: string) {
  otpTable.delete(normalizeEmail(email));
}

import { randomInt } from 'node:crypto';

const OTP_TTL_MS = 15 * 60 * 1000;

type OTPRecord = {
  email: string;
  code: string;
  expiredAt: Date;
};

const otpTable = new Map<string, OTPRecord>();

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function generateOtpCode() {
  return randomInt(100000, 1000000).toString();
}

export function saveOtp(email: string, code: string) {
  const normalizedEmail = normalizeEmail(email);
  const expiredAt = new Date(Date.now() + OTP_TTL_MS);

  const record: OTPRecord = {
    email: normalizedEmail,
    code,
    expiredAt,
  };

  otpTable.set(normalizedEmail, record);
  return record;
}

export function findOtpByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const record = otpTable.get(normalizedEmail);

  if (!record) return null;

  if (record.expiredAt.getTime() <= Date.now()) {
    otpTable.delete(normalizedEmail);
    return null;
  }

  return record;
}

export function removeOtp(email: string) {
  otpTable.delete(normalizeEmail(email));
}

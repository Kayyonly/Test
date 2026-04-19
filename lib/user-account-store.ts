import { createHash } from 'crypto';

export type UserAccount = {
  email: string;
  name: string;
  passwordHash: string;
  avatarUrl: string;
  updatedAt: number;
};

type PendingRegistration = {
  email: string;
  name: string;
  passwordHash: string;
  createdAt: number;
};

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=256&q=80&auto=format&fit=crop';

const accountTable = new Map<string, UserAccount>();
const pendingRegistrationTable = new Map<string, PendingRegistration>();

function hashPassword(rawPassword: string) {
  return createHash('sha256').update(`${process.env.AUTH_PASSWORD_SALT ?? 'vynra'}:${rawPassword}`).digest('hex');
}

export function stageRegistration(email: string, name: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  pendingRegistrationTable.set(normalizedEmail, {
    email: normalizedEmail,
    name: name.trim(),
    passwordHash: hashPassword(password),
    createdAt: Date.now(),
  });
}

export function finalizeRegistration(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const pending = pendingRegistrationTable.get(normalizedEmail);

  if (!pending) return;

  accountTable.set(normalizedEmail, {
    email: normalizedEmail,
    name: pending.name,
    passwordHash: pending.passwordHash,
    avatarUrl: accountTable.get(normalizedEmail)?.avatarUrl ?? DEFAULT_AVATAR,
    updatedAt: Date.now(),
  });
  pendingRegistrationTable.delete(normalizedEmail);
}

export function validateLoginPassword(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const account = accountTable.get(normalizedEmail);

  if (!account) return false;
  return account.passwordHash === hashPassword(password);
}

export function getUserAccount(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const account = accountTable.get(normalizedEmail);

  if (account) {
    return {
      email: account.email,
      name: account.name,
      avatarUrl: account.avatarUrl,
      updatedAt: account.updatedAt,
    };
  }

  return {
    email: normalizedEmail,
    name: normalizedEmail.split('@')[0] || 'Vynra User',
    avatarUrl: DEFAULT_AVATAR,
    updatedAt: Date.now(),
  };
}

export function updateUserProfile(email: string, payload: { name: string; avatarUrl?: string }) {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = accountTable.get(normalizedEmail);
  const base = existing ?? {
    email: normalizedEmail,
    passwordHash: hashPassword(''),
    name: normalizedEmail.split('@')[0] || 'Vynra User',
    avatarUrl: DEFAULT_AVATAR,
    updatedAt: Date.now(),
  };

  accountTable.set(normalizedEmail, {
    ...base,
    name: payload.name.trim() || base.name,
    avatarUrl: payload.avatarUrl?.trim() || base.avatarUrl,
    updatedAt: Date.now(),
  });

  return getUserAccount(normalizedEmail);
}

export function changePassword(email: string, oldPassword: string, newPassword: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const account = accountTable.get(normalizedEmail);
  if (!account) return { success: false, message: 'Akun tidak ditemukan.' };

  if (account.passwordHash !== hashPassword(oldPassword)) {
    return { success: false, message: 'Password lama tidak sesuai.' };
  }

  accountTable.set(normalizedEmail, {
    ...account,
    passwordHash: hashPassword(newPassword),
    updatedAt: Date.now(),
  });

  return { success: true, message: 'Password berhasil diperbarui.' };
}


export function setUserPassword(email: string, newPassword: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = accountTable.get(normalizedEmail);

  if (!existing) {
    accountTable.set(normalizedEmail, {
      email: normalizedEmail,
      name: normalizedEmail.split('@')[0] || 'Vynra User',
      passwordHash: hashPassword(newPassword),
      avatarUrl: DEFAULT_AVATAR,
      updatedAt: Date.now(),
    });
    return;
  }

  accountTable.set(normalizedEmail, {
    ...existing,
    passwordHash: hashPassword(newPassword),
    updatedAt: Date.now(),
  });
}

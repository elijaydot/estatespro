import { describe, expect, it } from 'vitest';

type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

type Invite = {
  id: string;
  email: string;
  status: InviteStatus;
  expiresAt: number;
  acceptedAt: number | null;
  acceptedUserId: string | null;
};

function acceptInvite(invite: Invite, nowMs: number, userId: string) {
  if (invite.status === 'accepted') {
    return { ok: true as const, alreadyApplied: true, invite };
  }

  if (invite.status === 'revoked') {
    return { ok: false as const, reason: 'invite_revoked' };
  }

  if (invite.status === 'expired' || invite.expiresAt <= nowMs) {
    return { ok: false as const, reason: 'invite_expired' };
  }

  invite.status = 'accepted';
  invite.acceptedAt = nowMs;
  invite.acceptedUserId = userId;

  return { ok: true as const, alreadyApplied: false, invite };
}

function revokeInvite(invite: Invite, nowMs: number) {
  if (invite.status === 'accepted') {
    return { ok: false as const, reason: 'invite_already_accepted' };
  }

  invite.status = 'revoked';
  invite.acceptedAt = null;
  invite.acceptedUserId = null;

  return { ok: true as const, revokedAt: nowMs };
}

describe('Week 3 - invite lifecycle reliability', () => {
  it('accepts a valid invite exactly once and keeps replay idempotent', () => {
    const invite: Invite = {
      id: 'inv_1',
      email: 'tenant@example.com',
      status: 'pending',
      expiresAt: Date.now() + 3600_000,
      acceptedAt: null,
      acceptedUserId: null,
    };

    const first = acceptInvite(invite, Date.now(), 'user_1');
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.alreadyApplied).toBe(false);
    expect(invite.status).toBe('accepted');

    const second = acceptInvite(invite, Date.now() + 1000, 'user_1');
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.alreadyApplied).toBe(true);
    expect(invite.status).toBe('accepted');
  });

  it('rejects invite acceptance after expiry and after revocation', () => {
    const expiredInvite: Invite = {
      id: 'inv_2',
      email: 'tenant2@example.com',
      status: 'pending',
      expiresAt: Date.now() - 1,
      acceptedAt: null,
      acceptedUserId: null,
    };

    const expiredResult = acceptInvite(expiredInvite, Date.now(), 'user_2');
    expect(expiredResult).toEqual({ ok: false, reason: 'invite_expired' });

    const revokableInvite: Invite = {
      id: 'inv_3',
      email: 'tenant3@example.com',
      status: 'pending',
      expiresAt: Date.now() + 3600_000,
      acceptedAt: null,
      acceptedUserId: null,
    };

    const revoked = revokeInvite(revokableInvite, Date.now());
    expect(revoked.ok).toBe(true);
    expect(revokableInvite.status).toBe('revoked');

    const revokedAccept = acceptInvite(revokableInvite, Date.now(), 'user_3');
    expect(revokedAccept).toEqual({ ok: false, reason: 'invite_revoked' });
  });
});

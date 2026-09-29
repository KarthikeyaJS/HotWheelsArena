import { describe, expect, it } from 'vitest';
import { EMPTY_USER_STATS } from '../../../shared/index.js';
import { NOW } from '../testing/fixtures.js';
import {
  DEFAULT_DISPLAY_NAME,
  buildProfileDoc,
  profileBackfill,
  resolveDisplayName,
} from './profile.js';

const seed = {
  uid: 'u1',
  displayName: ' Asha Rao ',
  email: ' Asha@Example.com ',
  photoURL: 'https://lh3.googleusercontent.com/a/photo',
};

const completeProfile = {
  uid: 'u1',
  displayName: 'Asha Rao',
  email: 'asha@example.com',
  photoURL: 'https://lh3.googleusercontent.com/a/photo',
  xp: 450,
  level: 4,
  badges: ['first-ride'],
  stats: { ...EMPTY_USER_STATS, ordersPlaced: 1, carsOwned: 3 },
  role: 'customer',
  createdAt: 'EARLIER',
  updatedAt: 'EARLIER',
};

describe('buildProfileDoc', () => {
  it('creates a fresh collector profile with zeroed progression', () => {
    expect(buildProfileDoc(seed, NOW)).toEqual({
      uid: 'u1',
      displayName: 'Asha Rao',
      email: 'asha@example.com',
      photoURL: 'https://lh3.googleusercontent.com/a/photo',
      xp: 0,
      level: 1,
      badges: [],
      stats: { ...EMPTY_USER_STATS },
      role: 'customer',
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  it('falls back sensibly when the token lacks profile data', () => {
    const doc = buildProfileDoc({ uid: 'u2', displayName: '  ', email: null, photoURL: '' }, NOW);
    expect(doc.displayName).toBe(DEFAULT_DISPLAY_NAME);
    expect(doc.email).toBe('');
    expect(doc.photoURL).toBeNull();
  });

  it('never shares the stats object between profiles', () => {
    const a = buildProfileDoc({ uid: 'a' }, NOW);
    const b = buildProfileDoc({ uid: 'b' }, NOW);
    a.stats.carsOwned = 5;
    expect(b.stats.carsOwned).toBe(0);
    expect(EMPTY_USER_STATS.carsOwned).toBe(0);
  });
});

describe('resolveDisplayName', () => {
  it('prefers the display name, then the email local part, then "Collector"', () => {
    expect(resolveDisplayName({ displayName: 'Ravi', email: 'x@y.in' })).toBe('Ravi');
    expect(resolveDisplayName({ displayName: null, email: 'speedster@y.in' })).toBe('speedster');
    expect(resolveDisplayName({})).toBe('Collector');
    expect(resolveDisplayName({ displayName: 'x'.repeat(200) })).toHaveLength(80);
  });
});

describe('profileBackfill', () => {
  it('returns null for a complete profile (idempotent)', () => {
    expect(profileBackfill(completeProfile, seed, NOW)).toBeNull();
  });

  it('fills missing identity fields from the token without touching progression', () => {
    const patch = profileBackfill(
      {
        xp: 450,
        level: 4,
        badges: ['first-ride'],
        stats: completeProfile.stats,
        role: 'customer',
        createdAt: 'EARLIER',
        uid: 'u1',
      },
      seed,
      NOW,
    );
    expect(patch).toEqual({
      displayName: 'Asha Rao',
      email: 'asha@example.com',
      photoURL: 'https://lh3.googleusercontent.com/a/photo',
      updatedAt: NOW,
    });
  });

  it('never overwrites valid values written by other functions', () => {
    const patch = profileBackfill({ ...completeProfile, displayName: 'Custom Name' }, seed, NOW);
    expect(patch).toBeNull();
  });

  it('repairs malformed progression fields', () => {
    const patch = profileBackfill(
      {
        ...completeProfile,
        xp: -5,
        level: 0,
        badges: 'first-ride',
        stats: { carsOwned: 3 },
        role: 'admin',
        createdAt: null,
      },
      seed,
      NOW,
    );
    expect(patch).toEqual({
      xp: 0,
      level: 1,
      badges: [],
      stats: { ...EMPTY_USER_STATS, carsOwned: 3 },
      role: 'customer',
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  it('keeps a stored null photo when the token has none, and normalises malformed photos', () => {
    const noPhotoSeed = { uid: 'u1', displayName: 'Asha Rao', email: 'asha@example.com' };
    expect(profileBackfill({ ...completeProfile, photoURL: null }, noPhotoSeed, NOW)).toBeNull();
    expect(profileBackfill({ ...completeProfile, photoURL: '' }, noPhotoSeed, NOW)).toEqual({
      photoURL: null,
      updatedAt: NOW,
    });
    expect(profileBackfill({ ...completeProfile, photoURL: null }, seed, NOW)).toEqual({
      photoURL: seed.photoURL,
      updatedAt: NOW,
    });
  });

  it('adds the uid when it is missing or wrong', () => {
    expect(profileBackfill({ ...completeProfile, uid: undefined }, seed, NOW)).toEqual({
      uid: 'u1',
      updatedAt: NOW,
    });
  });
});

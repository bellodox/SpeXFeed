/**
 * Storage key migration utilities for the blockcore → spexfeed namespace transition.
 * Provides backward-compatible read/write/remove for localStorage keys.
 */

/** Old key prefix used by Blockcore Notes */
const OLD_PREFIX = 'blockcore:notes:';
/** New key prefix for SpeXFeed */
const NEW_PREFIX = 'spexfeed:';

/**
 * Maps an old-style storage key to the new namespace.
 * Example: 'blockcore:notes:nostr:prvkey' → 'spexfeed:nostr:prvkey'
 */
export function migrateKeyName(oldKey: string): string {
  if (oldKey.startsWith(OLD_PREFIX)) {
    return NEW_PREFIX + oldKey.substring(OLD_PREFIX.length);
  }

  return oldKey;
}

/**
 * Reads a value from localStorage with backward-compatible migration.
 * Tries the new key first; if not found, reads the old key,
 * copies to the new key, removes the old key, and returns the value.
 */
export function migratedGetItem(oldKey: string): string | null {
  const newKey = migrateKeyName(oldKey);

  let value = localStorage.getItem(newKey);
  if (value !== null) {
    return value;
  }

  value = localStorage.getItem(oldKey);
  if (value !== null) {
    localStorage.setItem(newKey, value);
    localStorage.removeItem(oldKey);
  }

  return value;
}

/**
 * Writes a value to localStorage using the new key name only.
 */
export function migratedSetItem(oldKey: string, value: string): void {
  const newKey = migrateKeyName(oldKey);
  localStorage.setItem(newKey, value);
}

/**
 * Removes a value from both old and new localStorage keys.
 */
export function migratedRemoveItem(oldKey: string): void {
  const newKey = migrateKeyName(oldKey);
  localStorage.removeItem(newKey);
  localStorage.removeItem(oldKey);
}

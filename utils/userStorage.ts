/**
 * User-scoped localStorage utility.
 * Prefixes all keys with the user's Firebase UID to isolate data per user.
 */

let _currentUserId: string | null = null;

export function setCurrentUserId(uid: string | null) {
  _currentUserId = uid;
}

export function getCurrentUserId(): string | null {
  return _currentUserId;
}

/**
 * Returns a user-scoped localStorage key.
 * If userId is provided, uses it. Otherwise falls back to the global current user.
 * If no user is set, returns the key as-is (backwards compat for pre-login).
 */
export function getUserStorageKey(userId: string | null | undefined, key: string): string {
  const uid = userId || _currentUserId;
  if (!uid) return key;
  return `${uid}_${key}`;
}

/**
 * Get a value from user-scoped localStorage.
 */
export function getUserStorage(key: string, userId?: string): string | null {
  try {
    return localStorage.getItem(getUserStorageKey(userId ?? null, key));
  } catch {
    return null;
  }
}

/**
 * Set a value in user-scoped localStorage.
 */
export function setUserStorage(key: string, value: string, userId?: string): void {
  try {
    localStorage.setItem(getUserStorageKey(userId ?? null, key), value);
  } catch {}
}

/**
 * Migrate existing non-prefixed localStorage keys to user-scoped keys.
 * Only runs once per user (tracks migration flag).
 */
export function migrateLocalStorageForUser(uid: string): void {
  const migrationKey = `${uid}_storage_migrated`;
  try {
    if (localStorage.getItem(migrationKey)) return; // Already migrated
    
    const keysToMigrate = [
      'trucker_hud_layout',
      'trucker_hud_order',
      'trucker_hud_positions',
      'trucker_hud_scales',
      'trucker_weeklyEarnings',
      'trucker_milesThisWeek',
      'trucker_fuelCost',
      'trucker_truckCost',
      'trucker_weekDeductions',
      'trucker_takeHomePercentage',
      'trucker_unitSystem',
      'trucker_dataSaver',
      'trucker_current_region',
      'trucker_route_history',
      'nav_current_destination',
      'nav_destination_coords',
      'nav_north_up',
      'nav_avoid_tolls',
      'nav_avoid_ferries',
      'nav_avoid_unpaved',
      'nav_carplay_mode',
      'nav_show_pois',
      'nav_show_truck_restrictions',
      'nav_show_traffic_signs',
      'nav_show_facilities',
      'nav_3d_mode',
      'nav_waypoints',
      'poi_filters',
      'truck_pois',
      'truck_target_rate',
      'truck_max_weight',
      'offline_map_regions',
      'offline_route_cache',
    ];

    for (const key of keysToMigrate) {
      const existingValue = localStorage.getItem(key);
      if (existingValue !== null) {
        const newKey = `${uid}_${key}`;
        // Only copy if new key doesn't already exist
        if (localStorage.getItem(newKey) === null) {
          localStorage.setItem(newKey, existingValue);
        }
      }
    }

    localStorage.setItem(migrationKey, 'true');
  } catch {}
}

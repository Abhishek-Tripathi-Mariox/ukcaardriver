import { create } from 'zustand';
import { fetchCurrentUser, type ApiUser } from '../services/api';

/**
 * Holds the full logged-in user (driver) profile so screens don't have to
 * re-fetch /auth/me every time they need name / phone / email. Hydrated
 * once at app start (after login) and refreshed on demand.
 *
 * Why this exists: prefilling the Razorpay sheet, populating the profile
 * screen, the cashout screen, and the rider-call button all need the same
 * user fields. Without a shared store, each screen calls /auth/me on
 * mount, which both wastes round-trips and races (e.g. user taps Recharge
 * before the screen's own fetch returns → no prefill).
 */
interface UserState {
  user: ApiUser | null;
  loading: boolean;
  /** Fetch /auth/me and store the result. Idempotent. */
  hydrate: () => Promise<ApiUser | null>;
  /** Force a refresh — used after profile updates. */
  refresh: () => Promise<ApiUser | null>;
  /** Clear on logout. */
  clear: () => void;
}

let hydratePromise: Promise<ApiUser | null> | null = null;

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  loading: false,

  hydrate: async () => {
    // Already loaded — nothing to do.
    if (get().user) return get().user;
    // De-dupe concurrent callers — without this, every screen mounting at
    // the same time fires its own /auth/me request.
    if (hydratePromise) return hydratePromise;

    set({ loading: true });
    hydratePromise = fetchCurrentUser()
      .then(u => {
        set({ user: u, loading: false });
        hydratePromise = null;
        return u;
      })
      .catch(err => {
        console.warn('[userStore] hydrate failed:', err);
        set({ loading: false });
        hydratePromise = null;
        return null;
      });
    return hydratePromise;
  },

  refresh: async () => {
    set({ loading: true });
    try {
      const u = await fetchCurrentUser();
      set({ user: u, loading: false });
      return u;
    } catch (err) {
      console.warn('[userStore] refresh failed:', err);
      set({ loading: false });
      return null;
    }
  },

  clear: () => set({ user: null }),
}));

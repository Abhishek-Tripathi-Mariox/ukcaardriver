import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';
import { CACHE_KEYS, invalidate } from './apiCache';

/**
 * Socket.IO client for the driver app. The backend Socket.IO server lives
 * at the same host as the REST API (port 5000), but at the root path — not
 * under /api/v1. We strip the `/api/v1` suffix to derive the socket URL.
 *
 * The socket reconnects automatically and re-authenticates on every
 * reconnection, so a JWT refresh between disconnect/connect picks up the
 * new token without us having to wire a manual refresh path.
 */
const SOCKET_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
const ACCESS_TOKEN_KEY = 'auth.accessToken';

let socket: Socket | null = null;
let connectionGeneration = 0;
let presenceTimer: ReturnType<typeof setInterval> | null = null;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
const statusSubscribers = new Set<(isOnline: boolean) => void>();

export function subscribeDriverStatus(callback: (isOnline: boolean) => void): () => void {
  statusSubscribers.add(callback);
  return () => { statusSubscribers.delete(callback); };
}

function publishDriverStatus(isOnline: boolean): void {
  invalidate(CACHE_KEYS.CURRENT_USER);
  invalidate(CACHE_KEYS.DASHBOARD);
  statusSubscribers.forEach(callback => callback(isOnline));
}

type RideRequestPayload = {
  rideId: string;
  variant: 'instant' | 'private';
  passengerName: string;
  pickup: string;
  drop: string;
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
  fare: number;
  distance: number;
  duration: number;
};

type RideAssignedPayload = {
  rideId: string;
  ride: any;
  assignedBy?: 'admin' | 'system';
  message?: string;
};

type Listeners = {
  onRideRequest?: (payload: RideRequestPayload) => void;
  onRideStatus?: (payload: { rideId: string; status: string }) => void;
  /** Fired when another driver claimed a request that we were also offered.
   *  The app should dismiss any open RideRequestModal for this rideId. */
  onRideRequestTaken?: (payload: { rideId: string }) => void;
  /** Admin force-assigned this ride. Skip the accept/reject modal — the
   *  ride is already locked to this driver. App should navigate straight
   *  to the OTP / ride-in-progress flow. */
  onRideAssigned?: (payload: RideAssignedPayload) => void;
  /** Ride cancelled by another party (customer/admin) — driver-side
   *  cleanup so any open in-progress / accept modal can dismiss. */
  onRideCancelled?: (payload: { rideId: string; reason?: string; message?: string }) => void;
  /** Admin reassigned this ride to a DIFFERENT driver — the (old) driver
   *  should drop it so they stop heading to a pickup that's no longer theirs. */
  onRideReassigned?: (payload: { rideId: string; message?: string }) => void;
  /** Chat message from the rider, scoped to the joined ride room. */
  onChatMessage?: (payload: {
    rideId: string;
    sender: string;
    message: string;
    type?: string;
    timestamp: number;
  }) => void;
  /** A rider on this driver's scheduled shuttle asked to be dropped off early.
   *  The app surfaces the Emergency Alert (approve/decline) screen. */
  onEarlyDropRequest?: (payload: {
    bookingId: string;
    customerName: string;
    contact?: string;
    seats: number[];
    reason?: string;
    routeId?: string;
    departureIndex?: number;
    departureDate?: string;
  }) => void;
  /** The rider withdrew their still-pending early-drop request. */
  onEarlyDropCancelled?: (payload: { bookingId: string }) => void;
};

let listeners: Listeners = {};

export function setSocketListeners(next: Listeners): void {
  listeners = { ...listeners, ...next };
}

export function clearSocketListeners(): void {
  listeners = {};
}

/**
 * Connect (or reconnect) the driver's socket. Safe to call multiple times —
 * if a live connection already exists, it's reused. Call after login and
 * after any explicit token refresh.
 */
export async function connectSocket(): Promise<Socket | null> {
  const generation = connectionGeneration;
  const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token || generation !== connectionGeneration) return null;

  // Reuse a connecting/reconnecting socket too; stage changes must not
  // create duplicate connections or duplicate presence timers.
  if (socket) return socket;

  const s = io(SOCKET_URL, {
    auth: callback => {
      AsyncStorage.getItem(ACCESS_TOKEN_KEY).then(current => callback({ token: current ?? '' }));
    },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  const heartbeat = () => {
    // Backgrounded/killed apps must not retain online status indefinitely.
    // Do not buffer heartbeats while disconnected and replay stale contact.
    if (!s.connected || AppState.currentState !== 'active') return;
    s.emit('driver:heartbeat', (status: { isOnline: boolean }) => {
      if (socket === s && typeof status?.isOnline === 'boolean') {
        publishDriverStatus(status.isOnline);
      }
    });
  };
  presenceTimer = setInterval(heartbeat, 30_000);
  appStateSubscription = AppState.addEventListener('change', state => {
    if (state === 'active') heartbeat();
  });

  s.on('connect', () => {
    console.log('[socket] connected');
    heartbeat();
    // Replay queued joins so a connect-after-join doesn't lose membership,
    // and the same after a reconnect (server forgets rooms on disconnect).
    for (const rideId of joinedRideRooms) {
      s.emit('ride:join', rideId);
    }
  });

  s.on('driver:status', (status: { isOnline: boolean }) => {
    if (typeof status?.isOnline === 'boolean') publishDriverStatus(status.isOnline);
  });

  s.on('disconnect', reason => {
    console.log('[socket] disconnected:', reason);
  });

  s.on('connect_error', err => {
    console.warn('[socket] connect_error:', err.message);
  });

  // Server pushes a new ride to drivers within 5km. We just forward to the
  // app's listener; the screen layer decides whether to display the modal.
  s.on('ride:new-request', (payload: RideRequestPayload) => {
    listeners.onRideRequest?.(payload);
  });

  s.on('ride:status', (payload: { rideId: string; status: string }) => {
    listeners.onRideStatus?.(payload);
  });

  s.on('ride:request-taken', (payload: { rideId: string }) => {
    listeners.onRideRequestTaken?.(payload);
  });

  s.on('ride:assigned', (payload: RideAssignedPayload) => {
    listeners.onRideAssigned?.(payload);
  });

  s.on('ride:cancelled', (payload: { rideId: string; reason?: string; message?: string }) => {
    listeners.onRideCancelled?.(payload);
  });

  s.on('ride:reassigned', (payload: { rideId: string; message?: string }) => {
    listeners.onRideReassigned?.(payload);
  });

  s.on('chat:new-message', (payload: {
    rideId: string;
    sender: string;
    message: string;
    type?: string;
    timestamp: number;
  }) => {
    listeners.onChatMessage?.(payload);
  });

  s.on('scheduled:early-drop-request', (payload: any) => {
    listeners.onEarlyDropRequest?.(payload);
  });

  s.on('scheduled:early-drop-cancelled', (payload: { bookingId: string }) => {
    listeners.onEarlyDropCancelled?.(payload);
  });

  socket = s;
  return s;
}

export function disconnectSocket(): void {
  connectionGeneration++;
  if (presenceTimer !== null) clearInterval(presenceTimer);
  presenceTimer = null;
  appStateSubscription?.remove();
  appStateSubscription = null;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  joinedRideRooms.clear();
  clearSocketListeners();
}

export function getSocket(): Socket | null {
  return socket;
}

// Same connect-safe join machinery the customer side uses. Without this,
// any joinRideRoom() call that races a socket reconnect (very common on
// app foregrounding) is silently dropped and the driver stops getting
// ride-scoped events.
const joinedRideRooms = new Set<string>();

/**
 * Joins the per-ride room so the driver gets `driver:location:update` and
 * other ride-scoped events. Call after accepting a ride. Safe to call
 * before the socket connects — the join is queued and replayed on connect.
 */
export function joinRideRoom(rideId: string): void {
  joinedRideRooms.add(rideId);
  if (socket?.connected) {
    socket.emit('ride:join', rideId);
  }
}

export function leaveRideRoom(rideId: string): void {
  joinedRideRooms.delete(rideId);
  if (socket?.connected) {
    socket.emit('ride:leave', rideId);
  }
}

/** Push the driver's GPS to the backend so dispatch can find them. */
export function emitDriverLocation(loc: {
  lat: number;
  lng: number;
  heading?: number;
}): void {
  if (socket?.connected && AppState.currentState === 'active') {
    socket.emit('driver:location', loc);
  }
}

/** Send a chat message over the joined ride room. Backend echoes it back
 *  as `chat:new-message`, persists it, and pushes the recipient. */
export function sendChatMessage(rideId: string, message: string, type: string = 'text'): void {
  if (!socket?.connected) return;
  socket.emit('chat:message', { rideId, message, type });
}

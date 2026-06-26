import { create } from 'zustand';

type DriverStatus = 'offline' | 'online' | 'on-trip';

interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleNumber: string;
}

interface DriverState {
  driver: Driver | null;
  status: DriverStatus;
  earningsToday: number;
  tripsToday: number;
  setDriver: (driver: Driver) => void;
  clearDriver: () => void;
  setStatus: (status: DriverStatus) => void;
  addEarnings: (amount: number) => void;
  incrementTrips: () => void;
}

export const useDriverStore = create<DriverState>(set => ({
  driver: null,
  status: 'offline',
  earningsToday: 0,
  tripsToday: 0,
  setDriver: driver => set({ driver }),
  clearDriver: () => set({ driver: null, status: 'offline' }),
  setStatus: status => set({ status }),
  addEarnings: amount =>
    set(state => ({ earningsToday: state.earningsToday + amount })),
  incrementTrips: () =>
    set(state => ({ tripsToday: state.tripsToday + 1 })),
}));

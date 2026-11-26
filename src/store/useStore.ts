import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { adhkarData } from '../data/adhkar';

function getTodayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface AppState {
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  adhkarDate: string;
  adhkarProgress: Record<number, number>;
  checkAdhkarDayReset: () => void;
  incrementDhikr: (id: number) => void;
  resetDhikr: (id: number) => void;
  resetCategory: (category: string) => void;

  tasbeehCount: number;
  tasbeehGoal: number;
  tasbeehSound: boolean;
  toggleTasbeehSound: () => void;
  incrementTasbeeh: () => void;
  resetTasbeeh: () => void;
  setTasbeehGoal: (goal: number) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      isDarkMode: true,
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

      adhkarDate: getTodayKey(),
      adhkarProgress: {},

      checkAdhkarDayReset: () =>
        set((state) => {
          const today = getTodayKey();
          if (state.adhkarDate !== today) {
            return { adhkarDate: today, adhkarProgress: {} };
          }
          return state;
        }),

      incrementDhikr: (id) =>
        set((state) => {
          const today = getTodayKey();
          const baseProgress = state.adhkarDate === today ? state.adhkarProgress : {};
          const current = baseProgress[id] || 0;
          const dhikr = adhkarData.find((d) => d.id === id);
          if (dhikr && current < dhikr.count) {
            return {
              adhkarDate: today,
              adhkarProgress: { ...baseProgress, [id]: current + 1 },
            };
          }
          if (state.adhkarDate !== today) {
            return { adhkarDate: today, adhkarProgress: baseProgress };
          }
          return state;
        }),

      resetDhikr: (id) =>
        set((state) => {
          const newProgress = { ...state.adhkarProgress };
          delete newProgress[id];
          return { adhkarProgress: newProgress };
        }),

      resetCategory: (category) =>
        set((state) => {
          const newProgress = { ...state.adhkarProgress };
          adhkarData
            .filter((d) => d.category === category)
            .forEach((d) => {
              delete newProgress[d.id];
            });
          return { adhkarDate: getTodayKey(), adhkarProgress: newProgress };
        }),

      tasbeehCount: 0,
      tasbeehGoal: 100,
      tasbeehSound: true,
      toggleTasbeehSound: () => set((state) => ({ tasbeehSound: !state.tasbeehSound })),
      incrementTasbeeh: () => set((state) => ({ tasbeehCount: state.tasbeehCount + 1 })),
      resetTasbeeh: () => set({ tasbeehCount: 0 }),
      setTasbeehGoal: (goal) => set({ tasbeehGoal: Math.min(100000, Math.max(1, goal)) }),
    }),
    {
      name: 'urwah-storage',
    }
  )
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { adhkarData, Dhikr } from '../data/adhkar';

interface AppState {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  
  adhkarProgress: Record<number, number>;
  incrementDhikr: (id: number) => void;
  resetDhikr: (id: number) => void;
  resetCategory: (category: string) => void;
  
  tasbeehCount: number;
  tasbeehGoal: number;
  incrementTasbeeh: () => void;
  resetTasbeeh: () => void;
  setTasbeehGoal: (goal: number) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      isDarkMode: true,
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      
      adhkarProgress: {},
      
      incrementDhikr: (id) => set((state) => {
        const current = state.adhkarProgress[id] || 0;
        const dhikr = adhkarData.find(d => d.id === id);
        if (dhikr && current < dhikr.count) {
          return { adhkarProgress: { ...state.adhkarProgress, [id]: current + 1 } };
        }
        return state;
      }),
      
      resetDhikr: (id) => set((state) => {
        const newProgress = { ...state.adhkarProgress };
        delete newProgress[id];
        return { adhkarProgress: newProgress };
      }),
      
      resetCategory: (category) => set((state) => {
        const newProgress = { ...state.adhkarProgress };
        adhkarData.filter(d => d.category === category).forEach(d => {
          delete newProgress[d.id];
        });
        return { adhkarProgress: newProgress };
      }),
      
      tasbeehCount: 0,
      tasbeehGoal: 100,
      incrementTasbeeh: () => set((state) => ({ tasbeehCount: state.tasbeehCount + 1 })),
      resetTasbeeh: () => set({ tasbeehCount: 0 }),
      setTasbeehGoal: (goal) => set({ tasbeehGoal: goal }),
    }),
    {
      name: 'urwah-storage',
    }
  )
);

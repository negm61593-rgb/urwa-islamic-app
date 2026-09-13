import { create } from 'zustand';
import { Surah, Reciter } from './services/quranService';

interface PlayerState {
  currentSurah: Surah | null;
  isPlaying: boolean;
  reciter: Reciter | null;
  reciters: Reciter[];
  surahList: Surah[];
  
  setSurah: (surah: Surah) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setReciter: (reciter: Reciter) => void;
  setReciters: (reciters: Reciter[]) => void;
  setSurahList: (list: Surah[]) => void;
  nextSurah: () => void;
  prevSurah: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSurah: null,
  isPlaying: false,
  reciter: null,
  reciters: [],
  surahList: [],

  setSurah: (surah) => set({ currentSurah: surah, isPlaying: true }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setReciter: (reciter) => set({ reciter }),
  setReciters: (reciters) => set({ reciters }),
  setSurahList: (list) => set({ surahList: list }),
  
  nextSurah: () => {
    const { currentSurah, surahList } = get();
    if (!currentSurah || surahList.length === 0) return;
    const currentIndex = surahList.findIndex((s) => s.id === currentSurah.id);
    const nextIndex = (currentIndex + 1) % surahList.length;
    set({ currentSurah: surahList[nextIndex], isPlaying: true });
  },

  prevSurah: () => {
    const { currentSurah, surahList } = get();
    if (!currentSurah || surahList.length === 0) return;
    const currentIndex = surahList.findIndex((s) => s.id === currentSurah.id);
    const prevIndex = (currentIndex - 1 + surahList.length) % surahList.length;
    set({ currentSurah: surahList[prevIndex], isPlaying: true });
  },
}));

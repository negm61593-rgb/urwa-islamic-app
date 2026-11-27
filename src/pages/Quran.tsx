import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Book,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Minus,
  Plus,
  Play,
  Pause,
  Volume2,
  Download,
  Trash2,
  CheckCircle2,
  X,
} from 'lucide-react';
import { offlineService } from '../services/offlineService';
import { fetchJsonWithCache } from '../services/cacheService';
import { TajweedToggle } from '../components/TajweedToggle';
import { cn, toArabicNumerals } from '../lib/utils';

interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

interface Ayah {
  number: number;
  text: string;          // plain Uthmani text
  tajweedText?: string;  // tagged string with <tajweed class=...> from quran.com
  numberInSurah: number;
  juz: number;
  verse_key: string;
}

interface SurahDetail extends Surah {
  ayahs: Ayah[];
}

interface ReciterItem {
  id: string;
  name: string;
  serverUrl: string;
  mp3quranReadId: number | null;
}

const reciters: ReciterItem[] = [
  { id: 'yasser_aldosari',       name: 'ياسر الدوسري',         serverUrl: 'https://server11.mp3quran.net/yasser/',                              mp3quranReadId: 92 },
  { id: 'abdul_basit',           name: 'عبد الباسط عبد الصمد', serverUrl: 'https://server7.mp3quran.net/basit/',                                mp3quranReadId: 51 },
  { id: 'alafasy',               name: 'مشاري راشد العفاسي',   serverUrl: 'https://server8.mp3quran.net/afs/',                                  mp3quranReadId: 123 },
  { id: 'maher_almuaiqly',       name: 'ماهر المعيقلي',        serverUrl: 'https://cdn.mp3quran.net/audio/maher-muaiqly/r3/',                   mp3quranReadId: 133 },
  { id: 'minshawi',              name: 'محمد صديق المنشاوي',   serverUrl: 'https://server10.mp3quran.net/minsh/',                               mp3quranReadId: 112 },
  { id: 'husary',                name: 'محمود خليل الحصري',    serverUrl: 'https://server13.mp3quran.net/husr/',                                mp3quranReadId: 118 },
  { id: 'khalid_alqahtani',      name: 'خالد القحطاني',        serverUrl: 'https://server10.mp3quran.net/qht/',                                 mp3quranReadId: 21 },
  { id: 'ahmed_alajmi',          name: 'أحمد العجمي',          serverUrl: 'https://server10.mp3quran.net/ajm/',                                 mp3quranReadId: 5 },
  { id: 'nasser_alqatami',       name: 'ناصر القطامي',         serverUrl: 'https://server6.mp3quran.net/qtm/',                                  mp3quranReadId: 86 },
  { id: 'abdul_rahman_alsudais', name: 'عبد الرحمن السديس',    serverUrl: 'https://server11.mp3quran.net/sds/',                                 mp3quranReadId: 54 },
  { id: 'islam_sobhi',           name: 'إسلام صبحي',           serverUrl: 'https://server14.mp3quran.net/islam/Rewayat-Hafs-A-n-Assem/',        mp3quranReadId: null },
  { id: 'abu_bakr_al_shatri',    name: 'أبو بكر الشاطري',      serverUrl: 'https://server11.mp3quran.net/shatri/',                              mp3quranReadId: 4 },
  { id: 'muhammad_al_luhaidan',  name: 'محمد اللحيدان',        serverUrl: 'https://server8.mp3quran.net/lhdan/',                                mp3quranReadId: null },
];

interface VerseTiming {
  verse_key: string;
  timestamp_from: number;
  timestamp_to: number;
}

/** Normalize Arabic letters & digits so search works seamlessly regardless of hamza/diacritics/numerals. */
function normalizeArabicSearch(input: string): string {
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  return input
    .trim()
    .toLowerCase()
    .replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)))
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
}

/** Safely convert quran.com `<tajweed class=...>` markup into React elements without dangerouslySetInnerHTML. */
function renderTajweedNodes(raw: string): React.ReactNode {
  const cleaned = raw.replace(/<span[^>]*class=["']?end["']?[^>]*>.*?<\/span>/gi, '').trim();
  const nodes: React.ReactNode[] = [];
  const regex = /<tajweed\s+class=["']?([a-z0-9_]+)["']?[^>]*>(.*?)<\/tajweed>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = regex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(cleaned.slice(lastIndex, match.index));
    }
    const ruleClass = match[1];
    const innerText = match[2].replace(/<[^>]+>/g, '');
    nodes.push(
      <span key={`tj-${keyIdx++}`} className={`tajweed-${ruleClass}`}>
        {innerText}
      </span>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < cleaned.length) {
    nodes.push(cleaned.slice(lastIndex).replace(/<[^>]+>/g, ''));
  }

  return nodes;
}

export default function Quran() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<number | null>(() => {
    const p = Number(searchParams.get('surah'));
    return p >= 1 && p <= 114 ? p : null;
  });
  const [surahDetail, setSurahDetail] = useState<SurahDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [fontSize, setFontSize] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('urwah_quran_font_size'));
      if (saved >= 20 && saved <= 80) return saved;
    } catch {
      // Ignore storage read errors
    }
    return typeof window !== 'undefined' && window.innerWidth < 640 ? 32 : 42;
  });
  const [tajweedEnabled, setTajweedEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('urwah_quran_tajweed') === 'true';
    } catch {
      return false;
    }
  });
  const [tajweedLoading, setTajweedLoading] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<number | null>(null);
  const [selectedReciter, setSelectedReciter] = useState('yasser_aldosari');
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [verseTimings, setVerseTimings] = useState<VerseTiming[]>([]);
  const [activeAyahKey, setActiveAyahKey] = useState<string | null>(null);
  const [downloadingSurahs, setDownloadingSurahs] = useState<{ [key: string]: number }>({});
  const [cachedUrls, setCachedUrls] = useState<string[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const ayahRefs = useRef<{ [key: string]: HTMLSpanElement | null }>({});
  const surahDetailCache = useRef<Record<number, SurahDetail>>({});
  const surahsRef = useRef<Surah[]>([]);
  const activeBlobUrlRef = useRef<string | null>(null);
  const verseTimingsRef = useRef<VerseTiming[]>([]);
  const activeAyahKeyRef = useRef<string | null>(null);

  useEffect(() => {
    verseTimingsRef.current = verseTimings;
  }, [verseTimings]);

  useEffect(() => {
    activeAyahKeyRef.current = activeAyahKey;
  }, [activeAyahKey]);

  useEffect(() => {
    try {
      localStorage.setItem('urwah_quran_font_size', String(fontSize));
    } catch {
      // Ignore storage write errors
    }
  }, [fontSize]);

  const showNotice = useCallback((msg: string) => {
    setToastError(msg);
    setTimeout(() => setToastError((curr) => (curr === msg ? null : curr)), 4000);
  }, []);

  const getAudioUrl = (surahNumber: number, reciterId: string) => {
    const formattedNumber = surahNumber.toString().padStart(3, '0');
    const reciter = reciters.find((r) => r.id === reciterId);
    return `${reciter?.serverUrl}${formattedNumber}.mp3`;
  };

  const formatTime = (time: number) => {
    if (!Number.isFinite(time) || time < 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const safePause = async () => {
    if (!audioRef.current) return;
    if (playPromiseRef.current) {
      try {
        await playPromiseRef.current;
      } catch {
        // Ignore play errors
      }
    }
    audioRef.current.pause();
  };

  const fetchVerseTimings = useCallback(async (surahNumber: number, reciterId: string) => {
    const reciter = reciters.find((r) => r.id === reciterId);
    if (!reciter?.mp3quranReadId) {
      verseTimingsRef.current = [];
      setVerseTimings([]);
      return;
    }

    try {
      const data = await fetchJsonWithCache<{ ayah?: number; start_time: number; end_time: number }[]>(
        `https://www.mp3quran.net/api/v3/ayat_timing?surah=${surahNumber}&read=${reciter.mp3quranReadId}`,
        { maxAgeMs: 30 * 86_400_000 }
      );
      if (Array.isArray(data)) {
        const mapped: VerseTiming[] = data
          .filter((item) => typeof item.ayah === 'number' && item.ayah >= 1)
          .map((item) => ({
            verse_key: `${surahNumber}:${item.ayah}`,
            timestamp_from: Number(item.start_time) || 0,
            timestamp_to: Number(item.end_time) || 0,
          }));
        verseTimingsRef.current = mapped;
        setVerseTimings(mapped);
      } else {
        verseTimingsRef.current = [];
        setVerseTimings([]);
      }
    } catch {
      verseTimingsRef.current = [];
      setVerseTimings([]);
    }
  }, []);

  const stopAudio = useCallback(async () => {
    await safePause();
    if (audioRef.current) {
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }
    setIsPlaying(false);
    setCurrentAudio(null);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setActiveAyahKey(null);
    setVerseTimings([]);
    verseTimingsRef.current = [];
  }, []);

  const toggleAudio = useCallback(
    async (surahNumber: number, startTimestamp?: number) => {
      if (!audioRef.current) return;

      if (currentAudio === surahNumber && startTimestamp === undefined) {
        if (isPlaying) {
          await safePause();
          setIsPlaying(false);
        } else {
          try {
            playPromiseRef.current = audioRef.current.play();
            await playPromiseRef.current;
            setIsPlaying(true);
          } catch (err) {
            if (err instanceof Error && err.name !== 'AbortError') {
              showNotice('تعذّر تشغيل التلاوة، تأكد من اتصال الإنترنت.');
            }
          } finally {
            playPromiseRef.current = null;
          }
        }
        return;
      }

      if (currentAudio === surahNumber && startTimestamp !== undefined) {
        audioRef.current.currentTime = startTimestamp / 1000;
        if (!isPlaying) {
          try {
            playPromiseRef.current = audioRef.current.play();
            await playPromiseRef.current;
            setIsPlaying(true);
          } catch (err) {
            if (err instanceof Error && err.name !== 'AbortError') {
              showNotice('تعذّر تشغيل التلاوة، تأكد من اتصال الإنترنت.');
            }
          } finally {
            playPromiseRef.current = null;
          }
        }
        return;
      }

      const audioUrl = getAudioUrl(surahNumber, selectedReciter);

      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }

      const cachedUrl = await offlineService.getCachedAudioUrl(audioUrl);
      if (cachedUrl) {
        activeBlobUrlRef.current = cachedUrl;
      }
      const finalAudioUrl = cachedUrl || audioUrl;

      setActiveAyahKey(null);
      setProgress(0);
      setCurrentTime(0);
      void fetchVerseTimings(surahNumber, selectedReciter);

      await safePause();
      audioRef.current.src = finalAudioUrl;
      audioRef.current.load();

      if (startTimestamp !== undefined) {
        audioRef.current.currentTime = startTimestamp / 1000;
      }

      try {
        playPromiseRef.current = audioRef.current.play();
        await playPromiseRef.current;
        setCurrentAudio(surahNumber);
        setIsPlaying(true);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          showNotice('تعذّر تشغيل التلاوة، تأكد من اتصال الإنترنت.');
        }
      } finally {
        playPromiseRef.current = null;
      }
    },
    [currentAudio, isPlaying, selectedReciter, fetchVerseTimings, showNotice]
  );

  const playAll = () => {
    toggleAudio(1);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current || !duration) return;
    const pct = parseFloat(e.target.value);
    const seekTo = (pct / 100) * duration;
    audioRef.current.currentTime = seekTo;
    setProgress(pct);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  useEffect(() => {
    const audio = new Audio();
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    audio.preload = saveData ? 'none' : 'metadata';
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        const current = audio.currentTime;
        setProgress((current / audio.duration) * 100);
        setCurrentTime(current);

        // Read latest timings & active key from refs (avoids stale closure!)
        const timings = verseTimingsRef.current;
        if (timings.length > 0) {
          const ms = current * 1000;
          const active = timings.find((t) => ms >= t.timestamp_from && ms < t.timestamp_to);
          if (active && active.verse_key !== activeAyahKeyRef.current) {
            setActiveAyahKey(active.verse_key);
          }
        }
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);

      const cleanup = () => {
        audio.pause();
        audio.src = '';
        if (activeBlobUrlRef.current) {
          URL.revokeObjectURL(activeBlobUrlRef.current);
          activeBlobUrlRef.current = null;
        }
      };

      if (playPromiseRef.current) {
        playPromiseRef.current.then(cleanup).catch(cleanup);
      } else {
        cleanup();
      }

      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;

    const handleEnded = () => {
      setIsPlaying(false);
      if (currentAudio && currentAudio < 114) {
        toggleAudio(currentAudio + 1);
      } else {
        setCurrentAudio(null);
        setActiveAyahKey(null);
      }
    };

    audioRef.current.addEventListener('ended', handleEnded);
    return () => audioRef.current?.removeEventListener('ended', handleEnded);
  }, [currentAudio, toggleAudio]);

  const loadCachedUrls = async () => {
    const urls = await offlineService.getAllCachedUrls();
    setCachedUrls(urls);
  };

  const fetchTajweedForSurah = useCallback(
    async (number: number, baseDetail?: SurahDetail) => {
      const target = baseDetail || surahDetailCache.current[number];
      if (!target || target.ayahs.every((a) => Boolean(a.tajweedText))) return;

      setTajweedLoading(true);
      try {
        const json = await fetchJsonWithCache<{ verses?: { verse_key?: string; text_uthmani_tajweed?: string }[] }>(
          `https://api.quran.com/api/v4/quran/verses/uthmani_tajweed?chapter_number=${number}`,
          { maxAgeMs: 90 * 86_400_000 }
        );
        if (Array.isArray(json.verses)) {
          const map = new Map<string, string>();
          for (const v of json.verses) {
            if (v.verse_key && v.text_uthmani_tajweed) {
              map.set(v.verse_key, v.text_uthmani_tajweed);
            }
          }
          const updated: SurahDetail = {
            ...target,
            ayahs: target.ayahs.map((a) => ({
              ...a,
              tajweedText: map.get(a.verse_key) || a.tajweedText,
            })),
          };
          surahDetailCache.current[number] = updated;
          setSurahDetail((prev) => (prev?.number === number ? updated : prev));
        }
      } catch {
        showNotice('تعذّر تحميل ألوان التجويد لهذه السورة حالياً.');
      } finally {
        setTajweedLoading(false);
      }
    },
    [showNotice]
  );

  const handleToggleTajweed = () => {
    const next = !tajweedEnabled;
    setTajweedEnabled(next);
    try {
      localStorage.setItem('urwah_quran_tajweed', String(next));
    } catch {
      // Ignore storage error
    }
    if (next && surahDetail) {
      void fetchTajweedForSurah(surahDetail.number, surahDetail);
    }
  };

  const fetchSurahs = async () => {
    try {
      setLoading(true);
      const data = await fetchJsonWithCache<{
        chapters?: {
          id: number;
          name_arabic: string;
          name_simple: string;
          translated_name: { name: string };
          verses_count: number;
          revelation_place: string;
        }[];
      }>('https://api.quran.com/api/v4/chapters?language=ar', { maxAgeMs: 30 * 86_400_000 });
      if (data.chapters) {
        const mappedSurahs: Surah[] = data.chapters.map((c) => ({
          number: c.id,
          name: c.name_arabic,
          englishName: c.name_simple,
          englishNameTranslation: c.translated_name.name,
          numberOfAyahs: c.verses_count,
          revelationType: c.revelation_place === 'makkah' ? 'Meccan' : 'Medinan',
        }));
        surahsRef.current = mappedSurahs;
        setSurahs(mappedSurahs);
      } else {
        throw new Error('Failed to fetch surahs');
      }
    } catch {
      setError('حدث خطأ أثناء تحميل قائمة السور. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSurahDetail = useCallback(
    async (number: number) => {
      if (surahDetailCache.current[number]) {
        const cached = surahDetailCache.current[number];
        setSurahDetail(cached);
        if (tajweedEnabled) {
          void fetchTajweedForSurah(number, cached);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const knownSurah = surahsRef.current.find((s) => s.number === number);
        const versesPromise = fetchJsonWithCache<{ verses?: any[] }>(
          `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${number}`,
          { maxAgeMs: 90 * 86_400_000 }
        );

        const [surahMeta, versesData] = await Promise.all([
          knownSurah
            ? Promise.resolve(knownSurah)
            : fetchJsonWithCache<{ chapter?: any }>(
                `https://api.quran.com/api/v4/chapters/${number}?language=ar`,
                { maxAgeMs: 30 * 86_400_000 }
              ).then((d) =>
                d.chapter
                  ? ({
                      number: d.chapter.id,
                      name: d.chapter.name_arabic,
                      englishName: d.chapter.name_simple,
                      englishNameTranslation: d.chapter.translated_name.name,
                      numberOfAyahs: d.chapter.verses_count,
                      revelationType: d.chapter.revelation_place === 'makkah' ? 'Meccan' : 'Medinan',
                    } satisfies Surah)
                  : null
              ),
          versesPromise,
        ]);

        if (surahMeta && versesData.verses) {
          const ayahs: Ayah[] = versesData.verses.map((v: any, index: number) => ({
            number: v.id,
            text: v.text_uthmani,
            numberInSurah: index + 1,
            juz: v.juz_number,
            verse_key: v.verse_key,
          }));

          const detail: SurahDetail = {
            ...surahMeta,
            ayahs,
          };

          surahDetailCache.current[number] = detail;
          setSurahDetail(detail);
          if (tajweedEnabled) {
            void fetchTajweedForSurah(number, detail);
          }

          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          throw new Error('Failed to fetch surah details');
        }
      } catch {
        setError('حدث خطأ أثناء تحميل تفاصيل السورة. يرجى المحاولة مرة أخرى.');
      } finally {
        setLoading(false);
      }
    },
    [tajweedEnabled, fetchTajweedForSurah]
  );

  useEffect(() => {
    fetchSurahs();
    loadCachedUrls();
  }, []);

  // Load surah if deep-linked via ?surah=N
  useEffect(() => {
    const paramNum = Number(searchParams.get('surah'));
    if (paramNum >= 1 && paramNum <= 114) {
      if (selectedSurah !== paramNum || !surahDetail || surahDetail.number !== paramNum) {
        setSelectedSurah(paramNum);
        void fetchSurahDetail(paramNum);
      }
    } else if (selectedSurah !== null) {
      setSelectedSurah(null);
      setSurahDetail(null);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const openSurah = (num: number) => {
    setSelectedSurah(num);
    setSearchParams({ surah: String(num) });
    void fetchSurahDetail(num);
  };

  const closeSurah = () => {
    setSelectedSurah(null);
    setSurahDetail(null);
    setSearchParams({});
  };

  const handleDownload = async (surahNumber: number) => {
    const audioUrl = getAudioUrl(surahNumber, selectedReciter);

    if (cachedUrls.includes(audioUrl)) {
      const success = await offlineService.removeDownloadedSurah(audioUrl);
      if (success) {
        setCachedUrls((prev) => prev.filter((url) => url !== audioUrl));
      }
      return;
    }

    setDownloadingSurahs((prev) => ({ ...prev, [audioUrl]: 0 }));

    const success = await offlineService.downloadSurah(
      surahNumber,
      selectedReciter,
      audioUrl,
      (pct) => {
        setDownloadingSurahs((prev) => ({ ...prev, [audioUrl]: pct }));
      }
    );

    if (success) {
      setCachedUrls((prev) => [...prev, audioUrl]);
    } else {
      showNotice('تعذّر تحميل السورة للاستماع بدون إنترنت، حاول مرة أخرى.');
    }

    setDownloadingSurahs((prev) => {
      const newState = { ...prev };
      delete newState[audioUrl];
      return newState;
    });
  };

  useEffect(() => {
    if (activeAyahKey && ayahRefs.current[activeAyahKey]) {
      ayahRefs.current[activeAyahKey]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeAyahKey]);

  const filteredSurahs = useMemo(() => {
    const q = normalizeArabicSearch(searchQuery);
    if (!q) return surahs;
    return surahs.filter(
      (s) =>
        normalizeArabicSearch(s.name).includes(q) ||
        s.englishName.toLowerCase().includes(q) ||
        String(s.number) === q
    );
  }, [surahs, searchQuery]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-red-500 text-center">
        <AlertCircle size={48} />
        <p className="text-xl font-bold">{error}</p>
        <button
          onClick={() => {
            setError(null);
            if (selectedSurah) {
              void fetchSurahDetail(selectedSurah);
            } else {
              void fetchSurahs();
            }
          }}
          className="bg-islamic-gold text-islamic-green px-6 py-2 rounded-full font-bold cursor-pointer"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className={cn('max-w-7xl mx-auto space-y-12', currentAudio ? 'pb-44 sm:pb-36' : 'pb-20')}>
      {/* Non-blocking error/notice banner */}
      <AnimatePresence>
        {toastError && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-red-600 text-white text-sm font-bold shadow-2xl"
            role="status"
          >
            <AlertCircle size={18} className="shrink-0" />
            <span>{toastError}</span>
            <button onClick={() => setToastError(null)} aria-label="إغلاق التنبيه" className="cursor-pointer">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        {!selectedSurah ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            {/* Header & Search */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative">
              <div className="absolute -top-10 right-0 w-32 h-32 bg-islamic-gold/5 rounded-full blur-3xl -z-10" />

              <div className="space-y-3 text-center md:text-right">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-islamic-gold font-bold tracking-[0.2em] text-xs uppercase"
                >
                  المصحف الشريف
                </motion.span>
                <h1 className="text-4xl md:text-5xl font-bold font-cairo text-islamic-green dark:text-islamic-gold tracking-tight">
                  القرآن الكريم
                </h1>
                <p className="text-lg opacity-65 font-amiri italic leading-relaxed">
                  تصفح سور القرآن الكريم واستمتع بالقراءة والتلاوة.
                </p>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-4">
                  <button
                    onClick={playAll}
                    className="flex items-center gap-2 px-6 py-3 bg-islamic-gold text-islamic-green rounded-full font-bold hover:scale-105 transition-all shadow-lg cursor-pointer"
                  >
                    <Play size={20} fill="currentColor" />
                    <span>تشغيل الكل</span>
                  </button>

                  <select
                    aria-label="اختيار القارئ"
                    value={selectedReciter}
                    onChange={async (e) => {
                      const newReciterId = e.target.value;
                      setSelectedReciter(newReciterId);

                      if (!currentAudio) return;

                      await safePause();
                      if (!audioRef.current) return;

                      const audioUrl = getAudioUrl(currentAudio, newReciterId);

                      if (activeBlobUrlRef.current) {
                        URL.revokeObjectURL(activeBlobUrlRef.current);
                        activeBlobUrlRef.current = null;
                      }

                      const cachedUrl = await offlineService.getCachedAudioUrl(audioUrl);
                      if (cachedUrl) {
                        activeBlobUrlRef.current = cachedUrl;
                      }

                      setActiveAyahKey(null);
                      setProgress(0);
                      setCurrentTime(0);
                      void fetchVerseTimings(currentAudio, newReciterId);

                      audioRef.current.src = cachedUrl || audioUrl;
                      audioRef.current.load();
                      if (isPlaying) {
                        try {
                          playPromiseRef.current = audioRef.current.play();
                          await playPromiseRef.current;
                        } catch (err) {
                          if (err instanceof Error && err.name !== 'AbortError') {
                            showNotice('تعذّر تشغيل القارئ المحدد، يرجى المحاولة مرة أخرى.');
                          }
                        } finally {
                          playPromiseRef.current = null;
                        }
                      }
                    }}
                    className="bg-white dark:bg-white/5 border border-islamic-gold/30 rounded-full px-6 py-3 font-bold text-islamic-green dark:text-islamic-gold focus:outline-none focus:border-islamic-gold shadow-sm transition-all cursor-pointer"
                  >
                    {reciters.map((r) => (
                      <option
                        key={r.id}
                        value={r.id}
                        className="bg-white dark:bg-islamic-green text-islamic-green dark:text-islamic-beige"
                      >
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="relative w-full md:w-[28rem] group">
                <Search
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-islamic-gold group-focus-within:scale-110 transition-transform"
                  size={22}
                />
                <input
                  type="text"
                  aria-label="ابحث عن سورة بالاسم أو الرقم"
                  placeholder="ابحث عن سورة بالاسم أو الرقم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-white/5 border border-islamic-gold/20 rounded-[2rem] py-5 pr-16 pl-12 focus:outline-none focus:border-islamic-gold focus:ring-4 focus:ring-islamic-gold/10 text-islamic-green dark:text-islamic-beige placeholder:text-islamic-green/40 dark:placeholder:text-white/35 transition-all text-lg shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    aria-label="مسح البحث"
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-islamic-gold/70 hover:text-islamic-gold cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <Loader2 className="animate-spin text-islamic-gold" size={64} />
                <p className="text-islamic-gold font-bold animate-pulse">جاري تحميل السور...</p>
              </div>
            ) : filteredSurahs.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                <p className="text-xl font-bold opacity-60">لم يتم العثور على سورة مطابقة للبحث «{searchQuery}»</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-6 py-2.5 rounded-full bg-islamic-gold text-islamic-green font-bold text-sm cursor-pointer"
                >
                  عرض جميع السور
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {filteredSurahs.map((surah, index) => {
                  const audioUrl = getAudioUrl(surah.number, selectedReciter);
                  const isCached = cachedUrls.includes(audioUrl);
                  const dlPct = downloadingSurahs[audioUrl];
                  return (
                    <motion.div
                      key={surah.number}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: Math.min(index * 0.015, 0.3) }}
                      onClick={() => openSurah(surah.number)}
                      className="group cursor-pointer relative bg-white dark:bg-white/5 p-5 sm:p-6 rounded-[2rem] shadow-sm hover:shadow-2xl border border-islamic-gold/20 hover:border-islamic-gold/50 transition-all text-right flex flex-col justify-between gap-4 overflow-hidden soft-glow"
                    >
                      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-islamic-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="flex items-center gap-4 relative z-10 w-full">
                        <div className="w-12 h-12 shrink-0 bg-islamic-beige dark:bg-white/5 rounded-2xl flex items-center justify-center text-islamic-gold font-black text-xl group-hover:bg-islamic-gold group-hover:text-islamic-green transition-all duration-500 shadow-inner">
                          {surah.number}
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold font-cairo text-islamic-green dark:text-islamic-gold group-hover:text-islamic-gold transition-colors leading-snug">
                          {surah.name}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-islamic-gold/10 relative z-10 w-full">
                        <div className="flex items-center gap-2 text-xs font-bold opacity-55 uppercase tracking-wider min-w-0 flex-wrap">
                          <span dir="ltr">{surah.englishName}</span>
                          <span className="w-1 h-1 bg-current rounded-full shrink-0" />
                          <span className="whitespace-nowrap">{surah.numberOfAyahs} آية</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDownload(surah.number);
                            }}
                            aria-label={isCached ? `حذف تحميل ${surah.name}` : `تحميل ${surah.name} للاستماع بدون إنترنت`}
                            className={cn(
                              'p-2.5 rounded-xl transition-all relative overflow-hidden cursor-pointer',
                              isCached
                                ? 'bg-green-500/10 text-green-500 hover:bg-red-500/10 hover:text-red-500'
                                : 'bg-islamic-gold/10 text-islamic-gold hover:bg-islamic-gold/20'
                            )}
                          >
                            {dlPct !== undefined ? (
                              <div className="relative">
                                <Loader2 size={18} className="animate-spin" />
                                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold">
                                  {dlPct}
                                </span>
                              </div>
                            ) : isCached ? (
                              <div className="group/btn relative">
                                <CheckCircle2 size={18} className="group-hover/btn:opacity-0" />
                                <Trash2 size={18} className="absolute inset-0 opacity-0 group-hover/btn:opacity-100" />
                              </div>
                            ) : (
                              <Download size={18} />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void toggleAudio(surah.number);
                            }}
                            aria-label={currentAudio === surah.number && isPlaying ? `إيقاف ${surah.name}` : `تشغيل ${surah.name}`}
                            className="p-2.5 rounded-xl bg-islamic-gold/10 text-islamic-gold hover:bg-islamic-gold hover:text-islamic-green transition-all cursor-pointer"
                          >
                            {currentAudio === surah.number && isPlaying ? <Pause size={18} /> : <Play size={18} />}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="detail"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            {/* Surah Detail Header */}
            <div className="sticky top-20 sm:top-24 z-30 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 bg-white/90 dark:bg-islamic-green/90 backdrop-blur-xl p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border border-islamic-gold/15 shadow-xl mb-8 sm:mb-12">
              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                <div className="flex items-center gap-4">
                  <button
                    onClick={closeSurah}
                    aria-label="العودة إلى قائمة السور"
                    className="w-11 h-11 rounded-xl bg-islamic-gold/10 text-islamic-gold hover:bg-islamic-gold hover:text-islamic-green transition-all flex items-center justify-center border border-islamic-gold/15 group cursor-pointer"
                  >
                    <ChevronRight size={22} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <div className="space-y-0.5 text-right">
                    <h2 className="text-xl sm:text-2xl font-bold font-cairo text-islamic-green dark:text-islamic-gold">
                      {surahDetail?.name}
                    </h2>
                    <p className="text-[11px] opacity-55 font-bold">
                      سورة {surahDetail?.name} • <span dir="ltr">{surahDetail?.englishName}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
                {/* Tajweed Toggle */}
                <TajweedToggle
                  enabled={tajweedEnabled}
                  loading={tajweedLoading}
                  onToggle={handleToggleTajweed}
                />

                {/* Audio Control */}
                {surahDetail && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(surahDetail.number)}
                      aria-label={
                        cachedUrls.includes(getAudioUrl(surahDetail.number, selectedReciter))
                          ? 'حذف السورة المحمّلة'
                          : 'تحميل السورة للاستماع بدون إنترنت'
                      }
                      className={cn(
                        'p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer',
                        cachedUrls.includes(getAudioUrl(surahDetail.number, selectedReciter))
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-islamic-gold/10 text-islamic-gold hover:bg-islamic-gold/20'
                      )}
                    >
                      {downloadingSurahs[getAudioUrl(surahDetail.number, selectedReciter)] !== undefined ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : cachedUrls.includes(getAudioUrl(surahDetail.number, selectedReciter)) ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <Download size={18} />
                      )}
                    </button>
                    <button
                      onClick={() => toggleAudio(surahDetail.number)}
                      aria-label={currentAudio === surahDetail.number && isPlaying ? 'إيقاف التلاوة' : 'استماع للسورة'}
                      className={cn(
                        'flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl border transition-all font-bold text-sm cursor-pointer',
                        currentAudio === surahDetail.number && isPlaying
                          ? 'bg-islamic-gold text-islamic-green border-islamic-gold'
                          : 'bg-islamic-gold/10 text-islamic-gold border-islamic-gold/15 hover:bg-islamic-gold/20'
                      )}
                    >
                      {currentAudio === surahDetail.number && isPlaying ? (
                        <>
                          <Pause size={18} />
                          <span>إيقاف التلاوة</span>
                        </>
                      ) : (
                        <>
                          <Play size={18} />
                          <span>استماع للسورة</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Font Size Control */}
                <div className="flex items-center gap-2.5 bg-islamic-beige dark:bg-white/5 p-1.5 px-3 rounded-xl border border-islamic-gold/15">
                  <button
                    onClick={() => setFontSize(Math.max(20, fontSize - 4))}
                    aria-label="تصغير حجم الخط"
                    className="p-1 text-islamic-gold hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="text-[10px] font-black opacity-50 w-10 text-center">الخط</span>
                  <button
                    onClick={() => setFontSize(Math.min(80, fontSize + 4))}
                    aria-label="تكبير حجم الخط"
                    className="p-1 text-islamic-gold hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <Loader2 className="animate-spin text-islamic-gold" size={64} />
                <p className="text-islamic-gold font-bold animate-pulse">جاري تحميل الآيات...</p>
              </div>
            ) : (
              surahDetail && (
                <div className="space-y-12 sm:space-y-16">
                  {/* Surah Info Card */}
                  <div className="bg-islamic-green text-islamic-beige p-8 sm:p-10 md:p-14 rounded-[3rem] sm:rounded-[3.5rem] shadow-2xl space-y-8 relative overflow-hidden soft-glow">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-islamic-gold/10 rounded-full -mr-48 -mt-48 blur-[100px]" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-islamic-gold/10 rounded-full -ml-48 -mb-48 blur-[100px]" />

                    <div className="text-center space-y-4 relative z-10">
                      <h3 className="text-4xl sm:text-5xl md:text-6xl font-amiri text-islamic-gold drop-shadow-lg">
                        {surahDetail.name}
                      </h3>
                      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[11px] font-black uppercase tracking-[0.2em] opacity-70">
                        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
                          {surahDetail.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
                          {surahDetail.numberOfAyahs} آية
                        </span>
                        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
                          سورة رقم {surahDetail.number}
                        </span>
                      </div>
                    </div>

                    {surahDetail.number !== 1 && surahDetail.number !== 9 && (
                      <div className="basmala-container">
                        <motion.p
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-4xl sm:text-5xl md:text-7xl basmala-text text-center"
                        >
                          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                        </motion.p>
                      </div>
                    )}
                  </div>

                  {/* Mushaf Layout — connected paragraph, true Mushaf style */}
                  <div className="bg-white dark:bg-white/5 p-6 sm:p-10 md:p-20 rounded-[2.5rem] sm:rounded-[4rem] shadow-2xl border border-islamic-gold/10 relative overflow-hidden soft-glow">
                    <div className="absolute top-10 right-10 text-islamic-gold/5 pointer-events-none select-none">
                      <Book size={200} />
                    </div>

                    <div className="relative z-10">
                      <p
                        className="mushaf-page text-islamic-green dark:text-islamic-beige"
                        style={{ fontSize: `${fontSize}px` }}
                      >
                        {surahDetail.ayahs.map((ayah, idx) => {
                          const isActive = activeAyahKey === ayah.verse_key;

                          const handleAyahClick = () => {
                            const timing = verseTimings.find((t) => t.verse_key === ayah.verse_key);
                            if (timing) void toggleAudio(surahDetail.number, timing.timestamp_from);
                          };

                          return (
                            <span
                              key={ayah.number}
                              id={`ayah-${idx}`}
                              ref={(el) => {
                                ayahRefs.current[ayah.verse_key] = el;
                              }}
                              onClick={handleAyahClick}
                              className={cn('mushaf-ayah', isActive && 'ayah-active')}
                            >
                              {tajweedEnabled && ayah.tajweedText
                                ? renderTajweedNodes(ayah.tajweedText)
                                : ayah.text}
                              <span
                                className="ayah-number"
                                aria-label={`الآية ${ayah.numberInSurah}`}
                                title={`الآية ${ayah.numberInSurah}`}
                              >
                                <span className="ayah-number-text">{toArabicNumerals(ayah.numberInSurah)}</span>
                              </span>{' '}
                            </span>
                          );
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 pt-6">
                    <button
                      disabled={surahDetail.number === 1}
                      onClick={() => openSurah(surahDetail.number - 1)}
                      className="w-full sm:w-auto flex items-center justify-center gap-4 px-10 py-5 rounded-3xl bg-white dark:bg-white/5 text-islamic-green dark:text-islamic-gold font-black text-lg disabled:opacity-30 transition-all hover:shadow-2xl border border-islamic-gold/25 hover:border-islamic-gold/60 shadow-md group cursor-pointer"
                    >
                      <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
                      السورة السابقة
                    </button>
                    <button
                      disabled={surahDetail.number === 114}
                      onClick={() => openSurah(surahDetail.number + 1)}
                      className="w-full sm:w-auto flex items-center justify-center gap-4 px-10 py-5 rounded-3xl bg-white dark:bg-white/5 text-islamic-green dark:text-islamic-gold font-black text-lg disabled:opacity-30 transition-all hover:shadow-2xl border border-islamic-gold/25 hover:border-islamic-gold/60 shadow-md group cursor-pointer"
                    >
                      السورة التالية
                      <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent Audio Player Bar */}
      <AnimatePresence>
        {currentAudio && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-islamic-green/95 backdrop-blur-2xl border-t border-islamic-gold/25 p-3.5 sm:p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]"
          >
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-3 md:gap-8 relative">
              {/* Close player button */}
              <button
                onClick={stopAudio}
                aria-label="إغلاق مشغل التلاوة"
                className="absolute top-0 left-0 md:static w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 text-islamic-green dark:text-islamic-beige hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 md:order-last"
              >
                <X size={16} />
              </button>

              {/* Surah Info */}
              <div className="flex items-center gap-3 sm:gap-4 w-full md:w-1/4 pr-0 pl-10 md:pl-0">
                <div className="w-11 h-11 bg-islamic-gold rounded-xl flex items-center justify-center text-islamic-green font-bold text-base shadow-lg shrink-0">
                  {currentAudio}
                </div>
                <div className="text-right min-w-0">
                  <h4 className="font-bold font-cairo text-islamic-green dark:text-islamic-gold truncate">
                    {surahs.find((s) => s.number === currentAudio)?.name || surahDetail?.name}
                  </h4>
                  <p className="text-[11px] opacity-60 font-bold truncate">
                    {reciters.find((r) => r.id === selectedReciter)?.name}
                  </p>
                </div>
              </div>

              {/* Controls & Progress */}
              <div className="flex-grow w-full space-y-2">
                <div className="flex items-center justify-between px-1" dir="ltr">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono opacity-65">
                    <span>{formatTime(currentTime)}</span>
                    <span>/</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* LTR progress bar so seek slider aligns cleanly with time */}
                <div className="relative flex-grow h-5 flex items-center" dir="ltr">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    aria-label="شريط التقدم الصوتي"
                    value={Number.isFinite(progress) ? progress : 0}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-islamic-gold/20 rounded-lg appearance-none cursor-pointer accent-islamic-gold z-10"
                  />
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-islamic-gold rounded-lg pointer-events-none transition-all"
                    style={{ width: `${Number.isFinite(progress) ? progress : 0}%` }}
                  />
                </div>

                <div className="flex items-center justify-center gap-6">
                  <button
                    disabled={currentAudio === 1}
                    aria-label="السورة السابقة"
                    onClick={() => toggleAudio(currentAudio - 1)}
                    className="text-islamic-gold hover:scale-110 transition-transform disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight size={26} />
                  </button>
                  <button
                    aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل التلاوة'}
                    onClick={() => toggleAudio(currentAudio)}
                    className="w-12 h-12 sm:w-14 sm:h-14 bg-islamic-gold text-islamic-green rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-all active:scale-95 cursor-pointer"
                  >
                    {isPlaying ? (
                      <Pause size={24} fill="currentColor" />
                    ) : (
                      <Play size={24} fill="currentColor" className="translate-x-0.5" />
                    )}
                  </button>
                  <button
                    disabled={currentAudio === 114}
                    aria-label="السورة التالية"
                    onClick={() => toggleAudio(currentAudio + 1)}
                    className="text-islamic-gold hover:scale-110 transition-transform disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft size={26} />
                  </button>
                </div>
              </div>

              {/* Volume Control */}
              <div className="hidden md:flex items-center gap-3 w-1/5 justify-end" dir="ltr">
                <Volume2 size={20} className="text-islamic-gold opacity-60" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  aria-label="مستوى الصوت"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-24 h-1 bg-islamic-gold/20 rounded-lg appearance-none cursor-pointer accent-islamic-gold"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

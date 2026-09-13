import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Book, ChevronLeft, ChevronRight, Loader2, AlertCircle, Minus, Plus, Play, Pause, Volume2, Download, Trash2, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { offlineService } from '../services/offlineService';
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
  tajweedText?: string;  // HTML string with <tajweed> tags from alquran.cloud
  numberInSurah: number;
  juz: number;
  verse_key: string;
}

interface SurahDetail extends Surah {
  ayahs: Ayah[];
}

const reciters = [
  { id: 'yasser_aldosari', name: 'ياسر الدوسري', serverUrl: 'https://server11.mp3quran.net/yasser/', apiId: 11 },
  { id: 'abdul_basit', name: 'عبد الباسط عبد الصمد', serverUrl: 'https://server7.mp3quran.net/basit/', apiId: 1 },
  { id: 'alafasy', name: 'مشاري راشد العفاسي', serverUrl: 'https://server8.mp3quran.net/afs/', apiId: 7 },
  { id: 'maher_almuaiqly', name: 'ماهر المعيقلي', serverUrl: 'https://server12.mp3quran.net/maher/', apiId: 12 },
  { id: 'minshawi', name: 'محمد صديق المنشاوي', serverUrl: 'https://server10.mp3quran.net/minsh/', apiId: 9 },
  { id: 'husary', name: 'محمود خليل الحصري', serverUrl: 'https://server13.mp3quran.net/husr/', apiId: 6 },
  { id: 'khalid_alqahtani', name: 'خالد القحطاني', serverUrl: 'https://server10.mp3quran.net/qht/', apiId: 21 },
  { id: 'ahmed_alajmi', name: 'أحمد العجمي', serverUrl: 'https://server10.mp3quran.net/ajm/', apiId: 10 },
  { id: 'nasser_alqatami', name: 'ناصر القطامي', serverUrl: 'https://server6.mp3quran.net/qtm/', apiId: 8 },
  { id: 'abdul_rahman_alsudais', name: 'عبد الرحمن السديس', serverUrl: 'https://server11.mp3quran.net/sds/', apiId: 3 },
  { id: 'islam_sobhi', name: 'إسلام صبحي', serverUrl: 'https://server14.mp3quran.net/islam/Rewayat-Hafs-A-n-Assem/', apiId: 164 },
  { id: 'abu_bakr_al_shatri', name: 'أبو بكر الشاطري', serverUrl: 'https://server11.mp3quran.net/shatri/', apiId: 4 },
  { id: 'muhammad_al_luhaidan', name: 'محمد اللحيدان', serverUrl: 'https://server8.mp3quran.net/lhdan/', apiId: 14 },
];

interface VerseTiming {
  verse_key: string;
  timestamp_from: number;
  timestamp_to: number;
}

export default function Quran() {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [surahDetail, setSurahDetail] = useState<SurahDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [fontSize, setFontSize] = useState(48);
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
  const ayahRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  // ✅ Fix: cache for surah details to avoid redundant API calls
  const surahDetailCache = useRef<Record<number, SurahDetail>>({});
  // ✅ Fix: track active blob URL to revoke it and prevent memory leaks
  const activeBlobUrlRef = useRef<string | null>(null);

  const getAudioUrl = (surahNumber: number, reciterId: string) => {
    const formattedNumber = surahNumber.toString().padStart(3, '0');
    const reciter = reciters.find(r => r.id === reciterId);
    return `${reciter?.serverUrl}${formattedNumber}.mp3`;
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const safePause = async () => {
    if (!audioRef.current) return;
    if (playPromiseRef.current) {
      try {
        await playPromiseRef.current;
      } catch (err) {
        // Ignore play errors
      }
    }
    audioRef.current.pause();
  };

  const toggleAudio = useCallback(async (surahNumber: number, startTimestamp?: number) => {
    if (!audioRef.current) return;

    if (currentAudio === surahNumber && !startTimestamp) {
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
            console.error("Playback failed:", err);
          }
        } finally {
          playPromiseRef.current = null;
        }
      }
    } else {
      const audioUrl = getAudioUrl(surahNumber, selectedReciter);
      const reciter = reciters.find(r => r.id === selectedReciter);
      
      // ✅ Fix: revoke previous blob URL before creating a new one (prevents memory leak)
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }

      // Check if audio is cached
      const cachedUrl = await offlineService.getCachedAudioUrl(audioUrl);
      if (cachedUrl) {
        activeBlobUrlRef.current = cachedUrl;
      }
      const finalAudioUrl = cachedUrl || audioUrl;

      // Fetch timings if switching surah or reciter
      if (currentAudio !== surahNumber) {
        try {
          const res = await fetch(`https://api.quran.com/api/v4/chapter_recitations/${reciter?.apiId}/${surahNumber}`);
          const data = await res.json();
          if (data.audio_file && data.audio_file.verse_timings) {
            setVerseTimings(data.audio_file.verse_timings);
          } else {
            setVerseTimings([]);
          }
        } catch (err) {
          console.error("Failed to fetch timings:", err);
          setVerseTimings([]);
        }
      }

      await safePause();
      audioRef.current.src = finalAudioUrl;
      audioRef.current.load();
      
      if (startTimestamp) {
        audioRef.current.currentTime = startTimestamp / 1000;
      }

      try {
        playPromiseRef.current = audioRef.current.play();
        await playPromiseRef.current;
        setCurrentAudio(surahNumber);
        setIsPlaying(true);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error("Playback failed:", err);
        }
      } finally {
        playPromiseRef.current = null;
      }
    }
  // ✅ Fix: removed `verseTimings` from deps — it's read via closure in the timeupdate
  //    handler (separate effect), not needed here and caused unnecessary re-creation
  }, [currentAudio, isPlaying, selectedReciter]);

  const playAll = () => {
    toggleAudio(1);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTo = (parseFloat(e.target.value) / 100) * duration;
    if (audioRef.current) {
      audioRef.current.currentTime = seekTo;
      setProgress(parseFloat(e.target.value));
    }
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
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        const current = audio.currentTime;
        setProgress((current / audio.duration) * 100);
        setCurrentTime(current);

        // Update active ayah based on timings
        if (verseTimings.length > 0) {
          const ms = current * 1000;
          const active = verseTimings.find(t => ms >= t.timestamp_from && ms <= t.timestamp_to);
          if (active && active.verse_key !== activeAyahKey) {
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
      
      // ✅ Fix: set src to '' to release the media resource and prevent memory leak
      const cleanup = () => {
        audio.pause();
        audio.src = '';
        // Revoke any active blob URL
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
  }, []); // Run only once

  // Separate effect for handling ended event to access currentAudio
  useEffect(() => {
    if (!audioRef.current) return;
    
    const handleEnded = () => {
      setIsPlaying(false);
      if (currentAudio && currentAudio < 114) {
        toggleAudio(currentAudio + 1);
      } else {
        setCurrentAudio(null);
      }
    };

    audioRef.current.addEventListener('ended', handleEnded);
    return () => audioRef.current?.removeEventListener('ended', handleEnded);
  }, [currentAudio, toggleAudio]);

  useEffect(() => {
    fetchSurahs();
    loadCachedUrls();
  }, []);

  const loadCachedUrls = async () => {
    const urls = await offlineService.getAllCachedUrls();
    setCachedUrls(urls);
  };

  const handleDownload = async (surahNumber: number) => {
    const audioUrl = getAudioUrl(surahNumber, selectedReciter);

    if (cachedUrls.includes(audioUrl)) {
      const success = await offlineService.removeDownloadedSurah(audioUrl);
      if (success) {
        setCachedUrls(prev => prev.filter(url => url !== audioUrl));
      }
      return;
    }

    setDownloadingSurahs(prev => ({ ...prev, [audioUrl]: 0 }));
    
    const success = await offlineService.downloadSurah(
      surahNumber,
      selectedReciter,
      audioUrl,
      (progress) => {
        setDownloadingSurahs(prev => ({ ...prev, [audioUrl]: progress }));
      }
    );

    if (success) {
      setCachedUrls(prev => [...prev, audioUrl]);
    }
    
    setDownloadingSurahs(prev => {
      const newState = { ...prev };
      delete newState[audioUrl];
      return newState;
    });
  };

  useEffect(() => {
    if (activeAyahKey && ayahRefs.current[activeAyahKey]) {
      ayahRefs.current[activeAyahKey]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeAyahKey]);

  const fetchSurahs = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://api.quran.com/api/v4/chapters?language=ar');
      const data = await response.json();
      if (data.chapters) {
        const mappedSurahs = data.chapters.map((c: any) => ({
          number: c.id,
          name: c.name_arabic,
          englishName: c.name_simple,
          englishNameTranslation: c.translated_name.name,
          numberOfAyahs: c.verses_count,
          revelationType: c.revelation_place === 'makkah' ? 'Meccan' : 'Medinan'
        }));
        setSurahs(mappedSurahs);
      } else {
        throw new Error('Failed to fetch surahs');
      }
    } catch (err) {
      setError('حدث خطأ أثناء تحميل قائمة السور. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSurahDetail = async (number: number) => {
    // ✅ Fix: return cached result immediately to avoid redundant API calls
    if (surahDetailCache.current[number]) {
      setSurahDetail(surahDetailCache.current[number]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Fetch Surah Info and Verses in parallel for better performance
      const [surahRes, versesRes] = await Promise.all([
        fetch(`https://api.quran.com/api/v4/chapters/${number}?language=ar`),
        fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${number}`)
      ]);

      const [surahData, versesData] = await Promise.all([
        surahRes.json(),
        versesRes.json()
      ]);

      if (surahData.chapter && versesData.verses) {
        const ayahs = versesData.verses.map((v: any, index: number) => {
          return {
            number: v.id,
            text: v.text_uthmani,
            numberInSurah: index + 1,
            juz: v.juz_number,
            verse_key: v.verse_key
          };
        });

        const detail: SurahDetail = {
          number: surahData.chapter.id,
          name: surahData.chapter.name_arabic,
          englishName: surahData.chapter.name_simple,
          englishNameTranslation: surahData.chapter.translated_name.name,
          numberOfAyahs: surahData.chapter.verses_count,
          revelationType: surahData.chapter.revelation_place === 'makkah' ? 'Meccan' : 'Medinan',
          ayahs
        };

        // ✅ Fix: store in cache before setting state
        surahDetailCache.current[number] = detail;
        setSurahDetail(detail);
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error('Failed to fetch surah details');
      }
    } catch (err) {
      setError('حدث خطأ أثناء تحميل تفاصيل السورة. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fix: memoize filtered list to avoid recomputing on every render
  const filteredSurahs = useMemo(
    () => surahs.filter(
      (s) => s.name.includes(searchQuery) || s.englishName.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [surahs, searchQuery]
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-red-500">
        <AlertCircle size={48} />
        <p className="text-xl font-bold">{error}</p>
        <button 
          onClick={() => { setError(null); fetchSurahs(); }}
          className="bg-islamic-gold text-islamic-green px-6 py-2 rounded-full font-bold"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20">
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
                <h1 className="text-4xl md:text-5xl font-bold font-cairo text-islamic-green dark:text-islamic-gold tracking-tight">القرآن الكريم</h1>
                <p className="text-lg opacity-60 font-amiri italic leading-relaxed">تصفح سور القرآن الكريم واستمتع بالقراءة.</p>
                
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-4">
                  <button
                    onClick={playAll}
                    className="flex items-center gap-2 px-6 py-3 bg-islamic-gold text-islamic-green rounded-full font-bold hover:scale-105 transition-all shadow-lg"
                  >
                    <Play size={20} fill="currentColor" />
                    <span>تشغيل الكل</span>
                  </button>
                  
                  <select
                    value={selectedReciter}
                    onChange={async (e) => {
                      const newReciterId = e.target.value;
                      setSelectedReciter(newReciterId);
                      
                      if (!currentAudio) return;

                      // ✅ Fix: await safePause fully before changing src (prevents race condition)
                      await safePause();
                      if (!audioRef.current) return;

                      const reciter = reciters.find(r => r.id === newReciterId);
                      if (!reciter) return;
                      const formattedNumber = currentAudio.toString().padStart(3, '0');
                      const audioUrl = `${reciter.serverUrl}${formattedNumber}.mp3`;

                      // Revoke previous blob URL if any
                      if (activeBlobUrlRef.current) {
                        URL.revokeObjectURL(activeBlobUrlRef.current);
                        activeBlobUrlRef.current = null;
                      }

                      audioRef.current.src = audioUrl;
                      audioRef.current.load();
                      if (isPlaying) {
                        try {
                          playPromiseRef.current = audioRef.current.play();
                          await playPromiseRef.current;
                        } catch (err) {
                          if (err instanceof Error && err.name !== 'AbortError') {
                            console.error("Playback failed after reciter change:", err);
                          }
                        } finally {
                          playPromiseRef.current = null;
                        }
                      }
                    }}
                    className="bg-white dark:bg-white/5 border border-islamic-gold/30 rounded-full px-6 py-3 font-bold text-islamic-green dark:text-islamic-gold focus:outline-none focus:border-islamic-gold shadow-sm transition-all cursor-pointer"
                  >
                    {reciters.map(r => (
                      <option key={r.id} value={r.id} className="bg-white dark:bg-islamic-green text-islamic-green dark:text-islamic-beige">{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="relative w-full md:w-[28rem] group">
                <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-islamic-gold group-focus-within:scale-110 transition-transform" size={22} />
                <input
                  type="text"
                  placeholder="ابحث عن سورة بالاسم أو الرقم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-white/5 border border-islamic-gold/20 rounded-[2rem] py-5 pr-16 pl-8 focus:outline-none focus:border-islamic-gold focus:ring-4 focus:ring-islamic-gold/10 text-islamic-green dark:text-islamic-beige placeholder:text-islamic-green/40 dark:placeholder:text-white/30 transition-all text-lg shadow-sm"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <Loader2 className="animate-spin text-islamic-gold" size={64} />
                <p className="text-islamic-gold font-bold animate-pulse">جاري تحميل السور...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredSurahs.map((surah, index) => (
                  <motion.div
                    key={surah.number}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => {
                      setSelectedSurah(surah.number);
                      fetchSurahDetail(surah.number);
                    }}
                    className="group cursor-pointer relative bg-white dark:bg-white/5 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl border border-islamic-gold/20 hover:border-islamic-gold/50 transition-all text-right flex items-center justify-between overflow-hidden soft-glow"
                  >
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-islamic-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex items-center gap-6 relative z-10 w-full">
                      <div className="w-14 h-14 bg-islamic-beige dark:bg-white/5 rounded-2xl flex items-center justify-center text-islamic-gold font-black text-xl group-hover:bg-islamic-gold group-hover:text-islamic-green transition-all duration-500 shadow-inner">
                        {surah.number}
                      </div>
                      <div className="space-y-1 flex-grow">
                        <div className="flex items-center justify-between">
                          <h3 className="text-2xl font-bold font-cairo text-islamic-green dark:text-islamic-gold group-hover:text-islamic-gold transition-colors">{surah.name}</h3>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(surah.number);
                              }}
                              className={cn(
                                "p-3 rounded-xl transition-all relative overflow-hidden",
                                cachedUrls.includes(getAudioUrl(surah.number, selectedReciter))
                                  ? "bg-green-500/10 text-green-500 hover:bg-red-500/10 hover:text-red-500"
                                  : "bg-islamic-gold/10 text-islamic-gold hover:bg-islamic-gold/20"
                              )}
                            >
                              {downloadingSurahs[getAudioUrl(surah.number, selectedReciter)] !== undefined ? (
                                <div className="relative">
                                  <Loader2 size={20} className="animate-spin" />
                                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold">
                                    {downloadingSurahs[getAudioUrl(surah.number, selectedReciter)]}
                                  </span>
                                </div>
                              ) : cachedUrls.includes(getAudioUrl(surah.number, selectedReciter)) ? (
                                <div className="group/btn relative">
                                  <CheckCircle2 size={20} className="group-hover/btn:opacity-0" />
                                  <Trash2 size={20} className="absolute inset-0 opacity-0 group-hover/btn:opacity-100" />
                                </div>
                              ) : (
                                <Download size={20} />
                              )}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAudio(surah.number);
                              }}
                              className="p-3 rounded-xl bg-islamic-gold/10 text-islamic-gold hover:bg-islamic-gold hover:text-islamic-green transition-all"
                            >
                              {currentAudio === surah.number && isPlaying ? <Pause size={20} /> : <Play size={20} />}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold opacity-30 uppercase tracking-widest">
                          <span>{surah.englishName}</span>
                          <span className="w-1 h-1 bg-current rounded-full" />
                          <span>{surah.numberOfAyahs} آية</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
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
            <div className="sticky top-24 z-30 flex flex-col md:flex-row items-center justify-between gap-8 bg-white/80 dark:bg-islamic-green/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-islamic-gold/10 shadow-xl mb-12">
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => { 
                    setSelectedSurah(null); 
                    setSurahDetail(null); 
                  }}
                  className="w-12 h-12 rounded-xl bg-islamic-gold/10 text-islamic-gold hover:bg-islamic-gold hover:text-islamic-green transition-all flex items-center justify-center border border-islamic-gold/10 group"
                >
                  <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <div className="space-y-0.5">
                  <h2 className="text-2xl font-bold font-cairo text-islamic-green dark:text-islamic-gold">{surahDetail?.name}</h2>
                  <p className="text-[10px] opacity-40 font-black uppercase tracking-widest">سورة {surahDetail?.englishName}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4">
                {/* Audio Control */}
                {surahDetail && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(surahDetail.number)}
                      className={cn(
                        "p-3 rounded-xl transition-all",
                        cachedUrls.includes(getAudioUrl(surahDetail.number, selectedReciter))
                          ? "bg-green-500/10 text-green-500"
                          : "bg-islamic-gold/10 text-islamic-gold hover:bg-islamic-gold/20"
                      )}
                    >
                      {downloadingSurahs[getAudioUrl(surahDetail.number, selectedReciter)] !== undefined ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : cachedUrls.includes(getAudioUrl(surahDetail.number, selectedReciter)) ? (
                        <CheckCircle2 size={20} />
                      ) : (
                        <Download size={20} />
                      )}
                    </button>
                    <button
                      onClick={() => toggleAudio(surahDetail.number)}
                      className={cn(
                        "flex items-center gap-3 px-6 py-3 rounded-xl border transition-all font-bold",
                        currentAudio === surahDetail.number && isPlaying
                          ? "bg-islamic-gold text-islamic-green border-islamic-gold"
                          : "bg-islamic-gold/10 text-islamic-gold border-islamic-gold/10 hover:bg-islamic-gold/20"
                      )}
                    >
                      {currentAudio === surahDetail.number && isPlaying ? (
                        <>
                          <Pause size={20} />
                          <span>إيقاف التلاوة</span>
                        </>
                      ) : (
                        <>
                          <Play size={20} />
                          <span>استماع للسورة</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Font Size Control */}
                <div className="flex items-center gap-3 bg-islamic-beige dark:bg-white/5 p-1.5 px-4 rounded-xl border border-islamic-gold/10">
                  <button onClick={() => setFontSize(Math.max(20, fontSize - 4))} className="text-islamic-gold hover:scale-110 transition-transform"><Minus size={16} /></button>
                  <span className="text-[10px] font-black opacity-30 w-12 text-center uppercase tracking-tighter">الخط</span>
                  <button onClick={() => setFontSize(Math.min(80, fontSize + 4))} className="text-islamic-gold hover:scale-110 transition-transform"><Plus size={16} /></button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <Loader2 className="animate-spin text-islamic-gold" size={64} />
                <p className="text-islamic-gold font-bold animate-pulse">جاري تحميل الآيات...</p>
              </div>
            ) : surahDetail && (
              <div className="space-y-16">
                {/* Surah Info Card */}
                <div className="bg-islamic-green text-islamic-beige p-10 md:p-14 rounded-[3.5rem] shadow-2xl space-y-8 relative overflow-hidden soft-glow">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-islamic-gold/10 rounded-full -mr-48 -mt-48 blur-[100px]" />
                  <div className="absolute bottom-0 left-0 w-96 h-96 bg-islamic-gold/10 rounded-full -ml-48 -mb-48 blur-[100px]" />
                  
                  <div className="text-center space-y-4 relative z-10">
                    <h3 className="text-5xl md:text-6xl font-amiri text-islamic-gold drop-shadow-lg">{surahDetail.name}</h3>
                    <div className="flex flex-wrap items-center justify-center gap-6 text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                      <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">{surahDetail.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}</span>
                      <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">{surahDetail.numberOfAyahs} آية</span>
                      <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">سورة رقم {surahDetail.number}</span>
                    </div>
                  </div>

                  {surahDetail.number !== 1 && surahDetail.number !== 9 && (
                    <div className="basmala-container">
                      <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-7xl basmala-text"
                      >
                        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                      </motion.p>
                    </div>
                  )}
                </div>

                {/* Mushaf Layout — connected paragraph, true Mushaf style */}
                <div className="bg-white dark:bg-white/5 p-8 md:p-20 rounded-[4rem] shadow-2xl border border-islamic-gold/10 relative overflow-hidden soft-glow">
                  <div className="absolute top-10 right-10 text-islamic-gold/5 pointer-events-none select-none">
                    <Book size={200} />
                  </div>

                  {/*
                   * All ayahs rendered as a SINGLE flowing paragraph.
                   * Each ayah is an inline <span> so text wraps naturally
                   * across lines exactly like a printed Mushaf.
                   * The verse-number badge is inline-block after each ayah.
                   */}
                  <div
                    className="relative z-10"
                    style={{ fontSize: `${fontSize}px` }}
                  >
                    <p
                      className="mushaf-page text-islamic-green dark:text-islamic-beige"
                    >
                      {surahDetail.ayahs.map((ayah, idx) => {
                        const isActive = activeAyahKey === ayah.verse_key;

                        const handleAyahClick = () => {
                          const timing = verseTimings.find(t => t.verse_key === ayah.verse_key);
                          if (timing) toggleAudio(surahDetail.number, timing.timestamp_from);
                        };

                        return (
                          <span
                            key={ayah.number}
                            id={`ayah-${idx}`}
                            ref={el => { ayahRefs.current[ayah.verse_key] = el; }}
                            onClick={handleAyahClick}
                            className={cn(
                              "mushaf-ayah",
                              isActive && "ayah-active"
                            )}
                          >
                            {/* Ayah text — plain Uthmani */}
                            {ayah.text}
                            {/* Ornamental verse-number badge — inline after text */}
                            <span
                              className="ayah-number"
                              aria-label={`الآية ${ayah.numberInSurah}`}
                              title={`الآية ${ayah.numberInSurah}`}
                            >
                              <span className="ayah-number-text">
                                {toArabicNumerals(ayah.numberInSurah)}
                              </span>
                            </span>
                            {/* Single space between ayahs for natural flow */}
                            {' '}
                          </span>
                        );
                      })}
                    </p>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10">
                  <button
                    disabled={surahDetail.number === 1}
                    onClick={() => {
                      const next = surahDetail.number - 1;
                      setSelectedSurah(next);
                      fetchSurahDetail(next);
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-4 px-10 py-5 rounded-3xl bg-white dark:bg-white/5 text-islamic-green dark:text-islamic-gold font-black text-lg disabled:opacity-30 transition-all hover:shadow-2xl border border-islamic-gold/25 hover:border-islamic-gold/60 shadow-md group cursor-pointer"
                  >
                    <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
                    السورة السابقة
                  </button>
                  <button
                    disabled={surahDetail.number === 114}
                    onClick={() => {
                      const next = surahDetail.number + 1;
                      setSelectedSurah(next);
                      fetchSurahDetail(next);
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-4 px-10 py-5 rounded-3xl bg-white dark:bg-white/5 text-islamic-green dark:text-islamic-gold font-black text-lg disabled:opacity-30 transition-all hover:shadow-2xl border border-islamic-gold/25 hover:border-islamic-gold/60 shadow-md group cursor-pointer"
                  >
                    السورة التالية
                    <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
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
            className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-islamic-green/90 backdrop-blur-2xl border-t border-islamic-gold/20 p-4 md:p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"
          >
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4 md:gap-8">
              {/* Surah Info */}
              <div className="flex items-center gap-4 w-full md:w-1/4">
                <div className="w-12 h-12 bg-islamic-gold rounded-xl flex items-center justify-center text-islamic-green font-bold text-lg shadow-lg">
                  {currentAudio}
                </div>
                <div className="text-right">
                  <h4 className="font-bold font-cairo text-islamic-green dark:text-islamic-gold">
                    {surahs.find(s => s.number === currentAudio)?.name || surahDetail?.name}
                  </h4>
                  <p className="text-[10px] opacity-50 font-black uppercase tracking-widest">
                    {reciters.find(r => r.id === selectedReciter)?.name}
                  </p>
                </div>
              </div>

              {/* Controls & Progress */}
              <div className="flex-grow w-full space-y-2">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono opacity-50">{formatTime(currentTime)}</span>
                    <span className="text-[10px] opacity-20">/</span>
                    <span className="text-[10px] font-mono opacity-50">{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="relative flex-grow h-6 flex items-center group">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-islamic-gold/20 rounded-lg appearance-none cursor-pointer accent-islamic-gold z-10"
                  />
                  <div 
                    className="absolute right-0 top-1/2 -translate-y-1/2 h-1.5 bg-islamic-gold rounded-lg pointer-events-none transition-all"
                    style={{ width: `${progress}%` }}
                  />
                  
                  {/* Ayah Markers */}
                  {verseTimings.length > 0 && duration > 0 && (
                    <div className="absolute inset-0 flex items-center pointer-events-none px-[2px]">
                      {verseTimings.map((t, i) => (
                        <div 
                          key={i}
                          className="h-1 w-px bg-white/30 absolute"
                          style={{ right: `${(t.timestamp_from / 1000 / duration) * 100}%` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-center gap-6">
                  <button 
                    disabled={currentAudio === 1}
                    onClick={() => toggleAudio(currentAudio - 1)}
                    className="text-islamic-gold hover:scale-110 transition-transform disabled:opacity-30"
                  >
                    <ChevronRight size={28} />
                  </button>
                  <button
                    onClick={() => toggleAudio(currentAudio)}
                    className="w-14 h-14 bg-islamic-gold text-islamic-green rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-all active:scale-95"
                  >
                    {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="translate-x-0.5" />}
                  </button>
                  <button 
                    disabled={currentAudio === 114}
                    onClick={() => toggleAudio(currentAudio + 1)}
                    className="text-islamic-gold hover:scale-110 transition-transform disabled:opacity-30"
                  >
                    <ChevronLeft size={28} />
                  </button>
                </div>
              </div>

              {/* Volume Control */}
              <div className="hidden md:flex items-center gap-3 w-1/4 justify-end">
                <Volume2 size={20} className="text-islamic-gold opacity-50" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
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

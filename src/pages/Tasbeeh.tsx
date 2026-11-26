import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Settings, Target, Plus, Minus, Volume2, VolumeX } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';

const goals = [33, 100, 500, 1000];

const DHIKR_SUGGESTIONS = [
  { text: 'سُبْحَانَ اللهِ',          goal: 33  },
  { text: 'الْحَمْدُ للهِ',           goal: 33  },
  { text: 'اللهُ أَكْبَرُ',           goal: 33  },
  { text: 'لَا إِلَهَ إِلَّا اللهُ', goal: 100 },
  { text: 'أَسْتَغْفِرُ اللهَ',       goal: 100 },
];

export default function Tasbeeh() {
  const {
    tasbeehCount,
    tasbeehGoal,
    tasbeehSound,
    toggleTasbeehSound,
    incrementTasbeeh,
    resetTasbeeh,
    setTasbeehGoal,
  } = useStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeDhikr, setActiveDhikr] = useState(0);
  const [goalDraft, setGoalDraft] = useState(String(tasbeehGoal));
  const audioCtxRef = useRef<AudioContext | null>(null);

  React.useEffect(() => {
    setGoalDraft(String(tasbeehGoal));
  }, [tasbeehGoal]);

  const playFeedback = useCallback(
    (isGoalReached: boolean) => {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(isGoalReached ? [40, 30, 60] : 15);
      }
      if (!tasbeehSound) return;
      try {
        const AudioContextClass =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContextClass();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          void ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isGoalReached ? 880 : 520, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isGoalReached ? 0.25 : 0.06));
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + (isGoalReached ? 0.25 : 0.06));
      } catch {
        // Ignore audio errors on restricted environments
      }
    },
    [tasbeehSound]
  );

  const handleCount = useCallback(() => {
    const nextCount = tasbeehCount + 1;
    incrementTasbeeh();
    playFeedback(nextCount === tasbeehGoal);
  }, [tasbeehCount, tasbeehGoal, incrementTasbeeh, playFeedback]);

  const handleReset = useCallback(() => {
    if (tasbeehCount === 0) return;
    resetTasbeeh();
  }, [tasbeehCount, resetTasbeeh]);

  // Keyboard: Space/Enter to count (outside inputs/buttons), R to reset (with confirm)
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLButtonElement ||
        target?.closest('button, a, input, select, textarea')
      ) {
        return;
      }
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleCount();
      }
      if (e.code === 'KeyR' && tasbeehCount > 0) {
        if (window.confirm('هل تريد تصفير عداد التسبيح؟')) {
          resetTasbeeh();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleCount, resetTasbeeh, tasbeehCount]);

  const progress = Math.min((tasbeehCount / tasbeehGoal) * 100, 100);

  return (
    <div className="max-w-3xl mx-auto space-y-12 sm:space-y-16 pb-20">
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block px-4 py-1 rounded-full bg-islamic-gold/10 text-islamic-gold text-xs font-bold uppercase tracking-widest"
        >
          المسبحة الإلكترونية <span className="text-lg align-middle">📿</span>
        </motion.span>
        <h1 className="text-4xl md:text-5xl font-bold font-cairo text-islamic-green dark:text-islamic-gold">
          اذكر الله يذكرك
        </h1>
        <p className="text-lg opacity-70 font-amiri italic">
          "فَسَبِّحْ بِحَمْدِ رَبِّكَ وَكُن مِّنَ السَّاجِدِينَ"
        </p>
      </div>

      {/* Main Counter Display */}
      <div className="relative flex flex-col items-center justify-center py-10 sm:py-16 px-4 sm:px-8 bg-white dark:bg-white/5 rounded-[2.5rem] sm:rounded-[4rem] shadow-2xl border border-islamic-gold/15 overflow-hidden soft-glow">
        <div className="absolute top-0 right-0 w-96 h-96 bg-islamic-gold/5 rounded-full -mr-48 -mt-48 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-islamic-gold/5 rounded-full -ml-48 -mb-48 blur-[100px] pointer-events-none" />

        {/* Sound toggle */}
        <button
          onClick={toggleTasbeehSound}
          aria-label={tasbeehSound ? 'كتم صوت النقرات' : 'تفعيل صوت النقرات'}
          className="absolute top-5 left-5 sm:top-7 sm:left-7 w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 border border-islamic-gold/20 flex items-center justify-center text-islamic-gold hover:bg-islamic-gold/15 transition-all cursor-pointer z-20"
          title={tasbeehSound ? 'صوت النقرة مفعّل' : 'صوت النقرة مكتوم'}
        >
          {tasbeehSound ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>

        {/* Progress Ring (responsive sizing so it never overflows 390px screens) */}
        <div className="relative w-60 h-60 sm:w-80 sm:h-80 md:w-[28rem] md:h-[28rem] rounded-full flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-islamic-gold/5"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="1"
              className="text-islamic-gold/10"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="44"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: progress / 100 }}
              transition={{
                type: 'spring',
                stiffness: 50,
                damping: 20,
                mass: 0.5,
              }}
              className={cn(
                'transition-colors duration-500',
                progress >= 100 ? 'text-green-500' : 'text-islamic-gold'
              )}
              style={{
                filter:
                  progress >= 100
                    ? 'drop-shadow(0 0 12px rgba(34, 197, 94, 0.6))'
                    : 'drop-shadow(0 0 8px rgba(197, 160, 89, 0.5))',
              }}
            />
            {[...Array(33)].map((_, i) => (
              <circle
                key={i}
                cx={50 + 44 * Math.cos((i * (360 / 33) * Math.PI) / 180)}
                cy={50 + 44 * Math.sin((i * (360 / 33) * Math.PI) / 180)}
                r="0.8"
                className={cn(
                  'transition-all duration-500',
                  tasbeehCount % 33 > i
                    ? 'fill-islamic-gold shadow-[0_0_5px_rgba(197,160,89,0.8)]'
                    : 'fill-islamic-gold/20'
                )}
              />
            ))}
          </svg>

          <div className="text-center space-y-2 sm:space-y-4 z-10 px-4">
            <motion.div
              key={tasbeehCount}
              initial={{ scale: 0.92, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-1"
            >
              <span className="block text-6xl sm:text-8xl md:text-[10rem] font-bold font-cairo text-islamic-green dark:text-islamic-gold tracking-tighter leading-none tabular-nums">
                {tasbeehCount}
              </span>
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-black opacity-60 tracking-widest">
                <Target size={15} className="text-islamic-gold" />
                <span>الهدف: {tasbeehGoal}</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Action Buttons — responsive widths & gaps so they never clip on 390px */}
        <div className="mt-10 sm:mt-14 flex items-center justify-center gap-4 sm:gap-10 w-full">
          <button
            onClick={handleReset}
            aria-label="إعادة تعيين عداد التسبيح"
            className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-2xl bg-white dark:bg-white/5 text-islamic-green dark:text-islamic-gold hover:bg-red-500 hover:text-white transition-all active:scale-90 shadow-xl border border-islamic-gold/25 flex items-center justify-center group cursor-pointer"
            title="إعادة تعيين"
          >
            <RotateCcw size={24} className="group-hover:rotate-180 transition-transform duration-700" />
          </button>

          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92, rotate: 4 }}
            onClick={handleCount}
            aria-label="تسبيح (+1)"
            className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 shrink-0 rounded-[2.2rem] sm:rounded-[3rem] bg-islamic-gold text-islamic-green flex items-center justify-center shadow-[0_20px_60px_rgba(197,160,89,0.4)] hover:shadow-[0_30px_80px_rgba(197,160,89,0.6)] transition-all group relative overflow-hidden cursor-pointer"
          >
            <div className="absolute inset-0 bg-white opacity-0 group-active:opacity-20 transition-opacity" />
            <Plus
              size={56}
              className="group-hover:rotate-90 group-active:text-white transition-all duration-200"
            />
          </motion.button>

          <button
            onClick={() => setIsSettingsOpen((v) => !v)}
            aria-label="إعدادات هدف التسبيح"
            aria-expanded={isSettingsOpen}
            className={cn(
              'w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-2xl transition-all active:scale-90 shadow-xl border border-islamic-gold/25 flex items-center justify-center group cursor-pointer',
              isSettingsOpen
                ? 'bg-islamic-gold text-islamic-green'
                : 'bg-white dark:bg-white/5 text-islamic-green dark:text-islamic-gold hover:bg-islamic-gold/20'
            )}
            title="الإعدادات"
          >
            <Settings size={24} className="group-hover:rotate-45 transition-transform duration-500" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-white/5 p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl border border-islamic-gold/15 space-y-6 sm:space-y-8"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl sm:text-2xl font-bold font-cairo flex items-center gap-3">
                <Target className="text-islamic-gold" />
                تحديد الهدف
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-sm opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
              >
                إغلاق
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {goals.map((goal) => (
                <button
                  key={goal}
                  onClick={() => {
                    setTasbeehGoal(goal);
                    setIsSettingsOpen(false);
                  }}
                  className={cn(
                    'py-3.5 sm:py-4 rounded-2xl font-bold transition-all border-2 text-base sm:text-lg cursor-pointer',
                    tasbeehGoal === goal
                      ? 'bg-islamic-gold border-islamic-gold text-islamic-green shadow-lg shadow-islamic-gold/20'
                      : 'border-islamic-gold/15 hover:border-islamic-gold/40'
                  )}
                >
                  {goal}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 pt-6 border-t border-islamic-gold/10">
              <div className="space-y-1 text-center sm:text-right">
                <p className="font-bold">هدف مخصص</p>
                <p className="text-sm opacity-60">أدخل الرقم الذي ترغب في الوصول إليه</p>
              </div>
              <div className="flex items-center bg-islamic-beige dark:bg-white/5 rounded-2xl p-2 border border-islamic-gold/15">
                <button
                  onClick={() => setTasbeehGoal(Math.max(1, tasbeehGoal - 1))}
                  aria-label="إنقاص الهدف"
                  className="p-3 hover:text-islamic-gold transition-colors cursor-pointer"
                >
                  <Minus size={20} />
                </button>
                <input
                  type="number"
                  min={1}
                  max={100000}
                  aria-label="قيمة الهدف المخصص"
                  value={goalDraft}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGoalDraft(val);
                    const parsed = parseInt(val, 10);
                    if (!Number.isNaN(parsed) && parsed >= 1) {
                      setTasbeehGoal(parsed);
                    }
                  }}
                  onBlur={() => {
                    const parsed = parseInt(goalDraft, 10);
                    const safe = !Number.isNaN(parsed) && parsed >= 1 ? Math.min(100000, parsed) : 1;
                    setTasbeehGoal(safe);
                    setGoalDraft(String(safe));
                  }}
                  className="w-24 text-center bg-transparent text-2xl font-bold focus:outline-none"
                />
                <button
                  onClick={() => setTasbeehGoal(tasbeehGoal + 1)}
                  aria-label="زيادة الهدف"
                  className="p-3 hover:text-islamic-gold transition-colors cursor-pointer"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick dhikr selector */}
      <div className="space-y-4">
        <p className="text-center text-xs font-black uppercase tracking-[0.3em] opacity-50">اختر ذكراً</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {DHIKR_SUGGESTIONS.map((dhikr, i) => (
            <motion.button
              key={i}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setActiveDhikr(i);
                setTasbeehGoal(dhikr.goal);
                resetTasbeeh();
              }}
              className={cn(
                'p-6 rounded-3xl border text-center space-y-3 transition-all duration-300 cursor-pointer',
                activeDhikr === i
                  ? 'bg-islamic-green border-islamic-gold/40 shadow-xl'
                  : 'bg-white dark:bg-white/5 border-islamic-gold/20 hover:border-islamic-gold/50 hover:shadow-xl'
              )}
            >
              <p
                className={cn(
                  'text-2xl font-amiri',
                  activeDhikr === i ? 'text-islamic-gold' : 'text-islamic-green dark:text-islamic-gold'
                )}
              >
                {dhikr.text}
              </p>
              <div
                className={cn(
                  'inline-block px-3 py-1 rounded-full text-xs font-bold',
                  activeDhikr === i
                    ? 'bg-islamic-gold/20 text-islamic-gold'
                    : 'bg-islamic-gold/15 text-[#8c6b2d] dark:text-islamic-gold'
                )}
              >
                {dhikr.goal} مرة
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Keyboard hint */}
      <p className="text-center text-xs text-islamic-green/65 dark:text-islamic-beige/50 font-bold tracking-widest uppercase">
        اضغط <kbd className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 font-mono">Space</kbd> للعد •{' '}
        <kbd className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 font-mono">R</kbd> للإعادة
      </p>
    </div>
  );
}

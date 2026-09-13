import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Settings, Target, Plus, Minus } from 'lucide-react';
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
  const { tasbeehCount, tasbeehGoal, incrementTasbeeh, resetTasbeeh, setTasbeehGoal } = useStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeDhikr, setActiveDhikr] = useState(0);

  // Keyboard: Space/Enter to count, R to reset
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); incrementTasbeeh(); }
      if (e.code === 'KeyR') resetTasbeeh();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [incrementTasbeeh, resetTasbeeh]);

  const progress = Math.min((tasbeehCount / tasbeehGoal) * 100, 100);

  return (
    <div className="max-w-3xl mx-auto space-y-16 pb-20">
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.span 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block px-4 py-1 rounded-full bg-islamic-gold/10 text-islamic-gold text-xs font-bold uppercase tracking-widest"
        >
          المسبحة الإلكترونية <span className="text-lg align-middle">📿</span>
        </motion.span>
        <h1 className="text-4xl md:text-5xl font-bold font-cairo text-islamic-green dark:text-islamic-gold">اذكر الله يذكرك</h1>
        <p className="text-lg opacity-70 font-amiri italic">"فَسَبِّحْ بِحَمْدِ رَبِّكَ وَكُن مِّنَ السَّاجِدِينَ"</p>
      </div>

      {/* Main Counter Display */}
      <div className="relative flex flex-col items-center justify-center py-16 px-8 bg-white dark:bg-white/5 rounded-[4rem] shadow-2xl border border-islamic-gold/10 overflow-hidden soft-glow">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-islamic-gold/5 rounded-full -mr-48 -mt-48 blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-islamic-gold/5 rounded-full -ml-48 -mb-48 blur-[100px]" />
        
        {/* Progress Ring */}
        <div className="relative w-80 h-80 md:w-[32rem] md:h-[32rem] rounded-full flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Outer Glow Ring */}
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-islamic-gold/5"
            />
            {/* Main Track */}
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="1"
              className="text-islamic-gold/10"
            />
            {/* Progress Bar */}
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
                type: "spring", 
                stiffness: 50, 
                damping: 20,
                mass: 0.5
              }}
              className={cn(
                "transition-colors duration-500",
                progress >= 100 ? "text-green-500" : "text-islamic-gold"
              )}
              style={{ 
                filter: progress >= 100 ? 'drop-shadow(0 0 12px rgba(34, 197, 94, 0.6))' : 'drop-shadow(0 0 8px rgba(197, 160, 89, 0.5))'
              }}
            />
            {/* Decorative Dots - More dots to look like beads */}
            {[...Array(33)].map((_, i) => (
              <circle
                key={i}
                cx={50 + 44 * Math.cos((i * (360/33) * Math.PI) / 180)}
                cy={50 + 44 * Math.sin((i * (360/33) * Math.PI) / 180)}
                r="0.8"
                className={cn(
                  "transition-all duration-500",
                  (tasbeehCount % 33) > i ? "fill-islamic-gold shadow-[0_0_5px_rgba(197,160,89,0.8)]" : "fill-islamic-gold/20"
                )}
              />
            ))}
          </svg>
          
          <div className="text-center space-y-4 z-10">
            <motion.div 
              key={tasbeehCount}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-1"
            >
              <span className="block text-[10rem] md:text-[14rem] font-bold font-cairo text-islamic-green dark:text-islamic-gold tracking-tighter leading-none">
                {tasbeehCount}
              </span>
              <div className="flex items-center justify-center gap-3 text-sm font-black opacity-30 uppercase tracking-[0.4em]">
                <Target size={16} className="text-islamic-gold" />
                <span>الهدف: {tasbeehGoal}</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-16 flex items-center gap-12">
          <button
            onClick={resetTasbeeh}
            className="w-16 h-16 rounded-2xl bg-white dark:bg-white/5 text-islamic-green dark:text-islamic-gold hover:bg-red-500 hover:text-white transition-all active:scale-90 shadow-xl border border-islamic-gold/10 flex items-center justify-center group"
            title="إعادة تعيين"
          >
            <RotateCcw size={28} className="group-hover:rotate-180 transition-transform duration-700" />
          </button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9, rotate: 5 }}
            onClick={incrementTasbeeh}
            className="w-32 h-32 md:w-48 md:h-48 rounded-[3rem] bg-islamic-gold text-islamic-green flex items-center justify-center shadow-[0_20px_60px_rgba(197,160,89,0.4)] hover:shadow-[0_30px_80px_rgba(197,160,89,0.6)] transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white opacity-0 group-active:opacity-20 transition-opacity" />
            <Plus 
              size={80} 
              className="group-hover:rotate-90 group-active:text-white transition-all duration-200" 
            />
          </motion.button>

          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={cn(
              "w-16 h-16 rounded-2xl transition-all active:scale-90 shadow-xl border border-islamic-gold/10 flex items-center justify-center group",
              isSettingsOpen 
                ? "bg-islamic-gold text-islamic-green" 
                : "bg-white dark:bg-white/5 text-islamic-green dark:text-islamic-gold hover:bg-islamic-gold/20"
            )}
            title="الإعدادات"
          >
            <Settings size={28} className="group-hover:rotate-45 transition-transform duration-500" />
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
            className="bg-white dark:bg-white/5 p-10 rounded-[2.5rem] shadow-xl border border-islamic-gold/10 space-y-8"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold font-cairo flex items-center gap-3">
                <Target className="text-islamic-gold" />
                تحديد الهدف
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-sm opacity-40 hover:opacity-100 transition-opacity">إغلاق</button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {goals.map((goal) => (
                <button
                  key={goal}
                  onClick={() => {
                    setTasbeehGoal(goal);
                    setIsSettingsOpen(false);
                  }}
                  className={cn(
                    "py-4 rounded-2xl font-bold transition-all border-2 text-lg",
                    tasbeehGoal === goal
                      ? "bg-islamic-gold border-islamic-gold text-islamic-green shadow-lg shadow-islamic-gold/20"
                      : "border-islamic-gold/10 hover:border-islamic-gold/40"
                  )}
                >
                  {goal}
                </button>
              ))}
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 border-t border-islamic-gold/10">
              <div className="space-y-1">
                <p className="font-bold">هدف مخصص</p>
                <p className="text-sm opacity-50">أدخل الرقم الذي ترغب في الوصول إليه</p>
              </div>
              <div className="flex items-center bg-islamic-beige dark:bg-white/5 rounded-2xl p-2 border border-islamic-gold/10">
                <button 
                  onClick={() => setTasbeehGoal(Math.max(1, tasbeehGoal - 1))}
                  className="p-3 hover:text-islamic-gold transition-colors"
                >
                  <Minus size={20} />
                </button>
                <input 
                  type="number" 
                  value={tasbeehGoal}
                  onChange={(e) => setTasbeehGoal(parseInt(e.target.value) || 1)}
                  className="w-24 text-center bg-transparent text-2xl font-bold focus:outline-none"
                />
                <button 
                  onClick={() => setTasbeehGoal(tasbeehGoal + 1)}
                  className="p-3 hover:text-islamic-gold transition-colors"
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
        <p className="text-center text-xs font-black uppercase tracking-[0.3em] opacity-30">اختر ذكراً</p>
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
                'p-6 rounded-3xl border text-center space-y-3 transition-all duration-300',
                activeDhikr === i
                  ? 'bg-islamic-green border-islamic-gold/40 shadow-xl'
                  : 'bg-white dark:bg-white/5 border-islamic-gold/10 hover:border-islamic-gold/30 hover:shadow-md'
              )}
            >
              <p className={cn(
                'text-2xl font-amiri',
                activeDhikr === i ? 'text-islamic-gold' : 'text-islamic-green dark:text-islamic-gold'
              )}>
                {dhikr.text}
              </p>
              <div className={cn(
                'inline-block px-3 py-1 rounded-full text-xs font-bold',
                activeDhikr === i
                  ? 'bg-islamic-gold/20 text-islamic-gold'
                  : 'bg-islamic-gold/10 text-islamic-gold'
              )}>
                {dhikr.goal} مرة
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Keyboard hint */}
      <p className="text-center text-xs opacity-20 font-bold tracking-widest uppercase">
        اضغط <kbd className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 font-mono">Space</kbd> للعد •{' '}
        <kbd className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 font-mono">R</kbd> للإعادة
      </p>
    </div>
  );
}

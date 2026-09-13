import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon, RotateCcw, CheckCircle2, Plus, Copy } from 'lucide-react';
import { adhkarData } from '../data/adhkar';
import { useStore } from '../store/useStore';
import { useLocation } from 'react-router-dom';
import { cn, copyToClipboard } from '../lib/utils';

export default function Adhkar() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const typeParam = searchParams.get('type') as 'morning' | 'evening' | null;
  
  const [activeTab, setActiveTab] = useState<'morning' | 'evening'>(typeParam || 'morning');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  // ✅ Fix: destructure resetDhikr here instead of calling useStore.getState() inside event handlers
  const { adhkarProgress: rawProgress, incrementDhikr, resetCategory, resetDhikr } = useStore();
  const adhkarProgress = rawProgress || {};

  const handleCopyDhikr = async (e: React.MouseEvent, dhikr: typeof adhkarData[0]) => {
    e.stopPropagation();
    const success = await copyToClipboard(`${dhikr.text}${dhikr.description ? `\n[${dhikr.description}]` : ''}\n(عبر تطبيق عُروة)`);
    if (success) {
      setCopiedId(dhikr.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  useEffect(() => {
    if (typeParam === 'morning' || typeParam === 'evening') {
      setActiveTab(typeParam);
    }
  }, [typeParam]);

  const currentAdhkar = adhkarData.filter(d => d.category === activeTab);
  
  const totalDhikr = currentAdhkar.length;
  const completedDhikr = currentAdhkar.filter(d => ((adhkarProgress[d.id] || 0) >= d.count)).length;
  const progressPercentage = totalDhikr > 0 ? Math.round((completedDhikr / totalDhikr) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-16 pb-20">
      {/* Header Section */}
      <div className="text-center space-y-8 relative">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 bg-islamic-gold/5 rounded-full blur-3xl -z-10" />
        
        <div className="space-y-3">
          <motion.span 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1 rounded-full bg-islamic-gold/10 text-islamic-gold text-xs font-bold uppercase tracking-widest"
          >
            حصن المسلم
          </motion.span>
          <h1 className="text-4xl md:text-5xl font-bold font-cairo text-islamic-green dark:text-islamic-gold tracking-tight">
            الأذكار اليومية <span className="text-3xl align-middle">🤲</span>
          </h1>
          <p className="text-lg opacity-60 font-amiri italic">"ألا بذكر الله تطمئن القلوب"</p>
        </div>

        {/* Category Switcher */}
        <div className="flex justify-center p-2 bg-black/5 dark:bg-white/5 rounded-[2rem] w-fit mx-auto border border-islamic-gold/20 shadow-inner">
          <button
            onClick={() => setActiveTab('morning')}
            className={cn(
              "flex items-center gap-3 px-10 py-4 rounded-[1.5rem] text-sm font-bold transition-all duration-500",
              activeTab === 'morning'
                ? "bg-white dark:bg-islamic-gold text-islamic-green shadow-xl scale-105 border border-islamic-gold/20"
                : "text-islamic-green/70 dark:text-islamic-beige/60 hover:text-islamic-green font-bold"
            )}
          >
            <Sun size={20} className={activeTab === 'morning' ? "text-islamic-gold dark:text-islamic-green" : ""} />
            أذكار الصباح
          </button>
          <button
            onClick={() => setActiveTab('evening')}
            className={cn(
              "flex items-center gap-3 px-10 py-4 rounded-[1.5rem] text-sm font-bold transition-all duration-500",
              activeTab === 'evening'
                ? "bg-white dark:bg-islamic-gold text-islamic-green shadow-xl scale-105 border border-islamic-gold/20"
                : "text-islamic-green/70 dark:text-islamic-beige/60 hover:text-islamic-green font-bold"
            )}
          >
            <Moon size={20} className={activeTab === 'evening' ? "text-islamic-gold dark:text-islamic-green" : ""} />
            أذكار المساء
          </button>
        </div>
      </div>

      {/* Progress Card */}
      <motion.div 
        layout
        className="glass p-10 rounded-[3rem] border border-islamic-gold/10 shadow-2xl overflow-hidden relative soft-glow"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-islamic-gold/5 rounded-full -mr-20 -mt-20 blur-3xl" />
        
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10 relative z-10">
          <div className="space-y-2 text-center lg:text-right">
            <h3 className="text-3xl font-bold font-cairo text-islamic-green dark:text-islamic-gold">تقدمك اليوم</h3>
            <p className="text-lg opacity-50">لقد قرأت {completedDhikr} من أصل {totalDhikr} ذكراً</p>
          </div>
          
          <div className="flex-grow max-w-xl w-full space-y-5">
            <div className="h-5 bg-islamic-beige dark:bg-white/5 rounded-full overflow-hidden border border-islamic-gold/5 p-1">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                className="h-full bg-gradient-to-r from-islamic-gold to-yellow-500 rounded-full shadow-[0_0_20px_rgba(197,160,89,0.4)]"
              />
            </div>
            <div className="flex justify-between text-xs font-black opacity-40 tracking-[0.2em] uppercase">
              <span>{progressPercentage}% مكتمل</span>
              <span>{totalDhikr - completedDhikr} متبقي</span>
            </div>
          </div>

          <button
            onClick={() => resetCategory(activeTab)}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white transition-all text-sm font-bold group border border-red-500/10"
          >
            <RotateCcw size={18} className="group-hover:rotate-180 transition-transform duration-700" />
            إعادة الضبط
          </button>
        </div>
      </motion.div>

      {/* Adhkar List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <AnimatePresence mode="popLayout">
          {currentAdhkar.length > 0 ? (
            currentAdhkar.map((dhikr, index) => {
              const count = adhkarProgress[dhikr.id] || 0;
              const isCompleted = count >= dhikr.count;
              const progress = (count / dhikr.count) * 100;

              return (
                <motion.div
                  key={dhikr.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.03, duration: 0.5 }}
                  onClick={() => {
                    if (!isCompleted) {
                      incrementDhikr(dhikr.id);
                    }
                  }}
                  whileTap={!isCompleted ? { scale: 0.98 } : {}}
                  className={cn(
                    "group relative p-10 rounded-[2.5rem] border transition-all duration-500 cursor-pointer overflow-hidden flex flex-col justify-between soft-glow",
                    isCompleted
                      ? "bg-islamic-green/5 border-islamic-gold/30 opacity-70 grayscale-[0.3]"
                      : "bg-white dark:bg-white/5 border-islamic-gold/20 hover:border-islamic-gold/50 shadow-sm hover:shadow-2xl"
                  )}
                >
                  {/* Background Number */}
                  <span className="absolute -top-6 -right-6 text-[10rem] font-bold opacity-[0.02] pointer-events-none select-none italic tracking-tighter">
                    {index + 1}
                  </span>

                  <div className="space-y-8 relative z-10 pointer-events-none">
                    <div className="flex items-start justify-between gap-6">
                      <p className="text-2xl md:text-3xl font-amiri leading-relaxed text-islamic-green dark:text-islamic-gold text-right flex-grow">
                        {dhikr.text}
                      </p>
                      {isCompleted && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="shrink-0 w-12 h-12 bg-islamic-gold rounded-2xl flex items-center justify-center text-islamic-green shadow-xl rotate-12"
                        >
                          <CheckCircle2 size={24} strokeWidth={3} />
                        </motion.div>
                      )}
                    </div>

                    {dhikr.description && (
                      <p className="text-sm text-islamic-green/80 dark:text-islamic-beige/70 font-normal leading-relaxed border-r-2 border-islamic-gold/30 pr-5 italic">
                        {dhikr.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-10 space-y-6 relative z-10">
                    {/* Individual Progress Bar */}
                    <div className="h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden pointer-events-none">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-islamic-gold shadow-[0_0_10px_rgba(197,160,89,0.5)]"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-3 pointer-events-none">
                        <div className="text-center">
                          <span className="block text-3xl font-bold font-cairo text-islamic-gold">{count}</span>
                          <span className="text-[10px] uppercase tracking-widest font-black opacity-50">الحالي</span>
                        </div>
                        <div className="w-px h-10 bg-islamic-gold/20" />
                        <div className="text-center">
                          <span className="block text-3xl font-bold font-cairo text-islamic-green/40 dark:text-white/30">{dhikr.count}</span>
                          <span className="text-[10px] uppercase tracking-widest font-black opacity-50">الهدف</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleCopyDhikr(e, dhikr)}
                          className="p-3 rounded-xl hover:bg-islamic-gold/10 text-islamic-gold/60 hover:text-islamic-gold transition-all relative z-20 cursor-pointer"
                          title="نسخ الذكر"
                          aria-label="نسخ الذكر"
                        >
                          {copiedId === dhikr.id ? (
                            <CheckCircle2 size={18} className="text-emerald-500" />
                          ) : (
                            <Copy size={18} />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            resetDhikr(dhikr.id);
                          }}
                          className="p-3 rounded-xl hover:bg-red-500/10 text-red-500/30 hover:text-red-500 transition-all group/reset relative z-20 cursor-pointer"
                          title="إعادة تعيين"
                          aria-label="إعادة تعيين العداد"
                        >
                          <RotateCcw size={18} className="group-hover/reset:rotate-180 transition-transform duration-500" />
                        </button>
                        <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg pointer-events-none",
                          isCompleted
                            ? "bg-islamic-gold/20 text-islamic-gold"
                            : "bg-islamic-gold text-islamic-green group-hover:scale-110 group-hover:rotate-6"
                        )}>
                          {isCompleted ? <CheckCircle2 size={28} /> : <Plus size={28} strokeWidth={3} />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Click Ripple Effect Placeholder */}
                  {!isCompleted && (
                    <div className="absolute inset-0 bg-islamic-gold/0 group-active:bg-islamic-gold/5 transition-colors duration-100 pointer-events-none" />
                  )}
                </motion.div>
              );
            })
          ) : (
            <div className="col-span-full py-20 text-center space-y-4">
              <p className="text-2xl opacity-50">لا توجد أذكار في هذا القسم حالياً</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

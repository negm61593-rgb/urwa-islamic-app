import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Palette, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useClickOutside } from '../hooks/useClickOutside';

// ─── Tajweed legend — Tarteel / Dar Al-Maarifa exact palette ─────────────────
const TAJWEED_LEGEND = [
  { color: '#169400', label: 'غنة وإدغام',       sub: 'ن م مشددة — ي ن م و'   },
  { color: '#001CBA', label: 'قلقلة',            sub: 'ق ط ب ج د'              },
  { color: '#9400A8', label: 'إخفاء وإقلاب',     sub: 'حروف الإخفاء — ن → م'  },
  { color: '#940000', label: 'مد لازم',          sub: '6 حركات'                },
  { color: '#FF0000', label: 'مد واجب',          sub: '4-5 حركات'              },
  { color: '#FF7E1E', label: 'مد جائز / طبيعي',  sub: '2 أو 4 أو 6 حركات'    },
  { color: '#A1A1A1', label: 'لا يُنطق / صامت',  sub: 'همزة وصل — لام شمسية'  },
] as const;

interface TajweedToggleProps {
  enabled: boolean;
  loading: boolean;
  onToggle: () => void;
}

export function TajweedToggle({ enabled, loading, onToggle }: TajweedToggleProps) {
  const [open, setOpen] = React.useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setOpen(false), open);

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((v) => !v)}
        aria-label="إعدادات التجويد"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-sm transition-all duration-300',
          enabled
            ? 'bg-islamic-green text-islamic-gold border-islamic-gold/40 shadow-lg shadow-islamic-green/20'
            : 'bg-white dark:bg-white/5 text-islamic-green dark:text-islamic-gold border-islamic-gold/20 hover:border-islamic-gold/50'
        )}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Palette size={16} className={enabled ? 'text-islamic-gold' : ''} />
        )}
        <span>التجويد</span>
        {/* Active dot */}
        {enabled && !loading && (
          <span className="w-1.5 h-1.5 rounded-full bg-islamic-gold animate-pulse" />
        )}
      </motion.button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.95, y: -6 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="absolute left-0 top-full mt-2 w-72 z-50 bg-white dark:bg-[#0f1a14] rounded-3xl shadow-2xl border border-islamic-gold/15 overflow-hidden"
            role="dialog"
            aria-label="إعدادات ألوان التجويد"
          >
            {/* Header row with iOS-style toggle */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-islamic-gold/10">
              <div className="space-y-0.5">
                <p className="font-bold text-sm text-islamic-green dark:text-islamic-gold">
                  تلوين التجويد
                </p>
                <p className="text-[11px] opacity-40 font-bold">
                  {enabled ? 'مفعّل — ألوان حسب معيار ترتيل' : 'معطّل — نص عادي'}
                </p>
              </div>

              {/* iOS-style toggle switch */}
              <button
                role="switch"
                aria-checked={enabled}
                onClick={onToggle}
                disabled={loading}
                className={cn(
                  'relative w-12 h-6 rounded-full transition-all duration-300 focus-visible:ring-2 focus-visible:ring-islamic-gold focus-visible:ring-offset-2 disabled:opacity-50',
                  enabled ? 'bg-islamic-gold' : 'bg-gray-200 dark:bg-white/10'
                )}
              >
                <motion.span
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  className={cn(
                    'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md',
                    enabled ? 'right-0.5' : 'left-0.5'
                  )}
                />
                {loading && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Loader2 size={12} className="animate-spin text-white" />
                  </span>
                )}
              </button>
            </div>

            {/* Legend — only shown when enabled */}
            <AnimatePresence>
              {enabled && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{   height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 py-4 space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-30 mb-3">
                      دليل الألوان
                    </p>
                    {TAJWEED_LEGEND.map((item) => (
                      <div key={item.label} className="flex items-center gap-3 py-1">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-bold text-islamic-green dark:text-islamic-beige flex-1">
                          {item.label}
                        </span>
                        <span className="text-[11px] opacity-40 font-bold">{item.sub}</span>
                      </div>
                    ))}
                  </div>

                  <div className="px-5 pb-4">
                    <p className="text-[10px] opacity-30 leading-relaxed">
                      مصدر البيانات: quran.com API · معيار alquran.cloud
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

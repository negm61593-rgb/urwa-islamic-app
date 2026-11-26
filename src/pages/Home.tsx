import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Book, ChevronLeft, Clock, Copy, Check, Share2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn, copyToClipboard } from '../lib/utils';

// ─── Daily verse pool (rotates by day-of-year) ───────────────────────────────
const DAILY_VERSES = [
  { text: '"فَمَنْ يَكْفُرْ بِالطَّاغُوتِ وَيُؤْمِنْ بِاللَّهِ فَقَدِ اسْتَمْسَكَ بِالْعُرْوَةِ الْوُثْقَى لَا انْفِصَامَ لَهَا"', ref: 'سورة البقرة — الآية 256' },
  { text: '"إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ ۚ يَا أَيُّهَا الَّذِينَ آمَنُوا صَلُّوا عَلَيْهِ وَسَلِّمُوا تَسْلِيمًا"', ref: 'سورة الأحزاب — الآية 56' },
  { text: '"وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ"', ref: 'سورة البقرة — الآية 186' },
  { text: '"أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ"', ref: 'سورة الرعد — الآية 28' },
  { text: '"وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا ۝ وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ"', ref: 'سورة الطلاق — الآيتان 2-3' },
  { text: '"إِنَّ مَعَ الْعُسْرِ يُسْرًا"', ref: 'سورة الشرح — الآية 6' },
  { text: '"وَقُل رَّبِّ زِدْنِي عِلْمًا"', ref: 'سورة طه — الآية 114' },
];

// ─── Quick links ──────────────────────────────────────────────────────────────
const QUICK_LINKS = [
  {
    title: 'القرآن الكريم',
    description: 'تصفح سور القرآن الكريم واستمع للتلاوة مع 13 قارئاً.',
    path: '/quran',
    icon: Book,
    emoji: null,
    accent: 'bg-islamic-green',
    span: 'md:col-span-2',
  },
  {
    title: 'أذكار الصباح',
    description: 'ابدأ يومك بذكر الله مع أذكار الصباح من حصن المسلم.',
    path: '/adhkar?type=morning',
    icon: null,
    emoji: '☀️',
    accent: 'bg-islamic-gold',
    span: '',
  },
  {
    title: 'أذكار المساء',
    description: 'اختم يومك بذكر الله مع أذكار المساء.',
    path: '/adhkar?type=evening',
    icon: null,
    emoji: '🌙',
    accent: 'bg-islamic-green',
    span: '',
  },
  {
    title: 'التسبيح',
    description: 'سبح الله واذكر نعمته مع المسبحة الإلكترونية.',
    path: '/tasbeeh',
    icon: null,
    emoji: '📿',
    accent: 'bg-islamic-gold',
    span: '',
  },
  {
    title: 'مواقيت الصلاة والقبلة',
    description: 'أوقات الصلاة لموقعك مع عداد تنازلي وبوصلة القبلة الحية.',
    path: '/prayer',
    icon: Clock,
    emoji: null,
    accent: 'bg-islamic-green',
    span: 'md:col-span-2',
  },
] as const;

export default function Home() {
  // Rotate verse by day-of-year so it changes daily
  const verse = useMemo(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000
    );
    return DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
  }, []);

  const [copiedVerse, setCopiedVerse] = useState(false);

  const handleCopyVerse = async () => {
    const success = await copyToClipboard(`${verse.text}\n${verse.ref}\n(عبر تطبيق عُروة)`);
    if (success) {
      setCopiedVerse(true);
      setTimeout(() => setCopiedVerse(false), 2000);
    }
  };

  const handleShareVerse = async () => {
    const shareText = `${verse.text}\n${verse.ref}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'عُرْوَة - آية اليوم',
          text: shareText,
          url: window.location.href,
        });
      } catch {
        // User canceled share
      }
    } else {
      handleCopyVerse();
    }
  };

  return (
    <div className="space-y-28 pb-28">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[78vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(197,160,89,0.07)_0%,transparent_65%)] pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="space-y-5"
          >
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-islamic-gold/15 border border-islamic-gold/30 text-[#8c6b2d] dark:text-islamic-gold text-xs font-black tracking-[0.3em] uppercase">
              <span className="w-1.5 h-1.5 bg-islamic-gold rounded-full animate-pulse" />
              واحة الهدوء الرقمية
            </div>

            <h1 className="text-5xl sm:text-7xl md:text-9xl font-bold font-cairo leading-none tracking-tighter text-islamic-green dark:text-islamic-gold">
              عُرْوَة
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-islamic-green/75 dark:text-islamic-beige/75 font-cairo max-w-lg mx-auto leading-relaxed">
              رفيقك اليومي في القراءة والذكر والصلاة
            </p>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.8 }}
            className="text-xl md:text-2xl text-islamic-green/85 dark:text-islamic-beige/85 leading-relaxed font-amiri italic max-w-2xl mx-auto"
          >
            "فَمَنْ يَكْفُرْ بِالطَّاغُوتِ وَيُؤْمِنْ بِاللَّهِ فَقَدِ اسْتَمْسَكَ بِالْعُرْوَةِ الْوُثْقَى لَا انْفِصَامَ لَهَا"
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-4 pt-4"
          >
            <Link
              to="/quran"
              className="group relative inline-flex items-center gap-3 bg-islamic-green text-islamic-gold px-10 py-4 rounded-full font-black text-base shadow-2xl hover:shadow-islamic-gold/20 transition-all hover:scale-105 active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-islamic-gold opacity-0 group-hover:opacity-10 transition-opacity" />
              ابدأ القراءة
              <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/prayer"
              className="inline-flex items-center gap-3 bg-white/80 dark:bg-white/5 backdrop-blur-xl text-islamic-green dark:text-islamic-beige px-10 py-4 rounded-full font-black text-base border border-islamic-gold/30 dark:border-white/10 hover:bg-islamic-gold/15 shadow-md transition-all"
            >
              <Clock size={18} />
              مواقيت الصلاة
            </Link>
          </motion.div>
        </div>

        {/* Floating orbs */}
        <motion.div
          animate={{ y: [0, -18, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-16 right-[8%] w-56 h-56 bg-islamic-gold/5 rounded-full blur-3xl pointer-events-none"
        />
        <motion.div
          animate={{ y: [0, 18, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          className="absolute bottom-16 left-[8%] w-72 h-72 bg-islamic-gold/4 rounded-full blur-3xl pointer-events-none"
        />
      </section>

      {/* ── Bento grid ───────────────────────────────────────────────────── */}
      <section aria-label="الأقسام الرئيسية" className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          {QUICK_LINKS.map((link, index) => {
            const IconComp = link.icon;
            return (
              <motion.div
                key={link.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.05 }}
                transition={{ delay: index * 0.08, duration: 0.5 }}
                className={link.span}
              >
                <Link
                  to={link.path}
                  className="group relative overflow-hidden flex flex-col h-full bg-white dark:bg-white/5 p-10 rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 border border-islamic-gold/20 hover:border-islamic-gold/50 soft-glow"
                >
                  {/* Hover shimmer */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-shimmer pointer-events-none" />
                  {/* Corner glow */}
                  <div className="absolute top-0 right-0 w-40 h-40 bg-islamic-gold/5 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-1000 pointer-events-none" />

                  <div className="relative z-10 space-y-6 flex-1">
                    <div className={cn(
                      link.accent,
                      'text-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl group-hover:rotate-12 group-hover:scale-110 transition-all duration-500'
                    )}>
                      {link.emoji
                        ? <span className="text-2xl">{link.emoji}</span>
                        : IconComp && <IconComp size={26} />
                      }
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold font-cairo text-islamic-green dark:text-islamic-gold group-hover:text-islamic-gold transition-colors duration-300">
                        {link.title}
                      </h3>
                      <p className="text-sm text-islamic-green/75 dark:text-islamic-beige/65 leading-relaxed font-amiri italic">
                        {link.description}
                      </p>
                    </div>
                  </div>

                  <div className="relative z-10 mt-6 flex items-center gap-2 text-islamic-gold text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span>اذهب الآن</span>
                    <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Daily verse ──────────────────────────────────────────────────── */}
      <section aria-label="آية اليوم" className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.05 }}
          className="relative overflow-hidden bg-white dark:bg-white/5 p-12 md:p-20 rounded-[3.5rem] shadow-2xl border border-islamic-gold/20 text-center soft-glow"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(197,160,89,0.06)_0%,transparent_55%)] pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto space-y-10">
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-islamic-gold/15 border border-islamic-gold/30 text-[#8c6b2d] dark:text-islamic-gold text-xs font-black uppercase tracking-[0.4em]">
              <span className="w-1.5 h-1.5 bg-islamic-gold rounded-full animate-pulse" />
              آية اليوم
            </div>

            <figure className="space-y-8">
              <blockquote className="text-3xl md:text-5xl font-amiri leading-[1.7] text-islamic-green dark:text-islamic-beige">
                {verse.text}
              </blockquote>
              <figcaption className="flex items-center justify-center gap-4">
                <div className="h-px w-10 bg-islamic-gold/30" />
                <cite className="text-islamic-gold font-serif italic text-lg not-italic">{verse.ref}</cite>
                <div className="h-px w-10 bg-islamic-gold/30" />
              </figcaption>

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleCopyVerse}
                  aria-label="نسخ نص الآية"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold border border-islamic-gold/30 bg-white dark:bg-white/5 text-islamic-green dark:text-islamic-beige hover:bg-islamic-gold/15 transition-all active:scale-95 cursor-pointer shadow-sm"
                >
                  {copiedVerse ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-islamic-gold" />}
                  <span>{copiedVerse ? 'تم النسخ بنجاح' : 'نسخ الآية'}</span>
                </button>
                <button
                  onClick={handleShareVerse}
                  aria-label="مشاركة الآية"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold border border-islamic-gold/30 bg-white dark:bg-white/5 text-islamic-green dark:text-islamic-beige hover:bg-islamic-gold/15 transition-all active:scale-95 cursor-pointer shadow-sm"
                >
                  <Share2 size={14} className="text-islamic-gold" />
                  <span>مشاركة</span>
                </button>
              </div>
            </figure>
          </div>
        </motion.div>
      </section>

    </div>
  );
}

import React, { ReactNode, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, Home, Book, HeartHandshake, CircleDot, Menu, X, ArrowUp, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { useClickOutside } from '../hooks/useClickOutside';

interface LayoutProps { children: ReactNode }

const NAV_LINKS = [
  { name: 'الرئيسية',       path: '/',       icon: Home },
  { name: 'القرآن الكريم',  path: '/quran',  icon: Book },
  { name: 'الأذكار',        path: '/adhkar', icon: HeartHandshake },
  { name: 'التسبيح',        path: '/tasbeeh',icon: CircleDot },
  { name: 'الصلاة والقبلة', path: '/prayer', icon: Clock },
] as const;

export default function Layout({ children }: LayoutProps) {
  const { isDarkMode, toggleDarkMode } = useStore();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [showScrollTop, setShowScrollTop] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const location = useLocation();
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on outside click
  useClickOutside(mobileMenuRef, useCallback(() => setIsMenuOpen(false), []), isMenuOpen);

  // Close mobile menu on route change
  useEffect(() => { setIsMenuOpen(false); }, [location.pathname]);

  // Scroll to top on route change
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [location.pathname]);

  // Show scroll-to-top button & navbar glass backdrop
  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 400);
      setIsScrolled(window.scrollY > 20);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Apply dark mode class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // Close menu on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-500 mesh-gradient">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav
        role="navigation"
        aria-label="القائمة الرئيسية"
        className={cn(
          'fixed top-0 left-0 right-0 z-50 px-4 transition-all duration-300',
          isScrolled
            ? 'py-3 bg-white/85 dark:bg-[#0f1a14]/85 backdrop-blur-2xl border-b border-islamic-gold/15 shadow-lg'
            : 'py-5 pointer-events-none'
        )}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto" ref={mobileMenuRef}>

          {/* Logo */}
          <Link to="/" aria-label="عُرْوَة — الصفحة الرئيسية" className="flex items-center gap-3 group shrink-0">
            <div className="w-11 h-11 bg-islamic-green text-islamic-gold rounded-2xl flex items-center justify-center shadow-2xl group-hover:rotate-12 transition-transform duration-500 border border-islamic-gold/25">
              <span className="text-xl font-serif italic font-bold">ع</span>
            </div>
            <span className="text-xl font-bold font-cairo tracking-tight text-islamic-green dark:text-islamic-gold hidden sm:block">
              عُرْوَة
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1 bg-white/80 dark:bg-white/5 backdrop-blur-2xl px-2 py-2 rounded-[2rem] border border-islamic-gold/20 dark:border-white/5 shadow-2xl soft-glow">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  aria-current={isActive(link.path) ? 'page' : undefined}
                  className={cn(
                    'relative px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap',
                    isActive(link.path)
                      ? 'bg-islamic-green text-islamic-gold shadow-lg'
                      : 'hover:bg-islamic-gold/15 text-islamic-green dark:text-islamic-beige'
                  )}
                >
                  <Icon size={16} />
                  {link.name}
                  {isActive(link.path) && (
                    <motion.span
                      layoutId="nav-active-dot"
                      className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-islamic-gold rounded-full"
                    />
                  )}
                </Link>
              );
            })}
            <div className="w-px h-5 bg-islamic-gold/20 mx-1" />
            <button
              onClick={toggleDarkMode}
              aria-label={isDarkMode ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
              className="w-9 h-9 rounded-full flex items-center justify-center text-islamic-gold hover:bg-islamic-gold hover:text-islamic-green transition-all cursor-pointer"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isDarkMode ? 'sun' : 'moon'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0,   opacity: 1 }}
                  exit={{   rotate:  90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>

          {/* Tablet Nav (md–lg): icon-only pills */}
          <div className="hidden md:flex lg:hidden items-center gap-1 bg-white/80 dark:bg-white/5 backdrop-blur-2xl px-2 py-2 rounded-[2rem] border border-islamic-gold/20 dark:border-white/5 shadow-2xl">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  aria-label={link.name}
                  aria-current={isActive(link.path) ? 'page' : undefined}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm transition-all duration-300',
                    isActive(link.path)
                      ? 'bg-islamic-green text-islamic-gold shadow-lg'
                      : 'hover:bg-islamic-gold/15 text-islamic-green dark:text-islamic-beige'
                  )}
                >
                  <Icon size={18} />
                </Link>
              );
            })}
            <div className="w-px h-5 bg-islamic-gold/20 mx-1" />
            <button
              onClick={toggleDarkMode}
              aria-label={isDarkMode ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
              className="w-10 h-10 rounded-full flex items-center justify-center text-islamic-gold hover:bg-islamic-gold hover:text-islamic-green transition-all cursor-pointer"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          {/* Mobile controls */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={toggleDarkMode}
              aria-label={isDarkMode ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
              className="w-11 h-11 rounded-2xl bg-white/90 dark:bg-[#15261c]/90 backdrop-blur-xl flex items-center justify-center text-islamic-gold shadow-lg border border-islamic-gold/25 cursor-pointer"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={() => setIsMenuOpen((v) => !v)}
              aria-label={isMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
              aria-expanded={isMenuOpen}
              className="w-11 h-11 rounded-2xl bg-white/90 dark:bg-[#15261c]/90 backdrop-blur-xl flex items-center justify-center text-islamic-gold shadow-lg border border-islamic-gold/25 cursor-pointer"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isMenuOpen ? 'x' : 'menu'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0,   opacity: 1 }}
                  exit={{   rotate:  90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>

          {/* Mobile dropdown */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1,    y: 0  }}
                exit={{   opacity: 0, scale: 0.95, y: -8 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute top-full left-4 right-4 mt-3 md:hidden pointer-events-auto"
              >
                <div className="bg-white/95 dark:bg-islamic-green/95 backdrop-blur-2xl rounded-[2rem] p-4 shadow-2xl border border-islamic-gold/20 dark:border-white/5 space-y-1">
                  {NAV_LINKS.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.path}
                        to={link.path}
                        aria-current={isActive(link.path) ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-4 px-5 py-3.5 rounded-2xl text-base font-bold transition-all',
                          isActive(link.path)
                            ? 'bg-islamic-green text-islamic-gold shadow-lg'
                            : 'hover:bg-islamic-gold/15 text-islamic-green dark:text-islamic-beige'
                        )}
                      >
                        <Icon size={20} />
                        <span>{link.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main id="main-content" className="flex-grow pt-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10">
          {children}
        </div>
      </main>

      {/* ── Scroll to top ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1,   y: 0  }}
            exit={{   opacity: 0, scale: 0.8, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="العودة إلى أعلى الصفحة"
            className={cn(
              'fixed left-4 sm:left-6 z-40 w-10 h-10 sm:w-12 sm:h-12 bg-islamic-gold text-islamic-green rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all gold-glow cursor-pointer',
              location.pathname === '/quran' ? 'bottom-44 sm:bottom-36' : 'bottom-6 sm:bottom-8'
            )}
          >
            <ArrowUp size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="bg-islamic-green text-islamic-beige py-14 mt-auto relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-islamic-gold/30 to-transparent" />

        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 text-center space-y-8 relative z-10">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-islamic-gold font-serif italic tracking-tighter">عُرْوَة</h2>
            <p className="text-base opacity-60 max-w-md mx-auto font-light leading-relaxed">
              ملاذك الروحي اليومي للقراءة والذكر والتسبيح ومواقيت الصلاة.
            </p>
          </div>

          <nav aria-label="روابط التذييل" className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="text-xs font-bold hover:text-islamic-gold transition-colors uppercase tracking-widest opacity-70 hover:opacity-100"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
            <p className="opacity-55">&copy; {new Date().getFullYear()} عُرْوَة — رفيق المسلم اليومي. جميع الحقوق محفوظة.</p>
            <div className="flex items-center gap-4 text-islamic-gold/80">
              <span>صدقة جارية — نسألكم صالح الدعاء</span>
              <span className="w-1 h-1 bg-islamic-gold/40 rounded-full" />
              <span className="text-white/55">القرآن • الأذكار • الصلاة</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

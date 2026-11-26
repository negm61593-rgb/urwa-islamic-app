import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useSpring } from "motion/react";
import { MapPin, RefreshCw, AlertCircle, ChevronDown, Navigation, Clock } from "lucide-react";
import {
  prayerService,
  DEFAULT_COORDINATES,
  type PrayerTimes,
  type PrayerTimesResponse,
  type Coordinates,
  type CalculationMethod,
  CALCULATION_METHODS,
} from "../services/prayerService";
import { cn } from "../lib/utils";
import { useClickOutside } from "../hooks/useClickOutside";

// ─── Prayer meta ────────────────────────────────────────────────────────────
const PRAYER_META: { key: keyof PrayerTimes; nameAr: string; icon: string; color: string }[] = [
  { key: "Fajr",    nameAr: "الفجر",   icon: "🌙", color: "from-indigo-900/40 to-indigo-800/20" },
  { key: "Sunrise", nameAr: "الشروق",  icon: "🌅", color: "from-orange-500/20 to-orange-400/10" },
  { key: "Dhuhr",   nameAr: "الظهر",   icon: "☀️", color: "from-yellow-500/20 to-yellow-400/10" },
  { key: "Asr",     nameAr: "العصر",   icon: "🌤️", color: "from-amber-500/20 to-amber-400/10" },
  { key: "Maghrib", nameAr: "المغرب",  icon: "🌇", color: "from-rose-500/20 to-rose-400/10" },
  { key: "Isha",    nameAr: "العشاء",  icon: "🌃", color: "from-slate-700/40 to-slate-600/20" },
];

// ─── Countdown hook (second-accurate + auto-advance trigger) ──────────────────
function useCountdown(secondsLeft: number, onExpire?: () => void) {
  const [remaining, setRemaining] = useState(Math.max(0, secondsLeft));
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    setRemaining(Math.max(0, secondsLeft));
    if (secondsLeft <= 0) return;

    const id = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          onExpireRef.current?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Qibla Compass ──────────────────────────────────────────────────────────
interface QiblaCompassProps {
  qiblaDirection: number;
}

function QiblaCompass({ qiblaDirection }: QiblaCompassProps) {
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [permissionState, setPermissionState] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [sensorSupported, setSensorSupported] = useState(true);
  const [listening, setListening] = useState(false);

  // Smooth spring for needle rotation (numeric degrees passed directly to motion.div `rotate`)
  const rawAngle = deviceHeading !== null ? qiblaDirection - deviceHeading : qiblaDirection;
  const springAngle = useSpring(rawAngle, { stiffness: 60, damping: 18, mass: 0.8 });

  useEffect(() => {
    springAngle.set(rawAngle);
  }, [rawAngle, springAngle]);

  // Attach/detach deviceorientation cleanly via useEffect
  useEffect(() => {
    if (!listening) return;
    if (!("DeviceOrientationEvent" in window)) {
      setSensorSupported(false);
      setPermissionState("denied");
      setListening(false);
      return;
    }

    let gotReading = false;
    const handler = (e: DeviceOrientationEvent) => {
      const heading =
        (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading ??
        (e.alpha !== null ? (360 - e.alpha) % 360 : null);
      if (heading !== null && !Number.isNaN(heading)) {
        gotReading = true;
        setDeviceHeading(heading);
        setPermissionState("granted");
      } else if (!gotReading) {
        setSensorSupported(false);
        setPermissionState("idle");
      }
    };

    window.addEventListener("deviceorientation", handler, true);
    return () => {
      window.removeEventListener("deviceorientation", handler, true);
    };
  }, [listening]);

  // Auto-enable sensor on non-iOS browsers that don't require explicit permission
  useEffect(() => {
    const reqPerm = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission;
    if (typeof reqPerm !== "function" && "DeviceOrientationEvent" in window) {
      setListening(true);
    }
  }, []);

  const requestCompass = useCallback(async () => {
    if (!("DeviceOrientationEvent" in window)) {
      setSensorSupported(false);
      setPermissionState("denied");
      return;
    }
    setPermissionState("requesting");

    const reqPerm = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission;
    if (typeof reqPerm === "function") {
      try {
        const perm = await reqPerm();
        if (perm !== "granted") {
          setPermissionState("denied");
          return;
        }
      } catch {
        setPermissionState("denied");
        return;
      }
    }

    setListening(true);
    if (deviceHeading === null) {
      // Wait briefly; if desktop returns no heading, keep static north angle clearly labeled
      setTimeout(() => {
        setPermissionState((prev) => (prev === "requesting" ? "idle" : prev));
      }, 600);
    }
  }, [deviceHeading]);

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Compass ring */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 select-none">
        {/* Outer decorative ring */}
        <div className="absolute inset-0 rounded-full border-2 border-islamic-gold/20 shadow-[0_0_60px_rgba(197,160,89,0.15)]" />

        {/* Cardinal directions */}
        {[
          { label: "ش", deg: 0,   top: "4px",    left: "50%",  transform: "translateX(-50%)" },
          { label: "ج", deg: 180, bottom: "4px", left: "50%",  transform: "translateX(-50%)" },
          { label: "غ", deg: 270, top: "50%",    left: "4px",  transform: "translateY(-50%)" },
          { label: "ق", deg: 90,  top: "50%",    right: "4px", transform: "translateY(-50%)" },
        ].map(({ label, top, bottom, left, right, transform }) => (
          <span
            key={label}
            className="absolute text-xs font-black text-islamic-green dark:text-islamic-gold z-10"
            style={{ top, bottom, left, right, transform } as React.CSSProperties}
          >
            {label}
          </span>
        ))}

        {/* Tick marks */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          {Array.from({ length: 72 }).map((_, i) => {
            const angle = (i * 5 * Math.PI) / 180;
            const isMajor = i % 6 === 0;
            const r1 = isMajor ? 44 : 46;
            const r2 = 48;
            const x1 = 50 + r1 * Math.sin(angle);
            const y1 = 50 - r1 * Math.cos(angle);
            const x2 = 50 + r2 * Math.sin(angle);
            const y2 = 50 - r2 * Math.cos(angle);
            return (
              <line
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={isMajor ? "rgba(197,160,89,0.5)" : "rgba(197,160,89,0.15)"}
                strokeWidth={isMajor ? "0.8" : "0.4"}
              />
            );
          })}
        </svg>

        {/* Compass face */}
        <div className="absolute inset-4 rounded-full bg-gradient-to-br from-white dark:from-islamic-green/60 to-islamic-beige/50 dark:to-islamic-green/30 shadow-inner border border-islamic-gold/10 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(197,160,89,0.05)_0%,transparent_70%)]" />
        </div>

        {/* Animated needle — pass numeric springAngle directly to Motion's rotate */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{ rotate: springAngle }}
        >
          <div className="relative flex flex-col items-center" style={{ height: "120px" }}>
            {/* Kaaba icon at tip */}
            <div className="w-8 h-8 rounded-lg bg-islamic-green dark:bg-islamic-gold flex items-center justify-center shadow-lg mb-1 border border-islamic-gold/40">
              <span className="text-islamic-gold dark:text-islamic-green text-base">🕋</span>
            </div>
            {/* Needle body */}
            <div className="w-1.5 flex-1 rounded-full bg-gradient-to-b from-islamic-gold via-islamic-gold/80 to-transparent shadow-[0_0_8px_rgba(197,160,89,0.6)]" />
            {/* Tail */}
            <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-transparent to-red-400/60" />
          </div>
        </motion.div>

        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-4 h-4 rounded-full bg-islamic-gold shadow-[0_0_12px_rgba(197,160,89,0.8)] border-2 border-white dark:border-islamic-green z-20" />
        </div>
      </div>

      {/* Direction info */}
      <div className="text-center space-y-2">
        <p className="text-4xl font-bold font-cairo text-islamic-green dark:text-islamic-gold" dir="ltr">
          {Math.round(qiblaDirection)}°
        </p>
        <p className="text-sm opacity-60 font-bold uppercase tracking-widest">اتجاه القبلة من الشمال الجغرافي</p>
      </div>

      {/* Sensor status */}
      {permissionState === "granted" && deviceHeading !== null ? (
        <div className="flex items-center gap-3 px-6 py-3 bg-green-500/10 text-green-600 dark:text-green-400 rounded-2xl text-sm font-bold border border-green-500/20 text-center">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0" />
          البوصلة الحية مفعّلة — وجّه هاتفك نحو الكعبة
        </div>
      ) : permissionState === "denied" ? (
        <div className="flex items-center gap-3 px-6 py-3 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-2xl text-sm font-bold border border-amber-500/20 text-center">
          <AlertCircle size={18} className="shrink-0" />
          {sensorSupported
            ? "يرجى السماح بالوصول إلى حساسات الجهاز من إعدادات المتصفح"
            : "جهازك لا يدعم حساس البوصلة — الإبرة تشير إلى زاوية القبلة من الشمال الجغرافي"}
        </div>
      ) : !sensorSupported ? (
        <div className="flex items-center gap-3 px-6 py-3 bg-islamic-gold/10 text-islamic-green dark:text-islamic-gold rounded-2xl text-sm font-bold border border-islamic-gold/20 text-center">
          <Navigation size={18} className="shrink-0" />
          الإبرة مضبوطة على {Math.round(qiblaDirection)}° من الشمال (حساس البوصلة الحية متاح على الهواتف)
        </div>
      ) : (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={requestCompass}
          className="flex items-center gap-3 px-8 py-4 bg-islamic-gold text-islamic-green rounded-2xl font-bold shadow-lg hover:shadow-islamic-gold/30 transition-all cursor-pointer"
        >
          <Navigation size={20} />
          {permissionState === "requesting" ? "جاري التفعيل..." : "تفعيل البوصلة الحية"}
        </motion.button>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Prayer() {
  const [, setCoords] = useState<Coordinates | null>(null);
  const [cityName, setCityName] = useState<string>("");
  const [isFallbackLocation, setIsFallbackLocation] = useState(false);
  const [prayerData, setPrayerData] = useState<PrayerTimesResponse | null>(null);
  const [qiblaDir, setQiblaDir] = useState<number | null>(null);
  const [method, setMethod] = useState<CalculationMethod>(4);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"times" | "qibla">("times");
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [, setTick] = useState(0);

  const methodPickerRef = useRef<HTMLDivElement>(null);
  useClickOutside(methodPickerRef, useCallback(() => setShowMethodPicker(false), []), showMethodPicker);

  const nextPrayer = prayerData ? prayerService.getNextPrayer(prayerData.timings) : null;
  const handleCountdownExpire = useCallback(() => {
    setTick((t) => t + 1);
  }, []);
  const countdown = useCountdown(nextPrayer?.secondsLeft ?? 0, handleCountdownExpire);

  const load = useCallback(async (selectedMethod: CalculationMethod = method) => {
    setLoading(true);
    setError(null);
    try {
      let position: Coordinates;
      let usedFallback = false;
      try {
        position = await prayerService.getCurrentPosition(false);
      } catch {
        position = DEFAULT_COORDINATES;
        usedFallback = true;
      }
      setIsFallbackLocation(usedFallback);
      setCoords(position);
      const [data, qibla, city] = await Promise.all([
        prayerService.getPrayerTimes(position, selectedMethod),
        prayerService.getQiblaDirection(position),
        prayerService.getCityName(position),
      ]);
      setPrayerData(data);
      setQiblaDir(qibla);
      setCityName(city);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  }, [method]);

  useEffect(() => { load(); }, []);

  const handleMethodChange = (m: CalculationMethod) => {
    setMethod(m);
    setShowMethodPicker(false);
    load(m);
  };

  // ── Error state ────────────────────────────────────────────────────────────
  if (error && !loading) {
    return (
      <div className="max-w-lg mx-auto py-32 flex flex-col items-center gap-8 text-center">
        <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertCircle size={48} className="text-red-500" />
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-bold font-cairo text-islamic-green dark:text-islamic-gold">تعذّر تحميل البيانات</h2>
          <p className="text-lg opacity-60 leading-relaxed">{error}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => load()}
          className="flex items-center gap-3 px-10 py-4 bg-islamic-gold text-islamic-green rounded-full font-bold shadow-xl cursor-pointer"
        >
          <RefreshCw size={20} />
          إعادة المحاولة
        </motion.button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 sm:space-y-12 pb-24">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="text-center space-y-6 relative">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-64 bg-islamic-gold/5 rounded-full blur-3xl -z-10" />
        <motion.span
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="inline-block px-4 py-1 rounded-full bg-islamic-gold/10 text-islamic-gold text-xs font-bold uppercase tracking-widest"
        >
          مواقيت الصلاة والقبلة
        </motion.span>
        <h1 className="text-4xl md:text-5xl font-bold font-cairo text-islamic-green dark:text-islamic-gold tracking-tight">
          أوقات الصلاة <span className="text-3xl align-middle">🕌</span>
        </h1>
        {cityName && !loading && (
          <div className="space-y-3">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-2 text-sm opacity-75 font-bold"
            >
              <MapPin size={16} className="text-islamic-gold" />
              <span>{cityName}</span>
            </motion.div>
            {isFallbackLocation && (
              <div className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold">
                <AlertCircle size={14} className="shrink-0" />
                <span>يتم عرض توقيت مكة المكرمة افتراضياً (فعّل إذن الموقع لعرض مدينتك)</span>
                <button
                  onClick={() => load()}
                  className="underline hover:text-islamic-gold cursor-pointer"
                >
                  تحديد موقعي
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Loading skeleton ────────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-6">
          <div className="h-40 rounded-[3rem] bg-islamic-gold/5 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-[2rem] bg-islamic-gold/5 animate-pulse" />
            ))}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {!loading && prayerData && (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-8 sm:space-y-10"
          >
            {/* ── Next prayer countdown ──────────────────────────────────────── */}
            {nextPrayer && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative overflow-hidden bg-islamic-green text-islamic-beige p-8 sm:p-10 md:p-14 rounded-[3rem] sm:rounded-[3.5rem] shadow-2xl soft-glow"
              >
                <div className="absolute top-0 right-0 w-80 h-80 bg-islamic-gold/10 rounded-full -mr-40 -mt-40 blur-[80px]" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-islamic-gold/5 rounded-full -ml-40 -mb-40 blur-[80px]" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="text-center md:text-right space-y-3">
                    <p className="text-xs font-black uppercase tracking-[0.3em] opacity-60">الصلاة القادمة</p>
                    <h2 className="text-5xl md:text-6xl font-bold font-cairo text-islamic-gold">
                      {nextPrayer.nameAr}
                    </h2>
                    <p className="text-2xl opacity-75 font-amiri" dir="ltr">{nextPrayer.time}</p>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-xs font-black uppercase tracking-[0.3em] opacity-60">الوقت المتبقي</p>
                    <p
                      dir="ltr"
                      className="text-4xl sm:text-5xl md:text-6xl font-bold font-cairo text-islamic-gold tabular-nums"
                    >
                      {countdown}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Hijri date + method picker ─────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {prayerData.date.hijri && (
                <div className="flex items-center gap-3 px-4 sm:px-6 py-3 bg-white dark:bg-white/5 rounded-2xl border border-islamic-gold/10 shadow-sm w-full sm:w-auto justify-center sm:justify-start">
                  <span className="text-islamic-gold text-xl shrink-0">📅</span>
                  <div className="text-right min-w-0">
                    <p className="font-bold font-cairo text-islamic-green dark:text-islamic-gold text-xs sm:text-sm leading-relaxed">
                      {prayerData.date.hijri.weekday.ar}،{" "}
                      {prayerData.date.hijri.day}{" "}
                      {prayerData.date.hijri.month.ar}{" "}
                      {prayerData.date.hijri.year} هـ
                    </p>
                    <p className="text-xs opacity-60 font-bold" dir="ltr">{prayerData.date.readable}</p>
                  </div>
                </div>
              )}

              <div className="relative z-40" ref={methodPickerRef}>
                <button
                  onClick={() => setShowMethodPicker((v) => !v)}
                  aria-expanded={showMethodPicker}
                  aria-label="اختيار طريقة حساب المواقيت"
                  className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-white/5 rounded-2xl border border-islamic-gold/15 shadow-sm hover:border-islamic-gold/40 transition-all font-bold text-sm text-islamic-green dark:text-islamic-gold cursor-pointer whitespace-nowrap"
                >
                  <span>طريقة الحساب</span>
                  <ChevronDown size={16} className={cn("transition-transform", showMethodPicker && "rotate-180")} />
                </button>
                <AnimatePresence>
                  {showMethodPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      className="absolute left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 top-full mt-2 w-72 max-h-80 overflow-y-auto bg-white dark:bg-[#13241a] backdrop-blur-xl rounded-3xl shadow-2xl border border-islamic-gold/20 z-50"
                    >
                      {CALCULATION_METHODS.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => handleMethodChange(m.id)}
                          className={cn(
                            "w-full text-right px-5 py-3 text-sm font-bold transition-all hover:bg-islamic-gold/10 cursor-pointer",
                            method === m.id
                              ? "bg-islamic-gold/15 text-islamic-gold"
                              : "text-islamic-green dark:text-islamic-beige"
                          )}
                        >
                          {method === m.id && <span className="ml-2 text-islamic-gold">✓</span>}
                          {m.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ── Tab switcher ───────────────────────────────────────────────── */}
            <div className="flex justify-center p-1.5 sm:p-2 bg-islamic-beige dark:bg-white/5 rounded-[2rem] w-fit max-w-full mx-auto border border-islamic-gold/15 shadow-inner">
              {(["times", "qibla"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex items-center gap-2 sm:gap-3 px-5 sm:px-10 py-3 sm:py-4 rounded-[1.5rem] text-xs sm:text-sm font-bold transition-all duration-300 whitespace-nowrap cursor-pointer",
                    activeTab === tab
                      ? "bg-white dark:bg-islamic-gold text-islamic-green shadow-xl scale-[1.02]"
                      : "text-islamic-green/70 dark:text-islamic-beige/70 hover:text-islamic-green"
                  )}
                >
                  {tab === "times" ? <><Clock size={16} /> مواقيت الصلاة</> : <><Navigation size={16} /> بوصلة القبلة</>}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {/* ── Prayer times grid ─────────────────────────────────────────── */}
              {activeTab === "times" && (
                <motion.div
                  key="times"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  className="grid grid-cols-2 md:grid-cols-3 gap-5"
                >
                  {PRAYER_META.map((prayer, idx) => {
                    const isNext = nextPrayer?.name === prayer.key;
                    const timeStr = prayerService.formatTime(prayerData.timings[prayer.key]);
                    return (
                      <motion.div
                        key={prayer.key}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.07 }}
                        className={cn(
                          "relative overflow-hidden p-8 rounded-[2.5rem] border transition-all duration-500 soft-glow",
                          isNext
                            ? "bg-islamic-green text-islamic-beige border-islamic-gold/40 shadow-2xl scale-[1.03]"
                            : "bg-white dark:bg-white/5 border-islamic-gold/20 hover:border-islamic-gold/50 shadow-sm hover:shadow-2xl"
                        )}
                      >
                        {isNext && (
                          <div className="absolute top-0 right-0 w-32 h-32 bg-islamic-gold/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                        )}
                        <div className="relative z-10 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-3xl">{prayer.icon}</span>
                            {isNext && (
                              <span className="text-[10px] font-black uppercase tracking-widest bg-islamic-gold text-islamic-green px-3 py-1 rounded-full">
                                التالية
                              </span>
                            )}
                          </div>
                          <div>
                            <p className={cn(
                              "text-xl font-bold font-cairo",
                              isNext ? "text-islamic-gold" : "text-islamic-green dark:text-islamic-gold"
                            )}>
                              {prayer.nameAr}
                            </p>
                            <p className={cn(
                              "text-3xl font-bold font-cairo tabular-nums mt-1",
                              isNext ? "text-white" : "text-islamic-green dark:text-islamic-beige"
                            )}>
                              {timeStr}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}

              {/* ── Qibla compass ─────────────────────────────────────────────── */}
              {activeTab === "qibla" && qiblaDir !== null && (
                <motion.div
                  key="qibla"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  className="bg-white dark:bg-white/5 p-12 md:p-16 rounded-[4rem] border border-islamic-gold/10 shadow-2xl soft-glow"
                >
                  <div className="text-center space-y-3 mb-12">
                    <h2 className="text-3xl font-bold font-cairo text-islamic-green dark:text-islamic-gold">
                      بوصلة القبلة 🕋
                    </h2>
                    <p className="opacity-50 font-amiri italic text-lg">
                      "وَمِنْ حَيْثُ خَرَجْتَ فَوَلِّ وَجْهَكَ شَطْرَ الْمَسْجِدِ الْحَرَامِ"
                    </p>
                  </div>
                  <QiblaCompass qiblaDirection={qiblaDir} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Refresh button ─────────────────────────────────────────────── */}
            <div className="flex justify-center pt-4">
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => load()}
                disabled={loading}
                className="flex items-center gap-3 px-8 py-4 bg-white dark:bg-white/5 border border-islamic-gold/20 rounded-2xl font-bold text-sm text-islamic-green dark:text-islamic-gold hover:border-islamic-gold/50 transition-all shadow-sm disabled:opacity-50"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                تحديث المواقيت
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

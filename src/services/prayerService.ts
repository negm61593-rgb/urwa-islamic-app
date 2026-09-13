/**
 * Prayer Times & Qibla Service
 * Uses the free Aladhan API — https://aladhan.com/prayer-times-api
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Midnight: string;
}

export interface PrayerTimesResponse {
  timings: PrayerTimes;
  date: {
    readable: string;
    hijri: {
      date: string;
      day: string;
      month: { number: number; en: string; ar: string };
      year: string;
      weekday: { en: string; ar: string };
    };
    gregorian: {
      date: string;
      weekday: { en: string };
    };
  };
  meta: {
    latitude: number;
    longitude: number;
    timezone: string;
    method: { id: number; name: string };
  };
}

export interface QiblaResponse {
  latitude: number;
  longitude: number;
  direction: number; // degrees from North
}

export type CalculationMethod =
  | 2   // Islamic Society of North America (ISNA)
  | 3   // Muslim World League
  | 4   // Umm Al-Qura University, Makkah
  | 5   // Egyptian General Authority of Survey
  | 1   // University of Islamic Sciences, Karachi
  | 7   // Institute of Geophysics, University of Tehran
  | 8   // Gulf Region
  | 9   // Kuwait
  | 10  // Qatar
  | 11  // Majlis Ugama Islam Singapura, Singapore
  | 12  // Union Organization Islamic de France
  | 13  // Diyanet İşleri Başkanlığı, Turkey
  | 14  // Spiritual Administration of Muslims of Russia
  | 15; // Moonsighting Committee Worldwide

export const CALCULATION_METHODS: { id: CalculationMethod; name: string }[] = [
  { id: 4,  name: 'أم القرى — مكة المكرمة' },
  { id: 3,  name: 'رابطة العالم الإسلامي' },
  { id: 8,  name: 'منطقة الخليج' },
  { id: 9,  name: 'الكويت' },
  { id: 10, name: 'قطر' },
  { id: 5,  name: 'الهيئة المصرية العامة للمساحة' },
  { id: 2,  name: 'الجمعية الإسلامية لأمريكا الشمالية' },
  { id: 1,  name: 'جامعة العلوم الإسلامية — كراتشي' },
  { id: 13, name: 'رئاسة الشؤون الدينية — تركيا' },
  { id: 7,  name: 'معهد الجيوفيزياء — طهران' },
];

const BASE = 'https://api.aladhan.com/v1';

export const DEFAULT_COORDINATES: Coordinates = { latitude: 21.4225, longitude: 39.8262 };
export const DEFAULT_CITY = 'مكة المكرمة';

export const prayerService = {
  /**
   * Fetch today's prayer times for given coordinates.
   */
  async getPrayerTimes(
    coords: Coordinates,
    method: CalculationMethod = 4
  ): Promise<PrayerTimesResponse> {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const dateStr = `${dd}-${mm}-${yyyy}`;

    const url = `${BASE}/timings/${dateStr}?latitude=${coords.latitude}&longitude=${coords.longitude}&method=${method}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Aladhan API error: ${res.status}`);
    const json = await res.json();
    if (json.code !== 200) throw new Error(json.status ?? 'Unknown API error');
    return json.data as PrayerTimesResponse;
  },

  /**
   * Fetch Qibla direction (degrees from North) for given coordinates.
   */
  async getQiblaDirection(coords: Coordinates): Promise<number> {
    const url = `${BASE}/qibla/${coords.latitude}/${coords.longitude}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Aladhan Qibla API error: ${res.status}`);
    const json = await res.json();
    if (json.code !== 200) throw new Error(json.status ?? 'Unknown API error');
    return (json.data as QiblaResponse).direction;
  },

  /**
   * Get user's current coordinates via the browser Geolocation API with fallback.
   */
  getCurrentPosition(fallbackToDefault = true): Promise<Coordinates> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        if (fallbackToDefault) return resolve(DEFAULT_COORDINATES);
        reject(new Error('متصفحك لا يدعم تحديد الموقع الجغرافي.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => {
          if (fallbackToDefault) {
            console.warn('Geolocation unavailable, falling back to Makkah:', err?.message);
            resolve(DEFAULT_COORDINATES);
            return;
          }
          switch (err.code) {
            case err.PERMISSION_DENIED:
              reject(new Error('تم رفض إذن الوصول إلى الموقع. يرجى السماح بالوصول من إعدادات المتصفح.'));
              break;
            case err.POSITION_UNAVAILABLE:
              reject(new Error('تعذّر تحديد موقعك الجغرافي. تأكد من تفعيل خدمة الموقع.'));
              break;
            case err.TIMEOUT:
              reject(new Error('انتهت مهلة تحديد الموقع. يرجى المحاولة مرة أخرى.'));
              break;
            default:
              reject(new Error('حدث خطأ غير معروف أثناء تحديد الموقع.'));
          }
        },
        { timeout: 6000, maximumAge: 300000, enableHighAccuracy: false }
      );
    });
  },

  /**
   * Reverse-geocode coordinates to a city name using a free API.
   */
  async getCityName(coords: Coordinates): Promise<string> {
    if (Math.abs(coords.latitude - DEFAULT_COORDINATES.latitude) < 0.05 &&
        Math.abs(coords.longitude - DEFAULT_COORDINATES.longitude) < 0.05) {
      return DEFAULT_CITY;
    }
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json&accept-language=ar`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Urwah-Islamic-App/1.0' },
      });
      const data = await res.json();
      return (
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.county ||
        data.address?.state ||
        'موقعك الحالي'
      );
    } catch {
      return 'موقعك الحالي';
    }
  },

  /**
   * Format a time string "HH:MM (timezone)" → "HH:MM"
   */
  formatTime(raw: string): string {
    return raw.split(' ')[0];
  },

  /**
   * Returns the name of the next prayer and minutes remaining.
   */
  getNextPrayer(timings: PrayerTimes): { name: string; nameAr: string; time: string; minutesLeft: number } {
    const prayers: { key: keyof PrayerTimes; nameAr: string }[] = [
      { key: 'Fajr',    nameAr: 'الفجر' },
      { key: 'Sunrise', nameAr: 'الشروق' },
      { key: 'Dhuhr',   nameAr: 'الظهر' },
      { key: 'Asr',     nameAr: 'العصر' },
      { key: 'Maghrib', nameAr: 'المغرب' },
      { key: 'Isha',    nameAr: 'العشاء' },
    ];

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    for (const prayer of prayers) {
      const [h, m] = prayerService.formatTime(timings[prayer.key]).split(':').map(Number);
      const prayerMinutes = h * 60 + m;
      if (prayerMinutes > nowMinutes) {
        const diff = prayerMinutes - nowMinutes;
        return {
          name: prayer.key,
          nameAr: prayer.nameAr,
          time: prayerService.formatTime(timings[prayer.key]),
          minutesLeft: diff,
        };
      }
    }

    // All prayers passed — next is Fajr tomorrow
    const [h, m] = prayerService.formatTime(timings.Fajr).split(':').map(Number);
    const fajrMinutes = h * 60 + m;
    const minutesLeft = 1440 - nowMinutes + fajrMinutes;
    return {
      name: 'Fajr',
      nameAr: 'الفجر',
      time: prayerService.formatTime(timings.Fajr),
      minutesLeft,
    };
  },
};

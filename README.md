<div align="center">

# 🌿 عُرْوَة — Urwa
### ملاذك الروحي اليومي للقرآن والذكر ومواقيت الصلاة
**An Elegant, Modern Islamic Web Application built with React 19, TypeScript & Tailwind CSS**

[![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-38bdf8?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](LICENSE)

</div>

---

## 📖 عن المشروع (About)

**عُرْوَة** هو تطبيق ويب إسلامي متكامل صُمم لتقديم تجربة إيمانية هادئة وعصرية للمستخدم المسلم في يومه. يجمع التطبيق بين جمال التصميم المستوحى من الهوية الإسلامية وسلاسة الواجهات التفاعلية الحديثة، مع دعم كامل للعمل دون اتصال بالإنترنت وحفظ التلاوات محلياً.

> *"فَمَنْ يَكْفُرْ بِالطَّاغُوتِ وَيُؤْمِنْ بِاللَّهِ فَقَدِ اسْتَمْسَكَ بِالْعُرْوَةِ الْوُثْقَى لَا انْفِصَامَ لَهَا"*

---

## ✨ المميزات الرئيسية (Features)

| القسم | المميزات التقنية والوظيفية |
| :--- | :--- |
| **📖 القرآن الكريم** | • قراءة السور بالرسم العثماني مع دعم أحكام التجويد الملونة.<br>• الاستماع لأكثر من 13 قارئاً من كبار قراء العالم الإسلامي.<br>• مزامنة تظليل الآيات تلقائياً أثناء التلاوة الصوتية (Verse-by-verse sync).<br>• إمكانية تحميل السور وتشغيلها بدون اتصال بالإنترنت (Offline Mode).<br>• التحكم بحجم الخط، التبديل السلس بين السور، والبحث اللحظي. |
| **🕌 مواقيت الصلاة والقبلة** | • حساب مواقيت الصلاة بدقة بناءً على الموقع الجغرافي (Geolocation API).<br>• عداد تنازلي تفاعلي للوقت المتبقي حتى الصلاة القادمة.<br>• بوصلة القبلة الحية ثلاثية الأبعاد بدعم حساسات حركة الجهاز (Device Orientation).<br>• دعم طرق حساب فلكية متعددة (أم القرى، رابطة العالم الإسلامي، وغيرها). |
| **🤲 الأذكار اليومية** | • أذكار الصباح والمساء منتقاة بدقة من حصن المسلم.<br>• عدادات ذكية لكل ذكر مع شريط تقدم إجمالي.<br>• ميزة نسخ ومشاركة الأذكار بنقرة واحدة.<br>• حفظ التقدم اليومي تلقائياً في التخزين المحلي (LocalStorage). |
| **📿 المسبحة الإلكترونية** | • عداد تسبيح تفاعلي بدوائر تقدم متحركة (Progress Rings).<br>• أهداف مخصصة (33، 100، 500، 1000) مع اهتزاز واستجابة صوتية.<br>• دعم مفاتيح الكيبورد (المسافة للتسبيح، حرف R لإعادة الضبط). |
| **🎨 التصميم والتجربة (UI/UX)** | • تصميم تجاوبي 100% متوافق مع كافة أحجام الشاشات (الهواتف، الأجهزة اللوحية، والشاشات العريضة).<br>• دعم الوضع الليلي الداكن (Dark Mode) والوضع النهاري بانسجام تام.<br>• خطوط عربية فاخرة (Cairo, Amiri, Amiri Quran) وتأثيرات زجاجية (Glassmorphism).<br>• تطبيق ويب تقدمي (PWA) قابل للتثبيت كبرنامج مستقل على الهاتف أو الحاسوب. |

---

## 🛠️ التقنيات المستخدمة (Tech Stack)

- **Frontend Core**: [React 19](https://react.dev/) + [TypeScript 5.8](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 6](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Animations**: [Motion](https://motion.dev/) (Framer Motion)
- **State Management**: [Zustand 5](https://github.com/pmndrs/zustand)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Routing**: [React Router 7](https://reactrouter.com/)
- **Audio & Offline**: Web Audio API + IndexedDB / Cache Storage
- **Backend (Optional Proxy)**: Express.js + Google GenAI SDK (Gemini)

---

## 📁 هيكلية المشروع (Project Structure)

```
urwa/
├── public/                 # الأصول العامة (Manifest, Favicon, Redirects)
├── server/                 # خادم Express وسيط (Proxy للـ AI اختياري)
├── src/
│   ├── components/         # المكونات العامة (Layout, Navbar, ErrorBoundary)
│   ├── data/               # بيانات الأذكار والسور الثابتة
│   ├── hooks/              # خطافات مخصصة (useLocalStorage, useClickOutside)
│   ├── lib/                # دوال المساعدة والتنسيق (utils, cn)
│   ├── pages/              # صفحات التطبيق (Home, Quran, Adhkar, Tasbeeh, Prayer)
│   ├── services/           # خدمات الصوت، المواقيت، والتخزين المحلي
│   └── store/              # إدارة الحالة العامة عبر Zustand
├── index.html              # ملف المدخل الأساسي مع وسوم SEO و Open Graph
└── vite.config.ts          # إعدادات Vite ومسارات البناء
```

---

## 🚀 التشغيل المحلي (Getting Started)

1. **استنساخ المستودع (Clone Repository)**:
   ```bash
   git clone https://github.com/xpork504-ux/urwa-islamic-app.git
   cd urwa-islamic-app
   ```

2. **تثبيت الحزم (Install Dependencies)**:
   ```bash
   npm install
   ```

3. **تشغيل بيئة التطوير (Run Dev Server)**:
   ```bash
   npm run dev
   ```

4. **بناء المشروع للإنتاج (Build for Production)**:
   ```bash
   npm run build
   ```

---

## 📄 الترخيص (License)

هذا المشروع مرخص بموجب رخصة [MIT](LICENSE) — يحق لك استخدامه وتطويره بحرية.

<div align="center">
  <sub>صُنع بكل إتقان واحتساب للأجر 🤍</sub>
</div>

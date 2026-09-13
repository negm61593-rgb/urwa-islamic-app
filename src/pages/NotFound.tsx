import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-10 text-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 120 }}
        className="space-y-6"
      >
        <p className="text-[10rem] leading-none font-bold font-cairo text-islamic-gold/20 select-none">
          404
        </p>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold font-cairo text-islamic-green dark:text-islamic-gold">
            الصفحة غير موجودة
          </h1>
          <p className="text-lg opacity-50 font-amiri italic max-w-sm mx-auto">
            "وَعَسَىٰ أَن تَكْرَهُوا شَيْئًا وَهُوَ خَيْرٌ لَّكُمْ"
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Link
          to="/"
          className="inline-flex items-center gap-3 px-10 py-5 bg-islamic-green text-islamic-gold rounded-full font-bold text-lg shadow-2xl hover:scale-105 active:scale-95 transition-all"
        >
          <Home size={22} />
          العودة للرئيسية
        </Link>
      </motion.div>
    </div>
  );
}

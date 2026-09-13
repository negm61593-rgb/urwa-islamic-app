import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy-load pages for better initial load performance
const Home     = lazy(() => import('./pages/Home'));
const Quran    = lazy(() => import('./pages/Quran'));
const Adhkar   = lazy(() => import('./pages/Adhkar'));
const Tasbeeh  = lazy(() => import('./pages/Tasbeeh'));
const Prayer   = lazy(() => import('./pages/Prayer'));
const NotFound = lazy(() => import('./pages/NotFound'));

/** Full-page skeleton shown while a lazy page chunk is loading */
function PageLoader() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 py-12 px-4">
      <div className="h-12 w-48 rounded-2xl bg-islamic-gold/8 animate-pulse mx-auto" />
      <div className="h-6  w-72 rounded-xl  bg-islamic-gold/5 animate-pulse mx-auto" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 rounded-[2rem] bg-islamic-gold/5 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <ErrorBoundary>
        <Layout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/"        element={<Home />}     />
              <Route path="/quran"   element={<Quran />}    />
              <Route path="/adhkar"  element={<Adhkar />}   />
              <Route path="/tasbeeh" element={<Tasbeeh />}  />
              <Route path="/prayer"  element={<Prayer />}   />
              <Route path="*"        element={<NotFound />} />
            </Routes>
          </Suspense>
        </Layout>
      </ErrorBoundary>
    </Router>
  );
}

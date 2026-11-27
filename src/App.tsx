import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';

const Home = lazy(() => import('./pages/Home'));
const Quran = lazy(() => import('./pages/Quran'));
const Adhkar = lazy(() => import('./pages/Adhkar'));
const Tasbeeh = lazy(() => import('./pages/Tasbeeh'));
const Prayer = lazy(() => import('./pages/Prayer'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 rounded-full border-3 border-islamic-gold/25 border-t-islamic-gold animate-spin" />
      <span className="text-sm font-bold text-islamic-gold/80 font-cairo">جاري التحميل...</span>
    </div>
  );
}

export default function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
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

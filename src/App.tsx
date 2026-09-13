import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';

import Home from './pages/Home';
import Quran from './pages/Quran';
import Adhkar from './pages/Adhkar';
import Tasbeeh from './pages/Tasbeeh';
import Prayer from './pages/Prayer';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <ErrorBoundary>
        <Layout>
          <Routes>
            <Route path="/"        element={<Home />}     />
            <Route path="/quran"   element={<Quran />}    />
            <Route path="/adhkar"  element={<Adhkar />}   />
            <Route path="/tasbeeh" element={<Tasbeeh />}  />
            <Route path="/prayer"  element={<Prayer />}   />
            <Route path="*"        element={<NotFound />} />
          </Routes>
        </Layout>
      </ErrorBoundary>
    </Router>
  );
}

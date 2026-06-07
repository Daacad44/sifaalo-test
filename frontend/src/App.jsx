import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import TestBanner from './components/TestBanner.jsx';
import Home from './pages/Home.jsx';
import Status from './pages/Status.jsx';
import Admin from './pages/Admin.jsx';
import { getConfig } from './api/services.js';

export default function App() {
  const [cfg, setCfg] = useState({ testMode: true });

  useEffect(() => {
    getConfig()
      .then(setCfg)
      .catch(() => setCfg({ testMode: true }));
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      {cfg.testMode && <TestBanner />}
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home testMode={cfg.testMode} />} />
          <Route path="/status" element={<Status />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-slate-400">
          SifaloPay integration test harness · {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}

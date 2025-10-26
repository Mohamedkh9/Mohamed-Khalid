import React, { useState, useEffect } from 'react';
import QrGenerator from './components/QrGenerator';
import QrScanner from './components/QrScanner';
import FolioPage from './components/FolioPage';

type Tab = 'generator' | 'scanner';

// Helper to safely decode Base64 strings that may contain UTF-8 characters
const base64ToUtf8 = (str: string): string => {
    try {
        // This combination handles Unicode characters correctly.
        return decodeURIComponent(escape(window.atob(str)));
    } catch (e) {
        console.error("Base64 to UTF-8 decoding failed:", e);
        // Return a string that will fail JSON.parse, triggering the error UI in FolioPage
        return "{}";
    }
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('generator');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  // Check for Folio page route
  const urlParams = new URLSearchParams(window.location.search);
  const folioData = urlParams.get('folio');

  if (folioData) {
    // Delegate all parsing and error handling to the FolioPage component
    return <FolioPage encodedData={folioData} />;
  }

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };
  
  const handleTabChange = (tab: Tab) => {
    if (tab === activeTab) return;
    setIsAnimating(true);
    setTimeout(() => {
      setActiveTab(tab);
      setIsAnimating(false);
    }, 150);
  };

  const TabButton = ({ tab, label, icon }: { tab: Tab; label: string; icon: string; }) => (
    <button
        onClick={() => handleTabChange(tab)}
        className={`relative flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 rounded-full z-10 ${
        activeTab === tab
            ? 'text-white'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
        }`}
    >
        <i className={`fa-solid ${icon}`}></i>
        <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen font-sans">
      <header className="bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-white/20 dark:border-white/10 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-qrcode text-brand-500 text-3xl"></i>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                QR Master Pro
              </h1>
            </div>
            <button
              onClick={toggleTheme}
              className="w-10 h-10 flex items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              aria-label="Toggle theme"
            >
              <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="relative flex p-1 bg-slate-200/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-full shadow-md mb-8">
              <div
                  className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-gradient-to-r from-brand-600 to-brand-500 shadow-lg rounded-full transition-transform duration-300 ease-in-out ${
                      activeTab === 'scanner' ? 'translate-x-full' : 'translate-x-0'
                  }`}
              ></div>
              <TabButton tab="generator" label="Generator" icon="fa-magic" />
              <TabButton tab="scanner" label="Scanner" icon="fa-camera" />
          </div>
          
          <div className={`transition-all duration-300 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
            {activeTab === 'generator' && <QrGenerator />}
            {activeTab === 'scanner' && <QrScanner />}
          </div>
        </div>
      </main>

       <footer className="text-center py-6 text-sm text-slate-500 dark:text-slate-400">
          <p>&copy; {new Date().getFullYear()} QR Master Pro. All rights reserved. A project by Studio AI.</p>
      </footer>
    </div>
  );
};

export default App;
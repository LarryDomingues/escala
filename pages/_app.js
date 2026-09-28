import '../styles/globals.css';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Head from 'next/head';
import { ThemeProvider } from '../contexts/ThemeContext';

// Cache do usuário
let userCache = null;
let userCacheTime = 0;
const CACHE_DURATION = 30000;

// Registrar Service Worker
const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✅ Service Worker registrado');
        })
        .catch((error) => {
          console.log('❌ Falha ao registrar SW:', error);
        });
    });
  }
};

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    window.addEventListener('appinstalled', () => {
      setShowInstallBanner(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  const loadUser = useCallback(async () => {
    const now = Date.now();
    if (userCache && (now - userCacheTime) < CACHE_DURATION) {
      setUser(userCache);
      setIsAuthenticated(!!userCache);
      setIsLoading(false);
      return userCache;
    }

    try {
      const res = await axios.get('/api/auth/me');
      const userData = res.data || null;
      userCache = userData;
      userCacheTime = now;
      setUser(userData);
      setIsAuthenticated(!!userData);
      return userData;
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          userCache = null;
          userCacheTime = 0;
          setUser(null);
          setIsAuthenticated(false);
          const publicPages = ['/login', '/criar-admin', '/reset-admin'];
          if (!publicPages.includes(router.pathname)) {
            router.push('/login');
          }
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, [router]);

  useEffect(() => {
    const handleStart = () => setLoading(true);
    const handleComplete = () => setLoading(false);
    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);
    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  useEffect(() => {
    if (!isLoading) {
      const publicPages = ['/login', '/criar-admin', '/reset-admin'];
      if (!isAuthenticated && !publicPages.includes(router.pathname)) {
        router.push('/login');
      }
    }
  }, [isLoading, isAuthenticated, router.pathname]);

  if (loading || isLoading) {
    return (
      <>
        <Head>
          <title>Escala de Louvor</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-800 border-t-slate-900 dark:border-t-white rounded-full animate-spin"></div>
            <p className="text-sm text-slate-400">Carregando</p>
          </div>
        </div>
      </>
    );
  }

  const enhancedProps = { ...pageProps, user, isAuthenticated };

  return (
    <ThemeProvider>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes, viewport-fit=cover" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="description" content="Sistema de Escala do Ministério de Louvor" />
        <title>Escala de Louvor</title>
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      {showInstallBanner && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 dark:bg-slate-800 text-white p-4 z-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📱</span>
            <div>
              <p className="font-semibold text-sm">Instale o App</p>
              <p className="text-xs opacity-90">Adicione à tela inicial para acesso rápido</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleInstallClick}
              className="bg-white text-slate-900 px-4 py-2 rounded-lg font-semibold hover:bg-slate-100 transition text-sm"
            >
              Instalar
            </button>
            <button
              onClick={() => setShowInstallBanner(false)}
              className="bg-slate-800 dark:bg-slate-700 px-4 py-2 rounded-lg hover:bg-slate-700 transition text-sm"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      <Component {...enhancedProps} />
    </ThemeProvider>
  );
}

export default MyApp;
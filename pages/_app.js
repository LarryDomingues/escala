import '../styles/globals.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Head from 'next/head';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get('/api/auth/me');
        if (res.data) {
          setUser(res.data);
          setIsAuthenticated(true);
        }
      } catch (error) {
        setIsAuthenticated(false);
        setUser(null);
        const publicPages = ['/login', '/criar-admin', '/reset-admin'];
        if (!publicPages.includes(router.pathname)) {
          router.push('/login');
        }
      }
    };
    checkAuth();
  }, [router.pathname]);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          setIsAuthenticated(false);
          setUser(null);
          if (!['/login', '/criar-admin', '/reset-admin'].includes(router.pathname)) {
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

  const enhancedProps = { ...pageProps, user, isAuthenticated };

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes, viewport-fit=cover" />
        <meta name="theme-color" content="#4F46E5" />
        <meta name="description" content="Sistema de Escala do Ministério de Louvor" />
        <title>Escala de Louvor</title>
        <link rel="icon" href="/favicon.ico" />
        {/* Removido o link da fonte daqui - movido para _document.js */}
      </Head>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3 text-gray-600 text-sm">Carregando...</p>
          </div>
        </div>
      )}
      <Component {...enhancedProps} />
    </>
  );
}

export default MyApp;
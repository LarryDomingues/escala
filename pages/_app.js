import '../styles/globals.css';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Head from 'next/head';
import UserContext from '../contexts/UserContext';

// Cache do usuário
let userCache = null;
let userCacheTime = 0;
const CACHE_DURATION = 30000; // 30 segundos

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Função para carregar usuário com cache
  const loadUser = useCallback(async () => {
    // Verificar cache
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
      
      // Atualizar cache
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
    // Carregar usuário apenas uma vez
    loadUser();
  }, [loadUser]);

  // Interceptor para redirecionamento
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Limpar cache em caso de erro 401
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

  // Controle de loading para navegação
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

  // Verificação de autenticação para páginas protegidas
  useEffect(() => {
    if (!isLoading) {
      const publicPages = ['/login', '/criar-admin', '/reset-admin'];
      if (!isAuthenticated && !publicPages.includes(router.pathname)) {
        router.push('/login');
      }
    }
  }, [isLoading, isAuthenticated, router.pathname]);

  // Mostrar loading apenas durante navegação
  if (loading || isLoading) {
    return (
      <>
        <Head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes, viewport-fit=cover" />
          <meta name="theme-color" content="#4F46E5" />
          <title>Escala de Louvor</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3 text-gray-600 text-sm">Carregando...</p>
          </div>
        </div>
      </>
    );
  }

  const enhancedProps = { ...pageProps, user, isAuthenticated };

  return (
    <UserContext.Provider value={{ user, isAuthenticated }}>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes, viewport-fit=cover" />
        <meta name="theme-color" content="#4F46E5" />
        <meta name="description" content="Sistema de Escala do Ministério de Louvor" />
        <title>Escala de Louvor</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...enhancedProps} />
    </UserContext.Provider>
  );
}

export default MyApp;
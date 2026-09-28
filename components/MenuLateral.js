import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';

export default function MenuLateral() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme, mounted } = useTheme();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await axios.get('/api/auth/me');
        setUser(res.data);
      } catch (error) {}
    };
    loadUser();
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [router.pathname]);

  const handleLogout = async () => {
    await axios.post('/api/auth/logout');
    router.push('/login');
  };

  const isActive = (path) => router.pathname === path;

  const menuItems = [
    { path: '/', icon: '◐', label: 'Início' },
    { path: '/visualizar-escala', icon: '◇', label: 'Escalas' },
    { path: '/playlist', icon: '▷', label: 'Playlist' },
  ];

  if (user?.nivel === 'admin' || user?.nivel === 'coordenador') {
    menuItems.push(
      { path: '/cadastro-membros', icon: '○', label: 'Membros' },
      { path: '/criar-escala', icon: '✎', label: 'Criar Escala' }
    );
  }

  if (user?.nivel === 'admin') {
    menuItems.push(
      { path: '/gerenciar-usuarios', icon: '◈', label: 'Usuários' },
      { path: '/vincular-usuarios', icon: '⚭', label: 'Vincular' },
      { path: '/logs', icon: '≡', label: 'Logs' }
    );
  }

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/70 dark:border-slate-800 z-40 flex items-center justify-between px-4 transition-colors">
        <div className="flex items-center gap-2.5">
          <img 
            src="/logo.png" 
            alt="Louvor" 
            className="h-9 w-auto object-contain"
          />
          
        </div>
        <div className="flex items-center gap-1">
          {/* Botão de tema - Mobile */}
          {mounted && (
            <button
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Alternar tema"
              title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
            >
              {theme === 'light' ? '☾' : '☀'}
            </button>
          )}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Menu"
          >
            <div className="flex flex-col gap-1">
              <span className={`block w-4 h-0.5 bg-slate-700 dark:bg-slate-300 rounded transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
              <span className={`block w-4 h-0.5 bg-slate-700 dark:bg-slate-300 rounded transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`}></span>
              <span className={`block w-4 h-0.5 bg-slate-700 dark:bg-slate-300 rounded transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
            </div>
          </button>
        </div>
      </header>

      {/* Overlay */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/20 dark:bg-slate-950/50 backdrop-blur-sm z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200/70 dark:border-slate-800 z-50
        transform transition-all duration-300 ease-out
        ${menuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
        flex flex-col
      `}>
        {/* Logo - Desktop */}
        <div className="hidden md:flex items-center gap-3 px-6 py-6 border-b border-slate-200/70 dark:border-slate-800">
          <img 
            src="/logo.png" 
            alt="Louvor" 
            className="h-12 w-auto object-contain"
          />
          
        </div>

        {/* Logo - Mobile */}
        <div className="md:hidden flex items-center justify-between px-5 py-5 border-b border-slate-200/70 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="Louvor" 
              className="h-10 w-auto object-contain"
            />
            <div>
              <div className="font-semibold text-slate-900 dark:text-white text-sm">Louvor</div>
              <div className="text-xs text-slate-400">Escala</div>
            </div>
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-0.5">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                  ${isActive(item.path)
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }
                `}
              >
                <span className={`text-base w-5 text-center ${isActive(item.path) ? '' : 'text-slate-400 dark:text-slate-500'}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* Footer do menu */}
        <div className="p-3 border-t border-slate-200/70 dark:border-slate-800">
          {/* User info + Botão de tema */}
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {user?.nome?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.nome || 'Usuário'}</div>
              <div className="text-xs text-slate-400 capitalize">{user?.nivel || ''}</div>
            </div>
            
            {/* 🔥 Botão de tema - Desktop */}
            {mounted && (
              <button
                onClick={toggleTheme}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all flex-shrink-0"
                aria-label="Alternar tema"
                title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
              >
                {theme === 'light' ? '☾' : '☀'}
              </button>
            )}
          </div>
          
          {/* Botão Sair */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-colors"
          >
            <span className="text-base w-5 text-center">↪</span>
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from 'axios';

export default function MenuLateral() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await axios.get('/api/auth/me');
        setUser(res.data);
      } catch (error) {}
    };
    loadUser();
  }, []);

  const handleLogout = async () => {
    await axios.post('/api/auth/logout');
    router.push('/login');
  };

  const isActive = (path) => router.pathname === path;

  const menuItems = [
    { path: '/', icon: '📊', label: 'Dashboard' },
    { path: '/visualizar-escala', icon: '📅', label: 'Visualizar Escalas' },
    { path: '/playlist', icon: '▶️', label: 'PlayList' },
  ];

  if (user?.nivel === 'admin' || user?.nivel === 'coordenador') {
    menuItems.push(
      { path: '/cadastro-membros', icon: '👤', label: 'Membros' },
      { path: '/criar-escala', icon: '📝', label: 'Criar Escala' }
    );
  }

  if (user?.nivel === 'admin') {
    menuItems.push(
      { path: '/gerenciar-usuarios', icon: '👥', label: 'Gerenciar Usuários' },
      { path: '/logs', icon: '📋', label: 'Logs' }
    );
  }

  return (
    <>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="md:hidden fixed top-3 left-3 z-50 p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg active:scale-95 transition-transform"
      >
        {menuOpen ? '✕' : '☰'}
      </button>

      {menuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMenuOpen(false)} />
      )}

      <nav className={`
        fixed top-0 left-0 h-full w-72 bg-gray-800 text-white shadow-xl z-50
        transform transition-transform duration-300 ease-in-out
        ${menuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
        overflow-y-auto safe-bottom
      `}>
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-center">
            {user && (
              <div className="text-center">
                <div className="text-3xl">🎵</div>
                <div className="font-bold text-lg">Louvor</div>
                <div className="text-xs text-gray-400">Sistema de Escala</div>
              </div>
            )}
          </div>
        </div>

        <div className="p-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`
                flex items-center px-4 py-3 rounded-xl transition-colors active:scale-95
                ${isActive(item.path)
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }
              `}
              onClick={() => setMenuOpen(false)}
            >
              <span className="mr-3 text-xl">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700 bg-gray-800 safe-bottom">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-xl transition-colors active:scale-95"
          >
            <span className="mr-3 text-xl">🚪</span>
            <span className="text-sm">Sair</span>
          </button>
        </div>
      </nav>
    </>
  );
}
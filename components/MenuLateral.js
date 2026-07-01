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
          {/* Dashboard */}
          <Link
            href="/"
            className={`flex items-center px-4 py-3 rounded-xl transition-colors active:scale-95 ${
              isActive('/') ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
            onClick={() => setMenuOpen(false)}
          >
            <span className="mr-3 text-xl">📊</span>
            <span className="text-sm">Dashboard</span>
          </Link>

          {/* Visualizar Escalas */}
          <Link
            href="/visualizar-escala"
            className={`flex items-center px-4 py-3 rounded-xl transition-colors active:scale-95 ${
              isActive('/visualizar-escala') ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
            onClick={() => setMenuOpen(false)}
          >
            <span className="mr-3 text-xl">📅</span>
            <span className="text-sm">Visualizar Escalas</span>
          </Link>

          {/* PlayList */}
          <Link
            href="/playlist"
            className={`flex items-center px-4 py-3 rounded-xl transition-colors active:scale-95 ${
              isActive('/playlist') ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
            onClick={() => setMenuOpen(false)}
          >
            <span className="mr-3 text-xl">▶️</span>
            <span className="text-sm">PlayList</span>
          </Link>

          {/* Membros - Admin e Coordenador */}
          {(user?.nivel === 'admin' || user?.nivel === 'coordenador') && (
            <Link
              href="/cadastro-membros"
              className={`flex items-center px-4 py-3 rounded-xl transition-colors active:scale-95 ${
                isActive('/cadastro-membros') ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              onClick={() => setMenuOpen(false)}
            >
              <span className="mr-3 text-xl">👤</span>
              <span className="text-sm">Membros</span>
            </Link>
          )}

          {/* Criar Escala - Admin e Coordenador */}
          {(user?.nivel === 'admin' || user?.nivel === 'coordenador') && (
            <Link
              href="/criar-escala"
              className={`flex items-center px-4 py-3 rounded-xl transition-colors active:scale-95 ${
                isActive('/criar-escala') ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              onClick={() => setMenuOpen(false)}
            >
              <span className="mr-3 text-xl">📝</span>
              <span className="text-sm">Criar Escala</span>
            </Link>
          )}

          {/* Divider para Admin */}
          {user?.nivel === 'admin' && (
            <div className="border-t border-gray-700 my-2"></div>
          )}

          {/* Gerenciar Usuários - Admin */}
          {user?.nivel === 'admin' && (
            <Link
              href="/gerenciar-usuarios"
              className={`flex items-center px-4 py-3 rounded-xl transition-colors active:scale-95 ${
                isActive('/gerenciar-usuarios') ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              onClick={() => setMenuOpen(false)}
            >
              <span className="mr-3 text-xl">👥</span>
              <span className="text-sm">Gerenciar Usuários</span>
            </Link>
          )}

          {/* Vincular Usuários - Admin */}
          {user?.nivel === 'admin' && (
            <Link
              href="/vincular-usuarios"
              className={`flex items-center px-4 py-3 rounded-xl transition-colors active:scale-95 ${
                isActive('/vincular-usuarios') ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              onClick={() => setMenuOpen(false)}
            >
              <span className="mr-3 text-xl">🔗</span>
              <span className="text-sm">Vincular Usuários</span>
            </Link>
          )}

          {/* Logs - Admin */}
          {user?.nivel === 'admin' && (
            <Link
              href="/logs"
              className={`flex items-center px-4 py-3 rounded-xl transition-colors active:scale-95 ${
                isActive('/logs') ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              onClick={() => setMenuOpen(false)}
            >
              <span className="mr-3 text-xl">📋</span>
              <span className="text-sm">Logs</span>
            </Link>
          )}
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
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Image from 'next/image';
import axios from 'axios';
import {
  LayoutDashboard, Calendar, Music, User, PenSquare,
  Upload, Users, Link2, ScrollText, LogOut, Menu, X
} from 'lucide-react';

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

  const NavItem = ({ href, icon: Icon, label }) => {
    const active = href === '/' ? isActive(href) : router.pathname.startsWith(href);
    return (
      <Link
        href={href}
        className={`flex items-center px-4 py-2.5 mb-0.5 rounded-lg transition-all duration-200 ${
          active
            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
            : 'text-gray-400 hover:bg-gray-700/60 hover:text-gray-200'
        }`}
        onClick={() => setMenuOpen(false)}
      >
        <Icon className="w-5 h-5 mr-3 flex-shrink-0" strokeWidth={1.5} />
        <span className="text-sm font-medium">{label}</span>
        {active && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
        )}
      </Link>
    );
  };

  return (
    <>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="md:hidden fixed top-3 left-3 z-50 p-3 bg-indigo-600 text-white rounded-xl shadow-lg active:scale-95 transition-transform hover:bg-indigo-500"
      >
        {menuOpen ? <X className="w-5 h-5" strokeWidth={2} /> : <Menu className="w-5 h-5" strokeWidth={2} />}
      </button>

      {menuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
      )}

      <nav className={`
        fixed top-0 left-0 h-full w-72 bg-gray-900 text-white z-50
        transform transition-transform duration-300 ease-in-out
        ${menuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
        overflow-y-auto safe-bottom
        flex flex-col
      `}>
        {user && (
          <div className="p-6 border-b border-gray-800">
            <div className="flex flex-col items-center">
              <div className=" rounded-xl bg-white/50 p-0.5 backdrop-blur-sm mb-3 ring-1 ring-white/10 overflow-hidden">
                <Image src="/logo.png" alt="Logo" width={100} height={100} className="rounded-lg" />
              </div>
              <div className="font-semibold text-base text-gray-100">Louvor</div>
              <div className="text-xs text-gray-500 mt-0.5">Sistema de Escala</div>
            </div>
          </div>
        )}

        <div className="flex-1 px-3 py-4 space-y-0.5">
          <div className="px-3 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Principal</span>
          </div>
          <NavItem href="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem href="/visualizar-escala" icon={Calendar} label="Visualizar Escalas" />
          <NavItem href="/playlist" icon={Music} label="PlayList" />

          {(user?.nivel === 'admin' || user?.nivel === 'coordenador') && (
            <>
              <div className="px-3 mt-4 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Gerenciar</span>
              </div>
              <NavItem href="/cadastro-membros" icon={User} label="Membros" />
              <NavItem href="/criar-escala" icon={PenSquare} label="Criar Escala" />
            </>
          )}

          {user?.nivel === 'admin' && (
            <>
              <div className="px-3 mt-4 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Administração</span>
              </div>
              <NavItem href="/importar-escala" icon={Upload} label="Importar Escalas" />
              <NavItem href="/gerenciar-usuarios" icon={Users} label="Gerenciar Usuários" />
              <NavItem href="/vincular-usuarios" icon={Link2} label="Vincular Usuários" />
              <NavItem href="/logs" icon={ScrollText} label="Logs" />
            </>
          )}
        </div>

        <div className="p-3 border-t border-gray-800 safe-bottom">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2.5 text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-all duration-200"
          >
            <LogOut className="w-5 h-5 mr-3 flex-shrink-0" strokeWidth={1.5} />
            <span className="text-sm font-medium">Sair</span>
          </button>
        </div>
      </nav>
    </>
  );
}

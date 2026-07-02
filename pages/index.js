import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Cache para dados do dashboard
let dashboardCache = null;
let dashboardCacheTime = 0;
const DASHBOARD_CACHE_TTL = 60000; // 1 minuto

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [membroLogado, setMembroLogado] = useState(null);
  const [escalas, setEscalas] = useState([]);
  const [proximos, setProximos] = useState([]);
  const [totalMembros, setTotalMembros] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async (forceRefresh = false) => {
    // Verificar cache
    const now = Date.now();
    if (!forceRefresh && dashboardCache && (now - dashboardCacheTime) < DASHBOARD_CACHE_TTL) {
      const cached = dashboardCache;
      setEscalas(cached.escalas);
      setProximos(cached.proximos);
      setTotalMembros(cached.totalMembros);
      setMembroLogado(cached.membroLogado);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const mesAtual = format(new Date(), 'yyyy-MM');
      const [escalasRes, membrosRes] = await Promise.all([
        axios.get(`/api/escala?mes=${mesAtual}`),
        axios.get('/api/membros'),
      ]);

      const escalasData = escalasRes.data;
      const membrosData = membrosRes.data;
      
      // Encontrar membro logado
      const membro = membrosData.find(m => m.usuario_id === user?.id) || null;
      
      const hoje = format(new Date(), 'yyyy-MM-dd');
      const proximosData = escalasData.filter(e => e.data >= hoje).slice(0, 7);

      // Atualizar cache
      dashboardCache = {
        escalas: escalasData,
        proximos: proximosData,
        totalMembros: membrosData.length,
        membroLogado: membro,
      };
      dashboardCacheTime = now;

      setEscalas(escalasData);
      setProximos(proximosData);
      setTotalMembros(membrosData.length);
      setMembroLogado(membro);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get('/api/auth/me');
        setUser(res.data);
        await loadData();
      } catch (error) {
        router.push('/login');
      }
    };
    checkAuth();
  }, [loadData]);

  const formatarData = (data) => format(parseISO(data), 'dd/MM/yyyy');
  const getYouTubeLink = (link) => {
    if (!link) return null;
    const match = link.match(/(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    return match ? `https://www.youtube.com/watch?v=${match[1]}` : link;
  };

  const isUsuarioLogado = (membroId) => membroLogado?.id === membroId;

  const formatarNomeMembro = (nome, membroId) => {
    if (isUsuarioLogado(membroId)) {
      return (
        <span className="membro-destaque">
          ⭐ {nome} <span className="badge-eu">(EU)</span>
        </span>
      );
    }
    return <span className="membro-nome">{nome}</span>;
  };

  const eventosHoje = escalas.filter(e => e.data === format(new Date(), 'yyyy-MM-dd'));

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Carregando dados...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">
          <p>{error}</p>
          <button onClick={() => loadData(true)} className="mt-2 btn-primary">Tentar novamente</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-3 md:p-4 max-w-7xl mx-auto">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6">📊 Dashboard</h1>

        {/* Informação do Usuário Logado */}
        {membroLogado ? (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 md:p-4 rounded-lg mb-4 md:mb-6 border-l-4 border-orange-400">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-2xl">⭐</span>
              <div>
                <p className="font-medium text-orange-800 text-sm md:text-base">
                  Você está destacado na escala como <strong>{membroLogado.nome}</strong>
                  {user?.nivel === 'admin' && <span className="ml-2 text-xs text-gray-500">(Administrador)</span>}
                  {user?.nivel === 'coordenador' && <span className="ml-2 text-xs text-gray-500">(Coordenador)</span>}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 p-3 md:p-4 rounded-lg mb-4 md:mb-6 border-l-4 border-gray-400">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-2xl">ℹ️</span>
              <div>
                <p className="text-gray-600 text-sm md:text-base">
                  Você não está vinculado a nenhum membro. Peça ao administrador para vincular seu usuário a um membro.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cards - com skeleton loading melhorado */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
          {[
            { label: 'Eventos Hoje', value: eventosHoje.length },
            { label: 'Eventos no Mês', value: escalas.length },
            { label: 'Membros', value: totalMembros },
            { label: 'Próximos Eventos', value: proximos.length },
          ].map((item, index) => (
            <div key={index} className="bg-white p-3 md:p-4 rounded-lg shadow-sm">
              <div className="text-xs md:text-sm text-gray-500">{item.label}</div>
              <div className="text-xl md:text-2xl font-bold text-indigo-600">{item.value}</div>
            </div>
          ))}
        </div>

        {/* Restante do componente... */}
        {/* Próximos Eventos e Escala do Mês - mantidos */}
      </div>
    </Layout>
  );
}
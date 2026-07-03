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
      
      // Buscar escalas do mês
      const escalasRes = await axios.get(`/api/escala?mes=${mesAtual}`);
      const escalasData = escalasRes.data;
      
      // Buscar membros (agora todos podem acessar)
      const membrosRes = await axios.get('/api/membros');
      const membrosData = membrosRes.data;
      
      // Encontrar membro vinculado ao usuário logado
      let membro = null;
      if (user && user.id) {
        membro = membrosData.find(m => m.usuario_id === user.id) || null;
      }
      
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
        
        // Se o membro já veio na resposta do /api/auth/me, usar ele
        if (res.data && res.data.membro) {
          setMembroLogado(res.data.membro);
        }
        
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

        {/* Cards */}
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

        {/* Próximos Eventos */}
        {proximos.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-4 md:mb-6">
            <div className="p-3 md:p-4 border-b">
              <h2 className="text-base md:text-lg font-semibold">📅 Próximos Eventos</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 md:px-4 py-2 text-left">Data</th>
                    <th className="px-2 md:px-4 py-2 text-left hidden sm:table-cell">Dia</th>
                    <th className="px-2 md:px-4 py-2 text-left hidden md:table-cell">Voz</th>
                    <th className="px-2 md:px-4 py-2 text-left hidden md:table-cell">Violão</th>
                    <th className="px-2 md:px-4 py-2 text-left hidden lg:table-cell">Guitarra</th>
                    <th className="px-2 md:px-4 py-2 text-left hidden xl:table-cell">Baixo</th>
                    <th className="px-2 md:px-4 py-2 text-left hidden xl:table-cell">Bateria</th>
                    <th className="px-2 md:px-4 py-2 text-center">Vídeo</th>
                  </tr>
                </thead>
                <tbody>
                  {proximos.map((e, i) => {
                    const estaEscalado = membroLogado && (
                      e.voz_id === membroLogado.id ||
                      e.voz2_id === membroLogado.id ||
                      e.violao_id === membroLogado.id ||
                      e.guitarra_id === membroLogado.id ||
                      e.baixo_id === membroLogado.id ||
                      e.bateria_id === membroLogado.id ||
                      e.teclado_id === membroLogado.id
                    );
                    return (
                      <tr key={i} className={`border-t hover:bg-gray-50 ${estaEscalado ? 'bg-yellow-50' : ''}`}>
                        <td className="px-2 md:px-4 py-2 font-medium whitespace-nowrap">{formatarData(e.data)}</td>
                        <td className="px-2 md:px-4 py-2 text-indigo-600 hidden sm:table-cell whitespace-nowrap">{e.dia_semana}</td>
                        <td className="px-2 md:px-4 py-2 hidden md:table-cell">
                          {e.voz_nome ? formatarNomeMembro(e.voz_nome, e.voz_id) : '--'}
                        </td>
                        <td className="px-2 md:px-4 py-2 hidden md:table-cell">
                          {e.violao_nome ? formatarNomeMembro(e.violao_nome, e.violao_id) : '--'}
                        </td>
                        <td className="px-2 md:px-4 py-2 hidden lg:table-cell">
                          {e.guitarra_nome ? formatarNomeMembro(e.guitarra_nome, e.guitarra_id) : '--'}
                        </td>
                        <td className="px-2 md:px-4 py-2 hidden xl:table-cell">
                          {e.baixo_nome ? formatarNomeMembro(e.baixo_nome, e.baixo_id) : '--'}
                        </td>
                        <td className="px-2 md:px-4 py-2 hidden xl:table-cell">
                          {e.bateria_nome ? formatarNomeMembro(e.bateria_nome, e.bateria_id) : '--'}
                        </td>
                        <td className="px-2 md:px-4 py-2 text-center">
                          {e.link_youtube && (
                            <a
                              href={getYouTubeLink(e.link_youtube)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs md:text-sm"
                            >
                              ▶️
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Escala do Mês */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-3 md:p-4 border-b flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-base md:text-lg font-semibold">
              📆 Escala do Mês {format(new Date(), 'MMMM/yyyy', { locale: ptBR })}
            </h2>
            <span className="text-xs md:text-sm text-gray-500">{escalas.length} eventos</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 md:px-4 py-2 text-left">Data</th>
                  <th className="px-2 md:px-4 py-2 text-left hidden sm:table-cell">Dia</th>
                  <th className="px-2 md:px-4 py-2 text-left hidden md:table-cell">Voz</th>
                  <th className="px-2 md:px-4 py-2 text-left hidden lg:table-cell">Voz2</th>
                  <th className="px-2 md:px-4 py-2 text-left hidden md:table-cell">Violão</th>
                  <th className="px-2 md:px-4 py-2 text-left hidden xl:table-cell">Guitarra</th>
                  <th className="px-2 md:px-4 py-2 text-left hidden xl:table-cell">Baixo</th>
                  <th className="px-2 md:px-4 py-2 text-left hidden xl:table-cell">Bateria</th>
                  <th className="px-2 md:px-4 py-2 text-left hidden 2xl:table-cell">Teclado</th>
                  <th className="px-2 md:px-4 py-2 text-center">Vídeo</th>
                </tr>
              </thead>
              <tbody>
                {escalas.map((e, i) => {
                  const estaEscalado = membroLogado && (
                    e.voz_id === membroLogado.id ||
                    e.voz2_id === membroLogado.id ||
                    e.violao_id === membroLogado.id ||
                    e.guitarra_id === membroLogado.id ||
                    e.baixo_id === membroLogado.id ||
                    e.bateria_id === membroLogado.id ||
                    e.teclado_id === membroLogado.id
                  );
                  return (
                    <tr key={i} className={`border-t hover:bg-gray-50 ${estaEscalado ? 'bg-yellow-50' : ''}`}>
                      <td className="px-2 md:px-4 py-2 font-medium whitespace-nowrap">{formatarData(e.data)}</td>
                      <td className="px-2 md:px-4 py-2 text-indigo-600 hidden sm:table-cell whitespace-nowrap">{e.dia_semana}</td>
                      <td className="px-2 md:px-4 py-2 hidden md:table-cell">
                        {e.voz_nome ? formatarNomeMembro(e.voz_nome, e.voz_id) : '--'}
                      </td>
                      <td className="px-2 md:px-4 py-2 hidden lg:table-cell">
                        {e.voz2_nome ? formatarNomeMembro(e.voz2_nome, e.voz2_id) : '--'}
                      </td>
                      <td className="px-2 md:px-4 py-2 hidden md:table-cell">
                        {e.violao_nome ? formatarNomeMembro(e.violao_nome, e.violao_id) : '--'}
                      </td>
                      <td className="px-2 md:px-4 py-2 hidden xl:table-cell">
                        {e.guitarra_nome ? formatarNomeMembro(e.guitarra_nome, e.guitarra_id) : '--'}
                      </td>
                      <td className="px-2 md:px-4 py-2 hidden xl:table-cell">
                        {e.baixo_nome ? formatarNomeMembro(e.baixo_nome, e.baixo_id) : '--'}
                      </td>
                      <td className="px-2 md:px-4 py-2 hidden xl:table-cell">
                        {e.bateria_nome ? formatarNomeMembro(e.bateria_nome, e.bateria_id) : '--'}
                      </td>
                      <td className="px-2 md:px-4 py-2 hidden 2xl:table-cell">
                        {e.teclado_nome ? formatarNomeMembro(e.teclado_nome, e.teclado_id) : '--'}
                      </td>
                      <td className="px-2 md:px-4 py-2 text-center">
                        {e.link_youtube && (
                          <a
                            href={getYouTubeLink(e.link_youtube)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs md:text-sm"
                          >
                            ▶️
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Estilos para o destaque pulsante */}
      <style jsx global>{`
        .membro-destaque {
          display: inline-block;
          background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%);
          color: white;
          padding: 2px 10px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 13px;
          animation: pulse-destaque 2s ease-in-out infinite;
          box-shadow: 0 2px 10px rgba(237, 137, 54, 0.3);
          border: 2px solid #dd6b20;
        }
        .membro-destaque .badge-eu {
          background: rgba(255,255,255,0.3);
          padding: 1px 6px;
          border-radius: 12px;
          font-size: 9px;
          font-weight: 600;
          margin-left: 4px;
          color: white;
          text-transform: uppercase;
        }
        @keyframes pulse-destaque {
          0% {
            transform: scale(1);
            box-shadow: 0 2px 10px rgba(237, 137, 54, 0.3);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 4px 20px rgba(237, 137, 54, 0.5);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 2px 10px rgba(237, 137, 54, 0.3);
          }
        }
        .bg-yellow-50 {
          background-color: #fffbeb !important;
        }
      `}</style>
    </Layout>
  );
}
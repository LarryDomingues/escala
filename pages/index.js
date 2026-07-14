import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import axios from 'axios';
import { format, parseISO, isToday, isPast } from 'date-fns';
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
  const [viewMode, setViewMode] = useState('proximos'); // 'proximos' ou 'mes'

  const loadData = useCallback(async (forceRefresh = false) => {
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
      
      // Buscar membros
      const membrosRes = await axios.get('/api/membros');
      const membrosData = membrosRes.data;
      
      // Encontrar membro vinculado ao usuário logado
      let membro = null;
      if (user && user.id) {
        membro = membrosData.find(m => m.usuario_id === user.id) || null;
      }
      
      // Se o usuário já tem a informação do membro no objeto user
      if (user && user.membro) {
        membro = user.membro;
      }
      
      const hoje = format(new Date(), 'yyyy-MM-dd');
      const proximosData = escalasData.filter(e => e.data >= hoje).slice(0, 10);

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
  const formatarDataExtenso = (data) => format(parseISO(data), "EEEE, dd 'de' MMMM", { locale: ptBR });

  const getYouTubeLink = (link) => {
    if (!link) return null;
    const match = link.match(/(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    return match ? `https://www.youtube.com/watch?v=${match[1]}` : link;
  };

  // Função para verificar se o membro está escalado
  const isUsuarioEscalado = (escala) => {
    if (!membroLogado) return false;
    const campos = ['voz_id', 'voz2_id', 'violao_id', 'guitarra_id', 'baixo_id', 'bateria_id', 'teclado_id'];
    return campos.some(campo => escala[campo] === membroLogado.id);
  };

  // Função para verificar se é um evento especial (Reunião, Zeladoria, etc.)
  const isEventoEspecial = (escala) => {
    if (!escala) return false;
    
    // Verificar se todos os campos estão vazios
    const campos = ['voz_nome', 'voz2_nome', 'violao_nome', 'guitarra_nome', 'baixo_nome', 'bateria_nome', 'teclado_nome'];
    const todosVazios = campos.every(campo => !escala[campo]);
    
    // Verificar se o dia_semana contém palavras-chave
    const palavrasChave = ['Reunião', 'Zeladoria', 'Culto', 'Evento', 'Especial'];
    const temPalavraChave = palavrasChave.some(palavra => 
      escala.dia_semana?.includes(palavra) || 
      (escala.voz_nome?.includes(palavra)) ||
      (escala.violao_nome?.includes(palavra))
    );
    
    return todosVazios || temPalavraChave;
  };

  // Função para obter o instrumento que o usuário está tocando
  const getInstrumentoUsuario = (escala) => {
    if (!membroLogado) return null;
    
    const instrumentos = {
      voz_id: { icon: '🎤', label: 'Voz' },
      voz2_id: { icon: '🎤', label: 'Back Vocal' },
      violao_id: { icon: '🎸', label: 'Violão' },
      guitarra_id: { icon: '🎸', label: 'Guitarra' },
      baixo_id: { icon: '🎸', label: 'Baixo' },
      bateria_id: { icon: '🥁', label: 'Bateria' },
      teclado_id: { icon: '🎹', label: 'Teclado' }
    };
    
    for (const [campo, info] of Object.entries(instrumentos)) {
      if (escala[campo] === membroLogado.id) {
        return info;
      }
    }
    return null;
  };

  // Função para obter o tipo de evento (Reunião, Zeladoria, etc.)
  const getTipoEvento = (escala) => {
    if (!escala) return null;
    
    if (escala.dia_semana?.includes('Reunião') || 
        escala.voz_nome?.includes('Reunião') ||
        escala.violao_nome?.includes('Reunião')) {
      return { icon: '📌', label: 'Reunião' };
    }
    
    if (escala.dia_semana?.includes('Zeladoria') || 
        escala.voz_nome?.includes('Zeladoria') ||
        escala.violao_nome?.includes('Zeladoria')) {
      return { icon: '🧹', label: 'Zeladoria' };
    }
    
    if (escala.dia_semana?.includes('Especial') || 
        escala.dia_semana?.includes('Evento')) {
      return { icon: '🎯', label: 'Evento Especial' };
    }
    
    return null;
  };

  // Filtrar escalas para exibição
  const getEscalasParaExibir = () => {
    if (viewMode === 'proximos') {
      return proximos;
    }
    return escalas;
  };

  const escalasExibir = getEscalasParaExibir();

  // Número de eventos onde o usuário está escalado
  const eventosEscalados = escalas.filter(e => isUsuarioEscalado(e)).length;

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
        <div className="mb-4 md:mb-6">
          {membroLogado ? (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 md:p-4 rounded-lg border-l-4 border-orange-400">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-2xl">⭐</span>
                <div>
                  <p className="font-medium text-orange-800 text-sm md:text-base">
                    Você está destacado na escala como <strong>{membroLogado.nome}</strong>
                    {user?.nivel === 'admin' && <span className="ml-2 text-xs text-gray-500">(Admin)</span>}
                    {user?.nivel === 'coordenador' && <span className="ml-2 text-xs text-gray-500">(Coord)</span>}
                  </p>
                  {eventosEscalados > 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      🎵 Escalado em <strong>{eventosEscalados}</strong> evento(s) este mês
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-3 md:p-4 rounded-lg border-l-4 border-gray-400">
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
        </div>

        {/* Cards de resumo - versão mobile otimizada */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm">
            <div className="text-xs md:text-sm text-gray-500">Eventos Hoje</div>
            <div className="text-xl md:text-2xl font-bold text-indigo-600">
              {escalas.filter(e => e.data === format(new Date(), 'yyyy-MM-dd')).length}
            </div>
          </div>
          <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm">
            <div className="text-xs md:text-sm text-gray-500">No Mês</div>
            <div className="text-xl md:text-2xl font-bold text-indigo-600">{escalas.length}</div>
          </div>
          <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm">
            <div className="text-xs md:text-sm text-gray-500">Escalado</div>
            <div className="text-xl md:text-2xl font-bold text-green-600">{eventosEscalados}</div>
          </div>
          <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm">
            <div className="text-xs md:text-sm text-gray-500">Próximos</div>
            <div className="text-xl md:text-2xl font-bold text-indigo-600">{proximos.length}</div>
          </div>
        </div>

        {/* Toggle de visualização - mobile */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setViewMode('proximos')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
              viewMode === 'proximos'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            📅 Próximos
          </button>
          <button
            onClick={() => setViewMode('mes')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
              viewMode === 'mes'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            📆 Mês
          </button>
        </div>

        {/* Lista de Eventos - Versão Mobile otimizada */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-3 md:p-4 border-b flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-base md:text-lg font-semibold">
              {viewMode === 'proximos' ? '📅 Próximos Eventos' : `📆 Escala do Mês`}
            </h2>
            <span className="text-xs md:text-sm text-gray-500">
              {escalasExibir.length} {escalasExibir.length === 1 ? 'evento' : 'eventos'}
            </span>
          </div>

          {escalasExibir.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-5xl mb-4">📅</div>
              <p>Nenhum evento encontrado</p>
              {viewMode === 'mes' && (
                <p className="text-sm text-gray-400 mt-2">
                  Não há eventos de escala para este mês.
                </p>
              )}
              {viewMode === 'proximos' && (
                <p className="text-sm text-gray-400 mt-2">
                  Não há eventos próximos na escala.
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {escalasExibir.map((escala, index) => {
                const estaEscalado = isUsuarioEscalado(escala);
                const eventoEspecial = isEventoEspecial(escala);
                const tipoEvento = getTipoEvento(escala);
                const instrumento = getInstrumentoUsuario(escala);
                const youtubeLink = getYouTubeLink(escala.link_youtube);
                const isPastDate = isPast(parseISO(escala.data + 'T00:00:00')) && !isToday(parseISO(escala.data + 'T00:00:00'));

                return (
                  <div 
                    key={index} 
                    className={`
                      p-3 md:p-4 transition
                      ${estaEscalado ? 'bg-orange-50 border-l-4 border-orange-500' : ''}
                      ${eventoEspecial ? 'bg-purple-50 border-l-4 border-purple-500' : ''}
                      ${isPastDate ? 'opacity-60' : ''}
                    `}
                  >
                    <div className="flex flex-col gap-2">
                      {/* Linha 1: Data e Status */}
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-800 text-sm md:text-base">
                            📅 {formatarData(escala.data)}
                          </span>
                          {isToday(parseISO(escala.data + 'T00:00:00')) && (
                            <span className="inline-block px-2 py-0.5 bg-red-500 text-white text-xs rounded-full animate-pulse">
                              🔴 Hoje
                            </span>
                          )}
                          {isPastDate && (
                            <span className="inline-block px-2 py-0.5 bg-gray-300 text-gray-600 text-xs rounded-full">
                              ✓ Realizado
                            </span>
                          )}
                          {estaEscalado && (
                            <span className="inline-block px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full animate-pulse">
                              ⭐ Você
                            </span>
                          )}
                          {eventoEspecial && tipoEvento && (
                            <span className="inline-block px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">
                              {tipoEvento.icon} {tipoEvento.label}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Linha 2: Dia da Semana */}
                      <div className="text-sm text-indigo-600 font-medium">
                        {escala.dia_semana || '--'}
                      </div>

                      {/* Linha 3: Instrumento ou Evento */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex-1">
                          {estaEscalado && instrumento ? (
                            <div className="flex items-center gap-2 text-sm font-medium text-orange-700">
                              <span className="text-lg">{instrumento.icon}</span>
                              <span>{instrumento.label}</span>
                              <span className="text-xs text-orange-500">(Você está aqui)</span>
                            </div>
                          ) : eventoEspecial ? (
                            <div className="text-sm text-purple-700 font-medium">
                              📌 {tipoEvento?.label || 'Evento Especial'}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">
                              {escala.voz_nome || escala.violao_nome || escala.guitarra_nome || '--'}
                            </div>
                          )}
                        </div>

                        {/* Vídeo */}
                        <div className="flex-shrink-0">
                          {youtubeLink ? (
                            <a
                              href={youtubeLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                            >
                              ▶️ Vídeo
                            </a>
                          ) : (
                            <span className="text-xs text-gray-300">--</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Legenda - Mobile */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 flex flex-wrap gap-3">
          <span>📌 <strong>Legenda:</strong></span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-orange-400 rounded"></span> Você está escalado
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-purple-400 rounded"></span> Evento Especial
          </span>
          <span>🔴 Hoje</span>
          <span>✓ Realizado</span>
          <span>⭐ Pulsante</span>
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
        .bg-orange-50 {
          background-color: #fffbeb !important;
        }
        .bg-purple-50 {
          background-color: #faf5ff !important;
        }
      `}</style>
    </Layout>
  );
}
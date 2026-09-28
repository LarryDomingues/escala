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
  const [viewMode, setViewMode] = useState('proximos');
  const [anotacaoModal, setAnotacaoModal] = useState(null);

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
      const [escalasRes, membrosRes] = await Promise.all([
        axios.get(`/api/escala?mes=${mesAtual}`),
        axios.get('/api/membros'),
      ]);

      const escalasData = escalasRes.data;
      const membrosData = membrosRes.data;

      let membro = null;
      if (user && user.id) {
        membro = membrosData.find(m => m.usuario_id === user.id) || null;
      }
      if (user && user.membro) {
        membro = user.membro;
      }

      const hoje = format(new Date(), 'yyyy-MM-dd');
      const proximosData = escalasData.filter(e => e.data >= hoje).slice(0, 10);

      dashboardCache = { escalas: escalasData, proximos: proximosData, totalMembros: membrosData.length, membroLogado: membro };
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
        if (res.data && res.data.membro) setMembroLogado(res.data.membro);
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

  const isUsuarioEscalado = (escala) => {
    if (!membroLogado) return false;
    const campos = ['voz_id', 'voz2_id', 'violao_id', 'guitarra_id', 'baixo_id', 'bateria_id', 'teclado_id'];
    return campos.some(campo => escala[campo] === membroLogado.id);
  };

  const isEventoEspecial = (escala) => {
    if (!escala) return false;
    const campos = ['voz_nome', 'voz2_nome', 'violao_nome', 'guitarra_nome', 'baixo_nome', 'bateria_nome', 'teclado_nome'];
    const todosVazios = campos.every(campo => !escala[campo]);
    const palavrasChave = ['Reunião', 'Zeladoria', 'Culto', 'Evento', 'Especial'];
    const temPalavraChave = palavrasChave.some(p => escala.dia_semana?.includes(p) || escala.voz_nome?.includes(p) || escala.violao_nome?.includes(p));
    return todosVazios || temPalavraChave;
  };

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
      if (escala[campo] === membroLogado.id) return info;
    }
    return null;
  };

  const getTipoEvento = (escala) => {
    if (!escala) return null;
    if (escala.dia_semana?.includes('Reunião') || escala.voz_nome?.includes('Reunião') || escala.violao_nome?.includes('Reunião')) return { icon: '📌', label: 'Reunião' };
    if (escala.dia_semana?.includes('Zeladoria') || escala.voz_nome?.includes('Zeladoria') || escala.violao_nome?.includes('Zeladoria')) return { icon: '🧹', label: 'Zeladoria' };
    if (escala.dia_semana?.includes('Especial') || escala.dia_semana?.includes('Evento')) return { icon: '🎯', label: 'Evento Especial' };
    return null;
  };

  const escalasExibir = viewMode === 'proximos' ? proximos : escalas;
  const eventosEscalados = escalas.filter(e => isUsuarioEscalado(e)).length;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-800 border-t-slate-900 dark:border-t-white rounded-full animate-spin"></div>
            <p className="text-sm text-slate-400">Carregando</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-6 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-2xl">
          <p className="text-sm text-red-700 dark:text-red-400 mb-3">{error}</p>
          <button onClick={() => loadData(true)} className="btn-primary">Tentar novamente</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-1">
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-white">
          Olá, {user?.nome?.split(' ')[0] || 'Usuário'} 👋
        </h1>
      </div>

      {/* Info do usuário vinculado */}
      {membroLogado ? (
        <div className="mb-8 p-4 md:p-5 bg-slate-900 dark:bg-slate-800 rounded-2xl text-white transition-colors">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">⭐</span>
              </div>
              <div>
                <p className="text-sm text-slate-300">Você está escalado como</p>
                <p className="font-semibold">{membroLogado.nome}</p>
              </div>
            </div>
            {eventosEscalados > 0 && (
              <div className="text-right">
                <p className="text-2xl font-bold">{eventosEscalados}</p>
                <p className="text-xs text-slate-400">eventos este mês</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 rounded-2xl">
          <p className="text-sm text-amber-800 dark:text-amber-400">
            Você não está vinculado a nenhum membro.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        {[
          { label: 'Hoje', value: escalas.filter(e => e.data === format(new Date(), 'yyyy-MM-dd')).length },
          { label: 'Este mês', value: escalas.length },
          { label: 'Escalado', value: eventosEscalados },
          { label: 'Próximos', value: proximos.length },
        ].map((item, i) => (
          <div key={i} className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl transition-colors">
            <div className="text-xs text-slate-400 dark:text-slate-500 mb-1">{item.label}</div>
            <div className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-white">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Toggle */}
      <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6 transition-colors">
        <button
          onClick={() => setViewMode('proximos')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'proximos' 
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Próximos
        </button>
        <button
          onClick={() => setViewMode('mes')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'mes' 
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Mês
        </button>
      </div>

      {/* Lista */}
      {escalasExibir.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl transition-colors">
          <div className="text-4xl mb-3 opacity-40">📅</div>
          <p className="text-sm text-slate-400 dark:text-slate-500">Nenhum evento encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {escalasExibir.map((escala, index) => {
            const estaEscalado = isUsuarioEscalado(escala);
            const eventoEspecial = isEventoEspecial(escala);
            const tipoEvento = getTipoEvento(escala);
            const instrumento = getInstrumentoUsuario(escala);
            const youtubeLink = getYouTubeLink(escala.link_youtube);
            const isPastDate = isPast(parseISO(escala.data + 'T00:00:00')) && !isToday(parseISO(escala.data + 'T00:00:00'));
            const temAnotacao = escala.anotacao && escala.anotacao.trim() !== '';

            return (
              <div
                key={index}
                className={`
                  group p-4 md:p-5 bg-white dark:bg-slate-900 border rounded-2xl transition-all duration-200
                  ${estaEscalado 
                    ? 'border-slate-900 dark:border-white ring-1 ring-slate-900/5 dark:ring-white/10' 
                    : 'border-slate-200/60 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }
                  ${isPastDate ? 'opacity-50' : ''}
                `}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Data e badges */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-slate-900 dark:text-white text-sm md:text-base">
                        {formatarData(escala.data)}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{escala.dia_semana}</span>
                      {isToday(parseISO(escala.data + 'T00:00:00')) && (
                        <span className="badge bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 ring-1 ring-red-100 dark:ring-red-900/40">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                          Hoje
                        </span>
                      )}
                      {estaEscalado && (
                        <span className="badge bg-slate-900 dark:bg-white text-white dark:text-slate-900">
                          ⭐ Você
                        </span>
                      )}
                      {eventoEspecial && tipoEvento && (
                        <span className="badge bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 ring-1 ring-violet-100 dark:ring-violet-900/40">
                          {tipoEvento.label}
                        </span>
                      )}
                    </div>

                    {/* Info principal */}
                    <div className="mt-2">
                      {estaEscalado && instrumento ? (
                        <div className="flex items-center gap-2 text-sm">
                          <span>{instrumento.icon}</span>
                          <span className="font-medium text-slate-900 dark:text-white">{instrumento.label}</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">— Você está aqui</span>
                        </div>
                      ) : eventoEspecial ? (
                        <div className="text-sm text-violet-700 dark:text-violet-400 font-medium">
                          {tipoEvento?.icon} {tipoEvento?.label || 'Evento especial'}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {escala.voz_nome || escala.violao_nome || escala.guitarra_nome || 'Sem escala definida'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {temAnotacao && (
                      <button
                        onClick={() => setAnotacaoModal({ data: escala.data, anotacao: escala.anotacao, dia_semana: escala.dia_semana })}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        title="Ver anotação"
                      >
                        📝
                      </button>
                    )}
                    {youtubeLink && (
                      <a
                        href={youtubeLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Ver vídeo"
                      >
                        ▶
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legenda */}
      <div className="mt-6 p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl transition-colors">
        <p className="text-xs font-medium text-slate-900 dark:text-white mb-3">Legenda</p>
        <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-slate-900 dark:bg-white rounded"></span>
            <span>Você está escalado</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-violet-400 dark:bg-violet-500 rounded"></span>
            <span>Evento especial</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
            <span>Hoje</span>
          </div>
          <div className="flex items-center gap-2">
            <span>📝</span>
            <span>Anotações</span>
          </div>
          <div className="flex items-center gap-2">
            <span>▶</span>
            <span>Vídeo</span>
          </div>
        </div>
      </div>

      {/* Modal de anotação */}
      {anotacaoModal && (
        <div 
          className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
          onClick={() => setAnotacaoModal(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto border border-slate-200/60 dark:border-slate-800 transition-colors" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Anotação</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {formatarData(anotacaoModal.data)} · {anotacaoModal.dia_semana}
                </p>
              </div>
              <button
                onClick={() => setAnotacaoModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {anotacaoModal.anotacao}
              </p>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
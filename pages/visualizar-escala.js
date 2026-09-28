import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function VisualizarEscala() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [membroLogado, setMembroLogado] = useState(null);
  const [escalas, setEscalas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesSelecionado, setMesSelecionado] = useState(format(new Date(), 'yyyy-MM'));
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [anotacaoModal, setAnotacaoModal] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get('/api/auth/me');
        setUser(res.data);
        
        if (res.data && res.data.membro) {
          setMembroLogado(res.data.membro);
        }
      } catch (error) {
        router.push('/login');
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    loadEscalas();
  }, [mesSelecionado]);

  const loadEscalas = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`/api/escala?mes=${mesSelecionado}`);
      const data = res.data;
      setEscalas(data);
      
      const total = data.length;
      const completos = data.filter(e => {
        const campos = ['voz_id', 'voz2_id', 'violao_id', 'guitarra_id', 'baixo_id', 'bateria_id', 'teclado_id'];
        return campos.filter(c => e[c]).length >= 5;
      }).length;
      
      const participantes = new Set();
      data.forEach(e => {
        ['voz_id', 'voz2_id', 'violao_id', 'guitarra_id', 'baixo_id', 'bateria_id', 'teclado_id'].forEach(c => {
          if (e[c]) participantes.add(e[c]);
        });
      });

      setStats({
        total,
        completos,
        participantes: participantes.size,
        media: total > 0 ? Math.round((completos / total) * 100) : 0,
      });
    } catch (error) {
      console.error('Erro ao carregar escalas:', error);
      setError('Erro ao carregar escalas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

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
          ⭐ {nome}
        </span>
      );
    }
    return <span className="membro-nome">{nome}</span>;
  };

  const handleImprimir = () => window.print();

  const nomeMes = format(new Date(mesSelecionado + '-01'), 'MMMM', { locale: ptBR });
  const anoMes = format(new Date(mesSelecionado + '-01'), 'yyyy');

  const abrirAnotacao = (data, anotacao) => {
    setAnotacaoModal({ data, anotacao });
  };

  const fecharAnotacao = () => {
    setAnotacaoModal(null);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-800 border-t-slate-900 dark:border-t-white rounded-full animate-spin"></div>
            <p className="text-sm text-slate-400 dark:text-slate-500">Carregando</p>
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
          <button onClick={loadEscalas} className="btn-primary">Tentar novamente</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-1">
          {nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)} de {anoMes}
        </p>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-white">
            Escalas do Ministério
          </h1>
          <button onClick={handleImprimir} className="btn-secondary">
            <span>⎙</span>
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>

      {/* Info do membro logado - Desktop */}
      <div className="hidden md:block mb-6">
        {membroLogado ? (
          <div className="p-4 bg-slate-900 dark:bg-slate-800 rounded-2xl text-white flex items-center justify-between flex-wrap gap-3 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">⭐</span>
              </div>
              <div>
                <p className="text-sm text-slate-300">Você está escalado como</p>
                <p className="font-semibold">{membroLogado.nome}</p>
              </div>
            </div>
            {user?.nivel === 'admin' && (
              <span className="text-xs bg-white/10 px-3 py-1 rounded-lg">Administrador</span>
            )}
            {user?.nivel === 'coordenador' && (
              <span className="text-xs bg-white/10 px-3 py-1 rounded-lg">Coordenador</span>
            )}
          </div>
        ) : (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 rounded-2xl transition-colors">
            <p className="text-sm text-amber-800 dark:text-amber-400">
              Você não está vinculado a nenhum membro.
            </p>
          </div>
        )}
      </div>

      {/* Seletor de mês */}
      <div className="mb-6 p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl transition-colors">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Selecione o mês</label>
        <input
          type="month"
          value={mesSelecionado}
          onChange={(e) => setMesSelecionado(e.target.value)}
          className="input-field max-w-xs"
        />
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          {[
            { label: 'Total', value: stats.total },
            { label: 'Completos', value: stats.completos },
            { label: 'Membros', value: stats.participantes },
            { label: 'Preenchido', value: `${stats.media}%` },
          ].map((item, i) => (
            <div key={i} className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl transition-colors">
              <div className="text-xs text-slate-400 dark:text-slate-500 mb-1">{item.label}</div>
              <div className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-white">{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {escalas.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl transition-colors">
          <div className="text-4xl mb-3 opacity-40">📅</div>
          <p className="text-sm text-slate-400 dark:text-slate-500">Nenhuma escala neste mês</p>
        </div>
      ) : (
        <>
          {/* Versão Desktop - Tabela Completa sem scroll horizontal */}
          <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl overflow-hidden transition-colors">
            <table className="w-full table-fixed text-xs">
              <thead>
                <tr className="border-b border-slate-200/70 dark:border-slate-800">
                  <th className="px-1.5 py-3 text-left text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider w-[9%]">Data</th>
                  <th className="px-1.5 py-3 text-left text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider w-[10%]">Dia</th>
                  <th className="px-1.5 py-3 text-center text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider w-[11%]">Voz 1</th>
                  <th className="px-1.5 py-3 text-center text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider w-[11%]">Voz 2</th>
                  <th className="px-1.5 py-3 text-center text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider w-[11%]">Violão</th>
                  <th className="px-1.5 py-3 text-center text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider w-[11%]">Guitarra</th>
                  <th className="px-1.5 py-3 text-center text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider w-[11%]">Baixo</th>
                  <th className="px-1.5 py-3 text-center text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider w-[11%]">Bateria</th>
                  <th className="px-1.5 py-3 text-center text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider w-[11%]">Teclado</th>
                  <th className="px-1 py-3 text-center text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider w-[7%]">▶</th>
                  <th className="px-1 py-3 text-center text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider w-[7%]">📝</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
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
                  const temAnotacao = e.anotacao && e.anotacao.trim() !== '';
                  return (
                    <tr key={i} className={`transition-colors ${estaEscalado ? 'bg-slate-50 dark:bg-slate-800/50' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}`}>
                      <td className="px-1.5 py-2.5 font-medium text-slate-900 dark:text-white whitespace-nowrap text-[11px]">
                        {formatarData(e.data)}
                      </td>
                      <td className="px-1.5 py-2.5 text-slate-500 dark:text-slate-400 text-[11px] break-words leading-tight">
                        {e.dia_semana}
                      </td>
                      <td className="px-1.5 py-2.5 text-center text-slate-700 dark:text-slate-300 text-[11px] break-words leading-tight">
                        {e.voz_nome ? formatarNomeMembro(e.voz_nome, e.voz_id) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                      <td className="px-1.5 py-2.5 text-center text-slate-700 dark:text-slate-300 text-[11px] break-words leading-tight">
                        {e.voz2_nome ? formatarNomeMembro(e.voz2_nome, e.voz2_id) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                      <td className="px-1.5 py-2.5 text-center text-slate-700 dark:text-slate-300 text-[11px] break-words leading-tight">
                        {e.violao_nome ? formatarNomeMembro(e.violao_nome, e.violao_id) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                      <td className="px-1.5 py-2.5 text-center text-slate-700 dark:text-slate-300 text-[11px] break-words leading-tight">
                        {e.guitarra_nome ? formatarNomeMembro(e.guitarra_nome, e.guitarra_id) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                      <td className="px-1.5 py-2.5 text-center text-slate-700 dark:text-slate-300 text-[11px] break-words leading-tight">
                        {e.baixo_nome ? formatarNomeMembro(e.baixo_nome, e.baixo_id) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                      <td className="px-1.5 py-2.5 text-center text-slate-700 dark:text-slate-300 text-[11px] break-words leading-tight">
                        {e.bateria_nome ? formatarNomeMembro(e.bateria_nome, e.bateria_id) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                      <td className="px-1.5 py-2.5 text-center text-slate-700 dark:text-slate-300 text-[11px] break-words leading-tight">
                        {e.teclado_nome ? formatarNomeMembro(e.teclado_nome, e.teclado_id) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                      <td className="px-1 py-2.5 text-center">
                        {e.link_youtube ? (
                          <a
                            href={getYouTubeLink(e.link_youtube)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="Ver vídeo"
                          >
                            ▶
                          </a>
                        ) : (
                          <span className="text-slate-200 dark:text-slate-700 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-1 py-2.5 text-center">
                        {temAnotacao ? (
                          <button
                            onClick={() => abrirAnotacao(e.data, e.anotacao)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                            title="Ver anotação"
                          >
                            📝
                          </button>
                        ) : (
                          <span className="text-slate-200 dark:text-slate-700 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Versão Mobile - Cards */}
          <div className="md:hidden space-y-2">
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
              const temAnotacao = e.anotacao && e.anotacao.trim() !== '';
              return (
                <div
                  key={i}
                  className={`
                    p-4 bg-white dark:bg-slate-900 border rounded-2xl transition-all
                    ${estaEscalado 
                      ? 'border-slate-900 dark:border-white ring-1 ring-slate-900/5 dark:ring-white/10' 
                      : 'border-slate-200/60 dark:border-slate-800'
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white text-sm">{formatarData(e.data)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{e.dia_semana}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {temAnotacao && (
                        <button
                          onClick={() => abrirAnotacao(e.data, e.anotacao)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                          title="Ver anotação"
                        >
                          📝
                        </button>
                      )}
                      {e.link_youtube && (
                        <a
                          href={getYouTubeLink(e.link_youtube)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Ver vídeo"
                        >
                          ▶
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {[
                      { label: 'Voz 1', nome: e.voz_nome, id: e.voz_id },
                      { label: 'Voz 2', nome: e.voz2_nome, id: e.voz2_id },
                      { label: 'Violão', nome: e.violao_nome, id: e.violao_id },
                      { label: 'Guitarra', nome: e.guitarra_nome, id: e.guitarra_id },
                      { label: 'Baixo', nome: e.baixo_nome, id: e.baixo_id },
                      { label: 'Bateria', nome: e.bateria_nome, id: e.bateria_id },
                      { label: 'Teclado', nome: e.teclado_nome, id: e.teclado_id },
                    ].map(({ label, nome, id }) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className="text-slate-400 dark:text-slate-500 w-16 flex-shrink-0">{label}</span>
                        <span className={`font-medium ${id === membroLogado?.id ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                          {nome ? formatarNomeMembro(nome, id) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </span>
                      </div>
                    ))}
                  </div>

                  {estaEscalado && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-slate-900 dark:text-white font-medium">⭐ Você está escalado</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Legenda */}
      <div className="mt-6 p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl transition-colors">
        <p className="text-xs font-medium text-slate-900 dark:text-white mb-3">Legenda</p>
        <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="membro-destaque-inline">⭐</span>
            <span>Você está escalado</span>
          </div>
          <div className="flex items-center gap-2">
            <span>📝</span>
            <span>Anotações dos louvores</span>
          </div>
          <div className="flex items-center gap-2">
            <span>▶</span>
            <span>Vídeo no YouTube</span>
          </div>
        </div>
      </div>

      {/* Modal de anotação */}
      {anotacaoModal && (
        <div
          className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={fecharAnotacao}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto border border-slate-200/60 dark:border-slate-800 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Anotação</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{formatarData(anotacaoModal.data)}</p>
              </div>
              <button
                onClick={fecharAnotacao}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {anotacaoModal.anotacao || 'Nenhuma anotação para esta data.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* DIV OCULTA PARA IMPRESSÃO */}
      <div id="print-content" style={{ display: 'none' }}>
        <div className="print-header">
          <h1 style={{ fontSize: '24px', margin: '0', textAlign: 'center' }}>Ministério de Louvor</h1>
          <p style={{ fontSize: '14px', color: '#666', margin: '5px 0 15px', textAlign: 'center' }}>
            {nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)} / {anoMes}
          </p>
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Dia</th>
              <th>Voz 1</th>
              <th>Voz 2</th>
              <th>Violão</th>
              <th>Guitarra</th>
              <th>Baixo</th>
              <th>Bateria</th>
              <th>Teclado</th>
            </tr>
          </thead>
          <tbody>
            {escalas.map((e, i) => (
              <tr key={i}>
                <td>{formatarData(e.data)}</td>
                <td>{e.dia_semana}</td>
                <td>{e.voz_nome || '--'}</td>
                <td>{e.voz2_nome || '--'}</td>
                <td>{e.violao_nome || '--'}</td>
                <td>{e.guitarra_nome || '--'}</td>
                <td>{e.baixo_nome || '--'}</td>
                <td>{e.bateria_nome || '--'}</td>
                <td>{e.teclado_nome || '--'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="print-footer">
          Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
        </div>
      </div>

      {/* Estilos */}
      <style jsx global>{`
        .membro-destaque {
          display: inline-block;
          background: #0f172a;
          color: white;
          padding: 1px 6px;
          border-radius: 5px;
          font-weight: 600;
          font-size: 10px;
          animation: pulse-destaque 2s ease-in-out infinite;
          line-height: 1.4;
        }
        .dark .membro-destaque {
          background: white;
          color: #0f172a;
        }
        .membro-destaque-inline {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: #0f172a;
          color: white;
          border-radius: 6px;
          font-size: 11px;
        }
        .dark .membro-destaque-inline {
          background: white;
          color: #0f172a;
        }
        @keyframes pulse-destaque {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(15, 23, 42, 0.3);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 4px rgba(15, 23, 42, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(15, 23, 42, 0);
          }
        }

        /* ESTILOS PARA IMPRESSÃO */
        @media print {
          body * {
            visibility: hidden;
          }
          
          #print-content,
          #print-content * {
            visibility: visible;
          }
          
          #print-content {
            display: block !important;
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            padding: 30px 40px;
            background: white;
          }

          .print-header h1 {
            font-size: 24px;
            text-align: center;
            margin: 0 0 5px 0;
            color: #000;
            font-weight: bold;
          }

          .print-header p {
            font-size: 14px;
            text-align: center;
            color: #666;
            margin: 0 0 20px 0;
          }

          .print-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }

          .print-table th {
            background: #333 !important;
            color: white !important;
            padding: 8px 6px;
            border: 1px solid #333;
            text-align: center;
            font-weight: 600;
          }

          .print-table td {
            padding: 6px 4px;
            border: 1px solid #ddd;
            text-align: center;
          }

          .print-table tr:nth-child(even) {
            background: #f9f9f9;
          }

          .print-footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #ddd;
            font-size: 11px;
            color: #999;
          }

          .sidebar,
          .mobile-header,
          .menu-toggle-btn,
          .btn-primary,
          .btn-secondary,
          .btn-purple,
          .hidden.md\\:block,
          .md\\:hidden {
            display: none !important;
          }

          .print-table {
            display: table !important;
          }
        }

        #print-content {
          display: none !important;
        }
      `}</style>
    </Layout>
  );
}
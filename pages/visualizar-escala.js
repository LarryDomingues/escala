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
  const [anotacaoModal, setAnotacaoModal] = useState(null); // { data, anotacao }

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
          ⭐ {nome} <span className="badge-eu">(EU)</span>
        </span>
      );
    }
    return <span className="membro-nome">{nome}</span>;
  };

  const handleImprimir = () => window.print();

  // Nome do mês em português
  const nomeMes = format(new Date(mesSelecionado + '-01'), 'MMMM', { locale: ptBR });
  const anoMes = format(new Date(mesSelecionado + '-01'), 'yyyy');

  // Abrir modal de anotação
  const abrirAnotacao = (data, anotacao) => {
    setAnotacaoModal({ data, anotacao });
  };

  // Fechar modal
  const fecharAnotacao = () => {
    setAnotacaoModal(null);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Carregando...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">
          <p>{error}</p>
          <button onClick={loadEscalas} className="mt-2 btn-primary">Tentar novamente</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-3 md:p-4 max-w-7xl mx-auto">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6">📅 Visualizar Escalas</h1>

        {/* Informação do Usuário Logado - Visível apenas em Desktop */}
        <div className="hidden md:block">
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
        </div>

        {/* Legenda - Visível apenas em Desktop */}
        <div className="hidden md:block bg-yellow-50 p-3 md:p-4 rounded-lg mb-4 md:mb-6 border border-yellow-200 flex items-center gap-3 flex-wrap">
          <span className="font-medium text-yellow-800">📌 Legenda:</span>
          <span className="inline-block bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
            ⭐ Nome do Membro <span className="bg-white/30 px-1.5 py-0.5 rounded text-xs">(EU)</span>
          </span>
          <span className="text-sm text-yellow-800">→ Seu nome aparece destacado em <strong>laranja</strong> com efeito <strong>pulsante</strong></span>
          <span className="text-sm text-yellow-800 ml-2">📝 <strong>Anotações:</strong> Clique no ícone 📝 para ver observações sobre os louvores</span>
        </div>

        {/* Filtro de Mês - SEM BOTÃO VISUALIZAR */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 md:mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">📅 Selecione o Mês</label>
              <input
                type="month"
                value={mesSelecionado}
                onChange={(e) => setMesSelecionado(e.target.value)}
                className="input-field"
              />
            </div>
            <button onClick={handleImprimir} className="btn-purple">🖨️ Imprimir</button>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm text-center">
              <div className="text-xl md:text-2xl font-bold text-indigo-600">{stats.total}</div>
              <div className="text-xs md:text-sm text-gray-500">Total de Eventos</div>
            </div>
            <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm text-center">
              <div className="text-xl md:text-2xl font-bold text-green-600">{stats.completos}</div>
              <div className="text-xs md:text-sm text-gray-500">Eventos Completos</div>
            </div>
            <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm text-center">
              <div className="text-xl md:text-2xl font-bold text-purple-600">{stats.participantes}</div>
              <div className="text-xs md:text-sm text-gray-500">Participantes Únicos</div>
            </div>
            <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm text-center">
              <div className="text-xl md:text-2xl font-bold text-orange-600">{stats.media}%</div>
              <div className="text-xs md:text-sm text-gray-500">Taxa de Preenchimento</div>
            </div>
          </div>
        )}

        {escalas.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhuma escala encontrada</h3>
            <p className="text-gray-500">Não há eventos de escala para este mês.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Versão Desktop - Tabela Completa */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead className="bg-indigo-600 text-white">
                  <tr>
                    <th className="px-2 md:px-4 py-2 text-center">Data</th>
                    <th className="px-2 md:px-4 py-2 text-center">Dia</th>
                    <th className="px-2 md:px-4 py-2 text-center">Voz 1</th>
                    <th className="px-2 md:px-4 py-2 text-center">Voz 2</th>
                    <th className="px-2 md:px-4 py-2 text-center">Violão</th>
                    <th className="px-2 md:px-4 py-2 text-center">Guitarra</th>
                    <th className="px-2 md:px-4 py-2 text-center">Baixo</th>
                    <th className="px-2 md:px-4 py-2 text-center">Bateria</th>
                    <th className="px-2 md:px-4 py-2 text-center">Teclado</th>
                    <th className="px-2 md:px-4 py-2 text-center">Vídeo</th>
                    <th className="px-2 md:px-4 py-2 text-center">📝</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
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
                      <tr key={i} className={`hover:bg-gray-50 ${estaEscalado ? 'bg-yellow-50' : ''}`}>
                        <td className="px-2 md:px-4 py-2 text-center font-medium whitespace-nowrap">{formatarData(e.data)}</td>
                        <td className="px-2 md:px-4 py-2 text-center text-indigo-600 font-medium whitespace-nowrap">{e.dia_semana}</td>
                        <td className="px-2 md:px-4 py-2 text-center">
                          {e.voz_nome ? formatarNomeMembro(e.voz_nome, e.voz_id) : '--'}
                        </td>
                        <td className="px-2 md:px-4 py-2 text-center">
                          {e.voz2_nome ? formatarNomeMembro(e.voz2_nome, e.voz2_id) : '--'}
                        </td>
                        <td className="px-2 md:px-4 py-2 text-center">
                          {e.violao_nome ? formatarNomeMembro(e.violao_nome, e.violao_id) : '--'}
                        </td>
                        <td className="px-2 md:px-4 py-2 text-center">
                          {e.guitarra_nome ? formatarNomeMembro(e.guitarra_nome, e.guitarra_id) : '--'}
                        </td>
                        <td className="px-2 md:px-4 py-2 text-center">
                          {e.baixo_nome ? formatarNomeMembro(e.baixo_nome, e.baixo_id) : '--'}
                        </td>
                        <td className="px-2 md:px-4 py-2 text-center">
                          {e.bateria_nome ? formatarNomeMembro(e.bateria_nome, e.bateria_id) : '--'}
                        </td>
                        <td className="px-2 md:px-4 py-2 text-center">
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
                        <td className="px-2 md:px-4 py-2 text-center">
                          {temAnotacao ? (
                            <button
                              onClick={() => abrirAnotacao(e.data, e.anotacao)}
                              className="text-yellow-600 hover:text-yellow-800 text-lg transition-transform hover:scale-110"
                              title="Ver anotação"
                            >
                              📝
                            </button>
                          ) : (
                            <span className="text-gray-300 text-sm">--</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Versão Mobile - Cards */}
            <div className="md:hidden divide-y divide-gray-200">
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
                  <div key={i} className={`p-3 ${estaEscalado ? 'bg-yellow-50 border-l-4 border-orange-400' : ''}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm">{formatarData(e.data)}</span>
                      <span className="text-xs text-indigo-600">{e.dia_semana}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs mt-1">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Voz 1:</span>
                        <span className="font-medium">
                          {e.voz_nome ? formatarNomeMembro(e.voz_nome, e.voz_id) : '--'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Voz 2:</span>
                        <span className="font-medium">
                          {e.voz2_nome ? formatarNomeMembro(e.voz2_nome, e.voz2_id) : '--'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Violão:</span>
                        <span className="font-medium">
                          {e.violao_nome ? formatarNomeMembro(e.violao_nome, e.violao_id) : '--'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Guitarra:</span>
                        <span className="font-medium">
                          {e.guitarra_nome ? formatarNomeMembro(e.guitarra_nome, e.guitarra_id) : '--'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Baixo:</span>
                        <span className="font-medium">
                          {e.baixo_nome ? formatarNomeMembro(e.baixo_nome, e.baixo_id) : '--'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Bateria:</span>
                        <span className="font-medium">
                          {e.bateria_nome ? formatarNomeMembro(e.bateria_nome, e.bateria_id) : '--'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Teclado:</span>
                        <span className="font-medium">
                          {e.teclado_nome ? formatarNomeMembro(e.teclado_nome, e.teclado_id) : '--'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 justify-end">
                        {e.link_youtube ? (
                          <a
                            href={getYouTubeLink(e.link_youtube)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                          >
                            ▶️ Vídeo
                          </a>
                        ) : (
                          <span className="text-gray-300 text-xs">--</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      {estaEscalado && (
                        <span className="text-xs text-orange-600 font-medium">⭐ Você está escalado aqui</span>
                      )}
                      {temAnotacao && (
                        <button
                          onClick={() => abrirAnotacao(e.data, e.anotacao)}
                          className="text-yellow-600 hover:text-yellow-800 text-sm flex items-center gap-1"
                        >
                          📝 Anotação
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE ANOTAÇÃO */}
      {anotacaoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                📝 Anotação - {formatarData(anotacaoModal.data)}
              </h3>
              <button
                onClick={fecharAnotacao}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="mb-4">
              {anotacaoModal.anotacao ? (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                    {anotacaoModal.anotacao}
                  </p>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Nenhuma anotação para esta data.</p>
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={fecharAnotacao}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIV OCULTA PARA IMPRESSÃO - SOMENTE A ESCALA */}
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

      {/* Estilos para o destaque pulsante e impressão */}
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
          .btn-purple,
          .filtro-mes,
          .stats-grid,
          .legenda-destaque,
          .info-usuario-destaque,
          .bg-yellow-50,
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
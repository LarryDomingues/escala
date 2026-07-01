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

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get('/api/auth/me');
        setUser(res.data);
        
        // Buscar o membro vinculado ao usuário
        if (res.data) {
          await buscarMembroLogado(res.data.id);
        }
        
        await loadEscalas();
      } catch (error) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [mesSelecionado]);

  const buscarMembroLogado = async (usuarioId) => {
    try {
      const res = await axios.get('/api/membros');
      const membros = res.data;
      const membro = membros.find(m => m.usuario_id === usuarioId);
      setMembroLogado(membro || null);
    } catch (error) {
      console.error('Erro ao buscar membro logado:', error);
    }
  };

  const loadEscalas = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data) => {
    return format(parseISO(data), 'dd/MM/yyyy');
  };

  const getYouTubeLink = (link) => {
    if (!link) return null;
    const match = link.match(/(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (match) {
      return `https://www.youtube.com/watch?v=${match[1]}`;
    }
    return link;
  };

  // Função para verificar se o membro é o usuário logado
  const isUsuarioLogado = (membroId) => {
    if (!membroLogado) return false;
    return membroLogado.id === membroId;
  };

  // Função para formatar o nome com destaque
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

  const handleImprimir = () => {
    window.print();
  };

  const nomeMes = format(new Date(mesSelecionado + '-01'), 'MMMM', { locale: ptBR });

  return (
    <Layout>
      <div className="p-3 md:p-4 max-w-7xl mx-auto">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6">📅 Visualizar Escalas</h1>

        {/* Informação do Usuário Logado */}
        {membroLogado ? (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 md:p-4 rounded-lg mb-4 md:mb-6 border-l-4 border-orange-400">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-2xl">⭐</span>
              <div>
                <p className="font-medium text-orange-800 text-sm md:text-base">
                  Você está destacado na escala como <strong>{membroLogado.nome}</strong>
                  {user?.nivel === 'admin' && (
                    <span className="ml-2 text-xs text-gray-500">(Administrador)</span>
                  )}
                  {user?.nivel === 'coordenador' && (
                    <span className="ml-2 text-xs text-gray-500">(Coordenador)</span>
                  )}
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

        {/* Legenda de Destaque */}
        <div className="bg-yellow-50 p-3 md:p-4 rounded-lg mb-4 md:mb-6 border border-yellow-200 flex items-center gap-3 flex-wrap">
          <span className="font-medium text-yellow-800">📌 Legenda:</span>
          <span className="inline-block bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
            ⭐ Nome do Membro <span className="bg-white/30 px-1.5 py-0.5 rounded text-xs">(EU)</span>
          </span>
          <span className="text-sm text-yellow-800">→ Seu nome aparece destacado em <strong>laranja</strong> com efeito <strong>pulsante</strong></span>
        </div>

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
            <button onClick={loadEscalas} className="btn-primary">Visualizar</button>
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

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">Carregando...</div>
          </div>
        ) : escalas.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhuma escala encontrada</h3>
            <p className="text-gray-500">Não há eventos de escala para este mês.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead className="bg-indigo-600 text-white">
                  <tr>
                    <th className="px-2 md:px-4 py-2 text-center">Data</th>
                    <th className="px-2 md:px-4 py-2 text-center hidden sm:table-cell">Dia</th>
                    <th className="px-2 md:px-4 py-2 text-center">Voz 1</th>
                    <th className="px-2 md:px-4 py-2 text-center">Voz 2</th>
                    <th className="px-2 md:px-4 py-2 text-center hidden md:table-cell">Violão</th>
                    <th className="px-2 md:px-4 py-2 text-center hidden lg:table-cell">Guitarra</th>
                    <th className="px-2 md:px-4 py-2 text-center hidden xl:table-cell">Baixo</th>
                    <th className="px-2 md:px-4 py-2 text-center hidden xl:table-cell">Bateria</th>
                    <th className="px-2 md:px-4 py-2 text-center hidden 2xl:table-cell">Teclado</th>
                    <th className="px-2 md:px-4 py-2 text-center">Vídeo</th>
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
                    return (
                      <tr key={i} className={`hover:bg-gray-50 ${estaEscalado ? 'bg-yellow-50' : ''}`}>
                        <td className="px-2 md:px-4 py-2 text-center font-medium whitespace-nowrap">{formatarData(e.data)}</td>
                        <td className="px-2 md:px-4 py-2 text-center text-indigo-600 font-medium hidden sm:table-cell whitespace-nowrap">{e.dia_semana}</td>
                        <td className="px-2 md:px-4 py-2 text-center">
                          {e.voz_nome ? formatarNomeMembro(e.voz_nome, e.voz_id) : '--'}
                        </td>
                        <td className="px-2 md:px-4 py-2 text-center">
                          {e.voz2_nome ? formatarNomeMembro(e.voz2_nome, e.voz2_id) : '--'}
                        </td>
                        <td className="px-2 md:px-4 py-2 text-center hidden md:table-cell">
                          {e.violao_nome ? formatarNomeMembro(e.violao_nome, e.violao_id) : '--'}
                        </td>
                        <td className="px-2 md:px-4 py-2 text-center hidden lg:table-cell">
                          {e.guitarra_nome ? formatarNomeMembro(e.guitarra_nome, e.guitarra_id) : '--'}
                        </td>
                        <td className="px-2 md:px-4 py-2 text-center hidden xl:table-cell">
                          {e.baixo_nome ? formatarNomeMembro(e.baixo_nome, e.baixo_id) : '--'}
                        </td>
                        <td className="px-2 md:px-4 py-2 text-center hidden xl:table-cell">
                          {e.bateria_nome ? formatarNomeMembro(e.bateria_nome, e.bateria_id) : '--'}
                        </td>
                        <td className="px-2 md:px-4 py-2 text-center hidden 2xl:table-cell">
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
        )}
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
        @media print {
          .bg-yellow-50 {
            background-color: #fef3c7 !important;
          }
          .membro-destaque {
            background: #ed8936 !important;
            animation: none !important;
            border: 2px solid #dd6b20 !important;
          }
        }
      `}</style>
    </Layout>
  );
}
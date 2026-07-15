import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import axios from 'axios';
import { format, parseISO } from 'date-fns';

export default function PlaylistPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [escalas, setEscalas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesSelecionado, setMesSelecionado] = useState(format(new Date(), 'yyyy-MM'));
  const [editando, setEditando] = useState(null);
  const [linkYoutube, setLinkYoutube] = useState('');
  const [anotacao, setAnotacao] = useState('');
  const [editandoAnotacao, setEditandoAnotacao] = useState(null);
  const [anotacaoOriginal, setAnotacaoOriginal] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [mensagemTipo, setMensagemTipo] = useState('');
  const [usuarioInfo, setUsuarioInfo] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get('/api/auth/me');
        setUser(res.data);
        await loadPlaylist();
      } catch (error) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [mesSelecionado]);

  const loadPlaylist = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/playlist?mes=${mesSelecionado}`);
      setEscalas(res.data.escalas || []);
      setUsuarioInfo(res.data.usuario || null);
    } catch (error) {
      console.error('Erro ao carregar playlist:', error);
      setMensagem('Erro ao carregar playlist');
      setMensagemTipo('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarLink = async (data) => {
    try {
      const res = await axios.post('/api/playlist', { 
        data, 
        link_youtube: linkYoutube 
      });
      if (res.data.success) {
        setMensagem(res.data.message);
        setMensagemTipo('success');
        setEditando(null);
        setLinkYoutube('');
        await loadPlaylist();
      }
    } catch (error) {
      setMensagem(error.response?.data?.error || 'Erro ao salvar link');
      setMensagemTipo('error');
    }
  };

  const handleSalvarAnotacao = async (data, anotacaoTexto) => {
    try {
      const res = await axios.post('/api/playlist/anotacao', { 
        data, 
        anotacao: anotacaoTexto 
      });
      if (res.data.success) {
        setMensagem(res.data.message);
        setMensagemTipo('success');
        setEditandoAnotacao(null);
        setAnotacao('');
        await loadPlaylist();
      }
    } catch (error) {
      console.error('Erro ao salvar anotação:', error);
      setMensagem(error.response?.data?.error || 'Erro ao salvar anotação');
      setMensagemTipo('error');
    }
  };

  const handleRemoverLink = async (data) => {
    if (!confirm('Tem certeza que deseja remover este link?')) return;
    try {
      const res = await axios.post('/api/playlist', { data, link_youtube: null });
      if (res.data.success) {
        setMensagem(res.data.message);
        setMensagemTipo('success');
        await loadPlaylist();
      }
    } catch (error) {
      setMensagem(error.response?.data?.error || 'Erro ao remover link');
      setMensagemTipo('error');
    }
  };

  const getThumbnail = (link) => {
    if (!link) return null;
    const match = link.match(/(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (match) return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
    return null;
  };

  const getWatchLink = (link) => {
    if (!link) return null;
    const match = link.match(/(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (match) return `https://www.youtube.com/watch?v=${match[1]}`;
    return link;
  };

  const formatarData = (data) => format(parseISO(data), 'dd/MM/yyyy');

  const isUsuarioEscalado = (escala) => {
    if (!usuarioInfo?.membro_id) return false;
    const campos = ['voz_id', 'voz2_id', 'violao_id', 'guitarra_id', 'baixo_id', 'bateria_id', 'teclado_id'];
    return campos.some(campo => escala[campo] && escala[campo] === usuarioInfo.membro_id);
  };

  const podeEditar = (escala) => {
    if (user?.nivel === 'admin') return true;
    if (user?.nivel === 'coordenador' && isUsuarioEscalado(escala)) return true;
    if (user?.nivel === 'membro' && isUsuarioEscalado(escala)) return true;
    return false;
  };

  const iniciarEdicaoAnotacao = (escala) => {
    setEditandoAnotacao(escala.id);
    setAnotacao(escala.anotacao || '');
    setAnotacaoOriginal(escala.anotacao || '');
  };

  const cancelarEdicaoAnotacao = () => {
    setEditandoAnotacao(null);
    setAnotacao('');
    setAnotacaoOriginal('');
  };

  return (
    <Layout>
      <div className="p-3 md:p-4 max-w-7xl mx-auto">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6">▶️ PlayList</h1>

        {mensagem && (
          <div className={`p-3 md:p-4 rounded-lg mb-4 md:mb-6 ${mensagemTipo === 'success' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>
            {mensagem}
            <button onClick={() => setMensagem('')} className="float-right text-gray-500 hover:text-gray-700">✕</button>
          </div>
        )}

        <div className="bg-gradient-to-r from-green-50 to-green-100 p-3 md:p-4 rounded-lg mb-4 md:mb-6 border-l-4 border-green-500">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl">{user?.nivel === 'admin' ? '👑' : '🎵'}</span>
            <div>
              <p className="font-medium text-green-800 text-sm md:text-base">
                {user?.nivel === 'admin' 
                  ? 'Modo Administrador: Você está vendo todas as datas e pode gerenciar todos os links.'
                  : `Modo Membro: Você está vendo apenas as datas em que está escalado.`
                }
              </p>
              {user?.nivel !== 'admin' && (
                <p className="text-xs md:text-sm text-green-700 mt-1">🔑 Você pode adicionar ou remover links das datas em que está escalado.</p>
              )}
            </div>
          </div>
        </div>

        {/* Filtro de Mês - SEM BOTÃO CARREGAR */}
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
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64"><div className="text-gray-500">Carregando...</div></div>
        ) : escalas.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhum evento encontrado</h3>
            <p className="text-gray-500">
              {user?.nivel !== 'admin' ? 'Você não está escalado em nenhuma data neste mês.' : 'Não há eventos de escala para este mês.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {escalas.map((escala) => {
              const escalado = isUsuarioEscalado(escala);
              const podeEditarLink = podeEditar(escala);
              const thumbnail = getThumbnail(escala.link_youtube);
              const watchLink = getWatchLink(escala.link_youtube);

              return (
                <div key={escala.id} className={`
                  bg-white rounded-lg shadow-sm p-3 md:p-4 transition-all
                  ${escalado && user?.nivel !== 'admin' ? 'border-l-4 border-green-500 bg-green-50' : ''}
                  ${podeEditarLink && user?.nivel !== 'admin' ? 'border-l-4 border-indigo-500 bg-indigo-50' : ''}
                  ${user?.nivel === 'admin' ? 'border-l-4 border-indigo-500' : ''}
                `}>
                  <div className="flex flex-wrap gap-3 md:gap-4">
                    <div className="flex-1 min-w-[180px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-800 text-sm md:text-base">📅 {formatarData(escala.data)}</span>
                        {escalado && user?.nivel !== 'admin' && <span className="inline-block px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">🟢 Escalado</span>}
                        {podeEditarLink && user?.nivel !== 'admin' && <span className="inline-block px-2 py-0.5 bg-indigo-500 text-white text-xs rounded-full">🔑 Pode editar</span>}
                        {user?.nivel === 'admin' && <span className="inline-block px-2 py-0.5 bg-indigo-500 text-white text-xs rounded-full">👑 Admin</span>}
                      </div>
                      <div className="text-indigo-600 text-xs md:text-sm">{escala.dia_semana}</div>
                      <div className="text-xs md:text-sm text-gray-600 mt-1">
                        {['voz', 'voz2', 'violao', 'guitarra', 'baixo', 'bateria', 'teclado'].map((inst, i, arr) => {
                          const nome = escala[`${inst}_nome`];
                          if (!nome) return null;
                          const id = escala[`${inst}_id`];
                          return (
                            <span key={inst}>
                              {inst.charAt(0).toUpperCase() + inst.slice(1)}: <strong className={id === usuarioInfo?.membro_id ? 'text-green-600' : ''}>
                                {id === usuarioInfo?.membro_id ? '⭐ ' : ''}{nome}{id === usuarioInfo?.membro_id && ' (Você)'}
                              </strong>
                              {i < arr.length - 1 && ' | '}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Link do YouTube */}
                    <div className="flex-1 min-w-[200px] flex flex-wrap items-center gap-2 md:gap-3">
                      {escala.link_youtube ? (
                        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-[180px] bg-blue-50 p-2 rounded-lg flex-wrap">
                          {thumbnail && <img src={thumbnail} alt="Thumbnail" className="w-16 h-10 md:w-20 md:h-12 object-cover rounded" loading="lazy" />}
                          <a href={watchLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium text-xs md:text-sm flex items-center gap-1">▶️ Ver vídeo</a>
                          <span className="inline-block px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">Link</span>
                          {podeEditarLink && (
                            <button onClick={() => handleRemoverLink(escala.data)} className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 ml-auto">🗑️ Remover</button>
                          )}
                        </div>
                      ) : (
                        podeEditarLink ? (
                          <div className="flex flex-1 min-w-[180px] gap-2 flex-wrap">
                            <input type="text" value={editando === escala.data ? linkYoutube : ''} onChange={(e) => setLinkYoutube(e.target.value)} onFocus={() => setEditando(escala.data)} placeholder="Cole o link do YouTube..." className="flex-1 min-w-[120px] px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs md:text-sm" />
                            <button onClick={() => handleSalvarLink(escala.data)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-xs md:text-sm">➕ Adicionar</button>
                          </div>
                        ) : (
                          <div className="flex-1 min-w-[180px]">
                            <input type="text" disabled placeholder="🔒 Você não está escalado" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-xs md:text-sm cursor-not-allowed" />
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Campo de Anotações */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 text-sm mt-1">📝</span>
                      <div className="flex-1">
                        {editandoAnotacao === escala.id ? (
                          <div className="flex flex-col gap-2">
                            <textarea
                              value={anotacao}
                              onChange={(e) => setAnotacao(e.target.value)}
                              placeholder="Adicione observações sobre os louvores, músicas, dicas, etc."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm min-h-[60px]"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSalvarAnotacao(escala.data, anotacao)}
                                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-xs"
                              >
                                💾 Salvar
                              </button>
                              <button
                                onClick={cancelarEdicaoAnotacao}
                                className="px-3 py-1.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition text-xs"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {escala.anotacao ? (
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded-lg flex-1 whitespace-pre-wrap">
                                  {escala.anotacao}
                                </p>
                                {podeEditarLink && (
                                  <button
                                    onClick={() => iniciarEdicaoAnotacao(escala)}
                                    className="text-indigo-600 hover:text-indigo-800 text-xs px-2 py-1 whitespace-nowrap"
                                  >
                                    ✏️ Editar
                                  </button>
                                )}
                              </div>
                            ) : (
                              podeEditarLink && (
                                <button
                                  onClick={() => iniciarEdicaoAnotacao(escala)}
                                  className="text-xs text-gray-400 hover:text-indigo-600 transition"
                                >
                                  ➕ Adicionar anotação
                                </button>
                              )
                            )}
                            {!podeEditarLink && !escala.anotacao && (
                              <span className="text-xs text-gray-400">Sem anotações</span>
                            )}
                          </div>
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
    </Layout>
  );
}
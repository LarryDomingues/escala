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

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-1">
          {user?.nivel === 'admin' ? 'Visão completa' : 'Suas escalas'}
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-white">
          Playlist
        </h1>
      </div>

      {/* Info do modo */}
      <div className="mb-6 p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl transition-colors">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center flex-shrink-0 transition-colors">
            <span className="text-white dark:text-slate-900 text-lg">
              {user?.nivel === 'admin' ? '◈' : '◐'}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {user?.nivel === 'admin'
                ? 'Modo Administrador'
                : 'Modo Membro'
              }
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {user?.nivel === 'admin'
                ? 'Você está vendo todas as datas e pode gerenciar todos os links.'
                : 'Você está vendo apenas as datas em que está escalado.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Mensagem */}
      {mensagem && (
        <div className={`mb-6 p-4 rounded-2xl flex items-start justify-between gap-3 ${mensagemTipo === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400'
            : 'bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 text-red-700 dark:text-red-400'
          }`}>
          <p className="text-sm flex-1">{mensagem}</p>
          <button
            onClick={() => setMensagem('')}
            className="text-current opacity-50 hover:opacity-100 transition-opacity flex-shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Seletor de mês */}
      <div className="mb-6 p-4 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-2xl transition-colors overflow-hidden">
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Selecione o mês</label>
        <input
          type="month"
          value={mesSelecionado}
          onChange={(e) => setMesSelecionado(e.target.value)}
          className="input-field w-full min-w-0 md:max-w-xs"
        />
      </div>

      {/* Empty state */}
      {escalas.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl transition-colors">
          <div className="text-4xl mb-3 opacity-40">▷</div>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {user?.nivel !== 'admin'
              ? 'Você não está escalado em nenhuma data neste mês.'
              : 'Não há eventos de escala para este mês.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {escalas.map((escala) => {
            const escalado = isUsuarioEscalado(escala);
            const podeEditarLink = podeEditar(escala);
            const thumbnail = getThumbnail(escala.link_youtube);
            const watchLink = getWatchLink(escala.link_youtube);

            return (
              <div
                key={escala.id}
                className={`
                  bg-white dark:bg-slate-900 border rounded-2xl p-4 md:p-5 transition-all
                  ${escalado && user?.nivel !== 'admin'
                    ? 'border-slate-900 dark:border-white ring-1 ring-slate-900/5 dark:ring-white/10'
                    : 'border-slate-200/60 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }
                `}
              >
                {/* Header da escala */}
                <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 dark:text-white text-sm md:text-base">
                        {formatarData(escala.data)}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{escala.dia_semana}</span>
                      {escalado && user?.nivel !== 'admin' && (
                        <span className="badge bg-slate-900 dark:bg-white text-white dark:text-slate-900">
                          ⭐ Você
                        </span>
                      )}
                      {podeEditarLink && user?.nivel !== 'admin' && (
                        <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          Pode editar
                        </span>
                      )}
                      {user?.nivel === 'admin' && (
                        <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          Admin
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Membros escalados */}
                <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {['voz', 'voz2', 'violao', 'guitarra', 'baixo', 'bateria', 'teclado'].map((inst) => {
                    const nome = escala[`${inst}_nome`];
                    if (!nome) return null;
                    const id = escala[`${inst}_id`];
                    const labels = {
                      voz: 'Voz 1', voz2: 'Voz 2', violao: 'Violão',
                      guitarra: 'Guitarra', baixo: 'Baixo', bateria: 'Bateria', teclado: 'Teclado'
                    };
                    return (
                      <div key={inst} className="flex items-center gap-1.5">
                        <span className="text-slate-400 dark:text-slate-500">{labels[inst]}:</span>
                        <span className={id === usuarioInfo?.membro_id ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}>
                          {id === usuarioInfo?.membro_id ? '⭐ ' : ''}
                          {nome}
                          {id === usuarioInfo?.membro_id && ' (Você)'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Link do YouTube */}
                <div className="mb-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  {escala.link_youtube ? (
                    <div className="flex items-center gap-3 flex-wrap">
                      {thumbnail && (
                        <img
                          src={thumbnail}
                          alt="Thumbnail"
                          className="w-20 h-12 object-cover rounded-lg flex-shrink-0"
                          loading="lazy"
                        />
                      )}
                      <a
                        href={watchLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      >
                        <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                          ▶
                        </span>
                        Ver vídeo
                      </a>
                      {podeEditarLink && (
                        <button
                          onClick={() => handleRemoverLink(escala.data)}
                          className="ml-auto btn-ghost text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  ) : (
                    podeEditarLink ? (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={editando === escala.data ? linkYoutube : ''}
                          onChange={(e) => setLinkYoutube(e.target.value)}
                          onFocus={() => setEditando(escala.data)}
                          placeholder="Cole o link do YouTube..."
                          className="input-field flex-1 text-sm"
                        />
                        <button
                          onClick={() => handleSalvarLink(escala.data)}
                          className="btn-primary whitespace-nowrap"
                        >
                          Adicionar
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-400 dark:text-slate-500 text-center transition-colors">
                        Nenhum link adicionado
                      </div>
                    )
                  )}
                </div>

                {/* Anotação */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  {editandoAnotacao === escala.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={anotacao}
                        onChange={(e) => setAnotacao(e.target.value)}
                        placeholder="Adicione observações sobre os louvores, músicas, dicas..."
                        className="input-field text-sm min-h-[80px] resize-none"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSalvarAnotacao(escala.data, anotacao)}
                          className="btn-primary text-xs"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={cancelarEdicaoAnotacao}
                          className="btn-secondary text-xs"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {escala.anotacao ? (
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex-shrink-0 transition-colors">
                            ✎
                          </div>
                          <p className="flex-1 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                            {escala.anotacao}
                          </p>
                          {podeEditarLink && (
                            <button
                              onClick={() => iniciarEdicaoAnotacao(escala)}
                              className="btn-ghost text-xs flex-shrink-0"
                            >
                              Editar
                            </button>
                          )}
                        </div>
                      ) : (
                        podeEditarLink ? (
                          <button
                            onClick={() => iniciarEdicaoAnotacao(escala)}
                            className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                          >
                            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800">
                              ✎
                            </span>
                            Adicionar anotação
                          </button>
                        ) : (
                          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">
                            Sem anotações
                          </p>
                        )
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
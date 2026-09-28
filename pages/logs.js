import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import axios from 'axios';

export default function LogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [mensagemTipo, setMensagemTipo] = useState('');
  const [filtroAcao, setFiltroAcao] = useState('todas');
  const [acoesDisponiveis, setAcoesDisponiveis] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 100, total: 0, pages: 0 });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await axios.get('/api/auth/me');
        await carregarLogs();
      } catch (error) {
        router.push('/login');
      }
    };
    checkAuth();
  }, []);

  const carregarLogs = async (params = {}) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        limit: params.limit || pagination.limit,
        page: params.page || 1,
        ...(params.acao && params.acao !== 'todas' && { acao: params.acao }),
      });

      const res = await axios.get(`/api/logs?${queryParams}`);
      setLogs(res.data.logs || []);
      setAcoesDisponiveis(res.data.acoes || []);
      setPagination({
        page: res.data.page || 1,
        limit: res.data.limit || 100,
        total: res.data.total || 0,
        pages: res.data.pages || 0,
      });
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      setMensagem(error.response?.data?.error || 'Erro ao carregar logs');
      setMensagemTipo('error');
    } finally {
      setLoading(false);
    }
  };

  const handleFiltrar = () => {
    carregarLogs({ acao: filtroAcao, page: 1 });
  };

  const handlePageChange = (newPage) => {
    carregarLogs({ acao: filtroAcao, page: newPage });
  };

  const getAcaoLabel = (acao) => {
    const labels = {
      login: 'Login',
      logout: 'Logout',
      login_falha: 'Login Falho',
      cadastro_membro: 'Cadastro Membro',
      edicao_membro: 'Edição Membro',
      excluir_membro: 'Exclusão Membro',
      edicao_escala: 'Edição Escala',
      criar_escala: 'Criar Escala',
      excluir_escala: 'Excluir Escala',
      playlist: 'Playlist',
      playlist_anotacao: 'Anotação Playlist',
      admin_usuarios: 'Admin Usuários',
      ativar_usuario: 'Ativar Usuário',
      bloquear_usuario: 'Bloquear Usuário',
      desbloquear_usuario: 'Desbloquear Usuário',
      promover_usuario: 'Promover Usuário',
      rebaixar_usuario: 'Rebaixar Usuário',
      deletar_usuario: 'Deletar Usuário',
      vincular_usuario: 'Vincular Usuário',
      desvincular_usuario: 'Desvincular Usuário',
      reset_senha: 'Reset Senha',
      criar_usuario: 'Criar Usuário',
      importar_escala: 'Importar Escala',
      exportar_dados: 'Exportar Dados',
      criar_admin: 'Criar Admin',
      reset_admin: 'Reset Admin',
      sistema: 'Sistema',
      outros: 'Outros',
    };
    return labels[acao] || acao;
  };

  const getBadgeColor = (acao) => {
    const colors = {
      login: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-100 dark:ring-emerald-900/40',
      logout: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700',
      login_falha: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 ring-1 ring-red-100 dark:ring-red-900/40',
      cadastro_membro: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 ring-1 ring-blue-100 dark:ring-blue-900/40',
      edicao_membro: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 ring-1 ring-amber-100 dark:ring-amber-900/40',
      excluir_membro: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 ring-1 ring-red-100 dark:ring-red-900/40',
      edicao_escala: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 ring-1 ring-violet-100 dark:ring-violet-900/40',
      criar_escala: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 ring-1 ring-violet-100 dark:ring-violet-900/40',
      excluir_escala: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 ring-1 ring-red-100 dark:ring-red-900/40',
      playlist: 'bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-400 ring-1 ring-pink-100 dark:ring-pink-900/40',
      playlist_anotacao: 'bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-400 ring-1 ring-pink-100 dark:ring-pink-900/40',
      admin_usuarios: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 ring-1 ring-indigo-100 dark:ring-indigo-900/40',
      ativar_usuario: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-100 dark:ring-emerald-900/40',
      bloquear_usuario: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 ring-1 ring-red-100 dark:ring-red-900/40',
      desbloquear_usuario: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 ring-1 ring-blue-100 dark:ring-blue-900/40',
      promover_usuario: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 ring-1 ring-indigo-100 dark:ring-indigo-900/40',
      rebaixar_usuario: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 ring-1 ring-amber-100 dark:ring-amber-900/40',
      deletar_usuario: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 ring-1 ring-red-100 dark:ring-red-900/40',
      vincular_usuario: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 ring-1 ring-violet-100 dark:ring-violet-900/40',
      desvincular_usuario: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700',
      reset_senha: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 ring-1 ring-amber-100 dark:ring-amber-900/40',
      criar_usuario: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 ring-1 ring-blue-100 dark:ring-blue-900/40',
      importar_escala: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 ring-1 ring-cyan-100 dark:ring-cyan-900/40',
      exportar_dados: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 ring-1 ring-blue-100 dark:ring-blue-900/40',
      criar_admin: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 ring-1 ring-indigo-100 dark:ring-indigo-900/40',
      reset_admin: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 ring-1 ring-amber-100 dark:ring-amber-900/40',
    };
    return colors[acao] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700';
  };

  const formatarData = (data) => {
    if (!data) return '-';
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-1">
          {pagination.total} {pagination.total === 1 ? 'registro' : 'registros'}
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-white">
          Logs do Sistema
        </h1>
      </div>

      {/* Mensagem */}
      {mensagem && (
        <div className={`mb-6 p-4 rounded-2xl flex items-start justify-between gap-3 ${
          mensagemTipo === 'success' 
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

      {/* Filtros */}
      <div className="mb-6 p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl transition-colors">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
              Filtrar por ação
            </label>
            <select
              value={filtroAcao}
              onChange={(e) => setFiltroAcao(e.target.value)}
              className="input-field w-full min-w-0"
            >
              <option value="todas">Todas as ações</option>
              {acoesDisponiveis.map((acao) => (
                <option key={acao} value={acao}>
                  {getAcaoLabel(acao)}
                </option>
              ))}
            </select>
          </div>
          <button 
            onClick={handleFiltrar}
            className="btn-primary w-full sm:w-auto whitespace-nowrap"
          >
            Filtrar
          </button>
        </div>
      </div>

      {/* Tabela de Logs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl overflow-hidden transition-colors">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-800 border-t-slate-900 dark:border-t-white rounded-full animate-spin"></div>
              <p className="text-sm text-slate-400 dark:text-slate-500">Carregando</p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 opacity-40">📋</div>
            <p className="text-sm text-slate-400 dark:text-slate-500">Nenhum log encontrado</p>
            {filtroAcao !== 'todas' && (
              <button
                onClick={() => { setFiltroAcao('todas'); carregarLogs({ acao: 'todas' }); }}
                className="mt-4 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Versão Desktop - Tabela */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200/70 dark:border-slate-800">
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider w-[15%]">Data/Hora</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider w-[18%]">Usuário</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider w-[18%]">Ação</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Descrição</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider w-[12%]">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400 text-xs">
                        {formatarData(log.data_hora)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-white text-sm">
                          {log.usuario_nome || 'Sistema'}
                        </div>
                        {log.usuario_email && (
                          <div className="text-xs text-slate-400 dark:text-slate-500 truncate">
                            {log.usuario_email}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-wide ${getBadgeColor(log.acao)}`}>
                          {getAcaoLabel(log.acao)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-sm break-words">
                        {log.descricao}
                      </td>
                      <td className="px-4 py-3 text-slate-400 dark:text-slate-500 text-xs whitespace-nowrap">
                        {log.ip}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Versão Mobile - Cards */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((log) => (
                <div key={log.id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold tracking-wide ${getBadgeColor(log.acao)}`}>
                      {getAcaoLabel(log.acao)}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      {formatarData(log.data_hora)}
                    </span>
                  </div>
                  <div className="mb-2">
                    <div className="font-medium text-slate-900 dark:text-white text-sm">
                      {log.usuario_nome || 'Sistema'}
                    </div>
                    {log.usuario_email && (
                      <div className="text-xs text-slate-400 dark:text-slate-500">
                        {log.usuario_email}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-2 break-words">
                    {log.descricao}
                  </p>
                  <div className="text-xs text-slate-400 dark:text-slate-500">
                    IP: {log.ip}
                  </div>
                </div>
              ))}
            </div>

            {/* Paginação */}
            {pagination.pages > 1 && (
              <div className="p-4 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Página {pagination.page} de {pagination.pages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
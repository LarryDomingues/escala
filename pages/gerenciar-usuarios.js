import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import axios from 'axios';

export default function GerenciarUsuarios() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [mensagemTipo, setMensagemTipo] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [usuarioReset, setUsuarioReset] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get('/api/auth/me');
        setUser(res.data);
        if (res.data.nivel !== 'admin') {
          router.push('/');
          return;
        }
        await carregarUsuarios();
      } catch (error) {
        router.push('/login');
      }
    };
    checkAuth();
  }, []);

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/usuarios');
      setUsuarios(res.data);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      setMensagem('Erro ao carregar usuários');
      setMensagemTipo('error');
    } finally {
      setLoading(false);
    }
  };

  const handleAcao = async (id, acao, nome) => {
    if (!confirm(`Tem certeza que deseja ${acao} o usuário "${nome}"?`)) return;
    try {
      await axios.put(`/api/admin/usuarios/${id}`, { acao });
      setMensagem(`Usuário ${acao} com sucesso!`);
      setMensagemTipo('success');
      await carregarUsuarios();
    } catch (error) {
      setMensagem(error.response?.data?.error || 'Erro ao executar ação');
      setMensagemTipo('error');
    }
  };

  const handlePromover = async (id, nivel, nome) => {
    const novoNivel = nivel === 'membro' ? 'coordenador' : 'membro';
    if (!confirm(`Tem certeza que deseja promover "${nome}" para ${novoNivel}?`)) return;
    try {
      await axios.put(`/api/admin/usuarios/${id}`, { nivel: novoNivel });
      setMensagem(`Usuário promovido para ${novoNivel}!`);
      setMensagemTipo('success');
      await carregarUsuarios();
    } catch (error) {
      setMensagem(error.response?.data?.error || 'Erro ao promover usuário');
      setMensagemTipo('error');
    }
  };

  const handleRebaixar = async (id, nome) => {
    if (!confirm(`Tem certeza que deseja rebaixar "${nome}" para membro?`)) return;
    try {
      await axios.put(`/api/admin/usuarios/${id}`, { nivel: 'membro' });
      setMensagem(`Usuário rebaixado para membro!`);
      setMensagemTipo('success');
      await carregarUsuarios();
    } catch (error) {
      setMensagem(error.response?.data?.error || 'Erro ao rebaixar usuário');
      setMensagemTipo('error');
    }
  };

  const handleDeletar = async (id, nome) => {
    if (!confirm(`Tem certeza que deseja DELETAR o usuário "${nome}"? Esta ação não pode ser desfeita!`)) return;
    try {
      await axios.delete(`/api/admin/usuarios/${id}`);
      setMensagem(`Usuário ${nome} deletado com sucesso!`);
      setMensagemTipo('success');
      await carregarUsuarios();
    } catch (error) {
      setMensagem(error.response?.data?.error || 'Erro ao deletar usuário');
      setMensagemTipo('error');
    }
  };

  const handleResetSenha = async (id, nome) => {
    if (!confirm(`Tem certeza que deseja resetar a senha do usuário "${nome}"?`)) return;
    try {
      const res = await axios.post(`/api/admin/usuarios/${id}/reset-senha`);
      setNovaSenha(res.data.novaSenha);
      setUsuarioReset(res.data.usuario);
      setModalAberto(true);
      setMensagem(`Senha de ${nome} resetada com sucesso!`);
      setMensagemTipo('success');
      await carregarUsuarios();
    } catch (error) {
      setMensagem(error.response?.data?.error || 'Erro ao resetar senha');
      setMensagemTipo('error');
    }
  };

  const getStatusBadge = (status) => {
    const classes = {
      ativo: 'badge-ativo',
      pendente: 'badge-pendente',
      bloqueado: 'badge-bloqueado',
    };
    return `badge ${classes[status] || 'badge-ativo'}`;
  };

  const getNivelBadge = (nivel) => {
    const classes = {
      admin: 'badge-admin',
      coordenador: 'badge-coordenador',
      membro: 'badge-membro',
    };
    return `badge ${classes[nivel] || 'badge-membro'}`;
  };

  const formatarData = (data) => {
    if (!data) return 'Nunca';
    return new Date(data).toLocaleDateString('pt-BR') + ' ' + new Date(data).toLocaleTimeString('pt-BR');
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

  return (
    <Layout>
      <div className="p-3 md:p-4 max-w-7xl mx-auto">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6">👥 Gerenciar Usuários</h1>

        {mensagem && (
          <div className={`p-3 md:p-4 rounded-lg mb-4 md:mb-6 ${mensagemTipo === 'success' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>
            {mensagem}
            <button onClick={() => setMensagem('')} className="float-right text-gray-500 hover:text-gray-700">✕</button>
          </div>
        )}

        {/* Versão Desktop - Tabela */}
        <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nível</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Último Login</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {usuarios.map((usuario) => {
                  const isCurrentUser = user && usuario.id === user.id;
                  return (
                    <tr key={usuario.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {usuario.nome}
                        {isCurrentUser && <span className="ml-2 text-xs text-indigo-600">(Você)</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{usuario.email}</td>
                      <td className="px-4 py-3">
                        <span className={getNivelBadge(usuario.nivel)}>{usuario.nivel}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={getStatusBadge(usuario.status)}>{usuario.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-sm">{formatarData(usuario.ultimo_login)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {usuario.status === 'pendente' && !isCurrentUser && (
                            <button onClick={() => handleAcao(usuario.id, 'ativar', usuario.nome)} className="bg-green-600 text-white text-xs px-2 py-1 rounded hover:bg-green-700 transition">Ativar</button>
                          )}
                          {usuario.status === 'ativo' && !isCurrentUser && (
                            <button onClick={() => handleAcao(usuario.id, 'bloquear', usuario.nome)} className="bg-orange-500 text-white text-xs px-2 py-1 rounded hover:bg-orange-600 transition">Bloquear</button>
                          )}
                          {usuario.status === 'bloqueado' && !isCurrentUser && (
                            <button onClick={() => handleAcao(usuario.id, 'desbloquear', usuario.nome)} className="bg-blue-600 text-white text-xs px-2 py-1 rounded hover:bg-blue-700 transition">Desbloquear</button>
                          )}
                          {usuario.nivel !== 'admin' && !isCurrentUser && (
                            <button onClick={() => handlePromover(usuario.id, usuario.nivel, usuario.nome)} className="bg-indigo-600 text-white text-xs px-2 py-1 rounded hover:bg-indigo-700 transition" title={usuario.nivel === 'membro' ? 'Promover para Coordenador' : 'Promover para Admin'}>↑</button>
                          )}
                          {usuario.nivel === 'coordenador' && !isCurrentUser && (
                            <button onClick={() => handleRebaixar(usuario.id, usuario.nome)} className="bg-yellow-600 text-white text-xs px-2 py-1 rounded hover:bg-yellow-700 transition" title="Rebaixar para Membro">↓</button>
                          )}
                          {usuario.nivel !== 'admin' && !isCurrentUser && (
                            <button onClick={() => handleDeletar(usuario.id, usuario.nome)} className="bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700 transition" title="Deletar Usuário">🗑️</button>
                          )}
                          {!isCurrentUser && (
                            <button onClick={() => handleResetSenha(usuario.id, usuario.nome)} className="bg-purple-600 text-white text-xs px-2 py-1 rounded hover:bg-purple-700 transition" title="Resetar Senha">🔑</button>
                          )}
                          {isCurrentUser && (
                            <span className="text-xs text-gray-400">Não pode se modificar</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Versão Mobile - Cards */}
        <div className="md:hidden space-y-3">
          {usuarios.map((usuario) => {
            const isCurrentUser = user && usuario.id === user.id;
            return (
              <div key={usuario.id} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-gray-900 text-base">
                      {usuario.nome}
                      {isCurrentUser && <span className="ml-2 text-xs text-indigo-600">(Você)</span>}
                    </div>
                    <div className="text-sm text-gray-500">{usuario.email}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={getNivelBadge(usuario.nivel)}>{usuario.nivel}</span>
                    <span className={getStatusBadge(usuario.status)}>{usuario.status}</span>
                  </div>
                </div>

                <div className="text-xs text-gray-400 mb-3">
                  Último login: {formatarData(usuario.ultimo_login)}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {usuario.status === 'pendente' && !isCurrentUser && (
                    <button onClick={() => handleAcao(usuario.id, 'ativar', usuario.nome)} className="bg-green-600 text-white text-xs px-2.5 py-1.5 rounded hover:bg-green-700 transition flex-1 min-w-[60px]">Ativar</button>
                  )}
                  {usuario.status === 'ativo' && !isCurrentUser && (
                    <button onClick={() => handleAcao(usuario.id, 'bloquear', usuario.nome)} className="bg-orange-500 text-white text-xs px-2.5 py-1.5 rounded hover:bg-orange-600 transition flex-1 min-w-[60px]">Bloquear</button>
                  )}
                  {usuario.status === 'bloqueado' && !isCurrentUser && (
                    <button onClick={() => handleAcao(usuario.id, 'desbloquear', usuario.nome)} className="bg-blue-600 text-white text-xs px-2.5 py-1.5 rounded hover:bg-blue-700 transition flex-1 min-w-[60px]">Desbloquear</button>
                  )}
                  {usuario.nivel !== 'admin' && !isCurrentUser && (
                    <button onClick={() => handlePromover(usuario.id, usuario.nivel, usuario.nome)} className="bg-indigo-600 text-white text-xs px-2.5 py-1.5 rounded hover:bg-indigo-700 transition flex-1 min-w-[40px]" title={usuario.nivel === 'membro' ? 'Promover' : 'Promover Admin'}>↑</button>
                  )}
                  {usuario.nivel === 'coordenador' && !isCurrentUser && (
                    <button onClick={() => handleRebaixar(usuario.id, usuario.nome)} className="bg-yellow-600 text-white text-xs px-2.5 py-1.5 rounded hover:bg-yellow-700 transition flex-1 min-w-[40px]" title="Rebaixar">↓</button>
                  )}
                  {usuario.nivel !== 'admin' && !isCurrentUser && (
                    <button onClick={() => handleDeletar(usuario.id, usuario.nome)} className="bg-red-600 text-white text-xs px-2.5 py-1.5 rounded hover:bg-red-700 transition flex-1 min-w-[40px]" title="Deletar">🗑️</button>
                  )}
                  {!isCurrentUser && (
                    <button onClick={() => handleResetSenha(usuario.id, usuario.nome)} className="bg-purple-600 text-white text-xs px-2.5 py-1.5 rounded hover:bg-purple-700 transition flex-1 min-w-[40px]" title="Resetar Senha">🔑</button>
                  )}
                  {isCurrentUser && (
                    <span className="text-xs text-gray-400 w-full text-center">Não pode se modificar</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal para exibir nova senha */}
      {modalAberto && usuarioReset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">🔑 Senha Resetada</h3>
              <button
                onClick={() => setModalAberto(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="mb-4">
              <p className="text-gray-600">
                A senha do usuário <strong>{usuarioReset.nome}</strong> foi resetada com sucesso!
              </p>
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-gray-600">Nova senha temporária:</p>
                <p className="text-2xl font-mono font-bold text-purple-700 text-center py-2">
                  {novaSenha}
                </p>
                <p className="text-xs text-gray-400 text-center">
                  * Recomende que o usuário altere esta senha após o primeiro login.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setModalAberto(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(novaSenha);
                  alert('Senha copiada para a área de transferência!');
                }}
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
              >
                📋 Copiar Senha
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
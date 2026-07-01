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

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get('/api/auth/me');
        setUser(res.data);
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

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 md:px-4 py-2 text-left">Nome</th>
                  <th className="px-2 md:px-4 py-2 text-left hidden sm:table-cell">Email</th>
                  <th className="px-2 md:px-4 py-2 text-left">Nível</th>
                  <th className="px-2 md:px-4 py-2 text-left">Status</th>
                  <th className="px-2 md:px-4 py-2 text-left hidden md:table-cell">Último Login</th>
                  <th className="px-2 md:px-4 py-2 text-center min-w-[200px]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {usuarios.map((usuario) => {
                  const isCurrentUser = user && usuario.id === user.id;
                  return (
                    <tr key={usuario.id} className="hover:bg-gray-50">
                      <td className="px-2 md:px-4 py-2 font-medium text-gray-900">
                        {usuario.nome}
                        {isCurrentUser && <span className="ml-2 text-xs text-indigo-600">(Você)</span>}
                      </td>
                      <td className="px-2 md:px-4 py-2 text-gray-600 hidden sm:table-cell">{usuario.email}</td>
                      <td className="px-2 md:px-4 py-2">
                        <span className={getNivelBadge(usuario.nivel)}>{usuario.nivel}</span>
                      </td>
                      <td className="px-2 md:px-4 py-2">
                        <span className={getStatusBadge(usuario.status)}>{usuario.status}</span>
                      </td>
                      <td className="px-2 md:px-4 py-2 text-gray-500 hidden md:table-cell">
                        {formatarData(usuario.ultimo_login)}
                      </td>
                      <td className="px-2 md:px-4 py-2">
                        <div className="flex flex-wrap items-center justify-center gap-1 md:gap-2">
                          {/* Ativar - apenas para pendentes e não é o usuário atual */}
                          {usuario.status === 'pendente' && !isCurrentUser && (
                            <button
                              onClick={() => handleAcao(usuario.id, 'ativar', usuario.nome)}
                              className="bg-green-600 text-white text-xs px-2 py-1 rounded hover:bg-green-700 transition"
                            >
                              Ativar
                            </button>
                          )}

                          {/* Bloquear - apenas para ativos e não é o usuário atual */}
                          {usuario.status === 'ativo' && !isCurrentUser && (
                            <button
                              onClick={() => handleAcao(usuario.id, 'bloquear', usuario.nome)}
                              className="bg-orange-500 text-white text-xs px-2 py-1 rounded hover:bg-orange-600 transition"
                            >
                              Bloquear
                            </button>
                          )}

                          {/* Desbloquear - apenas para bloqueados e não é o usuário atual */}
                          {usuario.status === 'bloqueado' && !isCurrentUser && (
                            <button
                              onClick={() => handleAcao(usuario.id, 'desbloquear', usuario.nome)}
                              className="bg-blue-600 text-white text-xs px-2 py-1 rounded hover:bg-blue-700 transition"
                            >
                              Desbloquear
                            </button>
                          )}

                          {/* Promover - apenas para membros/coordenadores e não é admin */}
                          {usuario.nivel !== 'admin' && !isCurrentUser && (
                            <button
                              onClick={() => handlePromover(usuario.id, usuario.nivel, usuario.nome)}
                              className="bg-indigo-600 text-white text-xs px-2 py-1 rounded hover:bg-indigo-700 transition"
                              title={usuario.nivel === 'membro' ? 'Promover para Coordenador' : 'Promover para Admin'}
                            >
                              ↑
                            </button>
                          )}

                          {/* Rebaixar - apenas para coordenadores e não é o usuário atual */}
                          {usuario.nivel === 'coordenador' && !isCurrentUser && (
                            <button
                              onClick={() => handleRebaixar(usuario.id, usuario.nome)}
                              className="bg-yellow-600 text-white text-xs px-2 py-1 rounded hover:bg-yellow-700 transition"
                              title="Rebaixar para Membro"
                            >
                              ↓
                            </button>
                          )}

                          {/* Deletar - apenas para não admin e não é o usuário atual */}
                          {usuario.nivel !== 'admin' && !isCurrentUser && (
                            <button
                              onClick={() => handleDeletar(usuario.id, usuario.nome)}
                              className="bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700 transition"
                              title="Deletar Usuário"
                            >
                              🗑️
                            </button>
                          )}

                          {/* Mensagem para o próprio usuário */}
                          {isCurrentUser && (
                            <span className="text-xs text-gray-400">Você não pode se modificar</span>
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
      </div>
    </Layout>
  );
}
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
                  <th className="px-2 md:px-4 py-2 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {usuarios.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-gray-50">
                    <td className="px-2 md:px-4 py-2 font-medium text-gray-900">
                      {usuario.nome}
                      {user && usuario.id === user.id && <span className="ml-2 text-xs text-indigo-600">(Você)</span>}
                    </td>
                    <td className="px-2 md:px-4 py-2 text-gray-600 hidden sm:table-cell">{usuario.email}</td>
                    <td className="px-2 md:px-4 py-2"><span className={getNivelBadge(usuario.nivel)}>{usuario.nivel}</span></td>
                    <td className="px-2 md:px-4 py-2"><span className={getStatusBadge(usuario.status)}>{usuario.status}</span></td>
                    <td className="px-2 md:px-4 py-2 text-gray-500 hidden md:table-cell">{formatarData(usuario.ultimo_login)}</td>
                    <td className="px-2 md:px-4 py-2">
                      <div className="flex flex-wrap items-center justify-center gap-1 md:gap-2">
                        {usuario.status === 'pendente' && (!user || usuario.id !== user.id) && (
                          <button onClick={() => handleAcao(usuario.id, 'ativar', usuario.nome)} className="btn-success text-xs px-2 py-1">Ativar</button>
                        )}
                        {usuario.status === 'ativo' && (!user || usuario.id !== user.id) && (
                          <button onClick={() => handleAcao(usuario.id, 'bloquear', usuario.nome)} className="btn-danger text-xs px-2 py-1">Bloquear</button>
                        )}
                        {usuario.status === 'bloqueado' && (!user || usuario.id !== user.id) && (
                          <button onClick={() => handleAcao(usuario.id, 'desbloquear', usuario.nome)} className="btn-success text-xs px-2 py-1">Desbloquear</button>
                        )}
                        {usuario.nivel !== 'admin' && (!user || usuario.id !== user.id) && (
                          <button onClick={() => handlePromover(usuario.id, usuario.nivel, usuario.nome)} className="btn-warning text-xs px-2 py-1">
                            {usuario.nivel === 'membro' ? '↑' : '↓'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
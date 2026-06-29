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

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await axios.get('/api/auth/me');
        carregarLogs();
      } catch (error) {
        router.push('/login');
      }
    };
    checkAuth();
  }, []);

  const carregarLogs = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/logs');
      setLogs(res.data.logs || []);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      setMensagem('Erro ao carregar logs');
      setMensagemTipo('error');
    } finally {
      setLoading(false);
    }
  };

  const getAcaoLabel = (acao) => {
    const labels = {
      login: 'Login',
      logout: 'Logout',
      cadastro_membro: 'Cadastro Membro',
      edicao_membro: 'Edição Membro',
      excluir_membro: 'Exclusão Membro',
      edicao_escala: 'Edição Escala',
      playlist: 'PlayList',
      admin_usuarios: 'Admin Usuários',
    };
    return labels[acao] || acao;
  };

  const getBadgeColor = (acao) => {
    const colors = {
      login: 'bg-green-100 text-green-800',
      logout: 'bg-gray-100 text-gray-800',
      cadastro_membro: 'bg-blue-100 text-blue-800',
      edicao_membro: 'bg-yellow-100 text-yellow-800',
      excluir_membro: 'bg-red-100 text-red-800',
      edicao_escala: 'bg-purple-100 text-purple-800',
      playlist: 'bg-pink-100 text-pink-800',
      admin_usuarios: 'bg-indigo-100 text-indigo-800',
    };
    return colors[acao] || 'bg-gray-100 text-gray-800';
  };

  const formatarData = (data) => {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR') + ' ' + new Date(data).toLocaleTimeString('pt-BR');
  };

  return (
    <Layout>
      <div className="p-3 md:p-4 max-w-7xl mx-auto">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6">📋 Logs do Sistema</h1>

        {mensagem && (
          <div className={`p-3 md:p-4 rounded-lg mb-4 md:mb-6 ${mensagemTipo === 'success' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>
            {mensagem}
            <button onClick={() => setMensagem('')} className="float-right text-gray-500 hover:text-gray-700">✕</button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64"><div className="text-gray-500">Carregando logs...</div></div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-5xl mb-4">📋</div>
              <p>Nenhum log encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 md:px-4 py-2 text-left">Data/Hora</th>
                    <th className="px-2 md:px-4 py-2 text-left hidden sm:table-cell">Usuário</th>
                    <th className="px-2 md:px-4 py-2 text-left">Ação</th>
                    <th className="px-2 md:px-4 py-2 text-left hidden md:table-cell">Descrição</th>
                    <th className="px-2 md:px-4 py-2 text-left hidden lg:table-cell">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-2 md:px-4 py-2 whitespace-nowrap text-gray-600">{formatarData(log.data_hora)}</td>
                      <td className="px-2 md:px-4 py-2 font-medium hidden sm:table-cell">{log.usuario_nome || 'Sistema'}</td>
                      <td className="px-2 md:px-4 py-2">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getBadgeColor(log.acao)}`}>
                          {getAcaoLabel(log.acao)}
                        </span>
                      </td>
                      <td className="px-2 md:px-4 py-2 text-gray-600 hidden md:table-cell max-w-xs break-words">{log.descricao}</td>
                      <td className="px-2 md:px-4 py-2 text-gray-500 hidden lg:table-cell">{log.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
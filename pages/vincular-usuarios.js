import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import axios from 'axios';

export default function VincularUsuarios() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [membros, setMembros] = useState([]);
  const [usuariosVinculados, setUsuariosVinculados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [mensagemTipo, setMensagemTipo] = useState('');

  const [form, setForm] = useState({
    usuario_id: '',
    membro_id: '',
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get('/api/auth/me');
        setUser(res.data);
        if (res.data.nivel !== 'admin') {
          router.push('/');
          return;
        }
        carregarDados();
      } catch (error) {
        router.push('/login');
      }
    };
    checkAuth();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      // Buscar todos os usuários
      const usuariosRes = await axios.get('/api/admin/usuarios');
      const todosUsuarios = usuariosRes.data;

      // Buscar todos os membros
      const membrosRes = await axios.get('/api/membros');
      const todosMembros = membrosRes.data;

      // Buscar usuários com membro vinculado
      const usuariosComMembro = await Promise.all(
        todosUsuarios.map(async (u) => {
          const membro = todosMembros.find(m => m.usuario_id === u.id);
          return {
            ...u,
            membro: membro || null,
          };
        })
      );

      // Separar usuários com e sem vínculo
      const vinculados = usuariosComMembro.filter(u => u.membro);
      const naoVinculados = usuariosComMembro.filter(u => !u.membro);

      setUsuarios(naoVinculados);
      setMembros(todosMembros);
      setUsuariosVinculados(vinculados);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setMensagem('Erro ao carregar dados');
      setMensagemTipo('error');
    } finally {
      setLoading(false);
    }
  };

  const handleVincular = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setMensagem('');
    setMensagemTipo('');

    try {
      const { usuario_id, membro_id } = form;

      if (!usuario_id || !membro_id) {
        setMensagem('Selecione um usuário e um membro');
        setMensagemTipo('error');
        setSalvando(false);
        return;
      }

      await axios.put(`/api/admin/usuarios/${usuario_id}`, {
        vincular_membro: membro_id,
      });

      setMensagem('Usuário vinculado com sucesso!');
      setMensagemTipo('success');
      setForm({ usuario_id: '', membro_id: '' });
      await carregarDados();
    } catch (error) {
      console.error('Erro ao vincular:', error);
      setMensagem(error.response?.data?.error || 'Erro ao vincular usuário');
      setMensagemTipo('error');
    } finally {
      setSalvando(false);
    }
  };

  const handleDesvincular = async (usuarioId, membroNome) => {
    if (!confirm(`Tem certeza que deseja desvincular o usuário do membro "${membroNome}"?`)) return;

    try {
      await axios.put(`/api/admin/usuarios/${usuarioId}`, {
        desvincular_membro: true,
      });

      setMensagem('Usuário desvinculado com sucesso!');
      setMensagemTipo('success');
      await carregarDados();
    } catch (error) {
      console.error('Erro ao desvincular:', error);
      setMensagem(error.response?.data?.error || 'Erro ao desvincular usuário');
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

  return (
    <Layout>
      <div className="p-3 md:p-4 max-w-7xl mx-auto">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6">🔗 Vincular Usuários a Membros</h1>

        {mensagem && (
          <div className={`p-3 md:p-4 rounded-lg mb-4 md:mb-6 ${mensagemTipo === 'success' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>
            {mensagem}
            <button onClick={() => setMensagem('')} className="float-right text-gray-500 hover:text-gray-700">✕</button>
          </div>
        )}

        <div className="bg-blue-50 p-3 md:p-4 rounded-lg mb-4 md:mb-6 border-l-4 border-blue-500">
          <p className="text-blue-700 text-sm font-medium">ℹ️ Sobre a Vinculação:</p>
          <p className="text-blue-600 text-xs md:text-sm">
            Vincular um usuário a um membro permite que o sistema identifique qual membro está logado.
            Isso permite destacar o nome do usuário na escala e personalizar a experiência.
          </p>
          <p className="text-blue-600 text-xs md:text-sm mt-1">
            💡 <strong>Administradores também podem ser vinculados</strong> a membros para aparecerem destacados na escala.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Coluna 1: Vincular Novo */}
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
            <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              ➕ Vincular Novo
              <span className="text-sm bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                {usuarios.length} disponíveis
              </span>
            </h2>

            {usuarios.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">✅</div>
                <p>Todos os usuários já estão vinculados a um membro!</p>
                <p className="text-sm text-gray-400 mt-1">Não há usuários disponíveis para vincular.</p>
              </div>
            ) : (
              <form onSubmit={handleVincular}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o Usuário:</label>
                  <select
                    value={form.usuario_id}
                    onChange={(e) => setForm({ ...form, usuario_id: e.target.value })}
                    className="input-field"
                    required
                  >
                    <option value="">-- Selecione um usuário --</option>
                    {usuarios.map((usuario) => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.nome} ({usuario.email}) - {usuario.nivel}
                        {user && usuario.id === user.id && ' (Você)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o Membro:</label>
                  <select
                    value={form.membro_id}
                    onChange={(e) => setForm({ ...form, membro_id: e.target.value })}
                    className="input-field"
                    required
                  >
                    <option value="">-- Selecione um membro --</option>
                    {membros.map((membro) => (
                      <option key={membro.id} value={membro.id}>
                        {membro.nome} {membro.celular ? `- ${membro.celular}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={salvando}
                  className="btn-primary w-full py-2 text-sm md:text-base"
                >
                  {salvando ? 'Vinculando...' : '🔗 Vincular Usuário ao Membro'}
                </button>
              </form>
            )}
          </div>

          {/* Coluna 2: Usuários Vinculados */}
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
            <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              👥 Usuários Vinculados
              <span className="text-sm bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                {usuariosVinculados.length}
              </span>
            </h2>

            {usuariosVinculados.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📋</div>
                <p>Nenhum usuário vinculado ainda.</p>
                <p className="text-sm text-gray-400 mt-1">Use o formulário ao lado para vincular.</p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                {usuariosVinculados.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50 rounded-lg transition"
                  >
                    <div className="flex-1 mb-2 sm:mb-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-800">{item.nome}</span>
                        <span className={getNivelBadge(item.nivel)}>{item.nivel}</span>
                        <span className={getStatusBadge(item.status)}>{item.status}</span>
                        {user && item.id === user.id && (
                          <span className="text-xs text-indigo-600 font-medium">(Você)</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{item.email}</div>
                      {item.membro ? (
                        <div className="text-sm text-green-600">
                          👤 Vinculado a: <strong>{item.membro.nome}</strong>
                        </div>
                      ) : (
                        <div className="text-sm text-red-500">
                          ⚠️ Erro: Membro não encontrado
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDesvincular(item.id, item.membro?.nome || 'membro')}
                      className="btn-danger text-sm px-3 py-1.5"
                    >
                      🔓 Desvincular
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 mt-4 md:mt-6">
          <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 text-center">
            <div className="text-xl md:text-2xl font-bold text-indigo-600">{usuarios.length}</div>
            <div className="text-xs md:text-sm text-gray-500">Usuários sem vínculo</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 text-center">
            <div className="text-xl md:text-2xl font-bold text-green-600">{usuariosVinculados.length}</div>
            <div className="text-xs md:text-sm text-gray-500">Usuários vinculados</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 text-center">
            <div className="text-xl md:text-2xl font-bold text-orange-600">{membros.length}</div>
            <div className="text-xs md:text-sm text-gray-500">Total de membros</div>
          </div>
        </div>

        {/* Dica para Admin */}
        {user && user.nivel === 'admin' && (
          <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
            <p className="text-sm text-indigo-700">
              💡 <strong>Dica:</strong> Como administrador, você também pode se vincular a um membro.
              Basta selecionar seu usuário na lista e escolher um membro para vincular.
              Isso fará seu nome aparecer destacado na escala.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import axios from 'axios';

export default function CadastroMembros() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [membros, setMembros] = useState([]);
  const [habilidades, setHabilidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [acaoMembro, setAcaoMembro] = useState(null);

  const [form, setForm] = useState({
    id: null,
    nome: '',
    celular: '',
    email: '',
    data_nascimento: '',
    habilidades: [],
  });

  const [editando, setEditando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [mensagemTipo, setMensagemTipo] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get('/api/auth/me');
        setUser(res.data);
        if (res.data.nivel !== 'admin' && res.data.nivel !== 'coordenador') {
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
      const [membrosRes, habilidadesRes] = await Promise.all([
        axios.get('/api/membros'),
        axios.get('/api/membros/habilidades'),
      ]);
      setMembros(membrosRes.data);
      setHabilidades(habilidadesRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setMensagem('Erro ao carregar dados');
      setMensagemTipo('error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleHabilidadeChange = (habilidadeId) => {
    setForm((prev) => {
      const habilidades = prev.habilidades.includes(habilidadeId)
        ? prev.habilidades.filter((id) => id !== habilidadeId)
        : [...prev.habilidades, habilidadeId];
      return { ...prev, habilidades };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setMensagem('');
    setMensagemTipo('');

    try {
      if (!form.nome || form.nome.trim() === '') {
        setMensagem('Nome é obrigatório');
        setMensagemTipo('error');
        setSalvando(false);
        return;
      }

      const dados = {
        nome: form.nome.trim(),
        celular: form.celular || '',
        email: form.email || '',
        data_nascimento: form.data_nascimento || '',
        habilidades: form.habilidades || [],
      };

      let response;
      if (editando && form.id) {
        response = await axios.put(`/api/membros/${form.id}`, dados);
        setMensagem(response.data.message || 'Membro atualizado com sucesso!');
        setMensagemTipo('success');
      } else {
        response = await axios.post('/api/membros', dados);
        setMensagem(response.data.message || 'Membro cadastrado com sucesso!');
        setMensagemTipo('success');
      }

      resetForm();
      await carregarDados();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Erro ao salvar membro';
      setMensagem(errorMsg);
      setMensagemTipo('error');
    } finally {
      setSalvando(false);
    }
  };

  const handleEdit = async (id) => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/membros/${id}`);
      const membro = res.data;
      setForm({
        id: membro.id,
        nome: membro.nome || '',
        celular: membro.celular || '',
        email: membro.email || '',
        data_nascimento: membro.data_nascimento || '',
        habilidades: membro.habilidade_ids || [],
      });
      setEditando(true);
      document.getElementById('form-membro')?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error('Erro ao buscar membro:', error);
      setMensagem('Erro ao carregar dados para edição');
      setMensagemTipo('error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, nome) => {
    if (!confirm(`Tem certeza que deseja excluir o membro "${nome}"?`)) return;
    
    try {
      await axios.delete(`/api/membros/${id}`);
      setMensagem('Membro excluído com sucesso!');
      setMensagemTipo('success');
      await carregarDados();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      setMensagem(error.response?.data?.error || 'Erro ao excluir membro');
      setMensagemTipo('error');
    }
  };

  // ========== NOVAS AÇÕES ==========
  
  // Ativar conta do membro (cria usuário)
  const handleAtivarConta = async (id, nome, email) => {
    if (!email) {
      setMensagem(`O membro "${nome}" não possui email cadastrado para criar uma conta.`);
      setMensagemTipo('error');
      return;
    }

    if (!confirm(`Tem certeza que deseja ativar a conta do membro "${nome}"? Um usuário será criado com o email ${email}.`)) return;

    try {
      const response = await axios.post(`/api/membros/${id}/ativar-conta`);
      setMensagem(response.data.message || `Conta ativada com sucesso para ${nome}!`);
      setMensagemTipo('success');
      await carregarDados();
    } catch (error) {
      console.error('Erro ao ativar conta:', error);
      setMensagem(error.response?.data?.error || 'Erro ao ativar conta');
      setMensagemTipo('error');
    }
  };

  // Bloquear membro (bloqueia o usuário vinculado)
  const handleBloquearMembro = async (id, nome) => {
    if (!confirm(`Tem certeza que deseja bloquear o membro "${nome}"?`)) return;

    try {
      const response = await axios.post(`/api/membros/${id}/bloquear`);
      setMensagem(response.data.message || `Membro ${nome} bloqueado com sucesso!`);
      setMensagemTipo('success');
      await carregarDados();
    } catch (error) {
      console.error('Erro ao bloquear membro:', error);
      setMensagem(error.response?.data?.error || 'Erro ao bloquear membro');
      setMensagemTipo('error');
    }
  };

  // Desbloquear membro
  const handleDesbloquearMembro = async (id, nome) => {
    if (!confirm(`Tem certeza que deseja desbloquear o membro "${nome}"?`)) return;

    try {
      const response = await axios.post(`/api/membros/${id}/desbloquear`);
      setMensagem(response.data.message || `Membro ${nome} desbloqueado com sucesso!`);
      setMensagemTipo('success');
      await carregarDados();
    } catch (error) {
      console.error('Erro ao desbloquear membro:', error);
      setMensagem(error.response?.data?.error || 'Erro ao desbloquear membro');
      setMensagemTipo('error');
    }
  };

  const resetForm = () => {
    setForm({
      id: null,
      nome: '',
      celular: '',
      email: '',
      data_nascimento: '',
      habilidades: [],
    });
    setEditando(false);
  };

  const cancelarEdicao = () => {
    resetForm();
  };

  // Verificar se o membro tem usuário vinculado
  const temUsuario = (membro) => {
    return membro.usuario_id && membro.usuario_sistema !== 'Sem usuário';
  };

  // Verificar se o membro está ativo (se tiver usuário e estiver ativo)
  const isAtivo = (membro) => {
    // Por enquanto, consideramos que se tem usuário, está ativo
    // Isso pode ser expandido com o status do usuário
    return temUsuario(membro);
  };

  return (
    <Layout>
      <div className="p-3 md:p-4 max-w-7xl mx-auto">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6">👤 Cadastro de Membros</h1>

        {mensagem && (
          <div className={`p-3 md:p-4 rounded-lg mb-4 md:mb-6 ${mensagemTipo === 'success' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>
            {mensagem}
            <button onClick={() => setMensagem('')} className="float-right text-gray-500 hover:text-gray-700">✕</button>
          </div>
        )}

        <div id="form-membro" className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-4 md:mb-6">
          <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-4">
            {editando ? '✏️ Editar Membro' : '➕ Novo Membro'}
          </h2>

          {editando && (
            <div className="bg-blue-50 p-3 rounded-lg mb-4 border-l-4 border-blue-500">
              <p className="text-blue-700 text-sm">📝 Editando: <strong>{form.nome}</strong></p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  name="nome"
                  value={form.nome}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Digite o nome completo"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
                <input
                  type="text"
                  name="celular"
                  value={form.celular}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="email@exemplo.com"
                />
                <p className="text-xs text-gray-400 mt-1">Se não existir, será criado um usuário automaticamente</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
                <input
                  type="date"
                  name="data_nascimento"
                  value={form.data_nascimento}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Habilidades (selecione todas que se aplicam)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {habilidades.map((hab) => (
                  <label
                    key={hab.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition ${
                      form.habilidades.includes(hab.id)
                        ? 'bg-indigo-50 border-indigo-500'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.habilidades.includes(hab.id)}
                      onChange={() => handleHabilidadeChange(hab.id)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm">{hab.nome}</span>
                  </label>
                ))}
              </div>
              {editando && (
                <p className="text-xs text-gray-400 mt-2">💡 Habilidades marcadas: {form.habilidades.length}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              <button
                type="submit"
                disabled={salvando}
                className="btn-primary px-6 py-2 text-sm md:text-base"
              >
                {salvando ? 'Salvando...' : editando ? '💾 Atualizar Membro' : '➕ Cadastrar Membro'}
              </button>
              {editando && (
                <button
                  type="button"
                  onClick={cancelarEdicao}
                  className="btn-warning px-6 py-2 text-sm md:text-base"
                >
                  ❌ Cancelar Edição
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Lista de Membros */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-3 md:p-4 border-b flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-base md:text-lg font-semibold text-gray-800">📋 Membros Cadastrados</h2>
            <span className="text-sm text-gray-500">Total: <strong>{membros.length}</strong></span>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-gray-500">Carregando membros...</div>
            </div>
          ) : membros.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-5xl mb-4">👤</div>
              <p>Nenhum membro cadastrado ainda.</p>
              <p className="text-sm text-gray-400 mt-1">Use o formulário acima para adicionar membros.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 md:px-4 py-2 text-left">Nome</th>
                    <th className="px-2 md:px-4 py-2 text-left hidden sm:table-cell">Celular</th>
                    <th className="px-2 md:px-4 py-2 text-left hidden md:table-cell">Email</th>
                    <th className="px-2 md:px-4 py-2 text-left">Habilidades</th>
                    <th className="px-2 md:px-4 py-2 text-left hidden lg:table-cell">Usuário</th>
                    <th className="px-2 md:px-4 py-2 text-center min-w-[180px]">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {membros.map((membro) => (
                    <tr key={membro.id} className="hover:bg-gray-50">
                      <td className="px-2 md:px-4 py-2 font-medium text-gray-900">{membro.nome}</td>
                      <td className="px-2 md:px-4 py-2 text-gray-600 hidden sm:table-cell">{membro.celular || '--'}</td>
                      <td className="px-2 md:px-4 py-2 text-gray-600 hidden md:table-cell">{membro.email || '--'}</td>
                      <td className="px-2 md:px-4 py-2">
                        {membro.habilidades ? (
                          <div className="flex flex-wrap gap-1">
                            {membro.habilidades.split(', ').map((hab, i) => (
                              <span key={i} className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">{hab}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Nenhuma</span>
                        )}
                      </td>
                      <td className="px-2 md:px-4 py-2 hidden lg:table-cell">
                        {membro.usuario_id ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            {membro.usuario_sistema || 'Usuário'}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">Sem usuário</span>
                        )}
                      </td>
                      <td className="px-2 md:px-4 py-2">
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {/* Editar - Admin e Coordenador */}
                          {(user?.nivel === 'admin' || user?.nivel === 'coordenador') && (
                            <button
                              onClick={() => handleEdit(membro.id)}
                              className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg transition"
                              title="Editar"
                            >
                              ✏️
                            </button>
                          )}
                          
                          {/* Ativar Conta - Admin apenas, e somente se não tiver usuário */}
                          {user?.nivel === 'admin' && !membro.usuario_id && (
                            <button
                              onClick={() => handleAtivarConta(membro.id, membro.nome, membro.email)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition"
                              title="Ativar Conta (criar usuário)"
                            >
                              ✅
                            </button>
                          )}
                          
                          {/* Bloquear - Admin apenas, e somente se tiver usuário */}
                          {user?.nivel === 'admin' && membro.usuario_id && (
                            <button
                              onClick={() => handleBloquearMembro(membro.id, membro.nome)}
                              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition"
                              title="Bloquear"
                            >
                              🔒
                            </button>
                          )}
                          
                          {/* Desbloquear - Admin apenas, e somente se tiver usuário (seria necessário verificar status) */}
                          {/* Por enquanto, apenas um botão de desbloquear genérico */}
                          {user?.nivel === 'admin' && membro.usuario_id && (
                            <button
                              onClick={() => handleDesbloquearMembro(membro.id, membro.nome)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Desbloquear"
                            >
                              🔓
                            </button>
                          )}
                          
                          {/* Excluir - Admin e Coordenador */}
                          {(user?.nivel === 'admin' || user?.nivel === 'coordenador') && (
                            <button
                              onClick={() => handleDelete(membro.id, membro.nome)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Excluir"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Legenda das ações */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 flex flex-wrap gap-4">
          <span>📌 <strong>Legenda das ações:</strong></span>
          <span>✏️ Editar</span>
          <span className="text-green-600">✅ Ativar Conta</span>
          <span className="text-orange-600">🔒 Bloquear</span>
          <span className="text-blue-600">🔓 Desbloquear</span>
          <span className="text-red-600">🗑️ Excluir</span>
        </div>
      </div>
    </Layout>
  );
}
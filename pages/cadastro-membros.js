// Dentro do componente CadastroMembros, a função handleSubmit

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
      // Editar - PUT
      console.log('📤 Editando membro ID:', form.id);
      console.log('📤 Dados enviados:', dados);
      
      response = await axios.put(`/api/membros/${form.id}`, dados);
      console.log('✅ Resposta:', response.data);
      
      setMensagem(response.data.message || 'Membro atualizado com sucesso!');
      setMensagemTipo('success');
    } else {
      // Novo - POST
      response = await axios.post('/api/membros', dados);
      setMensagem(response.data.message || 'Membro cadastrado com sucesso!');
      setMensagemTipo('success');
    }

    resetForm();
    await carregarDados();

  } catch (error) {
    console.error('❌ Erro ao salvar:', error);
    console.error('❌ Detalhes:', error.response?.data);
    
    const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Erro ao salvar membro';
    setMensagem(errorMsg);
    setMensagemTipo('error');
  } finally {
    setSalvando(false);
  }
};
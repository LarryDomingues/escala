// Dentro do componente CriarEscala

const handleSalvar = async (e) => {
  e.preventDefault();
  setSalvando(true);
  setMensagem('');
  setMensagemTipo('');

  try {
    const formData = new FormData(e.target);
    const escalaData = {};

    // Log para debug - ver o que está sendo enviado
    console.log('📝 Dados do formulário:');
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}: ${value}`);
    }

    // Coletar dados do formulário
    for (const dia of diasEscala) {
      const data = dia.data;
      escalaData[data] = {};
      
      // Mapear campos do formulário
      for (const [campo] of Object.entries(CAMPOS_HABILIDADES)) {
        const value = formData.get(`${data}_${campo}`);
        // Converter string vazia para null
        escalaData[data][campo] = value && value !== '' ? value : null;
      }
    }

    console.log('📤 Dados a serem enviados:', escalaData);

    // Salvar cada dia
    let erros = [];
    let salvos = 0;
    
    for (const [data, membrosEscala] of Object.entries(escalaData)) {
      try {
        const payload = {
          data,
          escala: membrosEscala,
        };
        
        console.log(`📤 Enviando para ${data}:`, payload);
        
        const response = await axios.post('/api/escala/salvar', payload);
        console.log(`✅ Resposta para ${data}:`, response.data);
        salvos++;
      } catch (error) {
        console.error(`❌ Erro ao salvar dia ${data}:`, error);
        console.error('Detalhes:', error.response?.data);
        erros.push(`Dia ${format(parseISO(data), 'dd/MM/yyyy')}: ${error.response?.data?.error || error.message}`);
      }
    }

    if (erros.length > 0) {
      setMensagem(`${salvos} dia(s) salvos. ${erros.length} erro(s): ${erros.join('; ')}`);
      setMensagemTipo('error');
    } else {
      setMensagem(`✅ ${salvos} dia(s) salvos com sucesso!`);
      setMensagemTipo('success');
      await carregarDados();
    }

  } catch (error) {
    console.error('❌ Erro ao salvar escala:', error);
    setMensagem(error.response?.data?.error || 'Erro ao salvar escala');
    setMensagemTipo('error');
  } finally {
    setSalvando(false);
  }
};
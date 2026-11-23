import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import axios from 'axios';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function CriarEscala() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mesSelecionado, setMesSelecionado] = useState(format(new Date(), 'yyyy-MM'));
  const [escalas, setEscalas] = useState([]);
  const [membros, setMembros] = useState([]);
  const [membrosPorHabilidade, setMembrosPorHabilidade] = useState({});
  const [diasEscala, setDiasEscala] = useState([]);
  const [mensagem, setMensagem] = useState('');
  const [mensagemTipo, setMensagemTipo] = useState('');
  const [dataAvulsa, setDataAvulsa] = useState('');
  const [diasAvulsos, setDiasAvulsos] = useState([]);
  const [gerandoPDF, setGerandoPDF] = useState(false);

  const [valoresEscala, setValoresEscala] = useState({});
  const [escalasOriginais, setEscalasOriginais] = useState({});

  const HABILIDADES = ['Voz', 'Voz2', 'Violão', 'Guitarra', 'Baixo', 'Bateria', 'Teclado'];
  const CAMPOS_HABILIDADES = {
    voz_id: 'Voz',
    voz2_id: 'Voz2',
    violao_id: 'Violão',
    guitarra_id: 'Guitarra',
    baixo_id: 'Baixo',
    bateria_id: 'Bateria',
    teclado_id: 'Teclado'
  };

  const gerarDiasEscala = (ano, mes) => {
    const start = startOfMonth(new Date(ano, mes - 1));
    const end = endOfMonth(new Date(ano, mes - 1));
    const days = eachDayOfInterval({ start, end });
    return days
      .filter(day => {
        const diaSemana = format(day, 'EEEE', { locale: ptBR });
        return diaSemana === 'domingo' || diaSemana === 'quarta-feira';
      })
      .map(day => ({
        data: format(day, 'yyyy-MM-dd'),
        dia_semana: format(day, 'EEEE', { locale: ptBR }),
        isAvulsa: false,
      }));
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await axios.get('/api/auth/me');
      } catch (error) {
        router.push('/login');
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    carregarDados();
  }, [mesSelecionado]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [membrosRes, escalasRes] = await Promise.all([
        axios.get('/api/membros'),
        axios.get(`/api/escala/${mesSelecionado}`),
      ]);

      const membrosList = Array.isArray(membrosRes.data) ? membrosRes.data : (membrosRes.data.membros || []);
      setMembros(membrosList);

      let escalasSalvas = escalasRes.data.escalas || escalasRes.data || [];
      if (!Array.isArray(escalasSalvas) && typeof escalasSalvas === 'object') {
        escalasSalvas = Object.keys(escalasSalvas).map(key => ({
          data: key,
          ...escalasSalvas[key]
        }));
      }

      setEscalas(escalasSalvas);

      const [ano, mes] = mesSelecionado.split('-').map(Number);
      const diasRegulares = gerarDiasEscala(ano, mes);
      const diasAvulsosSalvos = await carregarDiasAvulsos(ano, mes);

      const todosDias = [...diasRegulares];
      diasAvulsosSalvos.forEach(diaAvulso => {
        if (!todosDias.some(d => d.data === diaAvulso.data)) todosDias.push(diaAvulso);
      });
      todosDias.sort((a, b) => a.data.localeCompare(b.data));

      setDiasEscala(todosDias);
      setDiasAvulsos(diasAvulsosSalvos);

      const valoresCarregados = {};
      const originaisCarregados = {};

      todosDias.forEach(d => {
        valoresCarregados[d.data] = {};
        Object.keys(CAMPOS_HABILIDADES).forEach(c => { valoresCarregados[d.data][c] = ''; });
      });

      escalasSalvas.forEach(esc => {
        let dataStr = esc.data;
        if (typeof dataStr === 'string' && dataStr.includes('T')) {
          dataStr = dataStr.split('T')[0];
        } else if (dataStr instanceof Date) {
          dataStr = format(dataStr, 'yyyy-MM-dd');
        }

        if (valoresCarregados[dataStr]) {
          Object.keys(CAMPOS_HABILIDADES).forEach(c => {
            const val = esc[c];
            valoresCarregados[dataStr][c] = (val !== null && val !== undefined) ? String(val) : '';
          });
          // Guarda o objeto COMPLETO do banco (inclui youtube_link, anotacoes, etc.)
          originaisCarregados[dataStr] = { ...esc }; 
        }
      });

      setEscalasOriginais(originaisCarregados);
      setValoresEscala(valoresCarregados);

      const membrosPorHab = {};
      HABILIDADES.forEach(hab => {
        membrosPorHab[hab] = membrosList.filter(membro =>
          membro.habilidades && membro.habilidades.includes(hab)
        );
      });
      setMembrosPorHabilidade(membrosPorHab);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setMensagem('Erro ao carregar dados');
      setMensagemTipo('error');
    } finally {
      setLoading(false);
    }
  };

  const carregarDiasAvulsos = async (ano, mes) => {
    try {
      const res = await axios.get(`/api/escala/avulsos?ano=${ano}&mes=${mes}`);
      const dados = Array.isArray(res.data) ? res.data : (res.data.avulsos || []);
      return dados.map(d => ({ ...d, isAvulsa: true }));
    } catch (error) {
      console.error('Erro ao carregar dias avulsos:', error);
      return [];
    }
  };

  const getEscalaData = (data) => {
    return escalas.find(e => {
      let dStr = e.data;
      if (typeof dStr === 'string' && dStr.includes('T')) dStr = dStr.split('T')[0];
      else if (dStr instanceof Date) dStr = format(dStr, 'yyyy-MM-dd');
      return dStr === data;
    });
  };

  const getMembroNome = (id) => {
    const membro = membros.find(m => String(m.id) === String(id));
    return membro ? membro.nome : '';
  };

  const handleSelectChange = (data, campo, value) => {
    setValoresEscala(prev => ({
      ...prev,
      [data]: {
        ...(prev[data] || {}),
        [campo]: value,
      },
    }));
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setMensagem('');
    setMensagemTipo('');

    try {
      const inclusoes = [];
      const alteracoes = [];

      for (const dia of diasEscala) {
        const original = escalasOriginais[dia.data] || {};
        const atual = valoresEscala[dia.data] || {};

        const camposAlterados = {};
        for (const campo of Object.keys(CAMPOS_HABILIDADES)) {
          const vOrig = String(original[campo] || '');
          const vAtual = String(atual[campo] || '');
          if (vOrig !== vAtual) {
            camposAlterados[campo] = vAtual !== '' ? vAtual : null;
          }
        }

        // Se nenhum membro foi alterado, não precisamos atualizar este dia
        if (Object.keys(camposAlterados).length === 0) continue;

        const tinhaEscala = Object.keys(CAMPOS_HABILIDADES).some(c => original[c]);
        const temAgora   = Object.keys(CAMPOS_HABILIDADES).some(c => atual[c]);

        if (!tinhaEscala && temAgora) {
          inclusoes.push({ data: dia.data, dia_semana: dia.dia_semana, membros: { ...atual } });
        } else {
          alteracoes.push({ data: dia.data, dia_semana: dia.dia_semana, antes: { ...original }, depois: { ...atual }, campos_alterados: camposAlterados });
        }

        // CRUCIAL: Preserva todos os dados originais (youtube_link, anotacoes, etc.)
        const escalaParaSalvar = { ...original };
        
        // Remove campos de controle para não mandar lixo para a API
        delete escalaParaSalvar.id;
        delete escalaParaSalvar.created_at;
        delete escalaParaSalvar.updated_at;
        delete escalaParaSalvar.data; 
        delete escalaParaSalvar.dia_semana;

        // Sobrescreve apenas os campos das habilidades
        Object.keys(CAMPOS_HABILIDADES).forEach(c => {
           escalaParaSalvar[c] = atual[c] !== '' ? atual[c] : null;
        });

        await axios.post('/api/escala/salvar', { data: dia.data, escala: escalaParaSalvar });
      }

      if (inclusoes.length > 0 || alteracoes.length > 0) {
        try {
          await axios.post('/api/escala/historico', {
            mes: mesSelecionado,
            inclusoes,
            alteracoes,
            timestamp: new Date().toISOString(),
          });
        } catch (histErr) {
          console.warn('Histórico não registrado:', histErr);
        }
      }

      const partes = [];
      if (inclusoes.length > 0) partes.push(`${inclusoes.length} inclusão(ões)`);
      if (alteracoes.length > 0) partes.push(`${alteracoes.length} alteração(ões)`);

      setMensagem(partes.length ? `Salvo! ${partes.join(' e ')} registrada(s).` : 'Nenhuma alteração nos membros para salvar.');
      setMensagemTipo('success');

      await carregarDados();
    } catch (error) {
      console.error('Erro ao salvar escala:', error);
      setMensagem(error.response?.data?.error || 'Erro ao salvar escala');
      setMensagemTipo('error');
    } finally {
      setSalvando(false);
    }
  };

  const handleAdicionarDataAvulsa = async () => {
    if (!dataAvulsa) {
      setMensagem('Selecione uma data'); setMensagemTipo('error'); return;
    }
    if (diasEscala.some(d => d.data === dataAvulsa)) {
      setMensagem('Esta data já está na escala'); setMensagemTipo('error'); return;
    }

    try {
      const [anoSelecionado, mesSelecionadoNum] = mesSelecionado.split('-').map(Number);
      const [anoAvulso, mesAvulso] = dataAvulsa.split('-').map(Number);
      if (anoAvulso !== anoSelecionado || mesAvulso !== mesSelecionadoNum) {
        setMensagem('A data deve ser do mês selecionado'); setMensagemTipo('error'); return;
      }

      const diaSemana = format(parseISO(dataAvulsa), 'EEEE', { locale: ptBR });
      const novoDia = { data: dataAvulsa, dia_semana: diaSemana, isAvulsa: true };

      setDiasEscala([...diasEscala, novoDia].sort((a, b) => a.data.localeCompare(b.data)));
      setDiasAvulsos([...diasAvulsos, novoDia]);

      const valoresVazios = Object.fromEntries(Object.keys(CAMPOS_HABILIDADES).map(c => [c, '']));
      setValoresEscala(prev => ({ ...prev, [dataAvulsa]: valoresVazios }));
      setEscalasOriginais(prev => ({ ...prev, [dataAvulsa]: {} }));

      setDataAvulsa('');

      await axios.post('/api/escala/avulsos', {
        data: dataAvulsa, mes: mesSelecionado, dia_semana: diaSemana,
      });

      setMensagem('Data avulsa adicionada com sucesso!'); setMensagemTipo('success');
    } catch (error) {
      console.error('Erro ao adicionar data avulsa:', error);
      setMensagem(error.response?.data?.error || 'Erro ao adicionar data avulsa'); setMensagemTipo('error');
    }
  };

  const handleRemoverDataAvulsa = async (data) => {
    if (!confirm(`Remover a data avulsa ${format(parseISO(data), 'dd/MM/yyyy')}?`)) return;
    try {
      await axios.delete(`/api/escala/avulsos?data=${data}`);
      setDiasEscala(diasEscala.filter(d => d.data !== data));
      setDiasAvulsos(diasAvulsos.filter(d => d.data !== data));
      
      setValoresEscala(prev => { const n = { ...prev }; delete n[data]; return n; });
      setEscalasOriginais(prev => { const n = { ...prev }; delete n[data]; return n; });

      setMensagem('Data avulsa removida com sucesso!'); setMensagemTipo('success');
    } catch (error) {
      console.error('Erro ao remover data avulsa:', error);
      setMensagem(error.response?.data?.error || 'Erro ao remover data avulsa'); setMensagemTipo('error');
    }
  };

  const handleGerarPDF = async () => {
    setGerandoPDF(true);
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      
      let logoLoaded = false;
      let logoY = 15; 
      
      try {
        const imageUrl = '/logo.png'; 
        const getImageBase64 = (url) => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width; canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => reject(new Error('Erro ao carregar imagem'));
            img.src = url;
          });
        };
        
        const imgBase64 = await getImageBase64(imageUrl);
        const logoWidth = 120; const logoHeight = 30; const xPos = (pageWidth - logoWidth) / 2; 
        
        doc.addImage(imgBase64, 'PNG', xPos, 10, logoWidth, logoHeight);
        logoLoaded = true;
        logoY = 45; 
      } catch (error) {
        console.warn('Erro ao carregar logo:', error);
        doc.setFontSize(20); doc.setTextColor('#000000');
        doc.text('MINISTÉRIO DE LOUVOR', pageWidth / 2, 25, { align: 'center' });
        logoY = 35;
      }
      
      const mesNome = format(parseISO(`${mesSelecionado}-01`), 'MMMM', { locale: ptBR });
      const anoNome = format(parseISO(`${mesSelecionado}-01`), 'yyyy');
      const mesAno = `${mesNome.charAt(0).toUpperCase() + mesNome.slice(1)} / ${anoNome}`;
      
      const mesY = logoLoaded ? 48 : 33;
      doc.setFontSize(14); doc.setTextColor('#000000');
      doc.text(mesAno, pageWidth / 2, mesY, { align: 'center' });
      
      const lineY = logoLoaded ? 53 : 38;
      doc.setDrawColor('#000000'); doc.setLineWidth(0.5);
      doc.line(20, lineY, pageWidth - 20, lineY);
      
      const tableData = [];
      let temDados = false;
      
      diasEscala.forEach((dia) => {
        const escalaData = getEscalaData(dia.data);
        
        let temMembro = false;
        if (escalaData) {
          for (const campo of Object.keys(CAMPOS_HABILIDADES)) {
            if (escalaData[campo]) { temMembro = true; break; }
          }
        }
        
        if (temMembro) {
          temDados = true;
          const dataFormatada = format(parseISO(dia.data), 'dd/MM/yyyy');
          const diaSemana = dia.dia_semana.charAt(0).toUpperCase() + dia.dia_semana.slice(1);
          
          const row = [dataFormatada, diaSemana];
          
          Object.entries(CAMPOS_HABILIDADES).forEach(([campo]) => {
            const membroId = escalaData ? escalaData[campo] : null;
            const nome = membroId ? getMembroNome(membroId) : '--';
            row.push(nome);
          });
          
          tableData.push(row);
        }
      });
      
      if (!temDados) {
        tableData.push(['Nenhum membro escalado para este mês']);
      }
      
      const headers = ['Data', 'Dia', ...Object.values(CAMPOS_HABILIDADES)];
      const startY = logoLoaded ? 60 : 45;
      
      autoTable(doc, {
        head: [headers], body: tableData, startY: startY, theme: 'grid',
        headStyles: { fillColor: '#0e0e0e', textColor: '#FFFFFF', fontSize: 9, fontStyle: 'bold', halign: 'center', valign: 'middle', lineWidth: 0.5, lineColor: '#1F2937' },
        bodyStyles: { fontSize: 9, halign: 'center', valign: 'middle', lineWidth: 0.5, lineColor: '#D1D5DB', textColor: '#050505' },
        alternateRowStyles: { fillColor: '#F9FAFB' },
        columnStyles: { 0: { cellWidth: 28, fontStyle: 'bold' }, 1: { cellWidth: 32, textColor: '#050505', fontStyle: 'bold' } },
        margin: { left: 15, right: 15 }, tableWidth: 'auto', styles: { overflow: 'linebreak', cellPadding: 2 },
        didDrawPage: function(data) {
          const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
          doc.setFontSize(8); doc.setTextColor('#9CA3AF');
          doc.text(`Escala gerada em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, doc.internal.pageSize.getWidth() / 2, pageHeight - 10, { align: 'center' });
        }
      });
      
      doc.save(`Escala_Louvor_${mesAno.replace('/', '_')}.pdf`);
      setMensagem('PDF gerado com sucesso!'); setMensagemTipo('success');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setMensagem('Erro ao gerar PDF: ' + error.message); setMensagemTipo('error');
    } finally {
      setGerandoPDF(false);
    }
  };

  const getMembrosByHabilidade = (habilidade) => membrosPorHabilidade[habilidade] || [];
  const isDataAvulsa = (data) => diasAvulsos.some(d => d.data === data);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          <div className="text-gray-500 dark:text-gray-400">Carregando...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Adicionado bg-gray-50 dark:bg-gray-900 e min-h-screen para garantir o fundo escuro */}
      <div className="p-3 md:p-4 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 md:mb-6">📝 Criar Escala</h1>

        {mensagem && (
          <div className={`p-3 md:p-4 rounded-lg mb-4 md:mb-6 border ${mensagemTipo === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'}`}>
            {mensagem}
            <button onClick={() => setMensagem('')} className="float-right text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">✕</button>
          </div>
        )}

        {/* Instruções */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 md:p-4 rounded-lg mb-4 md:mb-6 border-l-4 border-blue-500 dark:border-blue-400">
          <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">📌 Instruções:</p>
          <p className="text-blue-600 dark:text-blue-400 text-xs md:text-sm">Selecione um mês para preencher a escala. Os dias disponíveis são <strong>quartas-feiras</strong> e <strong>domingos</strong>.</p>
          <p className="text-blue-600 dark:text-blue-400 text-xs md:text-sm mt-1">💡 <strong>Data Avulsa:</strong> Você pode adicionar datas extras no mês (ex: eventos especiais, ensaios, etc.)</p>
        </div>

        {/* Filtro de Mês */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-4 md:mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">📅 Selecione o Mês</label>
              <input type="month" value={mesSelecionado} onChange={(e) => setMesSelecionado(e.target.value)} className="input-field" />
            </div>
            <button type="button" onClick={() => carregarDados()} className="btn-primary">
              Carregar Dias
            </button>
          </div>
        </div>

        {/* Adicionar Data Avulsa */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-4 md:mb-6 border-2 border-dashed border-indigo-300 dark:border-indigo-700">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">➕ Data Avulsa</label>
              <input type="date" value={dataAvulsa} onChange={(e) => setDataAvulsa(e.target.value)} min={`${mesSelecionado}-01`} max={`${mesSelecionado}-${format(endOfMonth(new Date(mesSelecionado + '-01')), 'dd')}`} className="input-field" />
            </div>
            <button type="button" onClick={handleAdicionarDataAvulsa} className="btn-success">
              ➕ Adicionar
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">💡 Adicione datas extras (ex: ensaios, eventos especiais, cultos extras)</p>
        </div>

        {diasEscala.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Nenhum dia de escala encontrado</h3>
            <p className="text-gray-500 dark:text-gray-400">Os dias de escala são apenas <strong>quartas-feiras</strong> e <strong>domingos</strong>.</p>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Use a opção <strong>"Data Avulsa"</strong> acima para adicionar dias extras.</p>
          </div>
        ) : (
          <form onSubmit={handleSalvar} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead className="bg-indigo-600 dark:bg-indigo-800 text-white">
                  <tr>
                    <th className="px-2 md:px-3 py-2 text-center">Data</th>
                    <th className="px-2 md:px-3 py-2 text-center hidden sm:table-cell">Dia</th>
                    <th className="px-2 md:px-3 py-2 text-center hidden sm:table-cell">Tipo</th>
                    <th className="px-2 md:px-3 py-2 text-center">Voz 1</th>
                    <th className="px-2 md:px-3 py-2 text-center">Voz 2</th>
                    <th className="px-2 md:px-3 py-2 text-center hidden md:table-cell">Violão</th>
                    <th className="px-2 md:px-3 py-2 text-center hidden lg:table-cell">Guitarra</th>
                    <th className="px-2 md:px-3 py-2 text-center hidden xl:table-cell">Baixo</th>
                    <th className="px-2 md:px-3 py-2 text-center hidden xl:table-cell">Bateria</th>
                    <th className="px-2 md:px-3 py-2 text-center hidden 2xl:table-cell">Teclado</th>
                    <th className="px-2 md:px-3 py-2 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {diasEscala.map((dia) => {
                    const avulsa = isDataAvulsa(dia.data);
                    const originalData = escalasOriginais[dia.data];
                    const temSalvo = originalData && Object.keys(originalData).length > 0;
                    
                    return (
                      <tr key={dia.data} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${avulsa ? 'bg-purple-50 dark:bg-purple-900/20' : ''}`}>
                        <td className="px-2 md:px-3 py-2 text-center font-medium whitespace-nowrap text-gray-800 dark:text-gray-200">
                          {format(parseISO(dia.data), 'dd/MM/yyyy')}
                          {temSalvo && (
                            <span className="ml-1 md:ml-2 inline-block px-1.5 py-0.5 bg-green-500 dark:bg-green-600 text-white text-xs rounded-full">✓</span>
                          )}
                        </td>
                        <td className="px-2 md:px-3 py-2 text-center text-indigo-600 dark:text-indigo-400 font-medium hidden sm:table-cell whitespace-nowrap">
                          {dia.dia_semana}
                        </td>
                        <td className="px-2 md:px-3 py-2 text-center hidden sm:table-cell">
                          {avulsa
                            ? <span className="inline-block px-2 py-0.5 bg-purple-500 dark:bg-purple-600 text-white text-xs rounded-full">Avulsa</span>
                            : <span className="inline-block px-2 py-0.5 bg-gray-400 dark:bg-gray-600 text-white text-xs rounded-full">Regular</span>}
                        </td>

                        {Object.entries(CAMPOS_HABILIDADES).map(([campo, habilidade]) => {
                          const membrosHab = getMembrosByHabilidade(habilidade);
                          const valorAtual = valoresEscala[dia.data]?.[campo] ? String(valoresEscala[dia.data][campo]) : '';
                          return (
                            <td key={campo} className="px-1 md:px-2 py-2 min-w-[100px]">
                              <select
                                name={`${dia.data}_${campo}`}
                                value={valorAtual}
                                onChange={(e) => handleSelectChange(dia.data, campo, e.target.value)}
                                className="w-full px-1 md:px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs md:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              >
                                <option value="">--</option>
                                {membrosHab.map((membro) => (
                                  <option key={membro.id} value={String(membro.id)}>{membro.nome}</option>
                                ))}
                              </select>
                              {membrosHab.length === 0 && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">⚠️ Nenhum membro</p>
                              )}
                            </td>
                          );
                        })}

                        <td className="px-2 md:px-3 py-2 text-center">
                          {avulsa && (
                            <button type="button" onClick={() => handleRemoverDataAvulsa(dia.data)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm" title="Remover data avulsa">🗑️</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 md:p-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 justify-center">
              <button type="submit" disabled={salvando} className="btn-success px-6 py-2 text-sm md:text-base">
                {salvando ? 'Salvando...' : '💾 Salvar Escala'}
              </button>
              <button type="button" onClick={handleGerarPDF} disabled={gerandoPDF} className="btn-purple px-6 py-2 text-sm md:text-base">
                {gerandoPDF ? 'Gerando PDF...' : '📋 Escala Grupo'}
              </button>
            </div>
          </form>
        )}
      </div>

      <style jsx global>{`
        .btn-purple { background: linear-gradient(135deg, #7C3AED, #6D28D9); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; padding: 8px 20px; }
        .btn-purple:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4); }
        .btn-purple:disabled { opacity: 0.6; cursor: not-allowed; }
        
        .input-field { width: 100%; padding: 8px 12px; border: 1px solid #D1D5DB; border-radius: 8px; font-size: 14px; transition: all 0.2s; background: white; color: #111827; }
        .input-field:focus { outline: none; border-color: #4F46E5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
        
        .btn-primary { background: linear-gradient(135deg, #4F46E5, #4338CA); color: white; border: none; border-radius: 8px; font-weight: 600; padding: 8px 20px; cursor: pointer; transition: all 0.2s; }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4); }
        
        .btn-success { background: linear-gradient(135deg, #10B981, #059669); color: white; border: none; border-radius: 8px; font-weight: 600; padding: 8px 20px; cursor: pointer; transition: all 0.2s; }
        .btn-success:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); }
        .btn-success:disabled { opacity: 0.6; cursor: not-allowed; }

        :global(.dark) .input-field {
          background: #374151; 
          border-color: #4B5563; 
          color: #F3F4F6; 
        }
        :global(.dark) .input-field:focus {
          border-color: #818CF8; 
          box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.2);
        }

        @media print {
          body, html { background: white !important; color: black !important; }
          body * { visibility: hidden; }
          .main-content, .main-content * { visibility: visible; }
          .main-content { position: absolute; left: 0; top: 0; width: 100%; padding: 20px !important; }
          .sidebar, .mobile-header, .menu-toggle-btn, .no-print { display: none !important; }
          table { width: 100% !important; font-size: 11px !important; }
          th { background: #333 !important; color: white !important; }
          select { border: none !important; background: transparent !important; -webkit-appearance: none !important; appearance: none !important; color: black !important; }
          .bg-indigo-600 { background: #333 !important; }
          .bg-purple-50 { background: #f9f5ff !important; }
          :global(.dark) .bg-white { background: white !important; }
          :global(.dark) .text-gray-800 { color: #1F2937 !important; }
        }
      `}</style>
    </Layout>
  );
}
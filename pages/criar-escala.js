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
      
      setMembros(membrosRes.data);
      setEscalas(escalasRes.data.escalas || []);

      const [ano, mes] = mesSelecionado.split('-').map(Number);
      const diasRegulares = gerarDiasEscala(ano, mes);
      
      const diasAvulsosSalvos = await carregarDiasAvulsos(ano, mes);
      
      const todosDias = [...diasRegulares];
      
      diasAvulsosSalvos.forEach(diaAvulso => {
        if (!todosDias.some(d => d.data === diaAvulso.data)) {
          todosDias.push(diaAvulso);
        }
      });
      
      todosDias.sort((a, b) => a.data.localeCompare(b.data));
      
      setDiasEscala(todosDias);
      setDiasAvulsos(diasAvulsosSalvos);

      const membrosPorHab = {};
      HABILIDADES.forEach(hab => {
        membrosPorHab[hab] = membrosRes.data.filter(membro => 
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
      return res.data.map(d => ({
        ...d,
        isAvulsa: true,
      }));
    } catch (error) {
      console.error('Erro ao carregar dias avulsos:', error);
      return [];
    }
  };

  const getEscalaData = (data) => {
    return escalas.find(e => e.data === data);
  };

  const getMembroNome = (id) => {
    const membro = membros.find(m => m.id === id);
    return membro ? membro.nome : '';
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setMensagem('');
    setMensagemTipo('');

    try {
      const formData = new FormData(e.target);
      const escalaData = {};

      for (const dia of diasEscala) {
        const data = dia.data;
        escalaData[data] = {};
        for (const [campo] of Object.entries(CAMPOS_HABILIDADES)) {
          const value = formData.get(`${data}_${campo}`);
          escalaData[data][campo] = value || null;
        }
      }

      let erros = [];
      for (const [data, membrosEscala] of Object.entries(escalaData)) {
        try {
          await axios.post('/api/escala/salvar', { data, escala: membrosEscala });
        } catch (error) {
          erros.push(`Dia ${data}: ${error.response?.data?.error || error.message}`);
        }
      }

      if (erros.length > 0) {
        setMensagem(`Erro em: ${erros.join('; ')}`);
        setMensagemTipo('error');
      } else {
        setMensagem('Escala salva com sucesso!');
        setMensagemTipo('success');
        await carregarDados();
      }
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
      setMensagem('Selecione uma data');
      setMensagemTipo('error');
      return;
    }

    if (diasEscala.some(d => d.data === dataAvulsa)) {
      setMensagem('Esta data já está na escala');
      setMensagemTipo('error');
      return;
    }

    try {
      const [anoSelecionado, mesSelecionadoNum] = mesSelecionado.split('-').map(Number);
      const [anoAvulso, mesAvulso] = dataAvulsa.split('-').map(Number);
      
      if (anoAvulso !== anoSelecionado || mesAvulso !== mesSelecionadoNum) {
        setMensagem('A data deve ser do mês selecionado');
        setMensagemTipo('error');
        return;
      }

      const diaSemana = format(parseISO(dataAvulsa), 'EEEE', { locale: ptBR });
      
      const novoDia = {
        data: dataAvulsa,
        dia_semana: diaSemana,
        isAvulsa: true,
      };
      
      setDiasEscala([...diasEscala, novoDia].sort((a, b) => a.data.localeCompare(b.data)));
      setDiasAvulsos([...diasAvulsos, novoDia]);
      setDataAvulsa('');
      
      await axios.post('/api/escala/avulsos', {
        data: dataAvulsa,
        mes: mesSelecionado,
        dia_semana: diaSemana,
      });
      
      setMensagem('Data avulsa adicionada com sucesso!');
      setMensagemTipo('success');
    } catch (error) {
      console.error('Erro ao adicionar data avulsa:', error);
      setMensagem(error.response?.data?.error || 'Erro ao adicionar data avulsa');
      setMensagemTipo('error');
    }
  };

  const handleRemoverDataAvulsa = async (data) => {
    if (!confirm(`Tem certeza que deseja remover a data avulsa ${format(parseISO(data), 'dd/MM/yyyy')}?`)) return;

    try {
      await axios.delete(`/api/escala/avulsos?data=${data}`);
      
      setDiasEscala(diasEscala.filter(d => d.data !== data));
      setDiasAvulsos(diasAvulsos.filter(d => d.data !== data));
      
      setMensagem('Data avulsa removida com sucesso!');
      setMensagemTipo('success');
    } catch (error) {
      console.error('Erro ao remover data avulsa:', error);
      setMensagem(error.response?.data?.error || 'Erro ao remover data avulsa');
      setMensagemTipo('error');
    }
  };

  const handleGerarPDF = async () => {  // Adicione 'async' aqui
  setGerandoPDF(true);

  try {
    // Criar documento em paisagem
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // ====== CARREGAR E INSERIR A LOGO ======
    let logoLoaded = false;
    let logoY = 15; // Posição Y padrão
    
    try {
      // Carregar a imagem da pasta public
      const imageUrl = '/logo.png'; // Caminho da imagem na pasta public
      
      // Função para converter imagem para base64
      const getImageBase64 = (url) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          };
          img.onerror = () => reject(new Error('Erro ao carregar imagem'));
          img.src = url;
        });
      };
      
      const imgBase64 = await getImageBase64(imageUrl);
      
      // Definir tamanho da logo (ajuste conforme necessário)
      const logoWidth = 120; // Largura em mm
      const logoHeight = 30; // Altura em mm
      const xPos = (pageWidth - logoWidth) / 2; // Centralizar
      
      // Adicionar a logo ao PDF
      doc.addImage(imgBase64, 'PNG', xPos, 10, logoWidth, logoHeight);
      
      logoLoaded = true;
      logoY = 45; // Ajustar posição Y para os próximos elementos
      
      console.log('Logo carregada com sucesso!');
      
    } catch (error) {
      console.warn('Erro ao carregar logo:', error);
      // Se a logo não carregar, mostra um texto alternativo
      doc.setFontSize(20);
      doc.setTextColor('#000000');
      doc.text('MINISTÉRIO DE LOUVOR', pageWidth / 2, 25, { align: 'center' });
      logoY = 35;
    }
    
    // ====== MÊS/ANO ======
    const mesNome = format(parseISO(`${mesSelecionado}-01`), 'MMMM', { locale: ptBR });
    const anoNome = format(parseISO(`${mesSelecionado}-01`), 'yyyy');
    const mesAno = `${mesNome.charAt(0).toUpperCase() + mesNome.slice(1)} / ${anoNome}`;
    
    // Posicionar o mês/ano abaixo da logo
    const mesY = logoLoaded ? 48 : 33;
    doc.setFontSize(14);
    doc.setTextColor('#000000');
    doc.text(mesAno, pageWidth / 2, mesY, { align: 'center' });
    
    // ====== LINHA SEPARADORA ======
    const lineY = logoLoaded ? 53 : 38;
    doc.setDrawColor('#000000');
    doc.setLineWidth(0.5);
    doc.line(20, lineY, pageWidth - 20, lineY);
    
    // ====== PREPARAR DADOS DA TABELA ======
    const tableData = [];
    let temDados = false;
    
    diasEscala.forEach((dia) => {
      const escalaData = getEscalaData(dia.data);
      
      let temMembro = false;
      if (escalaData) {
        for (const campo of Object.keys(CAMPOS_HABILIDADES)) {
          if (escalaData[campo]) {
            temMembro = true;
            break;
          }
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
    
    // ====== CONFIGURAR CABEÇALHO ======
    const headers = ['Data', 'Dia', ...Object.values(CAMPOS_HABILIDADES)];
    
    // ====== CRIAR TABELA ======
    const startY = logoLoaded ? 60 : 45;
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: startY,
      theme: 'grid',
      headStyles: {
        fillColor: '#0e0e0e',
        textColor: '#FFFFFF',
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        lineWidth: 0.5,
        lineColor: '#1F2937',
      },
      bodyStyles: {
        fontSize: 9,
        halign: 'center',
        valign: 'middle',
        lineWidth: 0.5,
        lineColor: '#D1D5DB',
        textColor: '#050505',
      },
      alternateRowStyles: {
        fillColor: '#F9FAFB',
      },
      columnStyles: {
        0: { cellWidth: 28, fontStyle: 'bold' },
        1: { cellWidth: 32, textColor: '#050505', fontStyle: 'bold' },
      },
      margin: { left: 15, right: 15 },
      tableWidth: 'auto',
      styles: {
        overflow: 'linebreak',
        cellPadding: 2,
      },
      didDrawPage: function(data) {
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        
        doc.setFontSize(8);
        doc.setTextColor('#9CA3AF');
        doc.text(
          `Escala gerada automaticamente em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
          doc.internal.pageSize.getWidth() / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
    });
    
    // ====== SALVAR PDF ======
    doc.save(`Escala_Louvor_${mesAno.replace('/', '_')}.pdf`);
    
    setMensagem('PDF gerado com sucesso!');
    setMensagemTipo('success');
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    setMensagem('Erro ao gerar PDF: ' + error.message);
    setMensagemTipo('error');
  } finally {
    setGerandoPDF(false);
  }
};

  const getMembrosByHabilidade = (habilidade) => {
    return membrosPorHabilidade[habilidade] || [];
  };

  const isDataAvulsa = (data) => {
    return diasAvulsos.some(d => d.data === data);
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
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6">📝 Criar Escala</h1>

        {mensagem && (
          <div className={`p-3 md:p-4 rounded-lg mb-4 md:mb-6 ${mensagemTipo === 'success' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>
            {mensagem}
            <button onClick={() => setMensagem('')} className="float-right text-gray-500 hover:text-gray-700">✕</button>
          </div>
        )}

        <div className="bg-blue-50 p-3 md:p-4 rounded-lg mb-4 md:mb-6 border-l-4 border-blue-500">
          <p className="text-blue-700 text-sm font-medium">📌 Instruções:</p>
          <p className="text-blue-600 text-xs md:text-sm">Selecione um mês para preencher a escala. Os dias disponíveis são <strong>quartas-feiras</strong> e <strong>domingos</strong>.</p>
          <p className="text-blue-600 text-xs md:text-sm mt-1">💡 <strong>Data Avulsa:</strong> Você pode adicionar datas extras no mês (ex: eventos especiais, ensaios, etc.)</p>
        </div>

        {/* Filtro de Mês */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 md:mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">📅 Selecione o Mês</label>
              <input
                type="month"
                value={mesSelecionado}
                onChange={(e) => setMesSelecionado(e.target.value)}
                className="input-field"
              />
            </div>
            <button onClick={() => carregarDados()} className="btn-primary">
              Carregar Dias
            </button>
          </div>
        </div>

        {/* Adicionar Data Avulsa */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 md:mb-6 border-2 border-dashed border-indigo-300">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">➕ Data Avulsa</label>
              <input
                type="date"
                value={dataAvulsa}
                onChange={(e) => setDataAvulsa(e.target.value)}
                min={`${mesSelecionado}-01`}
                max={`${mesSelecionado}-${format(endOfMonth(new Date(mesSelecionado + '-01')), 'dd')}`}
                className="input-field"
              />
            </div>
            <button onClick={handleAdicionarDataAvulsa} className="btn-success">
              ➕ Adicionar
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            💡 Adicione datas extras (ex: ensaios, eventos especiais, cultos extras)
          </p>
        </div>

        {diasEscala.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhum dia de escala encontrado</h3>
            <p className="text-gray-500">Os dias de escala são apenas <strong>quartas-feiras</strong> e <strong>domingos</strong>.</p>
            <p className="text-gray-500 mt-2">Use a opção <strong>"Data Avulsa"</strong> acima para adicionar dias extras.</p>
          </div>
        ) : (
          <form onSubmit={handleSalvar} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead className="bg-indigo-600 text-white">
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
                <tbody className="divide-y divide-gray-200">
                  {diasEscala.map((dia) => {
                    const escalaData = getEscalaData(dia.data);
                    const avulsa = isDataAvulsa(dia.data);
                    return (
                      <tr key={dia.data} className={`hover:bg-gray-50 ${avulsa ? 'bg-purple-50' : ''}`}>
                        <td className="px-2 md:px-3 py-2 text-center font-medium whitespace-nowrap">
                          {format(parseISO(dia.data), 'dd/MM/yyyy')}
                          {escalaData && (
                            <span className="ml-1 md:ml-2 inline-block px-1.5 py-0.5 bg-green-500 text-white text-xs rounded-full">✓</span>
                          )}
                        </td>
                        <td className="px-2 md:px-3 py-2 text-center text-indigo-600 font-medium hidden sm:table-cell whitespace-nowrap">
                          {dia.dia_semana}
                        </td>
                        <td className="px-2 md:px-3 py-2 text-center hidden sm:table-cell">
                          {avulsa ? (
                            <span className="inline-block px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">Avulsa</span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 bg-gray-400 text-white text-xs rounded-full">Regular</span>
                          )}
                        </td>
                        {Object.entries(CAMPOS_HABILIDADES).map(([campo, habilidade]) => {
                          const membrosHab = getMembrosByHabilidade(habilidade);
                          const valorAtual = escalaData ? escalaData[campo] : null;
                          return (
                            <td key={campo} className="px-1 md:px-2 py-2 min-w-[100px]">
                              <select
                                name={`${dia.data}_${campo}`}
                                className="w-full px-1 md:px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs md:text-sm bg-white"
                                defaultValue={valorAtual || ''}
                              >
                                <option value="">--</option>
                                {membrosHab.map((membro) => (
                                  <option key={membro.id} value={membro.id}>
                                    {membro.nome}
                                  </option>
                                ))}
                              </select>
                              {membrosHab.length === 0 && (
                                <p className="text-xs text-gray-400 mt-1">⚠️ Nenhum membro</p>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-2 md:px-3 py-2 text-center">
                          {avulsa && (
                            <button
                              type="button"
                              onClick={() => handleRemoverDataAvulsa(dia.data)}
                              className="text-red-500 hover:text-red-700 text-sm"
                              title="Remover data avulsa"
                            >
                              🗑️
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 md:p-4 border-t flex flex-wrap gap-3 justify-center">
              <button
                type="submit"
                disabled={salvando}
                className="btn-success px-6 py-2 text-sm md:text-base"
              >
                {salvando ? 'Salvando...' : '💾 Salvar Escala'}
              </button>
              <button
                type="button"
                onClick={handleGerarPDF}
                disabled={gerandoPDF}
                className="btn-purple px-6 py-2 text-sm md:text-base"
              >
                {gerandoPDF ? 'Gerando PDF...' : '📋 Escala Grupo'}
              </button>
            </div>
          </form>
        )}
      </div>

      <style jsx global>{`
        .btn-purple {
          background: linear-gradient(135deg, #7C3AED, #6D28D9);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          padding: 8px 20px;
        }
        
        .btn-purple:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
        }
        
        .btn-purple:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .input-field {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #D1D5DB;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s;
          background: white;
        }
        
        .input-field:focus {
          outline: none;
          border-color: #4F46E5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #4F46E5, #4338CA);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          padding: 8px 20px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
        }
        
        .btn-success {
          background: linear-gradient(135deg, #10B981, #059669);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          padding: 8px 20px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-success:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }
        
        .btn-success:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        @media print {
          body * { visibility: hidden; }
          .main-content, .main-content * { visibility: visible; }
          .main-content { position: absolute; left: 0; top: 0; width: 100%; padding: 20px !important; }
          .sidebar, .mobile-header, .menu-toggle-btn, .no-print { display: none !important; }
          table { width: 100% !important; font-size: 11px !important; }
          th { background: #333 !important; color: white !important; }
          select { border: none !important; background: transparent !important; -webkit-appearance: none !important; appearance: none !important; }
          .bg-indigo-600 { background: #333 !important; }
          .bg-purple-50 { background: #f9f5ff !important; }
        }
      `}</style>
    </Layout>
  );
}
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import axios from 'axios';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
      
      // Carregar dias avulsos salvos
      const diasAvulsosSalvos = await carregarDiasAvulsos(ano, mes);
      
      // Combinar dias regulares e avulsos
      const todosDias = [...diasRegulares];
      
      // Adicionar dias avulsos que não estão na lista regular
      diasAvulsosSalvos.forEach(diaAvulso => {
        if (!todosDias.some(d => d.data === diaAvulso.data)) {
          todosDias.push(diaAvulso);
        }
      });
      
      // Ordenar por data
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

    // Verificar se a data já existe na lista
    if (diasEscala.some(d => d.data === dataAvulsa)) {
      setMensagem('Esta data já está na escala');
      setMensagemTipo('error');
      return;
    }

    try {
      // Verificar se a data está no mês selecionado
      const [anoSelecionado, mesSelecionadoNum] = mesSelecionado.split('-').map(Number);
      const [anoAvulso, mesAvulso] = dataAvulsa.split('-').map(Number);
      
      if (anoAvulso !== anoSelecionado || mesAvulso !== mesSelecionadoNum) {
        setMensagem('A data deve ser do mês selecionado');
        setMensagemTipo('error');
        return;
      }

      const diaSemana = format(parseISO(dataAvulsa), 'EEEE', { locale: ptBR });
      
      // Adicionar à lista
      const novoDia = {
        data: dataAvulsa,
        dia_semana: diaSemana,
        isAvulsa: true,
      };
      
      setDiasEscala([...diasEscala, novoDia].sort((a, b) => a.data.localeCompare(b.data)));
      setDiasAvulsos([...diasAvulsos, novoDia]);
      setDataAvulsa('');
      
      // Salvar no banco como dia avulso
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
      
      // Remover da lista
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

  const handleImprimir = () => {
    window.print();
  };

  const getMembrosByHabilidade = (habilidade) => {
    return membrosPorHabilidade[habilidade] || [];
  };

  // Verificar se uma data é avulsa
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
                onClick={handleImprimir}
                className="btn-purple px-6 py-2 text-sm md:text-base"
              >
                📋 Escala Grupo
              </button>
            </div>
          </form>
        )}
      </div>

      <style jsx global>{`
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
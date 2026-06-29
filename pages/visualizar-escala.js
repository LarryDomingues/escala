import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function VisualizarEscala() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [escalas, setEscalas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesSelecionado, setMesSelecionado] = useState(format(new Date(), 'yyyy-MM'));
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get('/api/auth/me');
        setUser(res.data);
        await loadEscalas();
      } catch (error) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [mesSelecionado]);

  const loadEscalas = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/escala?mes=${mesSelecionado}`);
      const data = res.data;
      setEscalas(data);
      
      // Calcular estatísticas
      const total = data.length;
      const completos = data.filter(e => {
        const campos = ['voz_id', 'voz2_id', 'violao_id', 'guitarra_id', 'baixo_id', 'bateria_id', 'teclado_id'];
        return campos.filter(c => e[c]).length >= 5;
      }).length;
      
      const participantes = new Set();
      data.forEach(e => {
        ['voz_id', 'voz2_id', 'violao_id', 'guitarra_id', 'baixo_id', 'bateria_id', 'teclado_id'].forEach(c => {
          if (e[c]) participantes.add(e[c]);
        });
      });

      setStats({
        total,
        completos,
        participantes: participantes.size,
        media: total > 0 ? Math.round((completos / total) * 100) : 0,
      });
    } catch (error) {
      console.error('Erro ao carregar escalas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data) => {
    return format(parseISO(data), 'dd/MM/yyyy');
  };

  const getYouTubeLink = (link) => {
    if (!link) return null;
    const match = link.match(/(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (match) {
      return `https://www.youtube.com/watch?v=${match[1]}`;
    }
    return link;
  };

  const handleImprimir = () => {
    window.print();
  };

  return (
    <Layout>
      <div className="p-3 md:p-4 max-w-7xl mx-auto">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6">📅 Visualizar Escalas</h1>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 md:mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">📅 Selecione o Mês</label>
              <input type="month" value={mesSelecionado} onChange={(e) => setMesSelecionado(e.target.value)} className="input-field" />
            </div>
            <button onClick={loadEscalas} className="btn-primary">Visualizar</button>
            <button onClick={handleImprimir} className="btn-purple">🖨️ Imprimir</button>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm text-center">
              <div className="text-xl md:text-2xl font-bold text-indigo-600">{stats.total}</div>
              <div className="text-xs md:text-sm text-gray-500">Total de Eventos</div>
            </div>
            <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm text-center">
              <div className="text-xl md:text-2xl font-bold text-green-600">{stats.completos}</div>
              <div className="text-xs md:text-sm text-gray-500">Eventos Completos</div>
            </div>
            <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm text-center">
              <div className="text-xl md:text-2xl font-bold text-purple-600">{stats.participantes}</div>
              <div className="text-xs md:text-sm text-gray-500">Participantes Únicos</div>
            </div>
            <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm text-center">
              <div className="text-xl md:text-2xl font-bold text-orange-600">{stats.media}%</div>
              <div className="text-xs md:text-sm text-gray-500">Taxa de Preenchimento</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64"><div className="text-gray-500">Carregando...</div></div>
        ) : escalas.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhuma escala encontrada</h3>
            <p className="text-gray-500">Não há eventos de escala para este mês.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead className="bg-indigo-600 text-white">
                  <tr>
                    <th className="px-2 md:px-4 py-2 text-center">Data</th>
                    <th className="px-2 md:px-4 py-2 text-center hidden sm:table-cell">Dia</th>
                    <th className="px-2 md:px-4 py-2 text-center">Voz 1</th>
                    <th className="px-2 md:px-4 py-2 text-center">Voz 2</th>
                    <th className="px-2 md:px-4 py-2 text-center hidden md:table-cell">Violão</th>
                    <th className="px-2 md:px-4 py-2 text-center hidden lg:table-cell">Guitarra</th>
                    <th className="px-2 md:px-4 py-2 text-center hidden xl:table-cell">Baixo</th>
                    <th className="px-2 md:px-4 py-2 text-center hidden xl:table-cell">Bateria</th>
                    <th className="px-2 md:px-4 py-2 text-center hidden 2xl:table-cell">Teclado</th>
                    <th className="px-2 md:px-4 py-2 text-center">Vídeo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {escalas.map((e, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-2 md:px-4 py-2 text-center font-medium whitespace-nowrap">{formatarData(e.data)}</td>
                      <td className="px-2 md:px-4 py-2 text-center text-indigo-600 font-medium hidden sm:table-cell whitespace-nowrap">{e.dia_semana}</td>
                      <td className="px-2 md:px-4 py-2 text-center">{e.voz_nome || '--'}</td>
                      <td className="px-2 md:px-4 py-2 text-center">{e.voz2_nome || '--'}</td>
                      <td className="px-2 md:px-4 py-2 text-center hidden md:table-cell">{e.violao_nome || '--'}</td>
                      <td className="px-2 md:px-4 py-2 text-center hidden lg:table-cell">{e.guitarra_nome || '--'}</td>
                      <td className="px-2 md:px-4 py-2 text-center hidden xl:table-cell">{e.baixo_nome || '--'}</td>
                      <td className="px-2 md:px-4 py-2 text-center hidden xl:table-cell">{e.bateria_nome || '--'}</td>
                      <td className="px-2 md:px-4 py-2 text-center hidden 2xl:table-cell">{e.teclado_nome || '--'}</td>
                      <td className="px-2 md:px-4 py-2 text-center">
                        {e.link_youtube && (
                          <a href={getYouTubeLink(e.link_youtube)} target="_blank" rel="noopener noreferrer" className="inline-block px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs md:text-sm">▶️</a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
          .bg-indigo-600 { background: #333 !important; }
        }
      `}</style>
    </Layout>
  );
}
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [escalas, setEscalas] = useState([]);
  const [proximos, setProximos] = useState([]);
  const [totalMembros, setTotalMembros] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get('/api/auth/me');
        setUser(res.data);
        await loadData();
      } catch (error) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const loadData = async () => {
    try {
      const mesAtual = format(new Date(), 'yyyy-MM');
      const [escalasRes, membrosRes] = await Promise.all([
        axios.get(`/api/escala?mes=${mesAtual}`),
        axios.get('/api/membros'),
      ]);
      setEscalas(escalasRes.data);
      setTotalMembros(membrosRes.data.length);
      
      const hoje = format(new Date(), 'yyyy-MM-dd');
      const proximos = escalasRes.data.filter(e => e.data >= hoje);
      setProximos(proximos.slice(0, 7));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
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

  const eventosHoje = escalas.filter(e => e.data === format(new Date(), 'yyyy-MM-dd'));

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
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6">📊 Dashboard</h1>

        {/* Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm">
            <div className="text-xs md:text-sm text-gray-500">Eventos Hoje</div>
            <div className="text-xl md:text-2xl font-bold text-indigo-600">{eventosHoje.length}</div>
          </div>
          <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm">
            <div className="text-xs md:text-sm text-gray-500">Eventos no Mês</div>
            <div className="text-xl md:text-2xl font-bold text-indigo-600">{escalas.length}</div>
          </div>
          <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm">
            <div className="text-xs md:text-sm text-gray-500">Membros</div>
            <div className="text-xl md:text-2xl font-bold text-indigo-600">{totalMembros}</div>
          </div>
          <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm">
            <div className="text-xs md:text-sm text-gray-500">Próximos Eventos</div>
            <div className="text-xl md:text-2xl font-bold text-indigo-600">{proximos.length}</div>
          </div>
        </div>

        {/* Próximos Eventos */}
        {proximos.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-4 md:mb-6">
            <div className="p-3 md:p-4 border-b">
              <h2 className="text-base md:text-lg font-semibold">📅 Próximos Eventos</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 md:px-4 py-2 text-left">Data</th>
                    <th className="px-2 md:px-4 py-2 text-left hidden sm:table-cell">Dia</th>
                    <th className="px-2 md:px-4 py-2 text-left hidden md:table-cell">Voz</th>
                    <th className="px-2 md:px-4 py-2 text-left hidden md:table-cell">Violão</th>
                    <th className="px-2 md:px-4 py-2 text-left hidden lg:table-cell">Guitarra</th>
                    <th className="px-2 md:px-4 py-2 text-left hidden xl:table-cell">Baixo</th>
                    <th className="px-2 md:px-4 py-2 text-left hidden xl:table-cell">Bateria</th>
                    <th className="px-2 md:px-4 py-2 text-center">Vídeo</th>
                  </tr>
                </thead>
                <tbody>
                  {proximos.map((e, i) => (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      <td className="px-2 md:px-4 py-2 font-medium whitespace-nowrap">{formatarData(e.data)}</td>
                      <td className="px-2 md:px-4 py-2 text-indigo-600 hidden sm:table-cell whitespace-nowrap">{e.dia_semana}</td>
                      <td className="px-2 md:px-4 py-2 hidden md:table-cell">{e.voz_nome || '--'}</td>
                      <td className="px-2 md:px-4 py-2 hidden md:table-cell">{e.violao_nome || '--'}</td>
                      <td className="px-2 md:px-4 py-2 hidden lg:table-cell">{e.guitarra_nome || '--'}</td>
                      <td className="px-2 md:px-4 py-2 hidden xl:table-cell">{e.baixo_nome || '--'}</td>
                      <td className="px-2 md:px-4 py-2 hidden xl:table-cell">{e.bateria_nome || '--'}</td>
                      <td className="px-2 md:px-4 py-2 text-center">
                        {e.link_youtube && (
                          <a
                            href={getYouTubeLink(e.link_youtube)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs md:text-sm"
                          >
                            ▶️
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Escala do Mês */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-3 md:p-4 border-b flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-base md:text-lg font-semibold">
              📆 Escala do Mês {format(new Date(), 'MMMM/yyyy', { locale: ptBR })}
            </h2>
            <span className="text-xs md:text-sm text-gray-500">{escalas.length} eventos</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 md:px-4 py-2 text-left">Data</th>
                  <th className="px-2 md:px-4 py-2 text-left hidden sm:table-cell">Dia</th>
                  <th className="px-2 md:px-4 py-2 text-left hidden md:table-cell">Voz</th>
                  <th className="px-2 md:px-4 py-2 text-left hidden lg:table-cell">Voz2</th>
                  <th className="px-2 md:px-4 py-2 text-left hidden md:table-cell">Violão</th>
                  <th className="px-2 md:px-4 py-2 text-left hidden xl:table-cell">Guitarra</th>
                  <th className="px-2 md:px-4 py-2 text-left hidden xl:table-cell">Baixo</th>
                  <th className="px-2 md:px-4 py-2 text-left hidden xl:table-cell">Bateria</th>
                  <th className="px-2 md:px-4 py-2 text-left hidden 2xl:table-cell">Teclado</th>
                  <th className="px-2 md:px-4 py-2 text-center">Vídeo</th>
                </tr>
              </thead>
              <tbody>
                {escalas.map((e, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="px-2 md:px-4 py-2 font-medium whitespace-nowrap">{formatarData(e.data)}</td>
                    <td className="px-2 md:px-4 py-2 text-indigo-600 hidden sm:table-cell whitespace-nowrap">{e.dia_semana}</td>
                    <td className="px-2 md:px-4 py-2 hidden md:table-cell">{e.voz_nome || '--'}</td>
                    <td className="px-2 md:px-4 py-2 hidden lg:table-cell">{e.voz2_nome || '--'}</td>
                    <td className="px-2 md:px-4 py-2 hidden md:table-cell">{e.violao_nome || '--'}</td>
                    <td className="px-2 md:px-4 py-2 hidden xl:table-cell">{e.guitarra_nome || '--'}</td>
                    <td className="px-2 md:px-4 py-2 hidden xl:table-cell">{e.baixo_nome || '--'}</td>
                    <td className="px-2 md:px-4 py-2 hidden xl:table-cell">{e.bateria_nome || '--'}</td>
                    <td className="px-2 md:px-4 py-2 hidden 2xl:table-cell">{e.teclado_nome || '--'}</td>
                    <td className="px-2 md:px-4 py-2 text-center">
                      {e.link_youtube && (
                        <a
                          href={getYouTubeLink(e.link_youtube)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs md:text-sm"
                        >
                          ▶️
                        </a>
                      )}
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
// pages/importar-escala.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import axios from 'axios';

export default function ImportarEscala() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [mensagemTipo, setMensagemTipo] = useState('');
  const [progresso, setProgresso] = useState(0);
  const [resultado, setResultado] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMensagem('');
      setMensagemTipo('');
    } else {
      setMensagem('Por favor, selecione um arquivo CSV válido.');
      setMensagemTipo('error');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMensagem('Selecione um arquivo CSV primeiro.');
      setMensagemTipo('error');
      return;
    }

    setLoading(true);
    setMensagem('');
    setMensagemTipo('');
    setProgresso(0);
    setResultado(null);

    const formData = new FormData();
    formData.append('arquivo', file);

    try {
      const res = await axios.post('/api/importar-escala', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgresso(percent);
        },
      });

      setMensagem('Importação concluída com sucesso!');
      setMensagemTipo('success');
      setResultado(res.data);
    } catch (error) {
      console.error('Erro na importação:', error);
      setMensagem(error.response?.data?.error || 'Erro ao importar arquivo.');
      setMensagemTipo('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-3 md:p-4 max-w-4xl mx-auto">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6">
          📤 Importar Escalas do Excel/CSV
        </h1>

        <div className="bg-blue-50 p-4 rounded-lg mb-6 border-l-4 border-blue-500">
          <p className="text-blue-700 text-sm font-medium">📌 Instruções:</p>
          <ul className="text-blue-600 text-sm list-disc list-inside mt-1 space-y-1">
            <li>O arquivo deve estar no formato CSV (gerado pelo Excel)</li>
            <li>O sistema vai identificar automaticamente os meses e as escalas</li>
            <li>Membros não cadastrados serão criados automaticamente</li>
            <li>Datas com "ZELADORIA" ou "REUNIÃO" serão ignoradas</li>
            <li>Escalas já existentes na mesma data serão atualizadas</li>
          </ul>
        </div>

        {mensagem && (
          <div className={`p-3 md:p-4 rounded-lg mb-4 md:mb-6 ${mensagemTipo === 'success' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>
            {mensagem}
            <button onClick={() => setMensagem('')} className="float-right text-gray-500 hover:text-gray-700">✕</button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecione o arquivo CSV
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {file && (
              <p className="mt-2 text-sm text-green-600">
                ✅ Arquivo selecionado: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {progresso > 0 && progresso < 100 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progresso}%` }}></div>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="btn-primary w-full md:w-auto px-6 py-2 text-sm md:text-base disabled:opacity-50"
          >
            {loading ? 'Importando...' : '📤 Importar Escalas'}
          </button>
        </div>

        {resultado && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">📊 Resumo da Importação</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{resultado.escalasImportadas || 0}</div>
                <div className="text-xs text-gray-500">Escalas importadas</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{resultado.membrosCriados || 0}</div>
                <div className="text-xs text-gray-500">Membros criados</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">{resultado.escalasAtualizadas || 0}</div>
                <div className="text-xs text-gray-500">Escalas atualizadas</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{resultado.erros || 0}</div>
                <div className="text-xs text-gray-500">Erros</div>
              </div>
            </div>

            {resultado.detalhes && resultado.detalhes.length > 0 && (
              <details className="mt-4">
                <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-indigo-600">
                  Ver detalhes ({resultado.detalhes.length} registros)
                </summary>
                <div className="mt-2 max-h-60 overflow-y-auto bg-gray-50 rounded-lg p-3">
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                    {resultado.detalhes.join('\n')}
                  </pre>
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
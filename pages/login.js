import { useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Head from 'next/head';

export default function Login() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login', { email, senha });
         if (res.data.success) {
        window.location.href = '/';
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/register', {
        nome, email, senha, confirmar_senha: confirmarSenha,
      });
      setSuccess(res.data.message);
      setIsLogin(true);
      setNome(''); setEmail(''); setSenha(''); setConfirmarSenha('');
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>Entrar · Escala de Louvor</title></Head>
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-sm">
          {/* LOGO ORIGINAL */}
          <div className="flex flex-col items-center mb-8">
            <img 
              src="/logo.png" 
              alt="Louvor" 
              className="h-20 w-auto object-contain mb-4"
            />
            
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl mb-4 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl mb-4 text-sm text-emerald-700">
                {success}
              </div>
            )}

            {isLogin ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Senha</label>
                  <input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="input-field"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Nome completo</label>
                  <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} className="input-field" placeholder="Seu nome" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">E-mail</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="seu@email.com" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Senha</label>
                  <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className="input-field" placeholder="Mínimo 6 caracteres" required minLength={6} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Confirmar senha</label>
                  <input type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} className="input-field" placeholder="Confirme sua senha" required minLength={6} />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Cadastrando...' : 'Criar conta'}
                </button>
              </form>
            )}

            <div className="mt-6 pt-6 border-t border-slate-200/70 text-center">
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
                className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
              >
                {isLogin ? 'Não tem uma conta? ' : 'Já tem uma conta? '}
                <span className="font-medium text-slate-900">{isLogin ? 'Cadastre-se' : 'Entrar'}</span>
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            © {new Date().getFullYear()} Ministério de Louvor
          </p>
        </div>
      </div>
    </>
  );
}
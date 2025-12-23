import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import GlassCard from './GlassCard';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // 1. INICIAR CON GOOGLE (MODO POPUP)
  const handleGoogleLogin = async () => {
    try {
      setError('');
      await signInWithPopup(auth, googleProvider);
      // App.jsx detectará el cambio de usuario automáticamente
    } catch (err) {
      console.error("Error Google:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError("Inicio de sesión cancelado.");
      } else if (err.code === 'auth/popup-blocked') {
        setError("El navegador bloqueó la ventana emergente.");
      } else {
        setError(`Error: ${err.message}`);
      }
    }
  };

  // 2. Iniciar o Crear con Email
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') setError("Datos incorrectos");
      else if (err.code === 'auth/email-already-in-use') setError("Este email ya está en uso");
      else if (err.code === 'auth/weak-password') setError("Contraseña muy débil (mín 6 car.)");
      else setError("Error: " + err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81]">

      {/* Fondo Decorativo (Blobs) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vh] h-[50vh] bg-purple-600/30 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vh] h-[50vh] bg-blue-600/20 rounded-full blur-[100px]" />

      <GlassCard className="w-full max-w-md p-8 animate-fade-in border-white/10 shadow-2xl shadow-black/40">

        {/* Encabezado */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-tr from-white/10 to-white/5 rounded-full flex items-center justify-center mx-auto mb-5 border border-white/20 shadow-inner backdrop-blur-md">
            <span className="text-4xl filter drop-shadow no-select">💳</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-lg">Mi Billetera</h1>
          <p className="text-white/60 text-sm mt-2 font-medium tracking-wide">Tu control financiero personal</p>
        </div>

        {/* --- MOSTRAR ERROR SI EXISTE --- */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-200 text-xs font-bold text-center break-words backdrop-blur-md animate-pulse">
            ⚠️ {error}
          </div>
        )}

        {/* Botón Google */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 p-3.5 rounded-xl hover:bg-gray-100 transition-all font-bold mb-8 shadow-lg active:scale-95 group"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="Google" />
          Continuar con Google
        </button>

        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
          <div className="relative flex justify-center text-xs uppercase tracking-widest"><span className="px-3 bg-transparent text-white/40 font-bold backdrop-blur-sm">O usar email</span></div>
        </div>

        {/* Formulario Email */}
        <form onSubmit={handleEmailAuth} className="space-y-5">
          <div className="group">
            <label className="block text-xs font-bold text-white/50 mb-1.5 ml-1 uppercase tracking-wider group-focus-within:text-white/80 transition-colors">Email</label>
            <input
              type="email"
              required
              value={email}
              autoFocus
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3.5 bg-black/20 border border-white/10 rounded-xl focus:border-white/30 focus:bg-black/30 outline-none text-white placeholder-white/20 transition-all"
              placeholder="nombre@ejemplo.com"
            />
          </div>
          <div className="group">
            <label className="block text-xs font-bold text-white/50 mb-1.5 ml-1 uppercase tracking-wider group-focus-within:text-white/80 transition-colors">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3.5 bg-black/20 border border-white/10 rounded-xl focus:border-white/30 focus:bg-black/30 outline-none text-white placeholder-white/20 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all active:scale-95 shadow-lg shadow-blue-900/40 mt-2 border border-blue-400/20"
          >
            {isRegistering ? 'Crear Cuenta Gratis' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
            className="text-sm text-white/60 font-medium hover:text-white transition-colors underline decoration-transparent hover:decoration-white/50 underline-offset-4"
          >
            {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
          </button>
        </div>

      </GlassCard>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-white/20">
        &copy; {new Date().getFullYear()} Mi Billetera App
      </div>
    </div>
  );
}
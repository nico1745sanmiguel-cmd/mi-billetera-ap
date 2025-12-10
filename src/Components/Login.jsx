import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
// CAMBIO IMPORTANTE: Usamos signInWithPopup (más estable para debug)
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // 1. INICIAR CON GOOGLE (MODO POPUP)
  const handleGoogleLogin = async () => {
    try {
      setError('');
      console.log("Intentando abrir Popup de Google...");
      // Esto abrirá una ventana flotante (o pestaña nueva en celular)
      await signInWithPopup(auth, googleProvider);
      // Si funciona, App.jsx detectará el usuario automáticamente y cambiará de pantalla.
    } catch (err) {
      console.error("Error Google:", err);
      // Aquí atrapamos el error exacto en vivo
      if (err.code === 'auth/popup-closed-by-user') {
        setError("Cerraste la ventana de Google antes de terminar.");
      } else if (err.code === 'auth/popup-blocked') {
        setError("El navegador bloqueó la ventana emergente. Permítela e intenta de nuevo.");
      } else {
        setError(`Error Google: ${err.message}`);
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
      else if (err.code === 'auth/email-already-in-use') setError("Este email ya está registrado");
      else if (err.code === 'auth/weak-password') setError("La contraseña es muy corta (mín 6)");
      else setError("Error: " + err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6] p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md animate-fade-in">
        
        {/* Encabezado */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">💳</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Mi Billetera</h1>
          <p className="text-gray-500 text-sm mt-1">Tu control financiero personal</p>
        </div>

        {/* --- MOSTRAR ERROR SI EXISTE --- */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs font-bold text-center break-words">
            {error}
          </div>
        )}

        {/* Botón Google */}
        <button 
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 p-3 rounded-xl hover:bg-gray-50 transition-colors text-gray-700 font-medium mb-6 shadow-sm active:scale-95"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
          Continuar con Google
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
          <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">O con email</span></div>
        </div>

        {/* Formulario Email */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="nombre@ejemplo.com" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Contraseña</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="••••••••" />
          </div>

          <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-transform active:scale-95 shadow-lg shadow-blue-200">
            {isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => setIsRegistering(!isRegistering)} className="text-sm text-blue-600 font-medium hover:underline">
            {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate gratis'}
          </button>
        </div>

      </div>
    </div>
  );
}
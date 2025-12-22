import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';

const PRESET_COLORS = ['#1a1a1a', '#005f73', '#0a9396', '#ae2012', '#6a4c93', '#ca6702', '#2d3277', '#e63946', '#457b9d', '#ff006e'];

export default function CardDetailModal({ isOpen, onClose, card, privacyMode, isGlass }) {
  const [form, setForm] = useState({ name: '', bank: '', limit: '', limitOneShot: '', closeDay: '', dueDay: '', color: PRESET_COLORS[0] });
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      if (card) {
        setForm({ ...card, limitOneShot: card.limitOneShot || card.limit });
      } else {
        setForm({ name: '', bank: '', limit: '', limitOneShot: '', closeDay: '', dueDay: '', color: PRESET_COLORS[0] });
      }
    } else {
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, card]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const dataToSave = {
      name: form.name,
      bank: form.bank,
      limit: Number(form.limit),
      limitOneShot: Number(form.limitOneShot),
      closeDay: Number(form.closeDay),
      dueDay: Number(form.dueDay),
      color: form.color,
      userId: auth.currentUser.uid
    };

    try {
      if (card?.id) {
        await updateDoc(doc(db, 'cards', card.id), dataToSave);
      } else {
        const newId = Date.now().toString();
        await setDoc(doc(db, 'cards', newId), dataToSave);
      }
      onClose();
    } catch (error) {
      console.error(error);
      alert("Error al guardar.");
    }
  };

  const handleDelete = async () => {
    if (window.confirm('¿Seguro que quieres borrar esta tarjeta?')) {
      try {
        await deleteDoc(doc(db, 'cards', card.id));
        onClose();
      } catch (e) { console.error(e); }
    }
  };

  if (!isAnimating && !isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>

      {/* Modal Content */}
      <div className={`w-full max-w-sm rounded-3xl shadow-2xl z-10 overflow-hidden transform transition-all duration-300 ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-10 scale-95'} ${isGlass ? 'bg-[#0f172a] border border-white/10 text-white shadow-blue-900/20' : 'bg-white text-gray-800'}`}>
        <div className={`px-6 py-4 flex justify-between items-center ${isGlass ? 'border-b border-white/5 bg-white/5' : 'border-b border-gray-100 bg-gray-50/50'}`}>
          <h3 className={`font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>{card ? 'Editar Tarjeta' : 'Nueva Tarjeta'}</h3>
          <button onClick={onClose} className={`rounded-full p-1 transition-colors ${isGlass ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">

          {/* Preview Visual */}
          <div className="rounded-2xl p-4 text-white shadow-lg mb-4 transition-all duration-500 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${form.color} 0%, ${form.color}DD 100%)` }}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <span className="text-xs font-bold uppercase tracking-wider opacity-90 drop-shadow-sm">{form.bank || 'BANCO'}</span>
              <span className="font-bold drop-shadow-sm">{form.name || 'TARJETA'}</span>
            </div>
            <div className="text-right relative z-10">
              <p className="text-[10px] opacity-80 uppercase tracking-widest mb-0.5">Límite</p>
              <p className="font-mono text-xl font-bold tracking-tight drop-shadow-md">{form.limit ? `$ ${Number(form.limit).toLocaleString('es-AR')}` : '$ 0'}</p>
            </div>
          </div>

          <div>
            <label className={`block text-xs font-bold mb-1 ml-1 ${isGlass ? 'text-white/70' : 'text-gray-700'}`}>Nombre (ej. Visa Oro)</label>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={`w-full p-3 rounded-xl outline-none font-medium transition-colors ${isGlass ? 'bg-white/5 border border-white/10 text-white placeholder-white/30 focus:bg-white/10 focus:border-white/30' : 'bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-500'}`} placeholder="Descripción corta" />
          </div>

          <div>
            <label className={`block text-xs font-bold mb-1 ml-1 ${isGlass ? 'text-white/70' : 'text-gray-700'}`}>Banco Emisor</label>
            <input required value={form.bank} onChange={e => setForm({ ...form, bank: e.target.value })} className={`w-full p-3 rounded-xl outline-none font-medium transition-colors ${isGlass ? 'bg-white/5 border border-white/10 text-white placeholder-white/30 focus:bg-white/10 focus:border-white/30' : 'bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-500'}`} placeholder="Galicia, Santander, etc." />
          </div>

          <div>
            <label className={`block text-xs font-bold mb-2 ml-1 ${isGlass ? 'text-white/70' : 'text-gray-700'}`}>Color de Tarjeta</label>
            <div className="flex flex-wrap gap-2 p-2 rounded-xl border border-transparent hover:border-white/5 transition-colors">
              {PRESET_COLORS.map((color) => (
                <button key={color} type="button" onClick={() => setForm({ ...form, color: color })} className={`w-8 h-8 rounded-full shadow-sm transition-transform hover:scale-110 ${form.color === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''}`} style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-bold mb-1 ml-1 ${isGlass ? 'text-white/70' : 'text-gray-700'}`}>Cierre (Día)</label>
              <input required type="number" min="1" max="31" value={form.closeDay} onChange={e => setForm({ ...form, closeDay: e.target.value })} className={`w-full p-3 rounded-xl outline-none font-medium text-center transition-colors ${isGlass ? 'bg-white/5 border border-white/10 text-white focus:bg-white/10' : 'bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-500'}`} />
            </div>
            <div>
              <label className={`block text-xs font-bold mb-1 ml-1 ${isGlass ? 'text-white/70' : 'text-gray-700'}`}>Vencimiento (Día)</label>
              <input required type="number" min="1" max="31" value={form.dueDay} onChange={e => setForm({ ...form, dueDay: e.target.value })} className={`w-full p-3 rounded-xl outline-none font-medium text-center transition-colors ${isGlass ? 'bg-white/5 border border-white/10 text-white focus:bg-white/10' : 'bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-500'}`} />
            </div>
          </div>

          <div className={`grid grid-cols-2 gap-3 p-3 rounded-xl border ${isGlass ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
            <div>
              <label className={`block text-[10px] font-bold mb-1 uppercase ${isGlass ? 'text-blue-300' : 'text-blue-800'}`}>Límite Cuotas ($)</label>
              <input required type="number" value={form.limit} onChange={e => setForm({ ...form, limit: e.target.value })} className={`w-full p-2 rounded-lg outline-none text-sm font-bold ${isGlass ? 'bg-black/20 text-white border border-white/5 placeholder-white/20' : 'bg-white border border-blue-200 text-blue-900'}`} placeholder="0" />
            </div>
            <div>
              <label className={`block text-[10px] font-bold mb-1 uppercase ${isGlass ? 'text-blue-300' : 'text-blue-800'}`}>Límite 1 Pago ($)</label>
              <input required type="number" value={form.limitOneShot} onChange={e => setForm({ ...form, limitOneShot: e.target.value })} className={`w-full p-2 rounded-lg outline-none text-sm font-bold ${isGlass ? 'bg-black/20 text-white border border-white/5 placeholder-white/20' : 'bg-white border border-blue-200 text-blue-900'}`} placeholder="0" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            {card && (
              <button type="button" onClick={handleDelete} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${isGlass ? 'text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20' : 'text-red-500 bg-red-50 hover:bg-red-100'}`}>Eliminar</button>
            )}
            <button type="submit" className={`flex-[2] py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${isGlass ? 'bg-white text-black hover:bg-gray-100 hover:scale-[1.02]' : 'bg-black text-white hover:bg-gray-800 shadow-gray-200'}`}>Guardar Cambios</button>
          </div>

        </form>
      </div>
    </div>
  );
}


import React, { useState } from 'react';
import { db, auth } from '../../firebase';
import { doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { formatMoney } from '../../utils';

const PRESET_COLORS = ['#1a1a1a', '#005f73', '#0a9396', '#ae2012', '#6a4c93', '#ca6702', '#2d3277', '#e63946', '#457b9d', '#ff006e'];

const ChipIcon = () => (
    <svg viewBox="0 0 60 40" className="w-10 h-8 opacity-90 drop-shadow-sm">
        <rect width="60" height="40" rx="6" fill="#fbbf24" fillOpacity="0.8" />
        <path d="M10 0v40 M50 0v40 M0 15h60 M0 25h60 M20 15v10 M40 15v10" stroke="#b45309" strokeWidth="1.5" fill="none"/>
    </svg>
);

const getBrandLogo = (name) => {
    const n = (name || '').toLowerCase();
    let logoSrc = null;
    if (n.includes('visa')) logoSrc = '/logos/visa.png';
    else if (n.includes('master')) logoSrc = '/logos/mastercard.png';
    else if (n.includes('amex') || n.includes('american')) logoSrc = '/logos/amex.png';

    if (logoSrc) return <img src={logoSrc} alt="Logo" className="h-8 w-auto object-contain drop-shadow-md filter brightness-110" />;
    return <span className="font-bold text-white text-[10px] tracking-widest uppercase opacity-80">TARJETA</span>;
};

// RECIBIMOS LA PROP privacyMode
export default function MyCards({ cards, privacyMode }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  const initialForm = { name: '', bank: '', limit: '', limitOneShot: '', closeDay: '', dueDay: '', color: PRESET_COLORS[0] };
  const [form, setForm] = useState(initialForm);

  // Helper para ocultar dinero
  const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);

  const openForm = (card = null) => {
    if (card) { setForm({ ...card, limitOneShot: card.limitOneShot || card.limit }); setEditingId(card.id); } 
    else { setForm(initialForm); setEditingId(null); }
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Seguro que quieres borrar esta tarjeta?')) await deleteDoc(doc(db, 'cards', id));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const dataToSave = {
      name: form.name, bank: form.bank, 
      limit: Number(form.limit), limitOneShot: Number(form.limitOneShot), 
      closeDay: Number(form.closeDay), dueDay: Number(form.dueDay), 
      color: form.color, userId: auth.currentUser.uid 
    };

    try {
      if (editingId) await updateDoc(doc(db, 'cards', editingId), dataToSave);
      else { const newId = Date.now().toString(); await setDoc(doc(db, 'cards', newId), dataToSave); }
      setIsEditing(false);
    } catch (error) { console.error(error); alert("Error al guardar."); }
  };

  if (isEditing) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 max-w-lg mx-auto animate-fade-in mb-20">
        <h3 className="text-lg font-bold mb-6 text-gray-800 border-b pb-2">{editingId ? 'Editar Tarjeta' : 'Nueva Tarjeta'}</h3>
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-bold text-gray-700 mb-1">Nombre</label><input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" /></div>
            <div><label className="block text-xs font-bold text-gray-700 mb-1">Banco</label><input required value={form.bank} onChange={e => setForm({...form, bank: e.target.value})} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          </div>
          <div><label className="block text-xs font-bold text-gray-700 mb-2">Color</label><div className="flex flex-wrap gap-3">{PRESET_COLORS.map((color) => (<button key={color} type="button" onClick={() => setForm({...form, color: color})} className={`w-8 h-8 rounded-full shadow-sm transition-transform hover:scale-110 ${form.color === color ? 'ring-2 ring-offset-2 ring-blue-600 scale-110' : ''}`} style={{ backgroundColor: color }} />))}</div></div>
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
             <div><label className="block text-xs font-bold text-gray-700 mb-1">Límite 1 Pago ($)</label><input required type="number" value={form.limitOneShot} onChange={e => setForm({...form, limitOneShot: e.target.value})} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Contado" /></div>
             <div><label className="block text-xs font-bold text-gray-700 mb-1">Límite Cuotas ($)</label><input required type="number" value={form.limit} onChange={e => setForm({...form, limit: e.target.value})} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Financiación" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div><label className="block text-xs font-bold text-gray-700 mb-1">Día Cierre</label><input required type="number" min="1" max="31" value={form.closeDay} onChange={e => setForm({...form, closeDay: e.target.value})} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" /></div>
             <div><label className="block text-xs font-bold text-gray-700 mb-1">Día Vencimiento</label><input required type="number" min="1" max="31" value={form.dueDay} onChange={e => setForm({...form, dueDay: e.target.value})} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
            <button type="submit" className="px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 shadow">Guardar</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-medium text-gray-900">Mis Tarjetas</h2>
        <button onClick={() => openForm()} className="bg-[#3483fa] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#2968c8] shadow-sm transition-colors">+ Agregar Tarjeta</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div key={card.id} className="group relative w-full aspect-[1.58/1] rounded-xl shadow-lg text-white overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1" style={{ background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}DD 100%)` }}>
            <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-gradient-to-br from-white/20 to-transparent rotate-45 pointer-events-none"></div>
            <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
                <div className="flex justify-between items-start"><span className="font-bold tracking-wider text-sm uppercase drop-shadow-md opacity-90">{card.bank}</span><div className="opacity-100">{getBrandLogo(card.name)}</div></div>
                <div className="flex items-center gap-3 pl-1"><ChipIcon /><svg className="w-6 h-6 opacity-70 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><circle cx="12" cy="12" r="2.5"/><path d="M4.93 4.93C3.12 6.74 2 9.24 2 12s1.12 5.26 2.93 7.07L6.34 17.66C5.48 16.14 5 14.16 5 12c0-2.16.48-4.14 1.34-5.66L4.93 4.93zM19.07 4.93L17.66 6.34C18.52 7.86 19 9.84 19 12c0 2.16-.48 4.14-1.34 5.66l1.41 1.41C20.88 17.26 22 14.76 22 12s-1.12-5.26-2.93-7.07z"/></svg></div>
                <div className="pt-2">
                    <div className="grid grid-cols-2 gap-4 items-end">
                        <div>
                            <p className="text-[9px] opacity-80 uppercase tracking-widest drop-shadow-sm">Lim. Cuotas</p>
                            {/* MÁSCARA */}
                            <p className="font-mono text-lg tracking-wide font-bold text-shadow-sm">{showMoney(card.limit)}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-[9px] opacity-80 uppercase drop-shadow-sm">Lim. 1 Pago</p>
                             {/* MÁSCARA */}
                             <p className="font-mono text-sm font-bold opacity-90">{showMoney(card.limitOneShot || card.limit)}</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                <button onClick={() => openForm(card)} className="bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-2 rounded-full shadow-lg" title="Editar"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                <button onClick={() => handleDelete(card.id)} className="bg-red-500/80 hover:bg-red-600 backdrop-blur-md text-white p-2 rounded-full shadow-lg" title="Borrar"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
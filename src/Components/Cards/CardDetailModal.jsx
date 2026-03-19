import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';

const PRESET_COLORS = ['#1a1a1a', '#005f73', '#0a9396', '#ae2012', '#6a4c93', '#ca6702', '#2d3277', '#e63946', '#457b9d', '#ff006e'];

const getMonthKey = (date) => {
  const d = date || new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function CardDetailModal({ isOpen, onClose, card, privacyMode, isGlass, householdId, currentDate }) {
  const [activeTab, setActiveTab] = useState('card');
  const [form, setForm] = useState({ name: '', bank: '', closeDay: '', dueDay: '', color: PRESET_COLORS[0], isShared: true });
  const [statement, setStatement] = useState({ totalDue: '', dueDate: '', nextCloseDate: '', nextDueDate: '', isPaid: false });
  const [isAnimating, setIsAnimating] = useState(false);

  const monthKey = getMonthKey(currentDate);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      setActiveTab('card');
      if (card) {
        setForm({
          name: card.name || '',
          bank: card.bank || '',
          closeDay: card.closeDay || '',
          dueDay: card.dueDay || '',
          color: card.color || PRESET_COLORS[0],
          isShared: card.isShared !== undefined ? card.isShared : true,
        });
        const saved = card.monthlyStatements?.[monthKey] || {};
        setStatement({
          totalDue: saved.totalDue || '',
          dueDate: saved.dueDate || '',
          nextCloseDate: saved.nextCloseDate || '',
          nextDueDate: saved.nextDueDate || '',
          isPaid: card.paidPeriods?.includes(monthKey) || false,
        });
      } else {
        setForm({ name: '', bank: '', closeDay: '', dueDay: '', color: PRESET_COLORS[0], isShared: true });
        setStatement({ totalDue: '', dueDate: '', nextCloseDate: '', nextDueDate: '', isPaid: false });
      }
    } else {
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, card, monthKey]);

  const handleSaveCard = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const dataToSave = {
      name: form.name,
      bank: form.bank,
      closeDay: Number(form.closeDay),
      dueDay: Number(form.dueDay),
      color: form.color,
      userId: auth.currentUser.uid,
      ...(householdId && {
        householdId,
        ownerId: auth.currentUser.uid,
        isShared: form.isShared,
      }),
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
      alert('Error al guardar.');
    }
  };

  const handleSaveStatement = async (e) => {
    e.preventDefault();
    if (!auth.currentUser || !card?.id) return;

    const statementData = {
      totalDue: Number(statement.totalDue) || 0,
      dueDate: statement.dueDate,
      nextCloseDate: statement.nextCloseDate,
      nextDueDate: statement.nextDueDate,
    };

    try {
      const currentPaidPeriods = card.paidPeriods || [];
      let newPaidPeriods = [...currentPaidPeriods];
      
      if (statement.isPaid) {
        if (!newPaidPeriods.includes(monthKey)) newPaidPeriods.push(monthKey);
      } else {
        newPaidPeriods = newPaidPeriods.filter(p => p !== monthKey);
      }

      await updateDoc(doc(db, 'cards', card.id), {
        [`monthlyStatements.${monthKey}`]: statementData,
        paidPeriods: newPaidPeriods,
      });
      onClose();
    } catch (error) {
      console.error(error);
      alert('Error al guardar el resumen.');
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

  const inputClass = `w-full p-3 rounded-xl outline-none font-medium transition-colors ${isGlass ? 'bg-white/5 border border-white/10 text-white placeholder-white/30 focus:bg-white/10 focus:border-white/30' : 'bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-500'}`;
  const labelClass = `block text-xs font-bold mb-1 ml-1 ${isGlass ? 'text-white/70' : 'text-gray-700'}`;

  const monthLabel = currentDate
    ? currentDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>

      <div className={`w-full max-w-sm rounded-3xl shadow-2xl z-10 overflow-hidden transform transition-all duration-300 ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-10 scale-95'} ${isGlass ? 'bg-[#0f172a] border border-white/10 text-white shadow-blue-900/20' : 'bg-white text-gray-800'}`}>

        {/* Header */}
        <div className={`px-6 py-4 flex justify-between items-center ${isGlass ? 'border-b border-white/5 bg-white/5' : 'border-b border-gray-100 bg-gray-50/50'}`}>
          <h3 className={`font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>{card ? card.name : 'Nueva Tarjeta'}</h3>
          <button onClick={onClose} className={`rounded-full p-1 transition-colors ${isGlass ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tabs (solo si hay tarjeta existente) */}
        {card && (
          <div className={`flex border-b ${isGlass ? 'border-white/5' : 'border-gray-100'}`}>
            {['card', 'statement'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === tab
                  ? (isGlass ? 'text-white border-b-2 border-white' : 'text-blue-600 border-b-2 border-blue-600')
                  : (isGlass ? 'text-white/40 hover:text-white/70' : 'text-gray-400 hover:text-gray-600')}`}
              >
                {tab === 'card' ? 'Tarjeta' : `Resumen · ${monthLabel}`}
              </button>
            ))}
          </div>
        )}

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* --- TAB: DATOS DE TARJETA --- */}
          {activeTab === 'card' && (
            <form onSubmit={handleSaveCard} className="space-y-4">
              {/* Preview */}
              <div className="rounded-2xl p-4 text-white shadow-lg mb-2 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${form.color} 0%, ${form.color}DD 100%)` }}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-90">{form.bank || 'BANCO'}</span>
                  <span className="font-bold">{form.name || 'TARJETA'}</span>
                </div>
                <div className="relative z-10 text-right">
                  <p className="text-[10px] opacity-70 uppercase tracking-widest">Cierre · Vencimiento</p>
                  <p className="font-mono text-sm font-bold">
                    {form.closeDay || '--'} · {form.dueDay || '--'}
                  </p>
                </div>
                {householdId && (
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded-md">
                    <span className={`w-2 h-2 rounded-full ${form.isShared ? 'bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.8)]' : 'bg-red-400'}`}></span>
                    <span className="text-[8px] uppercase tracking-wide opacity-80">{form.isShared ? 'Compartida' : 'Privada'}</span>
                  </div>
                )}
              </div>

              {householdId && (
                <div className={`p-4 rounded-xl flex items-center justify-between ${isGlass ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-100'}`}>
                  <div>
                    <p className={`text-sm font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>Compartir en Hogar</p>
                    <p className={`text-xs ${isGlass ? 'text-white/50' : 'text-gray-500'}`}>Visible para tu pareja</p>
                  </div>
                  <button type="button" onClick={() => setForm(f => ({ ...f, isShared: !f.isShared }))} className={`w-12 h-7 rounded-full transition-colors relative ${form.isShared ? 'bg-blue-600' : 'bg-gray-600'}`}>
                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${form.isShared ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </button>
                </div>
              )}

              <div>
                <label className={labelClass}>Nombre (ej. Visa Oro)</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Descripción corta" />
              </div>

              <div>
                <label className={labelClass}>Banco Emisor</label>
                <input required value={form.bank} onChange={e => setForm({ ...form, bank: e.target.value })} className={inputClass} placeholder="Galicia, Santander, etc." />
              </div>

              <div>
                <label className={`${labelClass} mb-2`}>Color de Tarjeta</label>
                <div className="flex flex-wrap gap-2 p-2">
                  {PRESET_COLORS.map((color) => (
                    <button key={color} type="button" onClick={() => setForm({ ...form, color })} className={`w-8 h-8 rounded-full shadow-sm transition-transform hover:scale-110 ${form.color === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''}`} style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Día de Cierre</label>
                  <input required type="number" min="1" max="31" value={form.closeDay} onChange={e => setForm({ ...form, closeDay: e.target.value })} className={`${inputClass} text-center`} placeholder="Ej: 5" />
                </div>
                <div>
                  <label className={labelClass}>Día de Vencimiento</label>
                  <input required type="number" min="1" max="31" value={form.dueDay} onChange={e => setForm({ ...form, dueDay: e.target.value })} className={`${inputClass} text-center`} placeholder="Ej: 20" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                {card && (
                  <button type="button" onClick={handleDelete} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${isGlass ? 'text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20' : 'text-red-500 bg-red-50 hover:bg-red-100'}`}>Eliminar</button>
                )}
                <button type="submit" className={`flex-[2] py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${isGlass ? 'bg-white text-black hover:bg-gray-100' : 'bg-black text-white hover:bg-gray-800'}`}>Guardar</button>
              </div>
            </form>
          )}

          {/* --- TAB: RESUMEN DEL MES --- */}
          {activeTab === 'statement' && card && (
            <form onSubmit={handleSaveStatement} className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-2 transition-all">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${statement.isPaid ? 'bg-emerald-500 text-white' : 'bg-white/10 text-emerald-500/50'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>¿Ya pagaste esta tarjeta?</p>
                    <p className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-wider">{statement.isPaid ? 'Marcada como pagada' : 'Pendiente de pago'}</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setStatement(s => ({ ...s, isPaid: !s.isPaid }))}
                  className={`w-12 h-7 rounded-full transition-all relative ${statement.isPaid ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-sm ${statement.isPaid ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </button>
              </div>

              <p className={`text-[10px] font-bold uppercase ${isGlass ? 'text-white/30' : 'text-gray-400'} ml-1`}>Datos del período</p>

              <div>
                <label className={labelClass}>Total a Pagar ($)</label>
                <input
                  type="number"
                  value={statement.totalDue}
                  onChange={e => setStatement({ ...statement, totalDue: e.target.value })}
                  className={inputClass}
                  placeholder="Ej: 85000"
                />
              </div>

              <div>
                <label className={labelClass}>Fecha de Vencimiento</label>
                <input
                  type="date"
                  value={statement.dueDate}
                  onChange={e => setStatement({ ...statement, dueDate: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className={`p-3 rounded-xl border ${isGlass ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                <p className={`text-[10px] font-bold uppercase mb-3 ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>Próximo período</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Próximo Cierre</label>
                    <input
                      type="date"
                      value={statement.nextCloseDate}
                      onChange={e => setStatement({ ...statement, nextCloseDate: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Próximo Vencimiento</label>
                    <input
                      type="date"
                      value={statement.nextDueDate}
                      onChange={e => setStatement({ ...statement, nextDueDate: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className={`w-full py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${isGlass ? 'bg-white text-black hover:bg-gray-100' : 'bg-black text-white hover:bg-gray-800'}`}>
                Guardar Resumen
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

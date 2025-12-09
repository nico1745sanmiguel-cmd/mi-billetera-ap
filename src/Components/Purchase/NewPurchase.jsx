import React, { useState, useMemo, useRef } from 'react';
import { formatMoney } from '../../utils';
import Toast from '../UI/Toast';

// --- COMPONENTES VISUALES DE TARJETA (Miniatura) ---
const VisaLogo = () => <svg viewBox="0 0 100 32" className="w-10 h-auto opacity-90"><path fill="#fff" d="M33.7 1.4L22.6 29.8H14l-6.8-17.7c-0.8-2.9-1.6-3.8-4.2-4.9C1.6 6.5 0.5 6.3 0 6.1l0.2-1h10.9c1.4 0 2.6 1 3 2.8l2.9 14.8 8.8-21.3h7.9zm13.1 28.4l7.9-28.4h-7.6l-7.9 28.4h7.6zm13.6-28.4l-7.2 18.2-2.9-14.7c-0.5-2.2-2-3.5-4.2-3.5h-7.4l-0.1 0.4c2.9 0.7 6.2 1.9 8.2 5.1l7.3 22.9h8l12-28.4h-7.8v0z"/></svg>;
const MasterLogo = () => <svg viewBox="0 0 100 60" className="w-10 h-auto opacity-90"><circle cx="34" cy="30" r="30" fill="#EB001B" /><circle cx="66" cy="30" r="30" fill="#F79E1B" fillOpacity="0.9"/></svg>;
const AmexLogo = () => <svg viewBox="0 0 100 60" className="w-8 h-auto opacity-90 bg-white/20 rounded-sm"><path d="M15 45h-5l10-25h8l-5 15h2l2-6h6l-3 6h7l8-25h7l-8 25h14l8-25h6l-9 25h-6l2-6h-7l-3 6h-6l3-6h-3l-2 6zm20-15l3-6h5l-1 6h-7zm20 0l3-6h4l-2 6h-5z" fill="#fff"/></svg>;

const getBrandLogo = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('visa')) return <VisaLogo />;
    if (n.includes('master')) return <MasterLogo />;
    if (n.includes('amex') || n.includes('american')) return <AmexLogo />;
    return <span className="font-bold text-white text-[10px] tracking-widest uppercase opacity-80">TARJETA</span>;
};

export default function NewPurchase({ cards, onSave, transactions }) {
  const [toast, setToast] = useState(null);
  
  // Referencia para hacer scroll automático si hace falta
  const cardsContainerRef = useRef(null);

  const [form, setForm] = useState({
    cardId: cards[0]?.id || '',
    description: '',
    amount: '',
    installments: 1,
    interest: 0, 
    bonus: 0,    
    date: new Date().toISOString().split('T')[0]
  });

  // --- HERRAMIENTAS DE INPUT ---
  const formatInputValue = (value) => {
    if (!value) return '';
    const numbers = value.toString().replace(/\D/g, '');
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(numbers);
  };

  const parseInputValue = (value) => {
    if (!value) return 0;
    return Number(value.toString().replace(/\D/g, ''));
  };

  const handleMoneyChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setForm({ ...form, [e.target.name]: formatInputValue(rawValue) });
  };

  // --- CÁLCULOS PRINCIPALES ---
  const selectedCard = cards.find(c => c.id == form.cardId);

  // 1. Cálculo de límites
  const cardStatus = useMemo(() => {
    if (!selectedCard) return { limit: 0, available: 0 };
    
    // Calculamos deuda activa en esta tarjeta
    const usedLimit = transactions
      .filter(t => t.cardId == form.cardId)
      .reduce((acc, t) => acc + Number(t.finalAmount || t.amount), 0);

    return {
        limit: Number(selectedCard.limit),
        available: Number(selectedCard.limit) - usedLimit
    };
  }, [transactions, form.cardId, selectedCard]);

  // 2. Cálculo de la compra actual
  const purchaseCalc = useMemo(() => {
    const base = parseInputValue(form.amount);
    const bonus = parseInputValue(form.bonus);
    const interestAmt = base * (Number(form.interest) / 100);
    const total = base + interestAmt - bonus;
    return {
        base,
        total,
        quota: total / (Number(form.installments) || 1)
    };
  }, [form.amount, form.interest, form.bonus, form.installments]);

  // 3. PROYECCIÓN FUTURA (El Oráculo) 🔮
  const futureImpact = useMemo(() => {
    if (purchaseCalc.total <= 0) return [];

    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const today = new Date();
    const purchaseDate = new Date(form.date); 
    // Ajuste de zona horaria simple
    const localPurchaseDate = new Date(purchaseDate.valueOf() + purchaseDate.getTimezoneOffset() * 60000);

    // Generamos proyección para los próximos meses que dure la cuota
    let projection = [];
    const count = Math.min(Number(form.installments), 6); // Solo mostramos hasta 6 meses para no saturar

    for (let i = 0; i < count; i++) {
        // Mes exacto de la cuota (asumiendo que empieza en el mes de compra o siguiente según cierre)
        // Para simplificar UX hoy: Asumimos que la cuota 1 impacta en el mes "actual" del bucle si coincide
        const targetDate = new Date(localPurchaseDate.getFullYear(), localPurchaseDate.getMonth() + i, 1);
        const monthLabel = `${months[targetDate.getMonth()]} ${targetDate.getFullYear().toString().substr(2)}`;

        // Calculamos cuánto YA debías pagar ese mes (Global de todas las tarjetas)
        const currentDebt = transactions.reduce((acc, t) => {
            const tDate = new Date(t.date);
            const tLocal = new Date(tDate.valueOf() + tDate.getTimezoneOffset() * 60000);
            const tEnd = new Date(tLocal.getFullYear(), tLocal.getMonth() + Number(t.installments), 1);
            
            // Si el mes target cae dentro del rango de esa compra vieja
            if (targetDate >= new Date(tLocal.getFullYear(), tLocal.getMonth(), 1) && targetDate < tEnd) {
                 return acc + (Number(t.monthlyInstallment) || 0);
            }
            return acc;
        }, 0);

        projection.push({
            month: monthLabel,
            current: currentDebt,
            new: currentDebt + purchaseCalc.quota,
            diff: purchaseCalc.quota
        });
    }
    return projection;
  }, [transactions, purchaseCalc, form.installments, form.date]);


  const handleSubmit = (e) => {
    e.preventDefault();
    if (purchaseCalc.total <= 0) {
        setToast({ message: 'Ingresa un monto válido', type: 'error' });
        return;
    }
    onSave({ 
        ...form, 
        id: Date.now(), 
        amount: purchaseCalc.base, 
        finalAmount: purchaseCalc.total, 
        monthlyInstallment: purchaseCalc.quota,
        installments: Number(form.installments),
        bonus: parseInputValue(form.bonus)
    });
    setToast({ message: '¡Compra guardada!', type: 'success' });
    setForm({ ...form, description: '', amount: '', bonus: '', interest: 0, installments: 1 });
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 max-w-3xl mx-auto relative animate-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <h2 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-100">Nueva Compra</h2>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* --- 1. SELECCIÓN DE TARJETA (CARRUSEL MODO) --- */}
        <div>
            <label className="block text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">1. Selecciona tu Tarjeta</label>
            
            {/* Contenedor Scroll Horizontal */}
            <div 
                ref={cardsContainerRef}
                className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scrollbar-hide -mx-2 px-2"
                style={{ scrollBehavior: 'smooth' }}
            >
                {cards.map(card => {
                    const isSelected = form.cardId == card.id;
                    return (
                        <div 
                            key={card.id}
                            onClick={() => setForm({...form, cardId: card.id})}
                            className={`
                                relative flex-shrink-0 w-48 h-28 rounded-xl cursor-pointer transition-all duration-300 snap-center
                                ${isSelected ? 'ring-4 ring-blue-400 scale-105 shadow-xl z-10' : 'opacity-70 hover:opacity-100 scale-100'}
                            `}
                            style={{ 
                                background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}DD 100%)`,
                            }}
                        >
                            {/* Diseño Mini Tarjeta */}
                            <div className="absolute inset-0 p-3 flex flex-col justify-between text-white">
                                <div className="flex justify-between items-start">
                                    <span className="font-bold text-[10px] uppercase opacity-90">{card.bank}</span>
                                    {getBrandLogo(card.name)}
                                </div>
                                <div>
                                    <p className="text-[10px] opacity-70 uppercase tracking-widest">**** {card.id.slice(-4) || '1234'}</p>
                                    <p className="font-medium text-sm truncate">{card.name}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* INFO DE LÍMITES (Debajo del carrusel) */}
            <div className="mt-2 bg-gray-50 rounded-lg p-3 flex justify-between items-center border border-gray-100">
                <div>
                    <span className="block text-[10px] uppercase font-bold text-gray-400">Límite Disponible</span>
                    <span className={`text-lg font-mono font-bold ${cardStatus.available < 0 ? 'text-red-500' : 'text-gray-800'}`}>
                        {formatMoney(cardStatus.available)}
                    </span>
                </div>
                <div className="text-right">
                    <span className="block text-[10px] uppercase font-bold text-gray-400">Total Tarjeta</span>
                    <span className="text-sm font-medium text-gray-600">{formatMoney(cardStatus.limit)}</span>
                </div>
            </div>
        </div>

        {/* --- 2. DETALLES DE LA COMPRA --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">2. ¿Qué vas a comprar?</label>
                <input 
                    required name="description" value={form.description} onChange={handleChange} 
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 placeholder-gray-300" 
                    placeholder="Descripción del gasto" 
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">3. Monto Total</label>
                <input 
                    required type="text" name="amount" value={form.amount} onChange={handleMoneyChange} 
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-xl font-bold text-gray-800" 
                    placeholder="$ 0" autoComplete="off"
                />
            </div>

            <div>
                 <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Fecha</label>
                 <input type="date" name="date" value={form.date} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none text-gray-600 font-medium" />
            </div>
        </div>

        {/* --- 3. FINANCIACIÓN --- */}
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <label className="block text-xs font-bold text-gray-400 mb-3 uppercase tracking-wide">4. Plan de Pagos</label>
            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-3 md:col-span-1">
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Cuotas</label>
                    <select name="installments" value={form.installments} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none text-sm font-bold">
                        {[1, 3, 6, 9, 12, 18, 24].map(n => <option key={n} value={n}>{n} {n===1 ? 'pago' : 'cuotas'}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Interés (%)</label>
                    <input type="number" name="interest" value={form.interest} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none text-sm text-center" placeholder="0" />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Bonif. ($)</label>
                    <input type="text" name="bonus" value={form.bonus} onChange={handleMoneyChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none text-sm text-center text-green-600 font-bold" placeholder="$ 0" />
                </div>
            </div>
        </div>

        {/* --- 4. SIMULADOR DE IMPACTO (El Oráculo) --- */}
        {purchaseCalc.total > 0 && (
            <div className="mt-6 border-t border-gray-100 pt-4 animate-fade-in-up">
                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    📊 Impacto en tu Economía
                </h4>
                
                {/* Resumen Cuota */}
                <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                    <span className="text-blue-800 text-sm">Vas a pagar por mes:</span>
                    <span className="text-xl font-bold text-blue-900">{formatMoney(purchaseCalc.quota)}</span>
                </div>

                {/* Tabla de Proyección */}
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-gray-400 border-b border-gray-100">
                                <th className="text-left py-2">Mes</th>
                                <th className="text-right py-2">Pagas Hoy</th>
                                <th className="text-right py-2">Pagarás (+Compra)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {futureImpact.map((item, idx) => (
                                <tr key={idx} className="border-b border-gray-50 last:border-0">
                                    <td className="py-2 font-medium text-gray-600">{item.month}</td>
                                    <td className="py-2 text-right text-gray-400">{formatMoney(item.current)}</td>
                                    <td className="py-2 text-right font-bold text-gray-800">
                                        {formatMoney(item.new)} 
                                        <span className="text-[10px] text-red-500 ml-1">(+{formatMoney(item.diff)})</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        <div className="pt-2">
            <button type="submit" className="w-full py-4 bg-[#3483fa] text-white text-base font-bold rounded-xl hover:bg-[#2968c8] shadow-lg shadow-blue-200 transition-transform active:scale-95">
               Confirmar Compra
            </button>
        </div>

      </form>
    </div>
  );
}
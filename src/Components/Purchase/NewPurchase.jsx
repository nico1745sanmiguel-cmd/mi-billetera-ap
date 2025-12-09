import React, { useState, useMemo, useRef } from 'react';
import { formatMoney } from '../../utils';
import Toast from '../UI/Toast';

// --- LÓGICA DE LOGOS PNG (Igual que en MyCards) ---
const getBrandLogo = (name) => {
    const n = (name || '').toLowerCase();
    let logoSrc = null;

    if (n.includes('visa')) logoSrc = '/logos/visa.png';
    else if (n.includes('master')) logoSrc = '/logos/mastercard.png';
    else if (n.includes('amex') || n.includes('american')) logoSrc = '/logos/amex.png';

    if (logoSrc) {
        return (
            <img 
                src={logoSrc} 
                alt="Logo" 
                className="h-8 w-auto object-contain drop-shadow-md filter brightness-110" 
            />
        );
    }
    return <span className="font-bold text-white text-[10px] tracking-widest uppercase opacity-80">TARJETA</span>;
};

export default function NewPurchase({ cards, onSave, transactions }) {
  const [toast, setToast] = useState(null);
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

  // --- CÁLCULOS ---
  const selectedCard = cards.find(c => c.id == form.cardId);

  const cardStatus = useMemo(() => {
    if (!selectedCard) return { limit: 0, available: 0 };
    const usedLimit = transactions
      .filter(t => t.cardId == form.cardId)
      .reduce((acc, t) => acc + Number(t.finalAmount || t.amount), 0);
    return {
        limit: Number(selectedCard.limit),
        available: Number(selectedCard.limit) - usedLimit
    };
  }, [transactions, form.cardId, selectedCard]);

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

  const futureImpact = useMemo(() => {
    if (purchaseCalc.total <= 0) return [];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const purchaseDate = new Date(form.date); 
    const localPurchaseDate = new Date(purchaseDate.valueOf() + purchaseDate.getTimezoneOffset() * 60000);

    let projection = [];
    const count = Math.min(Number(form.installments), 6); 

    for (let i = 0; i < count; i++) {
        const targetDate = new Date(localPurchaseDate.getFullYear(), localPurchaseDate.getMonth() + i, 1);
        const monthLabel = `${months[targetDate.getMonth()]} ${targetDate.getFullYear().toString().substr(2)}`;
        
        const currentDebt = transactions.reduce((acc, t) => {
            const tDate = new Date(t.date);
            const tLocal = new Date(tDate.valueOf() + tDate.getTimezoneOffset() * 60000);
            const tEnd = new Date(tLocal.getFullYear(), tLocal.getMonth() + Number(t.installments), 1);
            if (targetDate >= new Date(tLocal.getFullYear(), tLocal.getMonth(), 1) && targetDate < tEnd) {
                 return acc + (Number(t.monthlyInstallment) || 0);
            }
            return acc;
        }, 0);

        projection.push({
            month: monthLabel,
            current: currentDebt,
            new: currentDebt + purchaseCalc.quota,
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
    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200 max-w-3xl mx-auto relative animate-fade-in pb-20">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Título eliminado como pediste */}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* --- 1. SELECCIÓN DE TARJETA (CARRUSEL MODO) --- */}
        <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">1. Selecciona tu Tarjeta</label>
            
            {/* Contenedor Scroll Horizontal - AUMENTADO EL PADDING Y (py-8) PARA QUE NO CORTE EL EFECTO ZOOM */}
            <div 
                ref={cardsContainerRef}
                className="flex overflow-x-auto gap-4 py-8 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0"
                style={{ scrollBehavior: 'smooth' }}
            >
                {cards.map(card => {
                    const isSelected = form.cardId == card.id;
                    return (
                        <div 
                            key={card.id}
                            onClick={() => setForm({...form, cardId: card.id})}
                            className={`
                                relative flex-shrink-0 
                                w-[85vw] max-w-[300px] h-44 rounded-2xl cursor-pointer transition-all duration-300 snap-center
                                ${isSelected ? 'ring-4 ring-blue-400 scale-105 shadow-2xl z-10' : 'opacity-80 hover:opacity-100 scale-95'}
                            `}
                            style={{ 
                                background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}DD 100%)`,
                            }}
                        >
                            {/* Efecto Glossy */}
                            <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-gradient-to-br from-white/20 to-transparent rotate-45 pointer-events-none"></div>

                            {/* Info Tarjeta */}
                            <div className="absolute inset-0 p-5 flex flex-col justify-between text-white z-10">
                                <div className="flex justify-between items-start">
                                    <span className="font-bold text-sm uppercase opacity-90 drop-shadow-md">{card.bank}</span>
                                    {getBrandLogo(card.name)}
                                </div>
                                <div>
                                    <p className="text-xs opacity-70 uppercase tracking-widest drop-shadow-sm">Límite Total</p>
                                    <p className="font-mono text-lg font-bold truncate drop-shadow-md">{formatMoney(card.limit)}</p>
                                    <p className="font-medium text-sm mt-1 truncate opacity-90">{card.name}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* INFO DE LÍMITES */}
            <div className="mt-2 bg-gray-50 rounded-lg p-4 flex justify-between items-center border border-gray-100 shadow-inner">
                <div>
                    <span className="block text-[10px] uppercase font-bold text-gray-400">Límite Disponible</span>
                    <span className={`text-xl font-mono font-bold ${cardStatus.available < 0 ? 'text-red-500' : 'text-gray-800'}`}>
                        {formatMoney(cardStatus.available)}
                    </span>
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

        {/* --- 4. SIMULADOR DE IMPACTO --- */}
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
                                <th className="text-right py-2">Venías pagando</th>
                                <th className="text-right py-2">Vas a pagar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {futureImpact.map((item, idx) => (
                                <tr key={idx} className="border-b border-gray-50 last:border-0">
                                    <td className="py-2 font-medium text-gray-600">{item.month}</td>
                                    <td className="py-2 text-right text-gray-400">{formatMoney(item.current)}</td>
                                    <td className="py-2 text-right font-bold text-gray-800">
                                        {formatMoney(item.new)} 
                                        {/* Dato extra eliminado */}
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
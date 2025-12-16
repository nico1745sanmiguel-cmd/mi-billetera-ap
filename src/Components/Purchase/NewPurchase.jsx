import React, { useState, useMemo, useRef } from 'react';
import { formatMoney } from '../../utils';
import Toast from '../UI/Toast';

// --- LÓGICA DE LOGOS PNG ---
const getBrandLogo = (name) => {
    const n = (name || '').toLowerCase();
    let logoSrc = null;
    if (n.includes('visa')) logoSrc = '/logos/visa.png';
    else if (n.includes('master')) logoSrc = '/logos/mastercard.png';
    else if (n.includes('amex') || n.includes('american')) logoSrc = '/logos/amex.png';

    if (logoSrc) return <img src={logoSrc} alt="Logo" className="h-8 w-auto object-contain drop-shadow-md filter brightness-110" />;
    return <span className="font-bold text-white text-[10px] tracking-widest uppercase opacity-80">TARJETA</span>;
};

// --- CATEGORÍAS (Para clasificar gastos) ---
const CATEGORIES = [
  { id: 'supermarket', label: 'Supermercado' },
  { id: 'health', label: 'Salud / Farmacia' },
  { id: 'food', label: 'Comida / Delivery' },
  { id: 'transport', label: 'Transporte / Nafta' },
  { id: 'services', label: 'Servicios' },
  { id: 'shopping', label: 'Ropa / Varios' },
  { id: 'home', label: 'Hogar' },
  { id: 'education', label: 'Educación' }
];

export default function NewPurchase({ cards, onSave, transactions, privacyMode }) {
  const [toast, setToast] = useState(null);
  const cardsContainerRef = useRef(null);
  
  // NUEVO: Estado para el Modo de Pago ('cash' por defecto, 'credit')
  const [paymentMethod, setPaymentMethod] = useState('cash'); 
  const [category, setCategory] = useState('supermarket');

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

  const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);

  const handleCardSelect = (cardId, index) => {
    setForm({ ...form, cardId });
    if (cardsContainerRef.current) {
        const container = cardsContainerRef.current;
        const cardElement = container.children[index];
        const scrollLeft = cardElement.offsetLeft - (container.clientWidth / 2) + (cardElement.clientWidth / 2);
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  };

  // --- CÁLCULOS (Solo relevantes para Crédito) ---
  const selectedCard = cards.find(c => c.id == form.cardId);

  const getCardAvailability = (card) => {
      if (!card) return { availableInstallments: 0, availableOneShot: 0 };
      const usedLimit = transactions
        .filter(t => t.cardId == card.id)
        .reduce((acc, t) => acc + Number(t.finalAmount || t.amount), 0);
      
      return {
          availableInstallments: Number(card.limit) - usedLimit,
          availableOneShot: (Number(card.limitOneShot) || Number(card.limit)) - usedLimit
      };
  };

  const selectedStatus = useMemo(() => {
    if (paymentMethod === 'cash') return { availableOneShot: 999999999, availableInstallments: 999999999 };
    if (!selectedCard) return { availableOneShot: 0, availableInstallments: 0 };
    return getCardAvailability(selectedCard);
  }, [transactions, form.cardId, selectedCard, paymentMethod]);

  const purchaseCalc = useMemo(() => {
    const base = parseInputValue(form.amount);
    
    // Si es contado, es simple
    if (paymentMethod === 'cash') {
        return { base, total: base, quota: base };
    }

    // Si es crédito, aplicamos la lógica compleja
    const bonus = parseInputValue(form.bonus);
    const interestAmt = base * (Number(form.interest) / 100);
    const total = base + interestAmt - bonus;
    return {
        base,
        total,
        quota: total / (Number(form.installments) || 1)
    };
  }, [form.amount, form.interest, form.bonus, form.installments, paymentMethod]);

  // Proyección Futura (Solo visible en Crédito)
  const futureImpact = useMemo(() => {
    if (paymentMethod === 'cash' || purchaseCalc.total <= 0) return [];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const purchaseDate = new Date(form.date); 
    const localPurchaseDate = new Date(purchaseDate.valueOf() + purchaseDate.getTimezoneOffset() * 60000);

    let projection = [];
    const count = Math.min(Number(form.installments), 6); 

    for (let i = 0; i < count; i++) {
        const targetDate = new Date(localPurchaseDate.getFullYear(), localPurchaseDate.getMonth() + i, 1);
        const monthLabel = `${months[targetDate.getMonth()]} ${targetDate.getFullYear().toString().substr(2)}`;
        
        let existingGlobal = 0;
        let existingCard = 0;

        transactions.forEach(t => {
            const tDate = new Date(t.date);
            const tLocal = new Date(tDate.valueOf() + tDate.getTimezoneOffset() * 60000);
            const tEnd = new Date(tLocal.getFullYear(), tLocal.getMonth() + Number(t.installments), 1);
            
            if (targetDate >= new Date(tLocal.getFullYear(), tLocal.getMonth(), 1) && targetDate < tEnd) {
                 const monthlyVal = Number(t.monthlyInstallment) || 0;
                 existingGlobal += monthlyVal;
                 if (t.cardId == form.cardId) existingCard += monthlyVal;
            }
        });

        projection.push({
            month: monthLabel,
            newCardTotal: existingCard + purchaseCalc.quota,
            newGlobalTotal: existingGlobal + purchaseCalc.quota
        });
    }
    return projection;
  }, [transactions, purchaseCalc, form.installments, form.date, form.cardId, paymentMethod]);


  const handleSubmit = (e) => {
    e.preventDefault();
    if (purchaseCalc.total <= 0) {
        setToast({ message: 'Ingresa un monto válido', type: 'error' });
        return;
    }
    
    // Validación de límite (Solo si es crédito)
    if (paymentMethod === 'credit') {
        const limitToCheck = Number(form.installments) === 1 ? selectedStatus.availableOneShot : selectedStatus.availableInstallments;
        if (purchaseCalc.total > limitToCheck) {
            if(!window.confirm("⚠️ ¡ALERTA DE LÍMITE! \nEstás superando el disponible.\n¿Guardar igual?")) return;
        }
    }

    const transactionData = { 
        ...form, 
        id: Date.now(), 
        amount: purchaseCalc.base, 
        finalAmount: purchaseCalc.total, 
        monthlyInstallment: purchaseCalc.quota,
        installments: paymentMethod === 'cash' ? 1 : Number(form.installments),
        bonus: parseInputValue(form.bonus),
        category: category,
        type: paymentMethod, // 'credit' o 'cash'
        cardId: paymentMethod === 'cash' ? null : form.cardId // Si es contado, borramos cardId
    };

    onSave(transactionData);
    setToast({ message: paymentMethod === 'credit' ? '¡Compra guardada!' : '¡Pago registrado!', type: 'success' });
    setForm({ ...form, description: '', amount: '', bonus: '', interest: 0, installments: 1 });
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200 max-w-3xl mx-auto relative animate-fade-in pb-20">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* --- 0. NUEVO: TOGGLE CRÉDITO / CONTADO --- */}
        <div className="bg-gray-100 p-1 rounded-xl flex text-sm font-bold mb-4">
            <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`flex-1 py-3 rounded-lg transition-all ${paymentMethod === 'cash' ? 'bg-white text-green-600 shadow-sm border border-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
            >
                💵 Contado
            </button>
            <button
                type="button"
                onClick={() => setPaymentMethod('credit')}
                className={`flex-1 py-3 rounded-lg transition-all ${paymentMethod === 'credit' ? 'bg-white text-blue-600 shadow-sm border border-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
            >
                💳 Crédito
            </button>
        </div>

        {/* --- 1. SELECCIÓN DE TARJETA (Solo visible en CRÉDITO) --- */}
        {paymentMethod === 'credit' && (
            <div className="animate-fade-in">
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">1. Selecciona tu Tarjeta</label>
                <div 
                    ref={cardsContainerRef}
                    className="flex overflow-x-auto overflow-y-hidden gap-4 py-6 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 touch-pan-x"
                    style={{ scrollBehavior: 'smooth' }}
                >
                    {cards.map((card, index) => {
                        const isSelected = form.cardId == card.id;
                        const { availableInstallments, availableOneShot } = getCardAvailability(card);
                        return (
                            <div 
                                key={card.id}
                                onClick={() => handleCardSelect(card.id, index)}
                                className={`relative flex-shrink-0 w-[85vw] max-w-[300px] h-44 rounded-2xl cursor-pointer transition-all duration-300 snap-center ${isSelected ? 'ring-4 ring-blue-400 scale-105 shadow-xl z-10' : 'opacity-60 scale-95 grayscale-[0.5]'}`}
                                style={{ background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}DD 100%)` }}
                            >
                                <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-gradient-to-br from-white/20 to-transparent rotate-45 pointer-events-none"></div>
                                <div className="absolute inset-0 p-5 flex flex-col justify-between text-white z-10">
                                    <div className="flex justify-between items-start">
                                        <span className="font-bold text-sm uppercase opacity-90 drop-shadow-md">{card.bank}</span>
                                        {getBrandLogo(card.name)}
                                    </div>
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-[10px] opacity-70 uppercase tracking-widest drop-shadow-sm">Disp. Cuotas</p>
                                            <p className="font-mono text-xl font-bold truncate drop-shadow-md text-shadow-sm">{showMoney(availableInstallments)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] opacity-70 uppercase tracking-widest drop-shadow-sm">Disp. 1 Pago</p>
                                            <p className="font-mono text-sm font-medium truncate drop-shadow-md opacity-90">{showMoney(availableOneShot)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {/* --- 2. DETALLES (Monto y Descripción) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">2. ¿Qué vas a comprar?</label>
                <input required name="description" value={form.description} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 placeholder-gray-300" placeholder={paymentMethod === 'credit' ? "Descripción del gasto" : "Ej: Nafta, Kiosco..."} />
            </div>
            
            {/* NUEVO: CATEGORÍAS */}
            <div className="md:col-span-2">
                 <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Categoría</label>
                 <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCategory(cat.id)}
                            className={`whitespace-nowrap py-2 px-3 rounded-lg text-xs font-bold transition-all border ${category === cat.id ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
                        >
                            {cat.label}
                        </button>
                    ))}
                 </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">3. Monto Total</label>
                <input required type="text" name="amount" value={form.amount} onChange={handleMoneyChange} inputMode="numeric" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-xl font-bold text-gray-800" placeholder="$ 0" autoComplete="off"/>
            </div>
            <div>
                 <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Fecha</label>
                 <input type="date" name="date" value={form.date} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none text-gray-600 font-medium" />
            </div>
        </div>

        {/* --- 3. FINANCIACIÓN (Solo visible en CRÉDITO) --- */}
        {paymentMethod === 'credit' && (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 animate-fade-in">
                <label className="block text-xs font-bold text-gray-400 mb-3 uppercase tracking-wide">4. Plan de Pagos</label>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Cuotas</label>
                        <select name="installments" value={form.installments} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:outline-none text-sm font-bold shadow-sm">
                            {[1, 3, 6, 9, 12, 18, 24].map(n => <option key={n} value={n}>{n} {n===1 ? 'pago' : 'cuotas'}</option>)}
                        </select>
                    </div>
                    <div><label className="block text-[10px] font-bold text-gray-500 mb-1">Interés (%)</label><input type="number" name="interest" value={form.interest} onChange={handleChange} inputMode="numeric" className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none text-sm text-center shadow-sm" placeholder="0" /></div>
                    <div><label className="block text-[10px] font-bold text-gray-500 mb-1">Bonif. ($)</label><input type="text" name="bonus" value={form.bonus} onChange={handleMoneyChange} inputMode="numeric" className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none text-sm text-center text-green-600 font-bold shadow-sm" placeholder="$ 0" /></div>
                </div>
            </div>
        )}

        {/* --- 4. SIMULADOR (Solo visible en CRÉDITO y si hay monto) --- */}
        {paymentMethod === 'credit' && purchaseCalc.total > 0 && (
            <div className="mt-6 border-t border-gray-100 pt-4 animate-fade-in-up">
                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">📊 Impacto en tu Economía</h4>
                <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                    <span className="text-blue-800 text-sm">Vas a pagar por mes:</span>
                    <span className="text-xl font-bold text-blue-900">{showMoney(purchaseCalc.quota)}</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-gray-400 border-b border-gray-100 uppercase tracking-wide">
                                <th className="text-left py-2 font-bold">Mes</th>
                                <th className="text-right py-2 font-bold">Total {selectedCard?.bank || 'Tarjeta'}</th>
                                <th className="text-right py-2 font-bold text-gray-800">Total Global</th>
                            </tr>
                        </thead>
                        <tbody>
                            {futureImpact.map((item, idx) => (
                                <tr key={idx} className="border-b border-gray-50 last:border-0">
                                    <td className="py-2.5 font-medium text-gray-500">{item.month}</td>
                                    <td className="py-2.5 text-right font-medium text-blue-600">{showMoney(item.newCardTotal)}</td>
                                    <td className="py-2.5 text-right font-bold text-gray-900">{showMoney(item.newGlobalTotal)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* BOTÓN CONFIRMAR */}
        <div className="pt-2">
            <button 
                type="submit" 
                className={`w-full py-4 text-white text-base font-bold rounded-xl shadow-lg transition-transform active:scale-95 ${paymentMethod === 'credit' ? 'bg-[#3483fa] hover:bg-[#2968c8] shadow-blue-200' : 'bg-green-600 hover:bg-green-700 shadow-green-200'}`}
            >
                {paymentMethod === 'credit' ? 'Confirmar Compra' : 'Registrar Pago Contado'}
            </button>
        </div>
      </form>
    </div>
  );
}
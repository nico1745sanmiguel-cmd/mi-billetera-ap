import React, { useState, useEffect } from 'react';

export default function NewPurchase({ cards, onSave, transactions, privacyMode, currentDate, isGlass, householdId }) {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [type, setType] = useState('cash'); // 'cash' | 'credit'
    const [selectedCard, setSelectedCard] = useState('');
    const [installments, setInstallments] = useState(1);
    const [category, setCategory] = useState('varios');
    const [isShared, setIsShared] = useState(true); // Default shared in household context

    // --- MÁQUINA DEL TIEMPO ⏳ ---
    // Si cambiamos de mes en el Home, al entrar aquí la fecha se ajusta al mes seleccionado
    useEffect(() => {
        if (currentDate) {
            const realToday = new Date();
            const isSameMonth = currentDate.getMonth() === realToday.getMonth() && currentDate.getFullYear() === realToday.getFullYear();

            if (isSameMonth) {
                // Si es el mes actual, usamos el día de hoy
                setDate(realToday.toISOString().split('T')[0]);
            } else {
                // Si es otro mes (futuro/pasado), ponemos el día 1 por defecto para facilitar
                const year = currentDate.getFullYear();
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                setDate(`${year}-${month}-01`);
            }
        }
    }, [currentDate]);

    // Selección automática de tarjeta si hay una sola
    useEffect(() => {
        if (type === 'credit' && cards.length === 1 && !selectedCard) {
            setSelectedCard(cards[0].id);
        }
    }, [type, cards, selectedCard]);

    // --- OPTIMIZACIÓN DE LOGOS (Lazy Loading) 🚀 ---
    const getBrandLogo = (cardName) => {
        const name = cardName.toLowerCase();
        let src = '';
        if (name.includes('visa')) src = '/logos/visa.png';
        else if (name.includes('master')) src = '/logos/mastercard.png';
        else if (name.includes('amex') || name.includes('american')) src = '/logos/amex.png';

        // Si encontramos logo, lo mostramos con LAZY LOADING
        if (src) return <img src={src} alt="Logo" loading="lazy" className="h-6 w-auto object-contain drop-shadow-sm opacity-80" />;

        // Fallback texto
        return <span className="text-[10px] font-bold bg-gray-100 px-1 rounded text-gray-500">{cardName.substring(0, 3)}</span>;
    };

    const handleSave = (e) => {
        e.preventDefault();
        if (!amount || !description) return;

        const transactionData = {
            amount: Number(amount),
            description,
            date, // YYYY-MM-DD
            category,
            type,
            createdAt: new Date().toISOString(),
            isShared: isShared, // Pass explicitly logic for App.jsx to use
        };

        if (type === 'credit') {
            if (!selectedCard) {
                alert("Selecciona una tarjeta");
                return;
            }
            transactionData.cardId = selectedCard;
            transactionData.installments = Number(installments);
            // Calculamos cuota mensual simple
            transactionData.monthlyInstallment = transactionData.amount / transactionData.installments;
        }

        onSave(transactionData);

        // Reset form (opcional, aunque normalmente navegamos fuera)
        setAmount('');
        setDescription('');
    };

    return (
        <div className="animate-fade-in max-w-lg mx-auto pb-20">

            {/* HEADER */}
            <div className="flex items-center gap-3 mb-6 px-2">
                <div className={`p-3 rounded-[24px] shadow-lg border ${isGlass ? 'bg-white/10 text-white border-white/20' : 'bg-gray-900 text-white shadow-gray-200'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </div>
                <div>
                    <h2 className={`text-xl font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>Nuevo Gasto</h2>
                    <p className={`text-xs font-medium ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>Registrar movimiento</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">

                {/* MONTO PRINCIPAL - CAJA GLASS */}
                <div className={`p-4 rounded-[30px] shadow-sm border text-center relative overflow-hidden group focus-within:ring-4 transition-all ${isGlass ? 'bg-white/5 border-white/10 focus-within:border-white/30 focus-within:ring-white/10' : 'bg-white border-gray-100 focus-within:border-blue-500 focus-within:ring-blue-50'}`}>
                    <p className={`text-xs font-bold uppercase mb-1 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>¿Cuánto gastaste?</p>
                    <div className="flex justify-center items-center gap-1">
                        <span className={`text-3xl font-bold ${isGlass ? 'text-white/30' : 'text-gray-300'}`}>$</span>
                        <input
                            type="tel"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                            className={`text-5xl font-bold w-full text-center outline-none bg-transparent ${isGlass ? 'text-white placeholder-white/10' : 'text-gray-800 placeholder-gray-200'}`}
                            placeholder="0"
                            autoFocus
                        />
                    </div>
                </div>

                {/* DETALLES - CAJA GLASS */}
                <div className={`p-5 rounded-[30px] shadow-sm border space-y-5 ${isGlass ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}>

                    {/* Descripción */}
                    <div>
                        <label className={`block text-xs font-bold uppercase mb-2 ml-1 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Descripción</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className={`w-full border rounded-2xl p-4 font-bold outline-none transition-colors ${isGlass ? 'bg-white/5 border-white/10 text-white placeholder-white/20 focus:bg-white/10 focus:border-white/30' : 'bg-gray-50 border-gray-200 text-gray-700 focus:bg-white focus:border-blue-500'}`}
                            placeholder="Ej: Supermercado, Nafta..."
                        />
                    </div>

                    {/* Fecha y Categoría */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-xs font-bold uppercase mb-2 ml-1 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Fecha</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className={`w-full border rounded-2xl p-3 font-bold outline-none text-sm text-center ${isGlass ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                            />
                        </div>
                        <div>
                            <label className={`block text-xs font-bold uppercase mb-2 ml-1 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Categoría</label>
                            <div className="relative">
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className={`w-full border rounded-2xl p-3 font-bold outline-none text-sm appearance-none ${isGlass ? 'bg-black/20 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                                >
                                    <option value="varios">Varios</option>
                                    <option value="supermarket">Supermercado</option>
                                    <option value="food">Comida</option>
                                    <option value="transport">Transporte</option>
                                    <option value="services">Servicios</option>
                                    <option value="home">Hogar</option>
                                    <option value="health">Salud</option>
                                    <option value="shopping">Compras</option>
                                    <option value="education">Educación</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                            </div>
                        </div>
                    </div>

                    {/* Visibilidad Hogar (Solo si tiene Household) */}
                    {householdId && (
                        <div className="col-span-2">
                            <label className={`block text-xs font-bold uppercase mb-2 ml-1 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Visibilidad</label>
                            <div
                                onClick={() => setIsShared(!isShared)}
                                className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${isGlass ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${isShared ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                        {isShared ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                        )}
                                    </div>
                                    <div>
                                        <p className={`font-bold text-sm ${isGlass ? 'text-white' : 'text-gray-800'}`}>{isShared ? 'Compartido con Hogar' : 'Gasto Privado'}</p>
                                        <p className={`text-[10px] ${isGlass ? 'text-white/50' : 'text-gray-500'}`}>{isShared ? 'Visible para ambos' : 'Solo visible para vos'}</p>
                                    </div>
                                </div>

                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isShared ? 'bg-blue-500 border-blue-500' : 'border-gray-400'}`}>
                                    {isShared && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* MEDIO DE PAGO - CAJA GLASS */}
                <div className={`p-5 rounded-[30px] shadow-sm border ${isGlass ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}>
                    <label className={`block text-xs font-bold uppercase mb-3 ml-1 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Método de Pago</label>

                    <div className={`flex p-1 rounded-2xl mb-4 ${isGlass ? 'bg-white/5' : 'bg-gray-100'}`}>
                        <button
                            type="button"
                            onClick={() => setType('cash')}
                            className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${type === 'cash' ? (isGlass ? 'bg-white/10 text-green-300 shadow-sm border border-white/5' : 'bg-white text-green-600 shadow-sm') : (isGlass ? 'text-white/30 hover:text-white/60' : 'text-gray-400')}`}
                        >
                            💵 Efectivo / Débito
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('credit')}
                            className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${type === 'credit' ? (isGlass ? 'bg-white/10 text-blue-300 shadow-sm border border-white/5' : 'bg-white text-blue-600 shadow-sm') : (isGlass ? 'text-white/30 hover:text-white/60' : 'text-gray-400')}`}
                        >
                            💳 Crédito
                        </button>
                    </div>

                    {/* SELECCIÓN DE TARJETA (Solo si es Crédito) */}
                    {type === 'credit' && (
                        <div className="space-y-4 animate-fade-in">

                            {/* Lista Horizontal de Tarjetas */}
                            <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                                {cards.map((card) => (
                                    <div
                                        key={card.id}
                                        onClick={() => setSelectedCard(card.id)}
                                        className={`flex-shrink-0 cursor-pointer border-2 rounded-2xl p-3 w-32 relative transition-all ${selectedCard === card.id
                                            ? (isGlass ? 'border-blue-400/50 bg-blue-500/10' : 'border-blue-500 bg-blue-50')
                                            : (isGlass ? 'border-white/5 bg-white/5 hover:bg-white/10' : 'border-gray-100 bg-white hover:border-gray-200')
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            {getBrandLogo(card.name)}
                                            {selectedCard === card.id && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                                        </div>
                                        <p className={`text-xs font-bold truncate ${isGlass ? 'text-white' : 'text-gray-700'}`}>{card.name}</p>
                                        <p className={`text-[10px] ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>{card.bank}</p>
                                    </div>
                                ))}
                                {cards.length === 0 && <p className="text-xs text-red-400 font-bold p-2">Agrega tarjetas primero en "Mis Tarjetas"</p>}
                            </div>

                            {/* Selector de Cuotas */}
                            <div>
                                <label className={`block text-xs font-bold uppercase mb-2 ml-1 ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Cuotas</label>
                                <div className={`flex items-center gap-4 p-3 rounded-2xl border ${isGlass ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                                    <input
                                        type="range"
                                        min="1"
                                        max="12"
                                        step="1"
                                        value={installments}
                                        onChange={(e) => setInstallments(Number(e.target.value))}
                                        className={`flex-1 accent-blue-600 h-2 rounded-lg appearance-none cursor-pointer ${isGlass ? 'bg-white/10' : 'bg-gray-200'}`}
                                    />
                                    <div className={`px-4 py-2 rounded-lg border shadow-sm text-center min-w-[80px] ${isGlass ? 'bg-white/10 border-white/10' : 'bg-white border-gray-200'}`}>
                                        <span className={`text-lg font-bold ${isGlass ? 'text-blue-300' : 'text-blue-600'}`}>{installments}</span>
                                        <span className={`text-[10px] block font-bold uppercase ${isGlass ? 'text-white/40' : 'text-gray-400'}`}>Pagos</span>
                                    </div>
                                </div>
                                {amount > 0 && installments > 1 && (
                                    <p className={`text-center text-xs mt-2 font-medium ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>
                                        {installments} cuotas de <span className={`font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>${(amount / installments).toFixed(2)}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* BOTÓN FINAL */}
                <button
                    type="submit"
                    className={`w-full py-4 rounded-[30px] font-bold shadow-lg active:scale-95 transition-all text-lg ${isGlass ? 'bg-white text-indigo-900 border border-white/50 hover:bg-indigo-50' : 'bg-gray-900 text-white shadow-gray-400'}`}
                >
                    Guardar Gasto
                </button>

            </form>
        </div>
    );
}
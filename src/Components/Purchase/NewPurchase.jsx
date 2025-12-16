import React, { useState } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc } from 'firebase/firestore';

// Lista de categorías (Extensible en el futuro)
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
  // Estado Principal
  const [paymentMethod, setPaymentMethod] = useState('credit'); // 'credit' o 'cash'
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('supermarket'); // Categoría por defecto

  // Estado Crédito
  const [selectedCardId, setSelectedCardId] = useState(cards.length > 0 ? cards[0].id : '');
  const [installments, setInstallments] = useState(1);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || !auth.currentUser) return;

    // Preparar objeto base
    const transactionData = {
      amount: Number(amount),
      description: description || (paymentMethod === 'credit' ? 'Compra crédito' : 'Compra contado'),
      date: date,
      category: category,
      type: paymentMethod, // 'credit' o 'cash'
      userId: auth.currentUser.uid,
      createdAt: new Date().toISOString()
    };

    // Agregar datos específicos según el método
    if (paymentMethod === 'credit') {
      if (!selectedCardId) {
        alert("Por favor selecciona una tarjeta");
        return;
      }
      const card = cards.find(c => c.id === selectedCardId);
      // Cálculo de cuota simple (Interés 0 por ahora)
      const monthlyAmount = Number(amount) / Number(installments);
      
      Object.assign(transactionData, {
        cardId: selectedCardId,
        cardName: card ? card.name : 'Tarjeta',
        installments: Number(installments),
        monthlyInstallment: monthlyAmount,
        finalAmount: Number(amount) // Aquí podrías sumar interés si quisieras a futuro
      });
    } else {
      // Datos para Contado
      Object.assign(transactionData, {
        cardId: null, // Importante para filtrar luego
        installments: 1,
        monthlyInstallment: Number(amount),
        finalAmount: Number(amount)
      });
    }

    onSave(transactionData);
  };

  return (
    <div className="animate-fade-in pb-20">
      
      <h2 className="text-xl font-bold text-gray-800 mb-6 px-2">Registrar Gasto</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* 1. TOGGLE MÉTODO DE PAGO */}
        <div className="bg-gray-200 p-1 rounded-xl flex text-sm font-bold">
            <button
                type="button"
                onClick={() => setPaymentMethod('credit')}
                className={`flex-1 py-3 rounded-lg transition-all ${paymentMethod === 'credit' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
            >
                Crédito
            </button>
            <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`flex-1 py-3 rounded-lg transition-all ${paymentMethod === 'cash' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}
            >
                Contado
            </button>
        </div>

        {/* 2. MONTO */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Monto Total</label>
            <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-300">$</span>
                <input 
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    className="w-full text-3xl font-bold text-gray-800 outline-none placeholder-gray-200"
                    placeholder="0"
                    autoFocus
                />
            </div>
        </div>

        {/* 3. DESCRIPCIÓN */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Detalle</label>
            <input 
                type="text" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                className="w-full text-base font-medium text-gray-800 outline-none placeholder-gray-300 border-b border-gray-100 pb-2"
                placeholder="Ej: Supermercado, Nafta..."
            />
        </div>

        {/* 4. CATEGORÍAS (Para todos los métodos) */}
        <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-3 px-2">Categoría</label>
            <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border ${category === cat.id ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'}`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>
        </div>

        {/* 5. SECCIÓN ESPECÍFICA: CRÉDITO */}
        {paymentMethod === 'credit' && (
            <div className="space-y-6 animate-fade-in">
                {/* Selector de Tarjetas */}
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-3 px-2">Seleccionar Tarjeta</label>
                    <div className="flex overflow-x-auto gap-3 pb-4 px-2 snap-x hide-scrollbar">
                        {cards.map((card) => (
                            <div 
                                key={card.id}
                                onClick={() => setSelectedCardId(card.id)}
                                className={`flex-shrink-0 w-40 h-24 rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all border-2 snap-center ${selectedCardId === card.id ? 'border-blue-500 ring-2 ring-blue-100 transform scale-105' : 'border-transparent opacity-60'}`}
                                style={{ backgroundColor: card.color || '#333' }}
                            >
                                <span className="text-white text-[10px] font-bold uppercase tracking-wider">{card.bank}</span>
                                <span className="text-white text-xs font-bold">{card.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Cuotas */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Cantidad de Cuotas</label>
                    <div className="flex gap-4 items-center">
                        <input 
                            type="range" 
                            min="1" 
                            max="12" 
                            step="1" 
                            value={installments} 
                            onChange={(e) => setInstallments(e.target.value)}
                            className="w-full accent-blue-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span className="text-blue-600 font-bold text-xl">{installments}</span>
                        </div>
                    </div>
                    {amount > 0 && installments > 1 && (
                        <p className="text-right text-xs text-blue-600 font-bold mt-2">
                            {installments} cuotas de ${Math.round(amount / installments).toLocaleString()}
                        </p>
                    )}
                </div>
            </div>
        )}

        {/* 6. FECHA */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Fecha del Gasto</label>
            <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className="w-full font-bold text-gray-800 outline-none"
            />
        </div>

        {/* BOTÓN GUARDAR */}
        <button 
            type="submit" 
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg text-lg transition-transform active:scale-95 ${paymentMethod === 'credit' ? 'bg-[#3483fa]' : 'bg-green-600'}`}
        >
            {paymentMethod === 'credit' ? 'Confirmar Compra' : 'Registrar Pago'}
        </button>

      </form>
    </div>
  );
}
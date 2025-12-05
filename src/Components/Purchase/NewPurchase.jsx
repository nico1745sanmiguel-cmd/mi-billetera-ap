import React, { useState, useMemo } from 'react';

export default function NewPurchase({ cards, onSave, transactions }) {
  const [form, setForm] = useState({
    description: '',
    cardId: cards[0]?.id || '',
    amount: '',
    installments: 1,
    interest: 0, // Porcentaje
    bonus: 0,    // Monto fijo descuento
    date: new Date().toISOString().split('T')[0]
  });

  const selectedCard = cards.find(c => c.id == form.cardId);

  // Cálculos en tiempo real
  const finalAmount = useMemo(() => {
    const base = Number(form.amount) || 0;
    const interestAmt = base * (Number(form.interest) / 100);
    const bonusAmt = Number(form.bonus) || 0;
    return (base + interestAmt - bonusAmt);
  }, [form.amount, form.interest, form.bonus]);

  const monthlyInstallment = finalAmount / (Number(form.installments) || 1);

  // Calcular compromiso actual del mes seleccionado (Feedback inmediato)
  const currentMonthCommitment = useMemo(() => {
    // Lógica simple: suma cuotas activas este mes para la tarjeta seleccionada
    // (En una app real, esto requiere lógica de fechas compleja, aquí simplificado para demo visual)
    return transactions
      .filter(t => t.cardId == form.cardId)
      .reduce((acc, t) => acc + (t.finalAmount / t.installments), 0);
  }, [transactions, form.cardId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, id: Date.now(), finalAmount, monthlyInstallment });
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200 max-w-2xl mx-auto">
      <h2 className="text-xl font-medium text-gray-900 mb-6 pb-2 border-b border-gray-100">Ingresar Consumo</h2>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Descripción</label>
            <input required name="description" value={form.description} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm" placeholder="Ej. Supermercado" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Tarjeta</label>
            <select name="cardId" value={form.cardId} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded bg-white focus:outline-none text-sm">
              {cards.map(c => <option key={c.id} value={c.id}>{c.name} ({c.bank})</option>)}
            </select>
          </div>
           
          <div>
             <label className="block text-xs text-gray-500 mb-1">Fecha de Compra</label>
             <input type="date" name="date" value={form.date} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded focus:outline-none text-sm" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Monto Base ($)</label>
            <input required type="number" name="amount" value={form.amount} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded focus:outline-none text-sm" placeholder="0.00" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Cuotas</label>
            <select name="installments" value={form.installments} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded bg-white focus:outline-none text-sm">
              {[1, 3, 6, 9, 12, 18, 24].map(n => <option key={n} value={n}>{n} cuotas</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Interés (%)</label>
            <input type="number" name="interest" value={form.interest} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded focus:outline-none text-sm" placeholder="0" />
          </div>

          <div>
             <label className="block text-xs text-gray-500 mb-1">Bonificación / Descuento ($)</label>
             <input type="number" name="bonus" value={form.bonus} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded focus:outline-none text-sm" placeholder="0" />
          </div>
        </div>

        {/* --- Sección de Alertas / Feedback --- */}
        <div className="bg-blue-50 p-4 rounded border border-blue-100 mt-4">
          <div className="flex justify-between items-center mb-1">
             <span className="text-sm text-blue-800">Valor Cuota Nueva:</span>
             <span className="font-bold text-blue-900">${monthlyInstallment.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center mb-1">
             <span className="text-sm text-blue-800">Total Final:</span>
             <span className="font-bold text-blue-900">${finalAmount.toFixed(2)}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-blue-200 text-xs text-blue-600">
             Actualmente tienes comprometidos <strong>${currentMonthCommitment.toFixed(2)}</strong> mensuales en {selectedCard?.name}.
             Pasarás a pagar <strong>${(currentMonthCommitment + monthlyInstallment).toFixed(2)}</strong>.
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
           <button type="button" className="px-4 py-2 text-blue-500 text-sm font-medium hover:bg-blue-50 rounded">Cancelar</button>
           <button type="submit" className="px-6 py-2 bg-[#3483fa] text-white text-sm font-medium rounded hover:bg-[#2968c8] shadow-sm">Confirmar Compra</button>
        </div>
      </form>
    </div>
  );
}
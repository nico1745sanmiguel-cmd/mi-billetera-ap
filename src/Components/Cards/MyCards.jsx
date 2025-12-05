import React from 'react';

export default function MyCards({ cards, onAddCard }) {
  
  // Función helper para agregar una dummy
  const handleAddMock = () => {
    const banks = ['HSBC', 'ICBC', 'Macro', 'Naranja'];
    const randomBank = banks[Math.floor(Math.random() * banks.length)];
    onAddCard({
        id: Date.now(),
        name: `${randomBank} Black`,
        bank: randomBank,
        limit: 1000000,
        closeDay: 1,
        dueDay: 10
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-medium text-gray-900">Mis Tarjetas</h2>
        <button onClick={handleAddMock} className="text-[#3483fa] text-sm font-medium hover:underline">
          + Agregar nueva tarjeta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 relative overflow-hidden group hover:shadow-md transition-shadow">
            {/* Banda de color decorativa */}
            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: card.color || '#3483fa' }}></div>
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">{card.name}</h3>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{card.bank}</p>
              </div>
              <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">**** 1234</div>
            </div>

            <div className="space-y-3 mt-4">
              <div>
                <p className="text-xs text-gray-400">Límite Total</p>
                <p className="font-medium text-gray-900 text-lg">${card.limit.toLocaleString()}</p>
              </div>
              
              <div className="flex justify-between pt-3 border-t border-gray-50">
                <div>
                   <p className="text-xs text-gray-400">Cierre</p>
                   <p className="text-sm font-medium text-gray-700">Día {card.closeDay}</p>
                </div>
                <div className="text-right">
                   <p className="text-xs text-gray-400">Vencimiento</p>
                   <p className="text-sm font-medium text-gray-700">Día {card.dueDay}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
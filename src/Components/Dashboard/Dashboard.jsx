import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Treemap 
} from 'recharts';
import { db } from '../../firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { formatMoney } from '../../utils';

// Colores seguros para el gráfico
const TREE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

// Componente visual del Treemap (VERSIÓN BLINDADA)
const CustomizedContent = (props) => {
    // Protección contra valores nulos
    const { x, y, width, height, index, name, value } = props;
    
    if (!width || !height) return null; // Si no hay dimensiones, no dibuja nada (evita crash)

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: TREE_COLORS[index % TREE_COLORS.length],
            stroke: '#fff',
            strokeWidth: 2,
            opacity: 0.9,
          }}
        />
        {/* Solo mostramos texto si el cuadro es grande */}
        {width > 60 && height > 35 && (
            <>
                <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="#fff" fontSize={11} fontWeight="bold" style={{ pointerEvents: 'none' }}>
                    {name ? (name.length > 10 ? name.substring(0, 10) + '..' : name) : ''}
                </text>
                <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize={10} style={{ pointerEvents: 'none' }}>
                    {formatMoney(value)}
                </text>
            </>
        )}
      </g>
    );
};

export default function Dashboard({ transactions = [], cards = [] }) {
  const [viewMode, setViewMode] = useState('bars'); // 'bars', 'tree', 'list'
  
  // --- ESTADO PARA EDICIÓN ---
  const [editingTx, setEditingTx] = useState(null); // Guarda la compra que estás editando
  const [editForm, setEditForm] = useState({ description: '', amount: '', installments: '' });

  // --- LÓGICA DE DATOS ---
  const totalDebt = useMemo(() => {
    if (!transactions) return 0;
    return transactions.reduce((acc, t) => acc + Number(t.finalAmount || t.amount || 0), 0);
  }, [transactions]);

  const projectedData = useMemo(() => {
    if (!transactions || !cards) return [];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const today = new Date();
    const result = [];

    for (let i = 0; i < 6; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const monthKey = `${months[d.getMonth()]} ${d.getFullYear().toString().substr(2)}`;
        let monthData = { name: monthKey, total: 0 };
        cards.forEach(c => monthData[c.name] = 0);

        transactions.forEach(t => {
            const tAmount = Number(t.finalAmount || t.amount || 0);
            const tInstallments = Number(t.installments || 1);
            const tDate = new Date(t.date);
            const localDate = new Date(tDate.valueOf() + tDate.getTimezoneOffset() * 60000);
            const tEnd = new Date(localDate.getFullYear(), localDate.getMonth() + tInstallments, 1);
            const currentLoopMonth = new Date(d.getFullYear(), d.getMonth(), 1);

            if (currentLoopMonth >= new Date(localDate.getFullYear(), localDate.getMonth(), 1) && currentLoopMonth < tEnd) {
                const cardObj = cards.find(c => c.id == t.cardId);
                const cardName = cardObj ? cardObj.name : 'Otras';
                const quotaValue = tAmount / tInstallments;

                if (monthData[cardName] !== undefined) {
                    monthData[cardName] += quotaValue;
                } else {
                    monthData['Otras'] = (monthData['Otras'] || 0) + quotaValue;
                }
                monthData.total += quotaValue;
            }
        });
        result.push(monthData);
    }
    return result;
  }, [transactions, cards]);

  const treeData = useMemo(() => {
    if (!transactions) return [];
    return transactions
      .filter(t => (Number(t.finalAmount) || Number(t.amount)) > 0)
      .map(t => ({
        name: t.description || 'Sin nombre',
        size: Number(t.finalAmount || t.amount),
      }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 15);
  }, [transactions]);

  // --- FUNCIONES DE EDICIÓN ---
  const handleEditClick = (tx) => {
    setEditingTx(tx.id);
    setEditForm({
        description: tx.description,
        amount: tx.amount || tx.finalAmount,
        installments: tx.installments
    });
  };

  const handleUpdate = async () => {
    try {
        const newAmount = Number(editForm.amount);
        const newInstallments = Number(editForm.installments);
        
        await updateDoc(doc(db, 'transactions', editingTx), {
            description: editForm.description,
            amount: newAmount,
            finalAmount: newAmount, // Actualizamos ambos por las dudas
            installments: newInstallments,
            monthlyInstallment: newAmount / newInstallments
        });
        setEditingTx(null); // Cerrar modal
    } catch (error) {
        console.error("Error al actualizar", error);
        alert("Error al actualizar");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Borrar esta compra permanentemente?")) {
        try {
            await deleteDoc(doc(db, 'transactions', id));
        } catch (error) {
            console.error(error);
        }
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* KPI UNIFICADO */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Deuda Total Procesada</p>
                    <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-1 tracking-tight">
                        {formatMoney(totalDebt)}
                    </h2>
                </div>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 gap-8">
                <div>
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">A Pagar este Mes</p>
                    <p className="text-xl font-bold text-gray-800">
                        {formatMoney(projectedData[0]?.total || 0)}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Compras Activas</p>
                    <p className="text-xl font-bold text-gray-800">
                        {transactions ? transactions.length : 0} <span className="text-sm font-normal text-gray-400">items</span>
                    </p>
                </div>
            </div>
        </div>
      </div>

      {/* SECCIÓN PRINCIPAL */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 min-h-[500px]">
         
         <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
            <h3 className="text-lg font-bold text-gray-800">Análisis de Consumos</h3>
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setViewMode('bars')} className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${viewMode === 'bars' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Proyección</button>
                <button onClick={() => setViewMode('tree')} className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${viewMode === 'tree' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Mapa</button>
                <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Lista</button>
            </div>
         </div>

         <div className="w-full h-[400px]">
            {/* VISTA BARRAS */}
            {viewMode === 'bars' && (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectedData} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                        <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{ borderRadius: '4px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} formatter={(value) => [formatMoney(value), 'Cuota']} />
                        <Legend />
                        {cards.map((card, index) => (
                            <Bar key={card.id} dataKey={card.name} stackId="a" fill={card.color || '#3483fa'} radius={index === cards.length - 1 ? [4, 4, 0, 0] : [0,0,0,0]} />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            )}

            {/* VISTA TREEMAP (Con protección) */}
            {viewMode === 'tree' && (
                treeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <Treemap
                            data={treeData}
                            dataKey="size"
                            aspectRatio={4 / 3}
                            stroke="#fff"
                            fill="#8884d8"
                            content={<CustomizedContent />}
                        >
                            <Tooltip contentStyle={{ borderRadius: '4px' }} formatter={(value) => formatMoney(value)} />
                        </Treemap>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">No hay datos suficientes para el mapa</div>
                )
            )}

            {/* VISTA LISTA (Con Edición y Columna Cuota) */}
            {viewMode === 'list' && (
                <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white z-10">
                            <tr className="text-xs text-gray-400 border-b border-gray-100 uppercase tracking-wider">
                                <th className="pb-3 font-medium">Fecha</th>
                                <th className="pb-3 font-medium">Descripción</th>
                                <th className="pb-3 font-medium">Cuotas</th>
                                <th className="pb-3 font-medium text-right">Valor Cuota</th>
                                <th className="pb-3 font-medium text-right">Total</th>
                                <th className="pb-3 font-medium text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {transactions.map((t) => {
                                // Cálculo seguro de cuota
                                const amount = Number(t.finalAmount || t.amount || 0);
                                const installments = Number(t.installments || 1);
                                const quota = amount / installments;

                                return (
                                <tr key={t.id} className="group hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                                    <td className="py-3 text-gray-500 whitespace-nowrap text-xs">{t.date}</td>
                                    <td className="py-3 font-medium text-gray-800">{t.description}</td>
                                    <td className="py-3 text-gray-500 text-center">
                                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">{installments}</span>
                                    </td>
                                    <td className="py-3 text-right text-gray-600">
                                        {formatMoney(quota)}
                                    </td>
                                    <td className="py-3 text-right font-medium text-gray-900">
                                        {formatMoney(amount)}
                                    </td>
                                    <td className="py-3 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleEditClick(t)} className="text-blue-500 hover:text-blue-700 text-xs font-bold underline">Editar</button>
                                            <button onClick={() => handleDelete(t.id)} className="text-red-400 hover:text-red-600 text-xs font-bold underline">Borrar</button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            )}
         </div>
      </section>

      {/* MODAL DE EDICIÓN FLOTANTE */}
      {editingTx && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">Editar Compra</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500">Descripción</label>
                        <input className="w-full border p-2 rounded" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500">Monto Total</label>
                            <input type="number" className="w-full border p-2 rounded" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500">Cuotas</label>
                            <input type="number" className="w-full border p-2 rounded" value={editForm.installments} onChange={e => setEditForm({...editForm, installments: e.target.value})} />
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={() => setEditingTx(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm font-bold">Cancelar</button>
                    <button onClick={handleUpdate} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700">Guardar Cambios</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}
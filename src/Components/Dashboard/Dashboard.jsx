import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Treemap 
} from 'recharts';
import { db } from '../../firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { formatMoney } from '../../utils';

// Colores suaves para el gráfico
const TREE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

// Helper para fecha DD/MM
const formatDate = (dateString) => {
    if (!dateString) return '';
    const parts = dateString.split('-'); // 2025-12-31
    return `${parts[2]}/${parts[1]}`;   // 31/12
};

// 1. Tooltip del Treemap (Ahora muestra cuotas)
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 shadow-lg rounded text-xs z-50">
        <p className="font-bold text-gray-800 text-sm mb-1">{data.name}</p>
        <p className="text-gray-500 mb-1">Plan: {data.installments} cuotas</p>
        <p className="text-blue-600 font-bold text-lg">
          {formatMoney(data.value)}
        </p>
      </div>
    );
  }
  return null;
};

// Componente visual del Treemap (VERSIÓN ULTRA FINA)
const CustomizedContent = (props) => {
    const { x, y, width, height, index, name, value } = props;
    
    if (!width || !height) return null;

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
                {/* NOMBRE: Letra fina (300) y sin sombra */}
                <text 
                    x={x + width / 2} 
                    y={y + height / 2 - 6} 
                    textAnchor="middle" 
                    fill="#fff" 
                    fontSize={10} 
                    style={{ pointerEvents: 'none', fontWeight: 300, textShadow: 'none' }}
                >
                    {name ? (name.length > 12 ? name.substring(0, 12) + '..' : name) : ''}
                </text>
                
                {/* MONTO: Letra fina y un poco transparente */}
                <text 
                    x={x + width / 2} 
                    y={y + height / 2 + 8} 
                    textAnchor="middle" 
                    fill="rgba(255,255,255,0.9)" 
                    fontSize={9} 
                    style={{ pointerEvents: 'none', fontWeight: 300, textShadow: 'none' }}
                >
                    {formatMoney(value)}
                </text>
            </>
        )}
      </g>
    );
};

export default function Dashboard({ transactions = [], cards = [] }) {
  const [viewMode, setViewMode] = useState('bars'); // 'bars', 'tree', 'list'
  const [editingTx, setEditingTx] = useState(null); 
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
        installments: t.installments // Pasamos cuotas para el tooltip
      }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 15);
  }, [transactions]);

  // --- ACCIONES ---
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
            finalAmount: newAmount, 
            installments: newInstallments,
            monthlyInstallment: newAmount / newInstallments
        });
        setEditingTx(null); 
    } catch (error) {
        console.error("Error al actualizar", error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("¿Estás seguro de borrar esta compra para siempre?")) {
        try {
            await deleteDoc(doc(db, 'transactions', editingTx));
            setEditingTx(null); // Cerrar modal tras borrar
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

            {/* VISTA TREEMAP */}
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
                            <Tooltip content={<CustomTooltip />} />
                        </Treemap>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">No hay datos suficientes</div>
                )
            )}

            {/* VISTA LISTA APILADA (Mobile Friendly) */}
            {viewMode === 'list' && (
                <div className="h-full overflow-y-auto pr-1 custom-scrollbar space-y-3">
                    {transactions.map((t) => {
                        const amount = Number(t.finalAmount || t.amount || 0);
                        const installments = Number(t.installments || 1);
                        const quota = amount / installments;

                        return (
                            <div key={t.id} className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                                {/* Fila Superior: Título y Fecha */}
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-gray-800 text-sm truncate pr-2">{t.description}</h4>
                                    <span className="text-xs text-gray-400 font-mono whitespace-nowrap">{formatDate(t.date)}</span>
                                </div>
                                
                                {/* Fila Media: Datos Numéricos */}
                                <div className="flex justify-between items-end">
                                    <div className="flex gap-4">
                                        <div>
                                            <span className="block text-[10px] text-gray-400 uppercase">Plan</span>
                                            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{installments}x</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] text-gray-400 uppercase">Cuota</span>
                                            <span className="text-xs font-medium text-gray-700">{formatMoney(quota)}</span>
                                        </div>
                                    </div>
                                    
                                    {/* Total y Botón Editar */}
                                    <div className="text-right flex items-center gap-3">
                                        <div>
                                            <span className="block text-[10px] text-gray-400 uppercase">Total</span>
                                            <span className="text-sm font-bold text-gray-900">{formatMoney(amount)}</span>
                                        </div>
                                        <button 
                                            onClick={() => handleEditClick(t)} 
                                            className="p-2 bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-full transition-colors"
                                            title="Editar"
                                        >
                                            {/* Icono Lápiz SVG Simple */}
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
         </div>
      </section>

      {/* MODAL DE EDICIÓN (Con Borrar adentro) */}
      {editingTx && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Editar Detalle</h3>
                    <button onClick={() => setEditingTx(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Descripción</label>
                        <input className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Monto Total</label>
                            <input type="number" className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Cuotas</label>
                            <input type="number" className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={editForm.installments} onChange={e => setEditForm({...editForm, installments: e.target.value})} />
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-between items-center pt-4 border-t border-gray-100">
                    {/* Botón Borrar (Izquierda, Rojo) */}
                    <button 
                        onClick={handleDelete} 
                        className="text-red-500 text-sm font-bold hover:bg-red-50 px-3 py-2 rounded transition-colors flex items-center gap-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        Eliminar Compra
                    </button>

                    {/* Botones Acción (Derecha) */}
                    <div className="flex gap-3">
                        <button onClick={() => setEditingTx(null)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-bold transition-colors">Cancelar</button>
                        <button onClick={handleUpdate} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md transition-colors">Guardar</button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}
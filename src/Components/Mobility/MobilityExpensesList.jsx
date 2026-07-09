import React from 'react';
import { Trash2, Tag } from 'lucide-react';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

export default function MobilityExpensesList({ 
    month, 
    totalMonth, 
    byCategory, 
    monthExpenses, 
    deleteExpense, 
    isGlass,
    text,
    sub,
    card
}) {
    return (
        <div className={card}>
            <div className="flex items-center justify-between mb-3">
                <p className={`text-xs font-bold uppercase tracking-wide ${sub}`}>
                    {MONTHS[month]} — Total gastos
                </p>
                <p className={`text-base font-bold ${isGlass ? 'text-red-300' : 'text-red-500'}`}>{fmt(totalMonth)}</p>
            </div>

            {/* Chips por categoría */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                {byCategory.map(cat => {
                    const Icon = cat.icon;
                    if (cat.total === 0) return null;
                    return (
                        <div key={cat.key} className={`flex items-center gap-2 p-2.5 rounded-xl ${isGlass ? 'bg-white/10' : cat.bg}`}>
                            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center`}>
                                <Icon size={13} className="text-white" />
                            </div>
                            <div className="min-w-0">
                                <p className={`text-xs font-semibold truncate ${isGlass ? 'text-white/80' : cat.text}`}>{cat.label}</p>
                                <p className={`text-xs font-bold ${isGlass ? 'text-white' : 'text-gray-700'}`}>{fmt(cat.total)}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Listado reciente */}
            {monthExpenses.length === 0 ? (
                <div className="text-center py-6">
                    <p className="text-3xl mb-1">⛽</p>
                    <p className={`text-sm font-semibold ${text}`}>Sin gastos este mes</p>
                    <p className={`text-xs ${sub}`}>Cargá tu primer gasto arriba</p>
                </div>
            ) : (
                <div className="space-y-1.5">
                    <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${sub}`}>Últimos registros</p>
                    {monthExpenses.slice(0, 10).map(exp => {
                        const cat = byCategory.find(c => c.key === exp.category) || { label: exp.category, icon: Tag, color: 'from-gray-500 to-gray-600' };
                        const Icon = cat.icon;
                        return (
                            <div key={exp.id} className={`flex items-center gap-3 py-2 px-3 rounded-xl ${isGlass ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'} transition-colors group`}>
                                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center flex-shrink-0`}>
                                    <Icon size={13} className="text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-semibold ${text}`}>{cat.label}</p>
                                    {exp.notes && <p className={`text-xs truncate ${sub}`}>{exp.notes}</p>}
                                </div>
                                <p className={`text-xs ${sub} flex-shrink-0`}>{exp.date?.slice(5)}</p>
                                <p className={`text-sm font-bold ${isGlass ? 'text-red-300' : 'text-red-500'} flex-shrink-0`}>{fmt(exp.amount)}</p>
                                <button aria-label="Acción" type="button"
                                    onClick={() => deleteExpense(exp.id)}
                                    className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg ${isGlass ? 'hover:bg-white/20 text-white/40' : 'hover:bg-red-50 text-gray-300 hover:text-red-400'}`}
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

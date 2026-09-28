import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

export default function MobilityInteractiveChart({ data, expensesData, timeRange, isGlass, privacyMode, fmt }) {
    // Process data for Recharts based on timeRange
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const map = new Map();

        // Si es 'month', agrupamos por día (1, 2, 3...)
        // Si es mayor, agrupamos por mes-año (2026-08, 2026-09)
        const isDaily = timeRange === 'month';

        const getKey = (dateStr) => {
            if (!dateStr) return 'Desc';
            // dateStr format: YYYY-MM-DD
            if (isDaily) {
                return dateStr.split('-')[2]; // Day
            } else {
                return dateStr.substring(0, 7); // YYYY-MM
            }
        };

        const getLabel = (key) => {
            if (isDaily) return key; // Just the day number
            const [y, m] = key.split('-');
            const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
            return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`;
        };

        // Initialize map with all dates in range to avoid gaps?
        // For simplicity, we just group existing data. Recharts handles categorical X axis well.

        data.forEach(s => {
            const key = getKey(s.date);
            if (!map.has(key)) map.set(key, { key, label: getLabel(key), rawDate: s.date, ingresos: 0, gastos: 0 });
            map.get(key).ingresos += Number(s.total || 0);
        });

        if (expensesData) {
            expensesData.forEach(e => {
                const key = getKey(e.date);
                if (!map.has(key)) map.set(key, { key, label: getLabel(key), rawDate: e.date, ingresos: 0, gastos: 0 });
                map.get(key).gastos += Number(e.amount || 0);
            });
        }

        // Convert to array and sort by date
        return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));

    }, [data, expensesData, timeRange]);

    const textColor = isGlass ? '#ffffff' : '#374151';
    const gridColor = isGlass ? 'rgba(255,255,255,0.1)' : '#f3f4f6';

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const ingresos = payload.find(p => p.dataKey === 'ingresos')?.value || 0;
            const gastos = payload.find(p => p.dataKey === 'gastos')?.value || 0;
            const neto = ingresos - gastos;

            return (
                <div className={`p-3 rounded-xl shadow-lg border ${isGlass ? 'bg-[#1e1e2e]/90 border-white/10 backdrop-blur-md text-white' : 'bg-white border-gray-100 text-gray-800'}`}>
                    <p className="font-bold mb-2 text-sm">{label}</p>
                    <div className="space-y-1">
                        <div className="flex justify-between gap-4 text-xs">
                            <span className="text-emerald-500 font-semibold">Ingresos:</span>
                            <span>{privacyMode ? '••••' : fmt(ingresos)}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-xs">
                            <span className="text-rose-500 font-semibold">Gastos:</span>
                            <span>{privacyMode ? '••••' : fmt(gastos)}</span>
                        </div>
                        <div className="border-t border-white/10 my-1 pt-1 flex justify-between gap-4 text-xs font-bold">
                            <span>Neto:</span>
                            <span className={neto >= 0 ? 'text-violet-400' : 'text-rose-400'}>{privacyMode ? '••••' : fmt(neto)}</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    if (chartData.length === 0) {
        return (
            <div className={`h-48 flex items-center justify-center rounded-2xl ${isGlass ? 'bg-white/5 border border-white/10 text-white/50' : 'bg-gray-50 border border-gray-100 text-gray-400'}`}>
                No hay datos para este período
            </div>
        );
    }

    return (
        <div className={`p-4 rounded-2xl ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-white shadow-sm border border-gray-100'}`}>
            <p className={`text-xs font-bold uppercase tracking-wide mb-4 ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>
                {timeRange === 'month' ? 'Evolución Diaria' : 'Evolución Histórica'}
            </p>
            <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                        <XAxis 
                            dataKey="label" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: textColor, fontSize: 10, opacity: 0.7 }}
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: textColor, fontSize: 10, opacity: 0.5 }}
                            tickFormatter={(value) => privacyMode ? '••' : `$${value > 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: isGlass ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }} />
                        
                        <Bar dataKey="ingresos" radius={[4, 4, 0, 0]} maxBarSize={40}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-in-${index}`} fill="url(#colorIngresos)" />
                            ))}
                        </Bar>
                        
                        <Bar dataKey="gastos" radius={[4, 4, 0, 0]} maxBarSize={40}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-out-${index}`} fill="url(#colorGastos)" />
                            ))}
                        </Bar>

                        <defs>
                            <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                                <stop offset="95%" stopColor="#34d399" stopOpacity={0.7}/>
                            </linearGradient>
                            <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.9}/>
                                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.7}/>
                            </linearGradient>
                        </defs>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            
            <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                    <span className={`text-[10px] font-medium ${isGlass ? 'text-white/50' : 'text-gray-500'}`}>Ingresos</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-rose-500" />
                    <span className={`text-[10px] font-medium ${isGlass ? 'text-white/50' : 'text-gray-500'}`}>Gastos</span>
                </div>
            </div>
        </div>
    );
}

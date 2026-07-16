import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calculator, TrendingUp } from 'lucide-react';
import { useSavings } from '../../../context/SavingsContext';
import { useFinancial } from '../../../context/FinancialContext';

const usdFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function AnalyticsTab({ isGlass, privacyMode }) {
    const { posiciones, savingsTransactions } = useSavings();
    const { dolarBlue } = useFinancial();
    const [aniosProyeccion, setAniosProyeccion] = useState(5);
    const [aportesMensuales, setAportesMensuales] = useState(0);

    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const cardBg = isGlass ? 'bg-white/10 backdrop-blur-md border border-white/20' : 'bg-white shadow-sm border border-gray-100';

    // Calcular TNA por posición
    const posicionesTNA = useMemo(() => {
        return posiciones.map(pos => {
            // Buscamos la fecha de la primera compra para aproximar días
            let primeraCompra = null;
            pos.operaciones.forEach(op => {
                if (op.tipo === 'compra' || op.tipo === 'deposito') {
                    const date = new Date(op.fecha || op.createdAt?.toDate?.() || Date.now());
                    if (!primeraCompra || date < primeraCompra) primeraCompra = date;
                }
            });

            let tna = 0;
            let dias = 0;
            if (primeraCompra && pos.inversionTotalUSD > 0 && pos.valorActualUSD > 0) {
                const now = new Date();
                dias = Math.max(1, Math.floor((now - primeraCompra) / (1000 * 60 * 60 * 24)));
                
                const ratio = pos.valorActualUSD / pos.inversionTotalUSD;
                tna = (Math.pow(ratio, 365 / dias) - 1) * 100;
            }

            return { ...pos, tna, dias };
        }).sort((a, b) => b.tna - a.tna);
    }, [posiciones]);

    // TNA Global ponderada
    const { totalValor, tnaGlobal } = useMemo(() => {
        let total = 0;
        let sumTnaVP = 0;
        posicionesTNA.forEach(p => {
            total += p.valorActualUSD;
            sumTnaVP += (p.tna * p.valorActualUSD);
        });
        const tna = total > 0 ? sumTnaVP / total : 0;
        return { totalValor: total, tnaGlobal: tna };
    }, [posicionesTNA]);

    // Generar datos para el gráfico de evolución
    // Esto es una aproximación: calculamos el valor de inversión acumulada por mes
    const chartData = useMemo(() => {
        if (!savingsTransactions || savingsTransactions.length === 0) return [];
        
        const history = [...savingsTransactions].sort((a, b) => {
            const dateA = new Date(a.fecha || a.createdAt?.toDate?.() || 0);
            const dateB = new Date(b.fecha || b.createdAt?.toDate?.() || 0);
            return dateA - dateB;
        });

        const rate = dolarBlue || 1000;
        let acumuladoUSD = 0;
        const dataMap = new Map();

        history.forEach(tx => {
            const date = new Date(tx.fecha || tx.createdAt?.toDate?.() || Date.now());
            const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            const cant = parseFloat(tx.cantidad) || 0;
            let precio = parseFloat(tx.precioUnitario) || 0;
            if (tx.monedaPrecio === 'ARS') precio = precio / rate;
            
            // Si es un movimiento viejo sin precio, estimamos con precioActual o 1. (Idealmente deberían haber sido borrados o migrados)
            if (precio === 0 && tx.tipo !== 'ajuste') return;

            const valorOp = cant * precio;

            if (tx.tipo === 'compra' || tx.tipo === 'deposito' || tx.tipo === 'ingreso') {
                acumuladoUSD += valorOp;
            } else if (tx.tipo === 'venta' || tx.tipo === 'retiro' || tx.tipo === 'egreso') {
                acumuladoUSD -= valorOp;
            }

            dataMap.set(monthYear, Math.max(0, acumuladoUSD));
        });

        // Completar meses intermedios vacíos si queremos, o simplemente usar los puntos con movimientos
        return Array.from(dataMap.entries()).map(([date, value]) => ({ date, value }));
    }, [savingsTransactions, dolarBlue]);


    // Proyección de interés compuesto
    const valorFuturo = useMemo(() => {
        const p = totalValor;
        const r = tnaGlobal / 100;
        const n = 12; // capitalización mensual
        const t = aniosProyeccion;
        const pmt = parseFloat(aportesMensuales) || 0;

        // Formula VF con aportes mensuales: VF = P(1+r/n)^(nt) + PMT * (((1+r/n)^(nt) - 1) / (r/n))
        const compoundFactor = Math.pow(1 + r/n, n * t);
        const vfPrincipal = p * compoundFactor;
        const vfAportes = pmt > 0 && r > 0 ? pmt * ((compoundFactor - 1) / (r/n)) : pmt * n * t;

        return vfPrincipal + vfAportes;
    }, [totalValor, tnaGlobal, aniosProyeccion, aportesMensuales]);


    return (
        <div className="space-y-6 animate-fade-in">
            {/* TNA Global y Proyector */}
            <div className="grid md:grid-cols-2 gap-6">
                <div className={`rounded-3xl p-6 ${cardBg}`}>
                    <h3 className={`font-bold mb-6 flex items-center gap-2 ${textColor}`}>
                        <TrendingUp size={18} />
                        Rendimiento Global (TNA)
                    </h3>
                    <div className="text-center mb-6">
                        <span className={`text-5xl font-black ${tnaGlobal >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {tnaGlobal >= 0 ? '+' : ''}{tnaGlobal.toFixed(1)}%
                        </span>
                        <p className={`text-sm mt-2 ${isGlass ? 'text-white/60' : 'text-gray-500'}`}>Tasa Nominal Anual ponderada</p>
                    </div>

                    <div className="space-y-2 mt-6">
                        <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isGlass ? 'text-white/50' : 'text-gray-400'}`}>
                            Desglose por activo
                        </h4>
                        {posicionesTNA.map(pos => (
                            <div key={`${pos.cartera}-${pos.especie}`} className="flex justify-between items-center text-sm">
                                <span className={textColor}>{pos.especie} <span className="opacity-50 text-xs">({pos.cartera})</span></span>
                                <span className={`font-bold ${pos.tna >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {pos.tna >= 0 ? '+' : ''}{pos.tna.toFixed(1)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={`rounded-3xl p-6 ${cardBg}`}>
                    <h3 className={`font-bold mb-6 flex items-center gap-2 ${textColor}`}>
                        <Calculator size={18} />
                        Proyector de Ahorro
                    </h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className={`block text-xs font-bold mb-2 ${isGlass ? 'text-white/70' : 'text-gray-500'}`}>
                                AÑOS A PROYECTAR: {aniosProyeccion}
                            </label>
                            <input 
                                type="range" 
                                min="1" max="30" 
                                value={aniosProyeccion}
                                onChange={e => setAniosProyeccion(parseInt(e.target.value))}
                                className="w-full accent-green-500"
                            />
                        </div>

                        <div>
                            <label className={`block text-xs font-bold mb-2 ${isGlass ? 'text-white/70' : 'text-gray-500'}`}>
                                APORTE MENSUAL (USD)
                            </label>
                            <input 
                                type="number" 
                                value={aportesMensuales}
                                onChange={e => setAportesMensuales(e.target.value)}
                                className={`w-full p-2 rounded-xl text-sm outline-none transition-all ${
                                    isGlass ? 'bg-white/10 text-white border border-white/20' : 'bg-gray-50 text-gray-800 border border-gray-200 focus:border-green-500'
                                }`}
                            />
                        </div>

                        <div className={`mt-6 p-4 rounded-2xl text-center ${isGlass ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50'}`}>
                            <span className={`block text-xs font-bold mb-1 ${isGlass ? 'text-green-300' : 'text-green-700'}`}>VALOR ESTIMADO</span>
                            <span className={`text-3xl font-black ${isGlass ? 'text-white' : 'text-green-800'}`}>
                                {privacyMode ? '****' : usdFormatter.format(valorFuturo)}
                            </span>
                            <span className={`block text-xs mt-2 opacity-60 ${textColor}`}>
                                Asumiendo que se mantiene la TNA de {tnaGlobal.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Evolución Histórica */}
            <div className={`rounded-3xl p-6 h-[300px] ${cardBg}`}>
                <h3 className={`font-bold mb-4 ${textColor}`}>Evolución de Inversión Acumulada (USD)</h3>
                {!privacyMode && chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isGlass ? "rgba(255,255,255,0.1)" : "#e5e7eb"} vertical={false} />
                            <XAxis 
                                dataKey="date" 
                                stroke={isGlass ? "rgba(255,255,255,0.5)" : "#9ca3af"} 
                                fontSize={12}
                                tickMargin={10}
                            />
                            <YAxis 
                                stroke={isGlass ? "rgba(255,255,255,0.5)" : "#9ca3af"} 
                                fontSize={12}
                                tickFormatter={(val) => `$${val}`}
                            />
                            <Tooltip 
                                formatter={(val) => usdFormatter.format(val)}
                                contentStyle={{ backgroundColor: isGlass ? 'rgba(0,0,0,0.8)' : 'white', borderRadius: '12px', border: 'none' }}
                                itemStyle={{ color: isGlass ? '#4ade80' : '#16a34a' }}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke={isGlass ? "#4ade80" : "#16a34a"} 
                                strokeWidth={3}
                                dot={{ fill: isGlass ? "#4ade80" : "#16a34a", r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="w-full h-full flex items-center justify-center -mt-6">
                        <span className={isGlass ? 'text-white/50' : 'text-gray-400'}>
                            {privacyMode ? 'Oculto por privacidad' : 'Datos insuficientes'}
                        </span>
                    </div>
                )}
            </div>

        </div>
    );
}

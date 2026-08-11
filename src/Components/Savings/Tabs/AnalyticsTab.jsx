import React, { useMemo, useState } from 'react';
// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Calculator, TrendingUp, BarChart, Info, ShieldAlert } from 'lucide-react';
import { useSavings } from '../../../context/SavingsContext';
import { useFinancial } from '../../../context/FinancialContext';

const usdFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// Helper: detectar si una especie es un bono argentino
const isBond = (especie) => /^[a-zA-Z]{2,4}\d{2}[a-zA-Z]?$/.test(especie);

// TIR por Newton-Raphson: dado un array de {valor, dias} donde valor<0 es egreso,
// retorna la tasa diaria que hace NPV=0, anualizada a TNA.
const calcularTIR = (flujos) => {
    if (flujos.length < 2) return null;
    
    // Debe haber al menos un flujo negativo (inversión) y uno positivo (retorno)
    const hasNegative = flujos.some(f => f.valor < 0);
    const hasPositive = flujos.some(f => f.valor > 0);
    if (!hasNegative || !hasPositive) return null;

    const npv = (r) => flujos.reduce((sum, f) => sum + f.valor / Math.pow(1 + r, f.dias / 365), 0);
    const dnpv = (r) => flujos.reduce((sum, f) => sum - (f.dias / 365) * f.valor / Math.pow(1 + r, f.dias / 365 + 1), 0);
    let r = 0.1;
    for (let i = 0; i < 50; i++) {
        const d = dnpv(r);
        if (Math.abs(d) < 1e-12) break;
        const rNew = r - npv(r) / d;
        if (Math.abs(rNew - r) < 1e-8) { r = rNew; break; }
        r = rNew;
    }
    return isFinite(r) && r > -1 ? r * 100 : null;
};

export default function AnalyticsTab({ isGlass, privacyMode }) {
    const { posiciones, savingsTransactions } = useSavings();
    const { dolarBlue } = useFinancial();
    const [aniosProyeccion, setAniosProyeccion] = useState(5);
    const [aportesMensuales, setAportesMensuales] = useState(0);

    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const cardBg = isGlass ? 'bg-white/10 backdrop-blur-md border border-white/20' : 'bg-white shadow-sm border border-gray-100';
    const secondaryTextColor = isGlass ? 'text-white/60' : 'text-gray-500';

    // Calcular TNA o TIR por posición
    const posicionesTNA = useMemo(() => {
        return posiciones.map(pos => {
            const esBono = isBond(pos.especie);
            const cobradoTotalUSD = pos.cobradoTotalUSD || 0;

            // Si es bono con cupones registrados → TIR real
            if (esBono && cobradoTotalUSD > 0) {
                // Construir flujos: usamos las operaciones de la posición
                const now = new Date();
                const flujos = [];
                let primeraFecha = null;

                pos.operaciones.forEach(op => {
                    const fecha = new Date(op.fecha || op.createdAt?.toDate?.() || Date.now());
                    const cant = parseFloat(op.cantidad) || 0;
                    let precio = parseFloat(op.precioUnitario) || 0;
                    if (op.monedaPrecio === 'ARS') precio = precio / (dolarBlue || 1000);
                    const valor = cant * precio;
                    const tipo = op.tipo;

                    if (!primeraFecha || fecha < primeraFecha) primeraFecha = fecha;

                    if (tipo === 'compra' || tipo === 'deposito' || tipo === 'ingreso') {
                        flujos.push({ valor: -valor, fecha });
                    } else if (tipo === 'cobro_cupon' || tipo === 'amortizacion') {
                        flujos.push({ valor: valor, fecha });
                    } else if (tipo === 'venta' || tipo === 'retiro') {
                        flujos.push({ valor: valor, fecha });
                    }
                });

                // Recalcular dias desde la primera fecha
                const base = primeraFecha || new Date();
                const flujosConDias = flujos.map(f => ({
                    valor: f.valor,
                    dias: Math.max(0, Math.floor((f.fecha - base) / 86400000))
                }));
                // Valor residual al día de hoy
                const diasHoy = Math.max(1, Math.floor((now - base) / 86400000));
                flujosConDias.push({ valor: pos.valorActualUSD, dias: diasHoy });

                const tir = calcularTIR(flujosConDias);
                const dias = diasHoy;
                return { ...pos, tna: tir ?? 0, dias, esBono, tieneCobros: true };
            }

            // Fallback: TNA simplificada (para no-bonos o bonos sin cupones registrados)
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

            return { ...pos, tna, dias, esBono, tieneCobros: false };
        }).sort((a, b) => b.tna - a.tna);
    }, [posiciones, dolarBlue]);

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
    const chartData = useMemo(() => {
        if (!savingsTransactions || savingsTransactions.length === 0) return [];
        
        const history = savingsTransactions.toSorted((a, b) => {
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
            
            let valorOp = 0;
            if (tx.tipo === 'caucion') {
                valorOp = (parseFloat(tx.montoARS) || 0) / rate;
            } else {
                const cant = parseFloat(tx.cantidad) || 0;
                let precio = parseFloat(tx.precioUnitario) || 0;
                if (tx.monedaPrecio === 'ARS') precio = precio / rate;
                
                if (precio === 0 && tx.tipo !== 'ajuste') return;

                valorOp = cant * precio;
            }

            if (tx.tipo === 'compra' || tx.tipo === 'deposito' || tx.tipo === 'ingreso' || tx.tipo === 'caucion') {
                acumuladoUSD += valorOp;
            } else if (tx.tipo === 'venta' || tx.tipo === 'retiro' || tx.tipo === 'egreso') {
                acumuladoUSD -= valorOp;
            }

            dataMap.set(monthYear, Math.max(0, acumuladoUSD));
        });

        return Array.from(dataMap.entries()).map(([date, value]) => ({ date, value }));
    }, [savingsTransactions, dolarBlue]);


    // Proyección de interés compuesto
    const valorFuturo = useMemo(() => {
        const p = totalValor;
        const r = Math.max(0, tnaGlobal) / 100; // No proyectar pérdidas a futuro
        const n = 12; // capitalización mensual
        const t = aniosProyeccion;
        const pmt = parseFloat(aportesMensuales) || 0;

        const compoundFactor = Math.pow(1 + r/n, n * t);
        const vfPrincipal = p * compoundFactor;
        const vfAportes = pmt > 0 && r > 0 ? pmt * ((compoundFactor - 1) / (r/n)) : pmt * n * t;

        return vfPrincipal + vfAportes;
    }, [totalValor, tnaGlobal, aniosProyeccion, aportesMensuales]);

    // Para la barra de progreso, encontramos el max TNA (abs) para la escala
    const maxTnaAbs = Math.max(1, ...posicionesTNA.map(p => Math.abs(p.tna)));

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            
            {/* ── HERO TNA & PROYECTOR ── */}
            <div className="grid lg:grid-cols-2 gap-6">
                
                {/* Panel TNA Global Hero */}
                <div className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-center ${
                    isGlass 
                        ? 'bg-gradient-to-br from-white/10 to-transparent border border-white/20' 
                        : 'bg-gradient-to-br from-green-50 to-white border border-green-100 shadow-sm'
                }`}>
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={20} className="text-green-500" />
                        <h3 className={`font-bold ${textColor}`}>Rendimiento Global (TNA)</h3>
                    </div>
                    <div className={`text-6xl sm:text-7xl font-black tracking-tighter my-4 ${tnaGlobal >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {tnaGlobal >= 0 ? '+' : ''}{tnaGlobal.toFixed(1)}%
                    </div>
                    <p className={`text-sm font-medium ${secondaryTextColor}`}>
                        Tasa Nominal Anual ponderada del portafolio completo, calculada a partir del P&L y el tiempo de inversión.
                    </p>
                </div>

                {/* Proyector Notion-style Card */}
                <div className={`rounded-3xl p-6 sm:p-8 flex flex-col ${cardBg}`}>
                    <h3 className={`font-bold mb-6 flex items-center gap-2 ${textColor}`}>
                        <Calculator size={18} className="text-blue-500" />
                        Proyector de Ahorro
                    </h3>
                    
                    <div className="space-y-5 flex-grow">
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className={`text-xs font-bold uppercase tracking-wider ${secondaryTextColor}`}>
                                    Años a proyectar
                                </label>
                                <span className={`text-xs font-black ${textColor}`}>{aniosProyeccion} años</span>
                            </div>
                            <input 
                                type="range" 
                                min="1" max="30" 
                                value={aniosProyeccion}
                                onChange={e => setAniosProyeccion(parseInt(e.target.value))}
                                className="w-full accent-blue-500"
                            />
                        </div>

                        <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${secondaryTextColor}`}>
                                Aporte Mensual (USD)
                            </label>
                            <input 
                                type="number" 
                                min="0" step="100"
                                value={aportesMensuales}
                                onChange={e => setAportesMensuales(e.target.value)}
                                className={`w-full p-3 rounded-xl font-bold outline-none transition-all ${
                                    isGlass ? 'bg-white/5 text-white border border-white/10 focus:border-blue-500/50' : 'bg-gray-50 text-gray-800 border border-gray-200 focus:border-blue-500 focus:bg-white'
                                }`}
                                placeholder="Ej: 200"
                            />
                        </div>
                    </div>

                    <div className={`mt-6 p-5 rounded-2xl border ${isGlass ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                        <span className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isGlass ? 'text-blue-300' : 'text-blue-700'}`}>Valor Estimado</span>
                        <span className={`text-4xl font-black tracking-tight ${isGlass ? 'text-white' : 'text-blue-900'}`}>
                            {privacyMode ? '****' : usdFormatter.format(valorFuturo)}
                        </span>
                        <span className={`block text-xs mt-2 opacity-80 ${isGlass ? 'text-blue-300/80' : 'text-blue-700/80'}`}>
                            Asumiendo {tnaGlobal >= 0 ? `TNA de ${tnaGlobal.toFixed(1)}%` : 'TNA 0% (no se proyectan pérdidas)'}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── BARRAS DE PROGRESO POR ACTIVO ── */}
            <div className={`rounded-3xl p-6 sm:p-8 ${cardBg}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                    <h3 className={`font-bold flex items-center gap-2 ${textColor}`}>
                        <BarChart size={18} className="text-purple-500" />
                        Desempeño por Activo
                    </h3>
                    <div className={`text-xs flex items-center gap-2 ${secondaryTextColor}`}>
                        <Info size={14} />
                        Tasa anualizada (TNA/TIR)
                    </div>
                </div>

                <div className="space-y-5">
                    {posicionesTNA.map(pos => {
                        const widthPct = Math.min(100, Math.max(0, (Math.abs(pos.tna) / maxTnaAbs) * 100));
                        const isPositive = pos.tna >= 0;
                        const barColor = isPositive 
                            ? (isGlass ? 'bg-green-500' : 'bg-green-500') 
                            : (isGlass ? 'bg-red-500' : 'bg-red-500');

                        return (
                            <div key={`${pos.cartera}-${pos.especie}`} className="group">
                                <div className="flex justify-between items-end mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-black text-sm ${textColor}`}>{pos.especie}</span>
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${isGlass ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-500'}`}>
                                            {pos.cartera}
                                        </span>
                                        {pos.esBono && pos.tieneCobros && (
                                            <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">TIR</span>
                                        )}
                                        {pos.esBono && !pos.tieneCobros && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-500/10 px-2 py-0.5 rounded-md" title="Faltan cobros de cupón">
                                                <ShieldAlert size={10} /> EST.
                                            </span>
                                        )}
                                    </div>
                                    <div className={`font-black text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                        {isPositive ? '+' : ''}{pos.tna.toFixed(1)}%
                                    </div>
                                </div>
                                {/* Progress Bar Track */}
                                <div className={`h-2.5 w-full rounded-full overflow-hidden ${isGlass ? 'bg-white/10' : 'bg-gray-100'}`}>
                                    {/* Progress Bar Fill */}
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${barColor}`} 
                                        style={{ width: `${widthPct}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── EVOLUCIÓN HISTÓRICA ── */}
            <div className={`rounded-3xl p-6 sm:p-8 h-[350px] flex flex-col ${cardBg}`}>
                <h3 className={`font-bold mb-6 flex items-center gap-2 ${textColor}`}>
                    <TrendingUp size={18} className="text-indigo-500" />
                    Inversión Acumulada
                </h3>
                
                <div className="flex-grow w-full relative">
                    {!privacyMode && chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={isGlass ? "rgba(255,255,255,0.05)" : "#f3f4f6"} vertical={false} />
                                <XAxis 
                                    dataKey="date" 
                                    stroke={isGlass ? "rgba(255,255,255,0.3)" : "#9ca3af"} 
                                    fontSize={10}
                                    tickMargin={10}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis 
                                    stroke={isGlass ? "rgba(255,255,255,0.3)" : "#9ca3af"} 
                                    fontSize={10}
                                    tickFormatter={(val) => `$${val}`}
                                    axisLine={false}
                                    tickLine={false}
                                    width={60}
                                />
                                <RechartsTooltip 
                                    formatter={(val) => [usdFormatter.format(val), 'Capital']}
                                    labelStyle={{ color: isGlass ? 'rgba(255,255,255,0.5)' : '#6b7280', fontSize: '12px', marginBottom: '4px' }}
                                    contentStyle={{ 
                                        backgroundColor: isGlass ? 'rgba(15, 23, 42, 0.9)' : 'white', 
                                        backdropFilter: 'blur(10px)',
                                        borderRadius: '16px', 
                                        border: isGlass ? '1px solid rgba(255,255,255,0.1)' : '1px solid #f3f4f6',
                                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                                    }}
                                    itemStyle={{ color: isGlass ? '#818cf8' : '#6366f1', fontWeight: 'bold' }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke={isGlass ? "#818cf8" : "#6366f1"} 
                                    strokeWidth={4}
                                    dot={false}
                                    activeDot={{ r: 6, fill: isGlass ? "#818cf8" : "#6366f1", strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-sm font-bold px-4 py-2 rounded-xl ${isGlass ? 'bg-white/5 text-white/50' : 'bg-gray-50 text-gray-400'}`}>
                                {privacyMode ? 'Oculto por privacidad' : 'Datos insuficientes para el gráfico'}
                            </span>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, BarChart3, Wallet, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { useSavings } from '../../context/SavingsContext';
import { useFinancial } from '../../context/FinancialContext';
import { useUI } from '../../context/UIContext';
import { getQuotes } from '../../services/quotesService';

const pctFormatter = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usdFmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const arsFmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

/**
 * Calcula el precio promedio ponderado de compra de un activo
 * sumando (cantidad * precioCompra) / cantidad total.
 */
function calcPrecioPromedio(txs) {
    let totalCant = 0;
    let totalCosto = 0;
    for (const tx of txs) {
        if (tx.tipo !== 'ingreso') continue;
        const cant = parseFloat(tx.cantidad) || 0;
        const precio = parseFloat(tx.precioCompra) || 0;
        if (precio > 0) {
            totalCant += cant;
            totalCosto += cant * precio;
        }
    }
    return totalCant > 0 ? totalCosto / totalCant : null;
}

// ─── Badge de rendimiento ────────────────────────────────────────────────────
function ReturnBadge({ pct, isGlass, size = 'sm' }) {
    if (pct == null || isNaN(pct)) return null;
    const positive = pct >= 0;
    const Icon = positive ? TrendingUp : TrendingDown;
    const color = positive
        ? (isGlass ? 'text-green-400 bg-green-500/15' : 'text-green-700 bg-green-100')
        : (isGlass ? 'text-red-400 bg-red-500/15' : 'text-red-700 bg-red-100');
    const textSz = size === 'lg' ? 'text-base' : 'text-xs';

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold ${color} ${textSz}`}>
            <Icon size={size === 'lg' ? 16 : 12} />
            {positive ? '+' : ''}{pctFormatter.format(pct)}%
        </span>
    );
}

// ─── Fila de especie dentro de una cartera ──────────────────────────────────
function EspecieRow({ especie, cantidad, precioPromedio, quote, dolarBlue, isGlass, privacyMode }) {
    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const subColor = isGlass ? 'text-white/50' : 'text-gray-500';

    const precioActual = quote?.price ?? null;
    const currency = quote?.currency || 'USD';

    // Valor actual de la posición en la moneda de la acción
    const valorActual = precioActual != null ? cantidad * precioActual : null;
    // Valor de costo histórico
    const valorCompra = precioPromedio != null ? cantidad * precioPromedio : null;
    // Ganancia absoluta
    const ganancia = valorActual != null && valorCompra != null ? valorActual - valorCompra : null;
    // Ganancia porcentual
    const pct = ganancia != null && valorCompra > 0 ? (ganancia / valorCompra) * 100 : null;

    const formatVal = (v, cur) => {
        if (privacyMode) return '****';
        if (v == null) return '--';
        if (cur === 'ARS') return arsFmt.format(v);
        return usdFmt.format(v);
    };

    return (
        <div className={`flex items-center justify-between py-2.5 px-3 rounded-xl ${isGlass ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}>
            <div className="flex items-center gap-2 min-w-0">
                <div className={`text-xs font-black px-2 py-0.5 rounded-full ${isGlass ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-700'}`}>
                    {especie}
                </div>
                <span className={`text-xs ${subColor} truncate`}>
                    {privacyMode ? '****' : `${cantidad % 1 === 0 ? cantidad.toLocaleString('es-AR') : cantidad.toFixed(6)} u.`}
                </span>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
                {valorActual != null && (
                    <span className={`text-sm font-bold ${textColor}`}>
                        {formatVal(valorActual, currency)}
                    </span>
                )}
                <ReturnBadge pct={pct} isGlass={isGlass} />
            </div>
        </div>
    );
}

// ─── Tarjeta de cartera con sus species ─────────────────────────────────────
function CarteraCard({ cartera, items, quotes, dolarBlue, isGlass, privacyMode }) {
    const [open, setOpen] = useState(true);
    const { savingsTransactions } = useSavings();
    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const bgClass = isGlass ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-100 shadow-sm';

    // Calcular valor total de la cartera en USD
    const totalUSD = useMemo(() => {
        let sum = 0;
        for (const item of items) {
            const q = quotes[item.apiTicker || item.especie?.toUpperCase()];
            if (q?.price) {
                const usd = q.currency === 'ARS' ? q.price / (dolarBlue || 1300) : q.price;
                sum += item.cantidad * usd;
            } else if (['USD', 'USDT', 'USDC', 'DAI'].includes(item.especie?.toUpperCase())) {
                sum += item.cantidad;
            } else if (item.especie?.toUpperCase() === 'ARS') {
                sum += item.cantidad / (dolarBlue || 1300);
            }
        }
        return sum;
    }, [items, quotes, dolarBlue]);

    // Calcular P&L global de la cartera
    const pnlData = useMemo(() => {
        let costoUSD = 0;
        let valorUSD = totalUSD;
        for (const item of items) {
            const txsDeEste = (savingsTransactions || []).filter(
                t => t.cartera === cartera && t.especie?.toUpperCase() === item.especie?.toUpperCase()
            );
            const pp = calcPrecioPromedio(txsDeEste);
            const q = quotes[item.apiTicker || item.especie?.toUpperCase()];
            if (pp != null && q?.price) {
                const ppUSD = q.currency === 'ARS' ? pp / (dolarBlue || 1300) : pp;
                costoUSD += item.cantidad * ppUSD;
            }
        }
        if (costoUSD === 0) return null;
        return { gananciaUSD: valorUSD - costoUSD, pct: ((valorUSD - costoUSD) / costoUSD) * 100 };
    }, [items, quotes, savingsTransactions, cartera, dolarBlue, totalUSD]);

    return (
        <div className={`rounded-2xl overflow-hidden ${bgClass}`}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors ${isGlass ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${isGlass ? 'bg-white/10' : 'bg-gray-100'}`}>
                        <Wallet size={16} className={isGlass ? 'text-white' : 'text-gray-600'} />
                    </div>
                    <span className={`font-black ${textColor}`}>{cartera}</span>
                </div>
                <div className="flex items-center gap-3">
                    {pnlData && <ReturnBadge pct={pnlData.pct} isGlass={isGlass} />}
                    {totalUSD > 0 && (
                        <span className={`text-sm font-bold ${textColor}`}>
                            {privacyMode ? '****' : usdFmt.format(totalUSD)}
                        </span>
                    )}
                    {open ? <ChevronUp size={16} className="opacity-40" /> : <ChevronDown size={16} className="opacity-40" />}
                </div>
            </button>

            {open && (
                <div className={`border-t ${isGlass ? 'border-white/10' : 'border-gray-100'} px-3 py-2 space-y-1`}>
                    {items.map(item => {
                        const txsDeEste = (savingsTransactions || []).filter(
                            t => t.cartera === cartera && t.especie?.toUpperCase() === item.especie?.toUpperCase()
                        );
                        const pp = calcPrecioPromedio(txsDeEste);
                        const quote = quotes[item.apiTicker || item.especie?.toUpperCase()];
                        return (
                            <EspecieRow
                                key={item.especie}
                                especie={item.especie}
                                cantidad={item.cantidad}
                                precioPromedio={pp}
                                quote={quote}
                                dolarBlue={dolarBlue}
                                isGlass={isGlass}
                                privacyMode={privacyMode}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Vista por Especie (tabla global) ───────────────────────────────────────
function EspecieTable({ balancesPorEspecie, quotes, dolarBlue, isGlass, privacyMode, savingsTransactions }) {
    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const subColor = isGlass ? 'text-white/50' : 'text-gray-500';
    const headerCls = `text-xs font-bold uppercase tracking-wide ${subColor} pb-2`;

    return (
        <div className={`rounded-2xl overflow-hidden ${isGlass ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-100 shadow-sm'}`}>
            <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                <Package size={16} className={isGlass ? 'text-white/60' : 'text-gray-500'} />
                <span className={`font-black text-sm ${textColor}`}>Por Especie</span>
            </div>
            <div className={`grid grid-cols-4 gap-2 px-4 pb-1 border-b ${isGlass ? 'border-white/10' : 'border-gray-100'}`}>
                <span className={`${headerCls} col-span-1`}>Activo</span>
                <span className={`${headerCls} text-right`}>Tenencia</span>
                <span className={`${headerCls} text-right`}>Valor</span>
                <span className={`${headerCls} text-right`}>Rend.</span>
            </div>
            <div className="divide-y divide-white/5">
                {balancesPorEspecie.map(({ especie, apiTicker, totalCantidad }) => {
                    const quote = quotes[apiTicker || especie?.toUpperCase()];
                    const price = quote?.price ?? null;
                    const currency = quote?.currency || 'USD';
                    const valorActual = price != null ? totalCantidad * price : null;

                    // Precio promedio de TODAS las carteras para esta especie
                    const txsTodas = (savingsTransactions || []).filter(
                        t => t.especie?.toUpperCase() === especie?.toUpperCase()
                    );
                    const pp = calcPrecioPromedio(txsTodas);
                    const valorCompra = pp != null ? totalCantidad * pp : null;
                    const ganancia = valorActual != null && valorCompra != null ? valorActual - valorCompra : null;
                    const pct = ganancia != null && valorCompra > 0 ? (ganancia / valorCompra) * 100 : null;

                    const fmtVal = (v) => {
                        if (privacyMode) return '****';
                        if (v == null) return '--';
                        return currency === 'ARS' ? arsFmt.format(v) : usdFmt.format(v);
                    };

                    return (
                        <div key={especie} className={`grid grid-cols-4 gap-2 px-4 py-2.5 items-center ${isGlass ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}>
                            <span className={`font-black text-sm col-span-1 ${textColor}`}>{especie}</span>
                            <span className={`text-xs text-right ${subColor}`}>
                                {privacyMode ? '****' : (totalCantidad % 1 === 0 ? totalCantidad.toLocaleString('es-AR') : totalCantidad.toFixed(4))}
                            </span>
                            <span className={`text-sm font-bold text-right ${textColor}`}>{fmtVal(valorActual)}</span>
                            <div className="flex justify-end">
                                <ReturnBadge pct={pct} isGlass={isGlass} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Dashboard principal ─────────────────────────────────────────────────────
export default function PerformanceDashboard({ balances }) {
    const { isGlass, privacyMode } = useUI();
    const { savingsTransactions } = useSavings();
    const { dolarBlue } = useFinancial();

    const [quotes, setQuotes] = useState({});
    const [loadingQuotes, setLoadingQuotes] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [activeTab, setActiveTab] = useState('carteras'); // 'carteras' | 'especies'

    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const subColor = isGlass ? 'text-white/50' : 'text-gray-500';

    // Recopilar todos los tickers únicos que necesitan cotización
    const tickersNecesarios = useMemo(() => {
        const set = new Set();
        (savingsTransactions || []).forEach(tx => {
            if (tx.apiTicker) set.add(tx.apiTicker);
        });
        return Array.from(set).filter(t => t);
    }, [savingsTransactions]);

    // Construir vista de balances por especie (global, todas las carteras)
    const balancesPorEspecie = useMemo(() => {
        const map = {};
        balances.forEach(cartera => {
            cartera.items.forEach(item => {
                const key = item.especie?.toUpperCase();
                if (!map[key]) {
                    // Buscar el apiTicker desde alguna transacción
                    const txConTicker = (savingsTransactions || []).find(
                        t => t.especie?.toUpperCase() === key && t.apiTicker
                    );
                    map[key] = { especie: key, apiTicker: txConTicker?.apiTicker || null, totalCantidad: 0 };
                }
                map[key].totalCantidad += item.cantidad;
            });
        });
        return Object.values(map).sort((a, b) => a.especie.localeCompare(b.especie));
    }, [balances, savingsTransactions]);

    const fetchQuotes = useCallback(async () => {
        if (tickersNecesarios.length === 0) return;
        setLoadingQuotes(true);
        try {
            const data = await getQuotes(tickersNecesarios);
            setQuotes(data);
            setLastUpdated(new Date());
        } catch (err) {
            console.error(err);
        }
        setLoadingQuotes(false);
    }, [tickersNecesarios]);

    // Cargar cotizaciones al montar y cuando cambien los tickers
    useEffect(() => {
        fetchQuotes();
    }, [fetchQuotes]);

    // P&L global en USD
    const globalPnL = useMemo(() => {
        let costoTotal = 0;
        let valorTotal = 0;

        balances.forEach(cartera => {
            cartera.items.forEach(item => {
                const espUpper = item.especie?.toUpperCase();
                const quote = quotes[item.apiTicker || espUpper];
                const txsDe = (savingsTransactions || []).filter(
                    t => t.cartera === cartera.cartera && t.especie?.toUpperCase() === espUpper
                );
                const pp = calcPrecioPromedio(txsDe);

                if (quote?.price) {
                    const factor = quote.currency === 'ARS' ? 1 / (dolarBlue || 1300) : 1;
                    valorTotal += item.cantidad * quote.price * factor;
                    if (pp != null) {
                        const ppUSD = quote.currency === 'ARS' ? pp / (dolarBlue || 1300) : pp;
                        costoTotal += item.cantidad * ppUSD;
                    }
                } else if (['USD', 'USDT', 'USDC', 'DAI'].includes(espUpper)) {
                    valorTotal += item.cantidad;
                    costoTotal += item.cantidad; // Stablecoins: siempre 1:1
                } else if (espUpper === 'ARS') {
                    valorTotal += item.cantidad / (dolarBlue || 1300);
                    costoTotal += item.cantidad / (dolarBlue || 1300);
                }
            });
        });

        if (costoTotal === 0) return null;
        const ganancia = valorTotal - costoTotal;
        return { valorTotal, costoTotal, ganancia, pct: (ganancia / costoTotal) * 100 };
    }, [balances, quotes, savingsTransactions, dolarBlue]);

    if (balances.length === 0) return null;

    const tabCls = (tab) => `px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
        activeTab === tab
            ? (isGlass ? 'bg-white/15 text-white' : 'bg-gray-900 text-white')
            : (isGlass ? 'text-white/50 hover:text-white/80' : 'text-gray-500 hover:text-gray-800')
    }`;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BarChart3 size={20} className={isGlass ? 'text-violet-400' : 'text-violet-600'} />
                    <h2 className={`text-lg font-black ${textColor}`}>Rendimiento</h2>
                </div>
                <button
                    type="button"
                    onClick={fetchQuotes}
                    disabled={loadingQuotes}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isGlass ? 'bg-white/10 hover:bg-white/20 text-white/70' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                >
                    <RefreshCw size={12} className={loadingQuotes ? 'animate-spin' : ''} />
                    {loadingQuotes ? 'Actualizando...' : 'Actualizar precios'}
                </button>
            </div>

            {lastUpdated && (
                <p className={`text-xs ${subColor}`}>
                    Precios actualizados: {lastUpdated.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </p>
            )}

            {/* Resumen global */}
            {globalPnL && (
                <div className={`rounded-2xl p-5 ${
                    isGlass
                        ? 'bg-gradient-to-br from-violet-500/15 to-purple-600/10 border border-violet-500/20'
                        : 'bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100'
                }`}>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-wide ${isGlass ? 'text-violet-300' : 'text-violet-700'}`}>
                                Rendimiento Global
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                                <span className={`text-3xl font-black ${textColor}`}>
                                    {privacyMode ? '****' : usdFmt.format(globalPnL.valorTotal)}
                                </span>
                                <ReturnBadge pct={globalPnL.pct} isGlass={isGlass} size="lg" />
                            </div>
                        </div>
                        <div className="text-right">
                            <p className={`text-xs ${subColor}`}>Ganancia / Pérdida</p>
                            <p className={`text-lg font-black mt-1 ${globalPnL.ganancia >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {privacyMode ? '****' : `${globalPnL.ganancia >= 0 ? '+' : ''}${usdFmt.format(globalPnL.ganancia)}`}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {tickersNecesarios.length === 0 && !loadingQuotes && (
                <div className={`text-xs p-3 rounded-xl ${isGlass ? 'bg-white/5 text-white/40' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                    💡 Para ver rendimientos, usá el scanner de capturas para registrar tus operaciones con precio de compra y ticker de API.
                </div>
            )}

            {/* Tabs carteras / especies */}
            <div className={`flex gap-1 p-1 rounded-xl ${isGlass ? 'bg-white/5' : 'bg-gray-100'}`}>
                <button type="button" onClick={() => setActiveTab('carteras')} className={tabCls('carteras')}>
                    Por Cartera
                </button>
                <button type="button" onClick={() => setActiveTab('especies')} className={tabCls('especies')}>
                    Por Activo
                </button>
            </div>

            {/* Vista carteras */}
            {activeTab === 'carteras' && (
                <div className="space-y-3">
                    {balances.map(carteraData => (
                        <CarteraCard
                            key={carteraData.cartera}
                            cartera={carteraData.cartera}
                            items={carteraData.items}
                            quotes={quotes}
                            dolarBlue={dolarBlue}
                            isGlass={isGlass}
                            privacyMode={privacyMode}
                        />
                    ))}
                </div>
            )}

            {/* Vista por especie */}
            {activeTab === 'especies' && (
                <EspecieTable
                    balancesPorEspecie={balancesPorEspecie}
                    quotes={quotes}
                    dolarBlue={dolarBlue}
                    isGlass={isGlass}
                    privacyMode={privacyMode}
                    savingsTransactions={savingsTransactions}
                />
            )}
        </div>
    );
}

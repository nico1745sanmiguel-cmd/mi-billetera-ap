import React, { useMemo, useState } from 'react';
// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Wallet, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';
import { useSavings } from '../../../context/SavingsContext';
import { useFinancial } from '../../../context/FinancialContext';
import AssetDetailsModal from '../AssetDetailsModal';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const usdFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const arsFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

const formatPercentage = (amount) => {
    return amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
};

export default function PortfolioTab({ isGlass, privacyMode, currencyView = 'USD' }) {
    const { posiciones } = useSavings();
    const { dolarBlue } = useFinancial();
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const rate = dolarBlue || 1000;

    const formatAmount = (amount, currency) => {
        if (privacyMode) return '****';
        return currency === 'USD' ? usdFormatter.format(amount) : arsFormatter.format(amount);
    };

    const handleRowClick = (pos) => {
        setSelectedAsset(pos);
        setIsModalOpen(true);
    };

    const requestSort = (key) => {
        let direction = 'desc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    // Agrupar por cartera
    const posicionesByCartera = useMemo(() => {
        const ag = {};
        posiciones.forEach(p => {
            if (!ag[p.cartera]) ag[p.cartera] = { totalUSD: 0, totalARS: 0, items: [] };
            
            const valorUSD = p.valorActualUSD;
            const valorARS = valorUSD * rate;
            
            ag[p.cartera].totalUSD += valorUSD;
            ag[p.cartera].totalARS += valorARS;
            ag[p.cartera].items.push(p);
        });

        // Ordenar dentro de cada cartera
        Object.keys(ag).forEach(cartera => {
            if (sortConfig.key) {
                ag[cartera].items.sort((a, b) => {
                    let aValue = a[sortConfig.key];
                    let bValue = b[sortConfig.key];
                    
                    if (typeof aValue === 'string') {
                        aValue = aValue.toLowerCase();
                        bValue = bValue.toLowerCase();
                    }
                    
                    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                });
            }
        });

        // Convert to array and sort carteras by total value descending
        return Object.keys(ag).map(name => ({
            name,
            ...ag[name]
        })).sort((a, b) => b.totalUSD - a.totalUSD);
    }, [posiciones, rate, sortConfig]);

    const dataByCartera = useMemo(() => {
        return posicionesByCartera.reduce((acc, c) => {
            const value = currencyView === 'ARS' ? c.totalARS : c.totalUSD;
            if (value > 0) acc.push({ name: c.name, value });
            return acc;
        }, []);
    }, [posicionesByCartera, currencyView]);

    const renderSortIcon = (columnName) => {
        if (sortConfig.key === columnName) {
            return <ArrowUpDown size={14} className={`inline-block ml-1 transition-transform ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />;
        }
        return <ArrowUpDown size={14} className="inline-block ml-1 opacity-30 hover:opacity-100 transition-opacity" />;
    };

    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const cardBg = isGlass ? 'bg-white/10 backdrop-blur-md border border-white/20' : 'bg-white shadow-sm border border-gray-100';

    if (posiciones.length === 0) {
        return (
            <div className={`text-center p-8 rounded-2xl ${cardBg}`}>
                <p className={isGlass ? 'text-white/60' : 'text-gray-500'}>
                    Todavía no agregaste operaciones a tu portafolio.<br/>Hacé clic en "Nueva Operación" para empezar.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Distribución de Carteras */}
            <div className={`rounded-3xl p-6 ${cardBg}`}>
                <h3 className={`font-bold mb-4 flex items-center gap-2 ${textColor}`}>
                    <Wallet size={18} />
                    Distribución por Cartera
                </h3>
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="w-full md:w-1/2 h-48 relative">
                        {!privacyMode ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={dataByCartera}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {dataByCartera.map((entry, index) => (
                                            <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(val) => currencyView === 'USD' ? usdFormatter.format(val) : arsFormatter.format(val)}
                                        contentStyle={{ backgroundColor: isGlass ? 'rgba(0,0,0,0.8)' : 'white', borderRadius: '12px', border: 'none' }}
                                        itemStyle={{ color: isGlass ? 'white' : 'black' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <span className={isGlass ? 'text-white/50' : 'text-gray-400'}>Oculto por privacidad</span>
                            </div>
                        )}
                    </div>
                    <div className="w-full md:w-1/2 space-y-3">
                        {dataByCartera.map((d, i) => (
                            <div key={d.name} className="flex justify-between items-center text-sm font-bold">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                    <span className={isGlass ? 'text-white/80' : 'text-gray-600'}>{d.name}</span>
                                </div>
                                <span className={textColor}>{formatAmount(d.value, currencyView)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Posiciones Abiertas Agrupadas por Cartera */}
            <div className="space-y-4">
                {posicionesByCartera.map((carteraData, index) => (
                    <div key={carteraData.name} className={`rounded-3xl p-6 overflow-hidden ${cardBg}`}>
                        <div className="flex justify-between items-end mb-4 border-b border-gray-200/20 pb-3">
                            <div>
                                <h3 className={`font-bold flex items-center gap-2 ${textColor}`}>
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                    {carteraData.name}
                                </h3>
                            </div>
                            <div className="text-right">
                                <div className={`text-xs font-semibold uppercase tracking-wider ${isGlass ? 'text-white/50' : 'text-gray-500'}`}>
                                    Total {currencyView}
                                </div>
                                <div className={`text-lg font-black ${textColor}`}>
                                    {formatAmount(currencyView === 'ARS' ? carteraData.totalARS : carteraData.totalUSD, currencyView)}
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto -mx-6 px-6">
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className={isGlass ? 'text-white/50' : 'text-gray-400'}>
                                        <th className="pb-3 font-semibold cursor-pointer select-none hover:text-green-500 transition-colors" onClick={() => requestSort('especie')}>
                                            Activo {renderSortIcon('especie')}
                                        </th>
                                        <th className="pb-3 font-semibold text-right cursor-pointer select-none hover:text-green-500 transition-colors" onClick={() => requestSort('variacionDiaria')}>
                                            Var. 24h {renderSortIcon('variacionDiaria')}
                                        </th>
                                        <th className="hidden md:table-cell pb-3 font-semibold text-right cursor-pointer select-none hover:text-green-500 transition-colors" onClick={() => requestSort('cantidad')}>
                                            Cant. {renderSortIcon('cantidad')}
                                        </th>
                                        <th className="hidden md:table-cell pb-3 font-semibold text-right cursor-pointer select-none hover:text-green-500 transition-colors" onClick={() => requestSort('precioActualUSD')}>
                                            Precio Actual {renderSortIcon('precioActualUSD')}
                                        </th>
                                        <th className="hidden md:table-cell pb-3 font-semibold text-right cursor-pointer select-none hover:text-green-500 transition-colors" onClick={() => requestSort('valorActualUSD')}>
                                            Valor {currencyView} {renderSortIcon('valorActualUSD')}
                                        </th>
                                        <th className="pb-3 font-semibold text-right cursor-pointer select-none hover:text-green-500 transition-colors" onClick={() => requestSort('gananciaPérdidaUSD')}>
                                            P&L {renderSortIcon('gananciaPérdidaUSD')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200/20">
                                    {carteraData.items.map(pos => {
                                        const valueBase = currencyView === 'ARS' ? (pos.valorActualUSD * rate) : pos.valorActualUSD;
                                        const priceBase = currencyView === 'ARS' ? (pos.precioActualUSD * rate) : pos.precioActualUSD;
                                        const pnlBase = currencyView === 'ARS' ? (pos.gananciaPérdidaUSD * rate) : pos.gananciaPérdidaUSD;
                                        const isProfit = pos.gananciaPérdidaUSD >= 0;

                                        return (
                                            <tr 
                                                key={`${pos.cartera}-${pos.especie}`} 
                                                className="hover:bg-white/5 transition-colors cursor-pointer"
                                                onClick={() => handleRowClick(pos)}
                                            >
                                                <td className={`py-4 font-bold ${textColor}`}>{pos.especie}</td>
                                                <td className={`py-4 text-right font-bold ${pos.variacionDiaria >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {pos.variacionDiaria !== 0 ? (pos.variacionDiaria > 0 ? '+' : '') + formatPercentage(pos.variacionDiaria) : '-'}
                                                </td>
                                                <td className={`hidden md:table-cell py-4 text-right font-medium ${textColor}`}>
                                                    {privacyMode ? '****' : pos.cantidad.toLocaleString('es-AR', { maximumFractionDigits: 6 })}
                                                </td>
                                                <td className={`hidden md:table-cell py-4 text-right ${isGlass ? 'text-white/70' : 'text-gray-600'}`}>
                                                    {formatAmount(priceBase, currencyView)}
                                                </td>
                                                <td className={`hidden md:table-cell py-4 text-right font-bold ${textColor}`}>
                                                    {formatAmount(valueBase, currencyView)}
                                                </td>
                                                <td className={`py-4 text-right font-bold flex justify-end items-center gap-1 ${
                                                    isProfit ? 'text-green-500' : 'text-red-500'
                                                }`}>
                                                    {isProfit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                    {formatAmount(Math.abs(pnlBase), currencyView)}
                                                    <span className="text-xs opacity-70 ml-1">
                                                        ({isProfit ? '+' : ''}{formatPercentage(pos.gananciaPorcentaje)})
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>

            <AssetDetailsModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                asset={selectedAsset}
                currencyView={currencyView}
                isGlass={isGlass}
                rate={rate}
            />
        </div>
    );
}

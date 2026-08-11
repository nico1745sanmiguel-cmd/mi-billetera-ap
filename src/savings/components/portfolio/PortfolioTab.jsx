import React, { useMemo, useState } from 'react';
import { useSavings } from '../../context/SavingsContext';
import { useFinancial } from '../../../context/FinancialContext';

import AssetDetailsModal from '../../../Components/Savings/AssetDetailsModal';
import OperationModal from '../../../Components/Savings/OperationModal';
import StopLossModal from '../../../Components/Savings/StopLossModal';

import ResumenPortfolio from './ResumenPortfolio';
import TenenciasLista from './TenenciasLista';
import CaucionesActivas from './CaucionesActivas';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const usdFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const arsFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export default function PortfolioTab({ isGlass, privacyMode, currencyView = 'USD' }) {
    const { posiciones, cauciones, liquidezPorCartera } = useSavings();
    const { dolarBlue } = useFinancial();
    
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [sellModalData, setSellModalData] = useState(null);
    
    const [selectedStopAsset, setSelectedStopAsset] = useState(null);
    const [isStopModalOpen, setIsStopModalOpen] = useState(false);
    
    const [chartView, setChartView] = useState('general');
    const [vencimientoModal, setVencimientoModal] = useState(null); // caucion a registrar vencimiento

    const rate = dolarBlue || 1000;

    const formatAmount = (amount, currency) => {
        if (privacyMode) return '****';
        return currency === 'USD' ? usdFormatter.format(amount) : arsFormatter.format(amount);
    };

    const handleRowClick = (pos) => {
        setSelectedAsset(pos);
        setIsModalOpen(true);
    };

    const handleSellClick = (e, pos) => {
        e.stopPropagation();
        setSellModalData({
            tipo: 'venta',
            cartera: pos.cartera,
            especie: pos.especie,
            cantidad: pos.cantidad.toString(),
            precioUnitario: pos.precioActualUSD.toString(),
            monedaPrecio: 'USD',
        });
    };

    const handleStopClick = (pos) => {
        setSelectedStopAsset(pos);
        setIsStopModalOpen(true);
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
        
        const initCartera = (c) => {
            if (!ag[c]) ag[c] = { totalUSD: 0, totalARS: 0, items: [], liquidez: { ARS: 0, USD: 0 } };
        };

        // Agregar posiciones
        posiciones.forEach(p => {
            initCartera(p.cartera);
            
            const valorUSD = p.valorActualUSD;
            const valorARS = valorUSD * rate;
            
            ag[p.cartera].totalUSD += valorUSD;
            ag[p.cartera].totalARS += valorARS;
            ag[p.cartera].items.push(p);
        });

        // Asegurar carteras que solo tienen liquidez
        Object.keys(liquidezPorCartera || {}).forEach(c => {
            initCartera(c);
            const liq = liquidezPorCartera[c];
            ag[c].liquidez = liq;
            ag[c].totalARS += (liq.ARS || 0) + ((liq.USD || 0) * rate);
            ag[c].totalUSD += (liq.USD || 0) + ((liq.ARS || 0) / rate);
        });

        // Agregar cauciones al total de la cartera
        const caucionesFiltradas = (cauciones || []).filter(c => c.estado !== 'vencida' || true);
        caucionesFiltradas.forEach(c => {
            initCartera(c.cartera);
            const valorARS = c.valorActualARS || 0;
            const valorUSD = c.valorActualUSD || 0;
            ag[c.cartera].totalUSD += valorUSD;
            ag[c.cartera].totalARS += valorARS;
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
    }, [posiciones, cauciones, liquidezPorCartera, rate, sortConfig]);

    const chartData = useMemo(() => {
        const caucionesFiltradas = (cauciones || []).filter(c => c.estado !== 'vencida' || true);

        if (chartView === 'general') {
            const innerData = [];
            const outerData = [];
            
            posicionesByCartera.forEach((c, index) => {
                const cValue = currencyView === 'ARS' ? c.totalARS : c.totalUSD;
                if (cValue > 0) {
                    innerData.push({ name: c.name, value: cValue, fill: COLORS[index % COLORS.length] });
                    
                    c.items.forEach(p => {
                        const pValue = currencyView === 'ARS' ? p.valorActualUSD * rate : p.valorActualUSD;
                        if (pValue > 0) {
                            outerData.push({ name: `${p.especie} (${c.name})`, value: pValue, parentFill: COLORS[index % COLORS.length] });
                        }
                    });

                    caucionesFiltradas.filter(cau => cau.cartera === c.name).forEach(cau => {
                        const pValue = currencyView === 'ARS' ? cau.valorActualARS : cau.valorActualUSD;
                        if (pValue > 0) {
                            outerData.push({ name: `Caución ARS (${c.name})`, value: pValue, parentFill: COLORS[index % COLORS.length] });
                        }
                    });

                    if (c.liquidez) {
                        if (c.liquidez.ARS > 0) outerData.push({ name: `Líquido ARS (${c.name})`, value: currencyView === 'ARS' ? c.liquidez.ARS : c.liquidez.ARS / rate, parentFill: COLORS[index % COLORS.length] });
                        if (c.liquidez.USD > 0) outerData.push({ name: `Líquido USD (${c.name})`, value: currencyView === 'ARS' ? c.liquidez.USD * rate : c.liquidez.USD, parentFill: COLORS[index % COLORS.length] });
                    }
                }
            });
            return { innerData, outerData, type: '2-level' };
        }
        
        if (chartView === 'global') {
            const grouped = {};
            posiciones.forEach(p => {
                const val = currencyView === 'ARS' ? p.valorActualUSD * rate : p.valorActualUSD;
                if (!grouped[p.especie]) grouped[p.especie] = 0;
                grouped[p.especie] += val;
            });
            caucionesFiltradas.forEach(cau => {
                const val = currencyView === 'ARS' ? cau.valorActualARS : cau.valorActualUSD;
                if (!grouped['Caución ARS']) grouped['Caución ARS'] = 0;
                grouped['Caución ARS'] += val;
            });
            posicionesByCartera.forEach(c => {
                if (c.liquidez) {
                    if (c.liquidez.ARS > 0) {
                        if (!grouped['Líquido ARS']) grouped['Líquido ARS'] = 0;
                        grouped['Líquido ARS'] += currencyView === 'ARS' ? c.liquidez.ARS : c.liquidez.ARS / rate;
                    }
                    if (c.liquidez.USD > 0) {
                        if (!grouped['Líquido USD']) grouped['Líquido USD'] = 0;
                        grouped['Líquido USD'] += currencyView === 'ARS' ? c.liquidez.USD * rate : c.liquidez.USD;
                    }
                }
            });
            
            const outerData = Object.keys(grouped).map((k, i) => ({
                name: k,
                value: grouped[k],
                fill: COLORS[i % COLORS.length]
            })).sort((a,b) => b.value - a.value);
            return { outerData, type: '1-level' };
        }
        
        const carteraInfo = posicionesByCartera.find(c => c.name === chartView);
        if (carteraInfo) {
            const outerData = carteraInfo.items.reduce((acc, p, i) => {
                 const value = currencyView === 'ARS' ? p.valorActualUSD * rate : p.valorActualUSD;
                 if (value > 0) acc.push({ name: p.especie, value, fill: COLORS[i % COLORS.length] });
                 return acc;
            }, []);
            
            caucionesFiltradas.filter(cau => cau.cartera === chartView).forEach(cau => {
                const value = currencyView === 'ARS' ? cau.valorActualARS : cau.valorActualUSD;
                if (value > 0) outerData.push({ name: 'Caución ARS', value, fill: COLORS[outerData.length % COLORS.length] });
            });

            if (carteraInfo.liquidez) {
                if (carteraInfo.liquidez.ARS > 0) {
                    outerData.push({ name: 'Líquido ARS', value: currencyView === 'ARS' ? carteraInfo.liquidez.ARS : carteraInfo.liquidez.ARS / rate, fill: COLORS[outerData.length % COLORS.length] });
                }
                if (carteraInfo.liquidez.USD > 0) {
                    outerData.push({ name: 'Líquido USD', value: currencyView === 'ARS' ? carteraInfo.liquidez.USD * rate : carteraInfo.liquidez.USD, fill: COLORS[outerData.length % COLORS.length] });
                }
            }

            outerData.sort((a,b) => b.value - a.value);
            return { outerData, type: '1-level' };
        }
        
        return { outerData: [], type: '1-level' };
    }, [posicionesByCartera, posiciones, cauciones, chartView, currencyView, rate]);


    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const cardBg = isGlass ? 'bg-white/10 backdrop-blur-md border border-white/20' : 'bg-white shadow-sm border border-gray-100';

    const caucionesActivasList = (cauciones || []).filter(c => c.estado !== 'vencida' || true); // mostrar todas
    const hasCauciones = caucionesActivasList.length > 0;
    const hasLiquidez = Object.keys(liquidezPorCartera || {}).some(c => liquidezPorCartera[c].ARS > 0 || liquidezPorCartera[c].USD > 0);

    if (posiciones.length === 0 && !hasCauciones && !hasLiquidez) {
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
            <ResumenPortfolio 
                isGlass={isGlass}
                privacyMode={privacyMode}
                currencyView={currencyView}
                formatAmount={formatAmount}
                chartView={chartView}
                setChartView={setChartView}
                posicionesByCartera={posicionesByCartera}
                chartData={chartData}
            />

            {/* Posiciones Abiertas Agrupadas por Cartera */}
            <TenenciasLista 
                posicionesByCartera={posicionesByCartera}
                currencyView={currencyView}
                isGlass={isGlass}
                privacyMode={privacyMode}
                formatAmount={formatAmount}
                rate={rate}
                requestSort={requestSort}
                sortConfig={sortConfig}
                handleRowClick={handleRowClick}
                handleSellClick={handleSellClick}
                handleStopClick={handleStopClick}
            />

            {/* Cauciones Activas */}
            <CaucionesActivas 
                caucionesActivas={caucionesActivasList}
                hasCauciones={hasCauciones}
                isGlass={isGlass}
                privacyMode={privacyMode}
                setVencimientoModal={setVencimientoModal}
                textColor={textColor}
                cardBg={cardBg}
            />

            {/* Modales (estaban en el PortfolioTab) */}
            <AssetDetailsModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                asset={selectedAsset}
                currencyView={currencyView}
                isGlass={isGlass}
                rate={rate}
                onSellClick={() => {
                    setIsModalOpen(false);
                    setSellModalData({
                        tipo: 'venta',
                        cartera: selectedAsset.cartera,
                        especie: selectedAsset.especie,
                        cantidad: selectedAsset.cantidad.toString(),
                        precioUnitario: selectedAsset.precioActualUSD.toString(),
                        monedaPrecio: 'USD',
                    });
                }}
            />
            
            <StopLossModal 
                isOpen={isStopModalOpen}
                onClose={() => setIsStopModalOpen(false)}
                asset={selectedStopAsset}
                isGlass={isGlass}
                currencyView={currencyView}
                rate={rate}
            />
            
            {sellModalData && (
                <OperationModal
                    onClose={() => setSellModalData(null)}
                    isGlass={isGlass}
                    initialData={sellModalData}
                />
            )}
            
            {vencimientoModal && (
                <OperationModal
                    onClose={() => setVencimientoModal(null)}
                    isGlass={isGlass}
                    initialData={{
                        tipo: 'deposito',
                        cartera: vencimientoModal.cartera,
                        especie: 'ARS',
                        cantidad: vencimientoModal.montoTotalEsperadoARS,
                        precioUnitario: 1,
                        monedaPrecio: 'ARS',
                        nota: `Vencimiento caución ${vencimientoModal.plazo}d @ ${vencimientoModal.tna}% TNA`,
                    }}
                />
            )}
        </div>
    );
}

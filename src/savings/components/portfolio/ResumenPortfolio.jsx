import React, { useState, useEffect, useRef } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { Wallet, Info } from 'lucide-react';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const usdFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const arsFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

function fmt(value, currencyView) {
    return currencyView === 'USD' ? usdFormatter.format(value) : arsFormatter.format(value);
}

function getPerfColor(pct) {
    if (pct === undefined || pct === null || isNaN(pct)) return '#374151';
    if (pct >= 40)  return '#14532d';
    if (pct >= 20)  return '#166534';
    if (pct >= 10)  return '#15803d';
    if (pct >= 4)   return '#16a34a';
    if (pct >= 0)   return '#22c55e';
    if (pct >= -4)  return '#f87171';
    if (pct >= -10) return '#ef4444';
    if (pct >= -20) return '#dc2626';
    if (pct >= -40) return '#b91c1c';
    return '#7f1d1d';
}

function TreemapCell(props) {
    const { x, y, width, height, name, value, fill, depth } = props;
    const { isPrivate, currencyView, captureRef } = props;

    if (depth === 0 || !width || !height) return null;

    if (depth === 1) {
        if (captureRef?.current) {
            captureRef.current.push({ name, x, y, width, height });
        }
        return (
            <g>
                <rect x={x} y={y} width={width} height={height} fill="rgba(0,0,0,0.45)" rx={4} ry={4} />
            </g>
        );
    }

    if (width < 6 || height < 6) return null;

    const GAP = 2;
    const area = width * height;
    const nameFontSize = Math.min(26, Math.max(9, Math.sqrt(area) / 5.5));
    const valFontSize  = Math.min(13, Math.max(8, nameFontSize * 0.62));

    const showName  = width > 30 && height > 18;
    const showValue = width > 50 && height > 36;

    const blockH = showValue ? nameFontSize + valFontSize + 4 : nameFontSize;
    const nameY  = y + (height - blockH) / 2 + nameFontSize;
    const valY   = nameY + valFontSize + 3;

    const displayName = name && name.length > 14 ? name.slice(0, 13) + '…' : name;

    return (
        <g>
            <rect
                x={x + GAP} y={y + GAP}
                width={width - GAP * 2} height={height - GAP * 2}
                fill={fill}
                stroke="rgba(0,0,0,0.25)"
                strokeWidth={0.5}
                rx={3} ry={3}
            />
            {showName && (
                <text
                    x={x + width / 2} y={nameY}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.95)"
                    fontSize={nameFontSize}
                    fontWeight="800"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                    {displayName}
                </text>
            )}
            {showValue && (
                <text
                    x={x + width / 2} y={valY}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.72)"
                    fontSize={valFontSize}
                    fontWeight="600"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                    {isPrivate ? '••••' : fmt(value, currencyView)}
                </text>
            )}
        </g>
    );
}

function CustomTooltip({ active, payload, currencyView, isGlass, isPrivate }) {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d?.name) return null;

    const hasDiaria = d.variacionDiaria !== undefined && d.variacionDiaria !== null && !isNaN(d.variacionDiaria);
    const hasHistorico = d.gananciaPorcentaje !== undefined && d.gananciaPorcentaje !== null && !isNaN(d.gananciaPorcentaje);
    const hasPnlUSD = d.gananciaPérdidaUSD !== undefined && d.gananciaPérdidaUSD !== null && !isNaN(d.gananciaPérdidaUSD);

    const diariaColor = hasDiaria ? (d.variacionDiaria >= 0 ? '#4ade80' : '#f87171') : '#9ca3af';
    const histColor   = hasHistorico ? (d.gananciaPorcentaje >= 0 ? '#4ade80' : '#f87171') : '#9ca3af';

    const bgColor  = isGlass ? 'rgba(10,16,32,0.97)' : 'white';
    const txtColor = isGlass ? 'rgba(255,255,255,0.9)' : '#111827';
    const subColor = isGlass ? 'rgba(255,255,255,0.5)' : '#6b7280';
    const divColor = isGlass ? 'rgba(255,255,255,0.1)' : '#f3f4f6';

    return (
        <div style={{
            backgroundColor: bgColor,
            backdropFilter: 'blur(16px)',
            borderRadius: 12,
            border: isGlass ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e5e7eb',
            padding: '12px 16px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
            minWidth: 200,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: d.fill, flexShrink: 0 }} />
                <span style={{ color: txtColor, fontWeight: 800, fontSize: 14 }}>{d.name}</span>
                {d.cartera && <span style={{ color: subColor, fontSize: 11, fontWeight: 600 }}>({d.cartera})</span>}
            </div>
            <div style={{ color: txtColor, fontWeight: 700, fontSize: 16, marginBottom: 10 }}>
                {isPrivate ? '••••' : fmt(d.value, currencyView)}
            </div>
            {(hasDiaria || hasHistorico) && (
                <div style={{ borderTop: `1px solid ${divColor}`, marginBottom: 8 }} />
            )}
            {hasDiaria && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ color: subColor, fontSize: 11, fontWeight: 600 }}>HOY</span>
                    <span style={{ color: diariaColor, fontWeight: 800, fontSize: 13 }}>
                        {d.variacionDiaria >= 0 ? '+' : ''}{d.variacionDiaria.toFixed(2)}%
                    </span>
                </div>
            )}
            {hasHistorico && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <span style={{ color: subColor, fontSize: 11, fontWeight: 600 }}>HISTÓRICO</span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {hasPnlUSD && !isPrivate && (
                            <span style={{ color: histColor, fontWeight: 700, fontSize: 12 }}>
                                {d.gananciaPérdidaUSD >= 0 ? '+' : ''}{usdFormatter.format(d.gananciaPérdidaUSD)}
                            </span>
                        )}
                        <span style={{
                            color: 'white',
                            background: histColor,
                            fontWeight: 800,
                            fontSize: 11,
                            padding: '2px 6px',
                            borderRadius: 6,
                        }}>
                            {d.gananciaPorcentaje >= 0 ? '+' : ''}{d.gananciaPorcentaje.toFixed(1)}%
                        </span>
                    </div>
                </div>
            )}
            {!hasDiaria && !hasHistorico && (
                <span style={{ color: subColor, fontSize: 11 }}>Sin datos de rendimiento</span>
            )}
        </div>
    );
}

export default function ResumenPortfolio({
    isGlass,
    privacyMode,
    currencyView,
    formatAmount,
    chartView,
    setChartView,
    posicionesByCartera,
    chartData
}) {
    const textColor = isGlass ? 'text-white' : 'text-gray-800';
    const cardBg = isGlass ? 'bg-white/10 backdrop-blur-md border border-white/20' : 'bg-white shadow-sm border border-gray-100';
    const secondaryTextColor = isGlass ? 'text-white/60' : 'text-gray-500';
    const treemapBg = isGlass ? 'rgba(0,0,0,0.3)' : '#e2e8f0';

    const captureRef = useRef([]);
    const [groupLabels, setGroupLabels] = useState([]);
    captureRef.current = [];

    useEffect(() => {
        if (captureRef.current.length > 0) {
            setGroupLabels([...captureRef.current]);
        }
    }, [chartData, currencyView]);

    const isHierarchical = chartData.type === '2-level';

    const treemapData = (() => {
        if (isHierarchical) {
            return chartData.innerData.map((cartera) => {
                const children = chartData.outerData
                    .filter(o => o.name.endsWith(`(${cartera.name})`))
                    .map(o => ({
                        name: o.name.replace(/ \(.*\)$/, ''),
                        value: o.value,
                        fill: getPerfColor(o.gananciaPorcentaje),
                        variacionDiaria: o.variacionDiaria,
                        gananciaPorcentaje: o.gananciaPorcentaje,
                        gananciaPérdidaUSD: o.gananciaPérdidaUSD,
                        cartera: cartera.name,
                    }))
                    .sort((a, b) => b.value - a.value);
                return {
                    name: cartera.name,
                    value: cartera.value,
                    fill: cartera.fill,
                    children: children.length > 0 ? children : undefined,
                };
            });
        }
        return chartData.outerData
            .map((d, i) => ({
                name: d.name,
                value: d.value,
                fill: d.gananciaPorcentaje != null ? getPerfColor(d.gananciaPorcentaje) : (d.fill || COLORS[i % COLORS.length]),
                variacionDiaria: d.variacionDiaria,
                gananciaPorcentaje: d.gananciaPorcentaje,
                gananciaPérdidaUSD: d.gananciaPérdidaUSD,
            }))
            .sort((a, b) => b.value - a.value);
    })();

    const legendItems = isHierarchical ? chartData.innerData : chartData.outerData;

    return (
        <div className={`rounded-3xl p-5 sm:p-6 ${cardBg}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                <h3 className={`font-bold flex items-center gap-2 ${textColor}`}>
                    <Wallet size={18} className="text-green-500" />
                    Distribución de Tenencias
                </h3>
                <select
                    value={chartView}
                    onChange={(e) => setChartView(e.target.value)}
                    className={`p-2 rounded-xl text-xs font-bold outline-none transition-all cursor-pointer ${
                        isGlass
                            ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                            : 'bg-gray-50 text-gray-800 border border-gray-200 hover:bg-gray-100'
                    }`}
                >
                    <option value="general">Visión General</option>
                    <option value="global">Todas las tenencias (Agrupadas)</option>
                    <optgroup label="Por Cartera">
                        {posicionesByCartera.map(c => (
                            <option key={c.name} value={c.name}>{c.name}</option>
                        ))}
                    </optgroup>
                </select>
            </div>

            <div
                className="w-full rounded-2xl overflow-hidden"
                style={{ height: 300, backgroundColor: treemapBg, position: 'relative' }}
            >
                {!privacyMode ? (
                    <>
                        <ResponsiveContainer width="100%" height="100%">
                            <Treemap
                                data={treemapData}
                                dataKey="value"
                                aspectRatio={4 / 3}
                                stroke="transparent"
                                isAnimationActive={false}
                                content={
                                    <TreemapCell
                                        isPrivate={privacyMode}
                                        currencyView={currencyView}
                                        captureRef={captureRef}
                                    />
                                }
                            >
                                <Tooltip
                                    content={
                                        <CustomTooltip
                                            currencyView={currencyView}
                                            isGlass={isGlass}
                                            isPrivate={privacyMode}
                                        />
                                    }
                                />
                            </Treemap>
                        </ResponsiveContainer>

                        {isHierarchical && groupLabels.map(g => (
                            g.width > 50 && (
                                <div
                                    key={g.name}
                                    style={{
                                        position: 'absolute',
                                        left: g.x + 6,
                                        top: g.y + 6,
                                        pointerEvents: 'none',
                                        zIndex: 10,
                                    }}
                                >
                                    <span style={{
                                        background: 'rgba(0,0,0,0.72)',
                                        color: 'rgba(255,255,255,0.95)',
                                        fontSize: 9,
                                        fontWeight: 800,
                                        letterSpacing: '0.12em',
                                        textTransform: 'uppercase',
                                        padding: '3px 7px',
                                        borderRadius: 4,
                                        backdropFilter: 'blur(4px)',
                                        display: 'inline-block',
                                    }}>
                                        {g.name}
                                    </span>
                                </div>
                            )
                        ))}
                    </>
                ) : (
                    <div className={`w-full h-full flex items-center justify-center border-2 border-dashed rounded-2xl ${isGlass ? 'border-white/20 text-white/50' : 'border-gray-200 text-gray-400'}`}>
                        <span className="text-xs font-bold uppercase tracking-wider">Oculto</span>
                    </div>
                )}
            </div>

            <div className="mt-4 space-y-1.5 max-h-36 overflow-y-auto hide-scrollbar pr-2">
                {legendItems.map((d, i) => (
                    <div key={d.name} className={`flex justify-between items-center text-sm px-2 py-1.5 rounded-xl transition-colors ${isGlass ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                        <div className="flex items-center gap-2 truncate">
                            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.fill || COLORS[i % COLORS.length] }} />
                            <span className={`font-semibold truncate ${textColor}`} title={d.name}>{d.name}</span>
                        </div>
                        <span className={`font-black text-sm ${textColor}`}>{formatAmount(d.value, currencyView)}</span>
                    </div>
                ))}
            </div>

            {chartView === 'general' && posicionesByCartera.some(c => c.liquidez && (c.liquidez.ARS > 0 || c.liquidez.USD > 0)) && (
                <div className={`mt-4 p-3 rounded-2xl ${isGlass ? 'bg-white/5 border border-white/5' : 'bg-green-50 border border-green-100'}`}>
                    <div className="flex items-center gap-1.5 mb-2">
                        <Info size={14} className="text-green-500" />
                        <span className={`text-xs font-bold uppercase tracking-wider ${secondaryTextColor}`}>Líquido Disponible</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {posicionesByCartera.filter(c => c.liquidez && (c.liquidez.ARS > 0 || c.liquidez.USD > 0)).map(c => (
                            <div key={`liq-${c.name}`} className="flex items-center gap-2 text-xs">
                                <span className={`font-semibold ${secondaryTextColor}`}>{c.name}:</span>
                                <div className="flex gap-1.5 font-black">
                                    {c.liquidez.ARS > 0 && <span className={textColor}>{privacyMode ? '****' : arsFormatter.format(c.liquidez.ARS)}</span>}
                                    {c.liquidez.USD > 0 && <span className="text-green-500">{privacyMode ? '****' : usdFormatter.format(c.liquidez.USD)}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

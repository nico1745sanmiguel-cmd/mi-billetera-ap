import React from 'react';
// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { Wallet, Info } from 'lucide-react';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const usdFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const arsFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

function fmt(value, currencyView) {
    return currencyView === 'USD' ? usdFormatter.format(value) : arsFormatter.format(value);
}

// Celda estilo Finviz: texto grande escalado por área, sin gradientes complejos
function TreemapCell(props) {
    const { x, y, width, height, name, value, fill } = props;
    const { isPrivate, currencyView } = props;

    if (!width || !height || width < 6 || height < 6) return null;

    const area = width * height;
    // Escala de texto proporcional al área de la celda
    const nameFontSize = Math.min(28, Math.max(9, Math.sqrt(area) / 6));
    const valFontSize  = Math.min(14, Math.max(8,  nameFontSize * 0.65));

    const showName  = width > 32 && height > 20;
    const showValue = width > 52 && height > 38;

    // Centrar verticalmente el bloque nombre + valor
    const blockH = showValue ? nameFontSize + valFontSize + 4 : nameFontSize;
    const nameY  = y + (height - blockH) / 2 + nameFontSize;
    const valY   = nameY + valFontSize + 3;

    const displayName = name && name.length > 16 ? name.slice(0, 15) + '…' : name;

    return (
        <g>
            <rect
                x={x + 1} y={y + 1}
                width={width - 2} height={height - 2}
                fill={fill}
                stroke="rgba(0,0,0,0.35)"
                strokeWidth={1.5}
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
                    fill="rgba(255,255,255,0.70)"
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

function CustomTooltip({ active, payload, currencyView, isGlass }) {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d?.name) return null;
    return (
        <div style={{
            backgroundColor: isGlass ? 'rgba(10,15,30,0.97)' : 'white',
            backdropFilter: 'blur(12px)',
            borderRadius: 10,
            border: isGlass ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e5e7eb',
            padding: '8px 14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        }}>
            <p style={{ color: d.fill || '#10B981', fontWeight: 800, margin: 0, fontSize: 13 }}>{d.name}</p>
            <p style={{ color: isGlass ? 'rgba(255,255,255,0.9)' : '#111827', fontWeight: 700, margin: '3px 0 0', fontSize: 15 }}>
                {fmt(d.value, currencyView)}
            </p>
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
    const treemapBg = isGlass ? 'rgba(0,0,0,0.25)' : '#f1f5f9';

    // Datos PLANOS para el Treemap — color indica la cartera
    const treemapData = (() => {
        if (chartData.type === '2-level') {
            // Visión general: cada activo como celda plana, coloreado por cartera
            return chartData.outerData
                .map(d => ({
                    name: d.name.replace(/ \(.*\)$/, ''), // quitar "(Cartera)" del nombre
                    value: d.value,
                    fill: d.parentFill,
                }))
                .sort((a, b) => b.value - a.value);
        }
        // Vista plana (global o cartera individual)
        return chartData.outerData
            .map((d, i) => ({
                name: d.name,
                value: d.value,
                fill: d.fill || COLORS[i % COLORS.length],
            }))
            .sort((a, b) => b.value - a.value);
    })();

    const legendItems = chartData.type === '2-level' ? chartData.innerData : chartData.outerData;

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

            {/* ── TREEMAP ── */}
            <div
                className="w-full rounded-2xl overflow-hidden"
                style={{ height: 280, backgroundColor: treemapBg }}
            >
                {!privacyMode ? (
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
                                />
                            }
                        >
                            <Tooltip
                                content={<CustomTooltip currencyView={currencyView} isGlass={isGlass} />}
                            />
                        </Treemap>
                    </ResponsiveContainer>
                ) : (
                    <div className={`w-full h-full flex items-center justify-center border-2 border-dashed rounded-2xl ${isGlass ? 'border-white/20 text-white/50' : 'border-gray-200 text-gray-400'}`}>
                        <span className="text-xs font-bold uppercase tracking-wider">Oculto</span>
                    </div>
                )}
            </div>

            {/* ── LEYENDA (carteras o activos) ── */}
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

            {/* ── LÍQUIDO DISPONIBLE (solo visión general) ── */}
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



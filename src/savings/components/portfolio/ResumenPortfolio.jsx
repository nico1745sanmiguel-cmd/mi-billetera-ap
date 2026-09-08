import React from 'react';
// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { Wallet, Info } from 'lucide-react';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const usdFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const arsFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

function CustomTreemapContent(props) {
    const { x, y, width, height, name, value, fill, depth, root } = props;
    // Acceder a las props extras que pasamos via content={}
    const isPrivate = props.isPrivate;
    const currencyView = props.currencyView;

    if (!width || !height || width < 8 || height < 8) return null;

    const showLabel = width > 44 && height > 26;
    const showValue = width > 70 && height > 46;
    const radius = 8;
    const gradH = Math.min(height * 0.5, 48);

    return (
        <g>
            <rect
                x={x + 1} y={y + 1}
                width={width - 2} height={height - 2}
                rx={radius} ry={radius}
                fill={fill}
                fillOpacity={depth === 1 ? 0.9 : 0.65}
                stroke="rgba(0,0,0,0.18)"
                strokeWidth={1}
            />
            {showLabel && (
                <rect
                    x={x + 1} y={y + height - gradH}
                    width={width - 2} height={gradH}
                    rx={radius} ry={radius}
                    fill="rgba(0,0,0,0.38)"
                />
            )}
            {showLabel && (
                <text
                    x={x + width / 2}
                    y={showValue ? y + height - 19 : y + height / 2 + 5}
                    textAnchor="middle"
                    fill="white"
                    fontSize={Math.min(12, Math.max(9, width / 7))}
                    fontWeight="700"
                    style={{ pointerEvents: 'none' }}
                >
                    {name && name.length > 14 ? name.slice(0, 13) + '…' : name}
                </text>
            )}
            {showValue && (
                <text
                    x={x + width / 2}
                    y={y + height - 6}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.85)"
                    fontSize={Math.min(10, Math.max(8, width / 9))}
                    fontWeight="600"
                    style={{ pointerEvents: 'none' }}
                >
                    {isPrivate ? '••••' : (currencyView === 'USD' ? usdFormatter.format(value) : arsFormatter.format(value))}
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
            backgroundColor: isGlass ? 'rgba(15,23,42,0.95)' : 'white',
            backdropFilter: 'blur(10px)',
            borderRadius: 12,
            border: isGlass ? '1px solid rgba(255,255,255,0.1)' : '1px solid #f3f4f6',
            padding: '8px 14px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
        }}>
            <p style={{ color: d.fill || '#10B981', fontWeight: 'bold', margin: 0, fontSize: 13 }}>{d.name}</p>
            <p style={{ color: isGlass ? 'white' : '#1f2937', fontWeight: '800', margin: '2px 0 0', fontSize: 14 }}>
                {currencyView === 'USD' ? usdFormatter.format(d.value) : arsFormatter.format(d.value)}
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

    // Construir datos jerárquicos para el Treemap
    const treemapData = (() => {
        if (chartData.type === '2-level') {
            // Vista general: cartera → activos dentro
            return chartData.innerData.map((cartera) => {
                const children = chartData.outerData
                    .filter(o => o.name.endsWith(`(${cartera.name})`))
                    .map(o => ({
                        name: o.name.replace(/ \(.*\)$/, ''),
                        value: o.value,
                        fill: cartera.fill,
                    }));
                return {
                    name: cartera.name,
                    value: cartera.value,
                    fill: cartera.fill,
                    children: children.length > 0 ? children : undefined,
                };
            });
        }
        // Vista plana (global o cartera individual)
        return chartData.outerData.map((d, i) => ({
            name: d.name,
            value: d.value,
            fill: d.fill || COLORS[i % COLORS.length],
        }));
    })();

    const legendItems = chartData.type === '2-level' ? chartData.innerData : chartData.outerData;

    return (
        <div className={`rounded-3xl p-5 sm:p-6 ${cardBg}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
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
                    <option value="general">Visión General (Treemap)</option>
                    <option value="global">Todas las tenencias (Agrupadas)</option>
                    <optgroup label="Por Cartera">
                        {posicionesByCartera.map(c => (
                            <option key={c.name} value={c.name}>{c.name}</option>
                        ))}
                    </optgroup>
                </select>
            </div>

            {/* ── TREEMAP ── */}
            <div className="w-full rounded-2xl overflow-hidden" style={{ height: 260 }}>
                {!privacyMode ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <Treemap
                            data={treemapData}
                            dataKey="value"
                            aspectRatio={4 / 3}
                            stroke="transparent"
                            content={
                                <CustomTreemapContent
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
                    <div className={`w-full h-full rounded-2xl flex items-center justify-center border-2 border-dashed ${isGlass ? 'border-white/20 text-white/50' : 'border-gray-200 text-gray-400'}`}>
                        <span className="text-xs font-bold uppercase tracking-wider">Oculto</span>
                    </div>
                )}
            </div>

            {/* ── LEYENDA ── */}
            <div className="mt-5 space-y-2 max-h-36 overflow-y-auto hide-scrollbar pr-2">
                {legendItems.map((d, i) => (
                    <div key={d.name} className={`flex justify-between items-center text-sm p-2 rounded-xl transition-colors ${isGlass ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                        <div className="flex items-center gap-2 truncate">
                            <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: d.fill || COLORS[i % COLORS.length] }} />
                            <span className={`font-bold truncate ${textColor}`} title={d.name}>{d.name}</span>
                        </div>
                        <span className={`font-black ${textColor}`}>{formatAmount(d.value, currencyView)}</span>
                    </div>
                ))}
            </div>

            {/* ── LÍQUIDO DISPONIBLE (solo en visión general) ── */}
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

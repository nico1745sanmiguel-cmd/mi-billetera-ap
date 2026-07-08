import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';

// Renderizado personalizado para el sector activo del gráfico de Dona
const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
        <g>
            <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} />
            <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 10} outerRadius={outerRadius + 12} fill={fill} />
        </g>
    );
};

export default function StatsChart({
    chartData,
    activeIndex,
    setActiveIndex,
    activeChartItem,
    currentChartTotal,
    showMoney,
    glassClass,
    glassTextPrimary,
    glassTextSecondary,
    isGlass
}) {
    if (chartData.length === 0) {
        return (
            <div className={`p-8 rounded-[32px] border text-center ${glassClass}`}>
                <p className={`text-sm ${glassTextSecondary}`}>No hay datos para este filtro.</p>
            </div>
        );
    }

    return (
        <div className={`p-6 rounded-[32px] border shadow-sm flex flex-col items-center relative ${glassClass}`}>
            <h3 className={`w-full text-left font-bold text-sm mb-2 ${glassTextPrimary}`}>Composición del Gasto</h3>
            <div className="h-56 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            activeIndex={activeIndex}
                            activeShape={renderActiveShape}
                            onMouseEnter={(_, index) => setActiveIndex(index)}
                            onClick={(_, index) => setActiveIndex(index)}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={entry.name || `cell-${index}`} fill={entry.color} style={{ cursor: 'pointer', outline: 'none' }} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                {/* Texto Central */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${glassTextSecondary}`}>
                        {activeChartItem ? 'Selección' : 'Total'}
                    </span>
                    <span className={`text-lg font-black ${glassTextPrimary}`}>
                        {showMoney(activeChartItem ? activeChartItem.value : currentChartTotal)}
                    </span>
                </div>
            </div>

            {/* Leyenda / Info del Activo */}
            {activeChartItem && (
                <div className={`mt-4 p-4 rounded-2xl w-full flex items-center justify-between transition-all ${isGlass ? 'bg-white/10' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl text-white shadow-sm" style={{ backgroundColor: activeChartItem.color }}>
                            <activeChartItem.icon size={20} />
                        </div>
                        <div>
                            <p className={`font-bold text-sm ${glassTextPrimary}`}>{activeChartItem.name}</p>
                            <p className={`text-[10px] font-bold ${glassTextSecondary}`}>
                                {Math.round((activeChartItem.value / currentChartTotal) * 100)}% del segmento
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className={`font-mono font-bold ${glassTextPrimary}`}>{showMoney(activeChartItem.value)}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

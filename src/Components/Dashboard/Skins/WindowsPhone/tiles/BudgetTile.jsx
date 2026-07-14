import React from 'react';
import WPTile from '../WPTile';
import { Target } from 'lucide-react';

const BudgetTile = ({ totalNeed, totalPaid, showMoney, navigate, animDelay = 0 }) => {
    const pct = totalNeed > 0 ? Math.round((totalPaid / totalNeed) * 100) : 0;
    const clampedPct = Math.min(pct, 100);

    const front = (
        <>
            <div className="flex items-start justify-between">
                <Target size={26} className="text-white/80" strokeWidth={1.5} />
                <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">presupuesto</span>
            </div>
            <div>
                <div className="w-full h-1 bg-white/20 overflow-hidden mb-2">
                    <div
                        className="h-full bg-white transition-all duration-700"
                        style={{ width: `${clampedPct}%` }}
                    />
                </div>
                <p className="text-white text-3xl font-bold leading-none">{clampedPct}<span className="text-lg font-light">%</span></p>
                <p className="text-white/60 text-[10px] mt-0.5">pagado del mes</p>
            </div>
        </>
    );

    const back = (
        <>
            <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">pagado</span>
            <div>
                <p className="text-white text-2xl font-bold leading-none">{showMoney(totalPaid)}</p>
                <p className="text-white/60 text-xs mt-1">de {showMoney(totalNeed)}</p>
            </div>
        </>
    );

    return (
        <WPTile
            color="#0078D4"
            size="2x1"
            front={front}
            back={back}
            onClick={() => navigate('/stats')}
            delay={1200}
            animDelay={animDelay}
            label="Ver presupuesto mensual"
        />
    );
};

export default BudgetTile;

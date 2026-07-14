import React from 'react';
import WPTile from '../WPTile';
import { ShoppingCart } from 'lucide-react';

const SuperTile = ({ superData, showMoney, navigate, animDelay = 0 }) => {
    const pct = superData?.rawBudget > 0
        ? Math.round((superData.realSpent / superData.rawBudget) * 100)
        : 0;

    const front = (
        <>
            <div className="flex items-start justify-between">
                <ShoppingCart size={26} className="text-white/80" strokeWidth={1.5} />
                <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">súper</span>
            </div>
            <div>
                <p className="text-white text-2xl font-bold leading-none">{showMoney(superData?.showAmount || 0)}</p>
                <p className="text-white/60 text-[10px] mt-0.5">{superData?.label || 'presupuesto'}</p>
            </div>
        </>
    );

    const back = (
        <>
            <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">uso</span>
            <div>
                <div className="w-full h-1 bg-white/20 overflow-hidden mb-2">
                    <div className="h-full bg-white transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <p className="text-white text-3xl font-bold leading-none">{pct}<span className="text-lg font-light">%</span></p>
                <p className="text-white/60 text-[10px] mt-0.5">del presupuesto</p>
            </div>
        </>
    );

    return (
        <WPTile
            color="#5C2D91"
            size="1x1"
            front={front}
            back={back}
            onClick={() => navigate('/supermarket')}
            delay={3000}
            animDelay={animDelay}
            label="Ver supermercado"
        />
    );
};

export default SuperTile;

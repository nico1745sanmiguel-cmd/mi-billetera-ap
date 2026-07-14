import React from 'react';
import WPTile from '../WPTile';
import { Users } from 'lucide-react';
import { formatMoney } from '../../../../../utils';

const SplitTile = ({ splitData, privacyMode, navigate, animDelay = 0 }) => {
    const showMoney = (v) => privacyMode ? '****' : formatMoney(v);
    const first = splitData?.breakdown?.[0];
    const second = splitData?.breakdown?.[1];

    const front = (
        <>
            <div className="flex items-start justify-between">
                <Users size={26} className="text-white/80" strokeWidth={1.5} />
                <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">reparto</span>
            </div>
            <div>
                <p className="text-white text-2xl font-bold leading-none">
                    {showMoney(splitData?.grandTotal || 0)}
                </p>
                <p className="text-white/60 text-[10px] mt-0.5">gasto compartido</p>
            </div>
        </>
    );

    const back = splitData && first ? (
        <>
            <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">aportes</span>
            <div className="space-y-1">
                {first && (
                    <div className="flex justify-between items-center">
                        <span className="text-white/80 text-[10px] truncate max-w-[60px]">{first.displayName?.split(' ')[0]}</span>
                        <span className="text-white text-sm font-bold">{Math.round(first.percentage)}%</span>
                    </div>
                )}
                {second && (
                    <div className="flex justify-between items-center">
                        <span className="text-white/80 text-[10px] truncate max-w-[60px]">{second.displayName?.split(' ')[0]}</span>
                        <span className="text-white text-sm font-bold">{Math.round(second.percentage)}%</span>
                    </div>
                )}
            </div>
        </>
    ) : (
        <>
            <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">estado</span>
            <p className="text-white text-xs font-bold">Solo vos</p>
        </>
    );

    return (
        <WPTile
            color="#B4009E"
            size="1x1"
            front={front}
            back={back}
            onClick={() => navigate('/household')}
            delay={3400}
            animDelay={animDelay}
            label="Ver reparto del hogar"
        />
    );
};

export default SplitTile;

import React from 'react';
import WPTile from '../WPTile';
import { TrendingUp } from 'lucide-react';
import { useSavings } from '../../../../../context/SavingsContext';
import { formatMoney } from '../../../../../utils';

const SavingsTile = ({ privacyMode, navigate, animDelay = 0 }) => {
    const { savingsTransactions } = useSavings();
    const totalSaved = savingsTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);
    const showMoney = (v) => privacyMode ? '****' : formatMoney(v);

    const front = (
        <>
            <div className="flex items-start justify-between">
                <TrendingUp size={26} className="text-white/80" strokeWidth={1.5} />
                <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">ahorros</span>
            </div>
            <div>
                <p className="text-white text-2xl font-bold leading-none">{showMoney(totalSaved)}</p>
                <p className="text-white/60 text-[10px] mt-0.5">total acumulado</p>
            </div>
        </>
    );

    const back = (
        <>
            <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">carteras</span>
            <div>
                <p className="text-white text-4xl font-bold leading-none">
                    {new Set(savingsTransactions.map(t => t.carteraId || t.walletId || 'default')).size}
                </p>
                <p className="text-white/60 text-[10px] mt-0.5">carteras activas</p>
            </div>
        </>
    );

    return (
        <WPTile
            color="#107C10"
            size="1x1"
            front={front}
            back={back}
            onClick={() => navigate('/savings')}
            delay={1600}
            animDelay={animDelay}
            label="Ver ahorros"
        />
    );
};

export default SavingsTile;

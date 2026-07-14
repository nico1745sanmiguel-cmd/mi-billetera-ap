import React from 'react';
import WPTile from '../WPTile';
import { CreditCard } from 'lucide-react';

const CardsTile = ({ cardsWithDebt, showMoney, navigate, animDelay = 0 }) => {
    const totalDebt = cardsWithDebt.reduce((acc, c) => acc + (c.currentDebt || 0), 0);
    const activeCards = cardsWithDebt.filter(c => (c.currentDebt || 0) > 0).length;

    const front = (
        <>
            <div className="flex items-start justify-between">
                <CreditCard size={26} className="text-white/80" strokeWidth={1.5} />
                <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">tarjetas</span>
            </div>
            <div>
                <p className="text-white text-2xl font-bold leading-none">{showMoney(totalDebt)}</p>
                <p className="text-white/60 text-[10px] mt-0.5">en deuda</p>
            </div>
        </>
    );

    const back = (
        <>
            <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">activas</span>
            <div>
                <p className="text-white text-4xl font-bold leading-none">{activeCards}</p>
                <p className="text-white/60 text-[10px] mt-0.5">{activeCards === 1 ? 'tarjeta' : 'tarjetas'} con deuda</p>
            </div>
        </>
    );

    return (
        <WPTile
            color="#E81123"
            size="1x1"
            front={front}
            back={back}
            onClick={() => navigate('/cards')}
            delay={2000}
            animDelay={animDelay}
            label="Ver tarjetas"
        />
    );
};

export default CardsTile;

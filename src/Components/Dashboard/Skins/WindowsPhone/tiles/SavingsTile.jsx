import React, { useMemo } from 'react';
import WPTile from '../WPTile';
import { TrendingUp } from 'lucide-react';
import { useSavings } from '../../../../../context/SavingsContext';
import { useFinancial } from '../../../../../context/FinancialContext';
import { formatMoney } from '../../../../../utils';

const SavingsTile = ({ privacyMode, navigate, animDelay = 0 }) => {
    const { posiciones, cauciones, liquidezPorCartera, carteras } = useSavings();
    const { dolarBlue } = useFinancial();

    const totalSavedARS = useMemo(() => {
        const rate = dolarBlue || 1000;
        let totalUSD = 0;

        (posiciones || []).forEach(pos => {
            totalUSD += pos.valorActualUSD || 0;
        });

        (cauciones || []).forEach(c => {
            if (c.estado !== 'vencida' && !c.liquidada) {
                totalUSD += c.valorActualUSD || ((parseFloat(c.montoARS) || 0) / rate);
            }
        });

        Object.values(liquidezPorCartera || {}).forEach(liq => {
            totalUSD += (liq.USD || 0) + ((liq.ARS || 0) / rate);
        });

        return totalUSD * rate;
    }, [posiciones, cauciones, liquidezPorCartera, dolarBlue]);

    const activeWalletsCount = useMemo(() => {
        const set = new Set();
        (posiciones || []).forEach(p => { if (p.cartera) set.add(p.cartera); });
        (cauciones || []).forEach(c => { if (c.cartera) set.add(c.cartera); });
        Object.entries(liquidezPorCartera || {}).forEach(([cName, liq]) => {
            if (liq.ARS !== 0 || liq.USD !== 0) set.add(cName);
        });
        (carteras || []).forEach(c => set.add(c));
        return set.size || 1;
    }, [posiciones, cauciones, liquidezPorCartera, carteras]);

    const showMoney = (v) => privacyMode ? '****' : formatMoney(v);

    const front = (
        <>
            <div className="flex items-start justify-between">
                <TrendingUp size={26} className="text-white/80" strokeWidth={1.5} />
                <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">ahorros</span>
            </div>
            <div>
                <p className="text-white text-2xl font-bold leading-none">{showMoney(totalSavedARS)}</p>
                <p className="text-white/60 text-[10px] mt-0.5">total acumulado</p>
            </div>
        </>
    );

    const back = (
        <>
            <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">carteras</span>
            <div>
                <p className="text-white text-4xl font-bold leading-none">
                    {activeWalletsCount}
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

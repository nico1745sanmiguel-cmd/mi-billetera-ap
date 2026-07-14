import React from 'react';
import WPTile from '../WPTile';
import { Wallet } from 'lucide-react';
import { useSalary } from '../../../../../context/SalaryContext';
import { formatMoney } from '../../../../../utils';

const SalaryTile = ({ privacyMode, navigate, animDelay = 0 }) => {
    const { totalIncome, totalFree, baseSalary } = useSalary();
    const showMoney = (v) => privacyMode ? '****' : formatMoney(v);

    const front = (
        <>
            <div className="flex items-start justify-between">
                <Wallet size={26} className="text-white/80" strokeWidth={1.5} />
                <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">salario</span>
            </div>
            <div>
                <p className="text-white text-2xl font-bold leading-none">{showMoney(totalIncome || baseSalary || 0)}</p>
                <p className="text-white/60 text-[10px] mt-0.5">ingreso mensual</p>
            </div>
        </>
    );

    const back = (
        <>
            <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">disponible</span>
            <div>
                <p className="text-white text-2xl font-bold leading-none">{showMoney(totalFree || 0)}</p>
                <p className="text-white/60 text-[10px] mt-0.5">sin presupuestar</p>
            </div>
        </>
    );

    return (
        <WPTile
            color="#498205"
            size="2x1"
            front={front}
            back={back}
            onClick={() => navigate('/salary')}
            delay={1800}
            animDelay={animDelay}
            label="Ver salario"
        />
    );
};

export default SalaryTile;

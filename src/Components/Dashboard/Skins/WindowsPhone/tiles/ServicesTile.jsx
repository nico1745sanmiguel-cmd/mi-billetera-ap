import React from 'react';
import WPTile from '../WPTile';
import { Zap } from 'lucide-react';

const ServicesTile = ({ agenda, services, showMoney, navigate, animDelay = 0 }) => {
    const totalServices = services.reduce((acc, s) => acc + (s.amount || 0), 0);
    const nextItem = agenda[0];

    const front = (
        <>
            <div className="flex items-start justify-between">
                <Zap size={26} className="text-white/80" strokeWidth={1.5} />
                <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">servicios</span>
            </div>
            <div>
                <p className="text-white text-2xl font-bold leading-none">{showMoney(totalServices)}</p>
                <p className="text-white/60 text-[10px] mt-0.5">total mensual</p>
            </div>
        </>
    );

    const back = nextItem ? (
        <>
            <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">próximo</span>
            <div>
                <p className="text-white text-sm font-bold leading-tight truncate">{nextItem.name}</p>
                <p className="text-white/70 text-[10px] mt-0.5">Día {nextItem.day}</p>
                <p className="text-white text-lg font-bold mt-1">{showMoney(nextItem.amount)}</p>
            </div>
        </>
    ) : (
        <>
            <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">estado</span>
            <p className="text-white text-sm font-bold">✓ Todo al día</p>
        </>
    );

    return (
        <WPTile
            color="#FF8C00"
            size="1x1"
            front={front}
            back={back}
            onClick={() => navigate('/services_manager')}
            delay={2400}
            animDelay={animDelay}
            label="Ver servicios"
        />
    );
};

export default ServicesTile;

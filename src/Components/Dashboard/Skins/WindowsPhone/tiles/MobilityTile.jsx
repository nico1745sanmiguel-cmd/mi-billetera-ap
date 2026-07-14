import React, { useMemo } from 'react';
import WPTile from '../WPTile';
import { Car } from 'lucide-react';
import { useMobility } from '../../../../../context/MobilityContext';
import { formatMoney } from '../../../../../utils';

const MobilityTile = ({ privacyMode, navigate, currentDate, animDelay = 0 }) => {
    const { sessions } = useMobility();
    const showMoney = (v) => privacyMode ? '****' : formatMoney(v);

    const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    const monthlyTotal = useMemo(() => {
        return sessions
            .filter(s => s.date?.startsWith(monthKey))
            .reduce((acc, s) => acc + (s.total || 0), 0);
    }, [sessions, monthKey]);

    const monthSessions = useMemo(() => {
        return sessions.filter(s => s.date?.startsWith(monthKey)).length;
    }, [sessions, monthKey]);

    const front = (
        <>
            <div className="flex items-start justify-between">
                <Car size={26} className="text-white/80" strokeWidth={1.5} />
                <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">movilidad</span>
            </div>
            <div>
                <p className="text-white text-2xl font-bold leading-none">{showMoney(monthlyTotal)}</p>
                <p className="text-white/60 text-[10px] mt-0.5">este mes</p>
            </div>
        </>
    );

    const back = (
        <>
            <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">jornadas</span>
            <div>
                <p className="text-white text-4xl font-bold leading-none">{monthSessions}</p>
                <p className="text-white/60 text-[10px] mt-0.5">registradas este mes</p>
            </div>
        </>
    );

    return (
        <WPTile
            color="#0099BC"
            size="1x1"
            front={front}
            back={back}
            onClick={() => navigate('/mobility')}
            delay={2800}
            animDelay={animDelay}
            label="Ver movilidad"
        />
    );
};

export default MobilityTile;

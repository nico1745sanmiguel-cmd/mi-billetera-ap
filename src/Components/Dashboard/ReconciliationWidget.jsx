import React from 'react';

export const ReconciliationWidget = ({ setView, privacyMode }) => {
    return (
        <div
            onClick={() => setView('reconcile')}
            className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-[24px] cursor-pointer hover:bg-emerald-500/20 transition-all group relative overflow-hidden h-32 flex flex-col justify-between"
        >
            {/* Background Icon */}
            <div className="absolute -right-4 -bottom-4 opacity-10 text-emerald-400 transform group-hover:scale-110 transition-transform">
                <svg className="w-32 h-32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>

            <div className="flex justify-between items-start z-10">
                <div className="bg-emerald-500/20 text-emerald-300 p-2.5 rounded-xl backdrop-blur-sm">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                </div>
            </div>

            <div className="z-10">
                <p className="text-xs text-emerald-300/80 font-bold uppercase mb-0.5 tracking-wider">Mantenimiento</p>
                <p className="text-xl font-bold text-white flex items-center gap-2">
                    Conciliar
                    <span className="text-[10px] bg-emerald-500 text-black px-2 py-0.5 rounded-full uppercase font-black tracking-wide">Nuevo</span>
                </p>
            </div>
        </div>
    );
};

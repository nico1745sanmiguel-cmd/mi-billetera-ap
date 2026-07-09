import React from 'react';
import { Briefcase, ChevronRight, Wallet } from 'lucide-react';
import { SalaryProvider, useSalaryState } from '../../../context/SalaryContext';
import { formatMoney } from '../../../utils';

function SalaryWidgetInner({ setView, privacyMode }) {
    const { totalIncome, totalBudgeted, totalFree, loading } = useSalaryState();

    const percent = totalIncome > 0 ? Math.min(100, Math.round((totalBudgeted / totalIncome) * 100)) : 0;
    const showMoney = (v) => privacyMode ? '••••' : formatMoney(v);

    return (
        <div
            onClick={() => setView('salary')}
            className="h-full flex flex-col justify-center rounded-2xl p-5 shadow-sm border border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50
                dark:from-white/10 dark:to-white/5 dark:border-white/10 relative overflow-hidden group cursor-pointer transition-all active:scale-95"
        >
            <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-br from-violet-200/50 to-indigo-200/50 dark:from-violet-500/10 dark:to-indigo-500/10 rounded-full -mr-10 -mt-10 blur-2xl transition-all group-hover:scale-110" />

            <div className="relative z-10 flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="bg-violet-200 dark:bg-violet-500/20 p-2.5 rounded-xl text-violet-700 dark:text-violet-300">
                        <Briefcase size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-base text-gray-800 dark:text-white leading-tight">Sueldo del mes</h3>
                        <p className="text-[10px] uppercase font-bold text-gray-500 dark:text-white/50 tracking-wider">Plan de ingresos</p>
                    </div>
                </div>
                <button aria-label="Acción" type="button" className="text-gray-400 dark:text-white/40 group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors">
                    <ChevronRight size={20} />
                </button>
            </div>

            <div className="relative z-10">
                {loading && totalIncome === 0 ? (
                    <div className="animate-pulse flex gap-2 items-center">
                        <div className="h-8 w-24 bg-violet-200/50 dark:bg-white/10 rounded-lg" />
                    </div>
                ) : totalIncome === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-white/40 font-medium">Sin configurar · Tocá para empezar</p>
                ) : (
                    <>
                        <div className="flex items-end gap-3 mb-3">
                            <p className="text-3xl font-extrabold text-violet-700 dark:text-violet-300 font-mono">
                                {showMoney(totalIncome)}
                            </p>
                            <p className="text-xs font-semibold text-gray-500 dark:text-white/50 mb-1.5 bg-white/60 dark:bg-black/20 px-2 py-1 rounded-lg flex items-center gap-1">
                                <Wallet size={12} className="text-violet-400" />
                                Libre: {showMoney(totalFree)}
                            </p>
                        </div>
                        {/* Mini barra */}
                        <div className="h-1.5 rounded-full bg-violet-100 dark:bg-white/10 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ${totalFree < 0 ? 'bg-red-500' : 'bg-gradient-to-r from-violet-500 to-indigo-500'}`}
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-white/30 mt-1">{percent}% asignado</p>
                    </>
                )}
            </div>
        </div>
    );
}

export default function SalaryWidget(props) {
    return <SalaryWidgetInner {...props} />;
}

import React from 'react';
import { Scale, Wallet } from 'lucide-react';
import { formatMoney } from '../../../utils';

export default function SplitSummaryWidget({ setView, householdMembers, splitData, currentDate, privacyMode, user }) {
    const showMoney = (amount) => privacyMode ? '****' : formatMoney(amount);

    return (
        <div 
            onClick={() => setView('reparto')}
            className="bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden mx-1 cursor-pointer hover:border-emerald-200 dark:hover:bg-white/10 transition-all dark:backdrop-blur-md group"
        >
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-50 dark:border-white/5 flex justify-between items-center bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-transparent dark:to-transparent">
                <div>
                    <h3 className="font-bold text-gray-800 dark:text-white text-sm flex items-center gap-2"><Scale size={18} className="text-emerald-600 dark:text-emerald-400" /> Reparto del Mes</h3>
                    <p className="text-[10px] text-gray-400 dark:text-white/40 font-medium capitalize">{currentDate.toLocaleString('es-AR', { month: 'long', year: 'numeric' })}</p>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); setView('household'); }} 
                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-2 py-1 rounded-full transition-colors dark:border dark:border-emerald-500/20"
                >
                    Sueldos
                </button>
            </div>

            {householdMembers && householdMembers.length >= 2 && splitData ? (
                <div className="p-4 space-y-3">
                    {splitData.breakdown.map((member, idx) => {
                        const isMe = member.uid === user?.uid;
                        const barWidth = `${member.percentage}%`;
                        const colors = ['from-indigo-500 to-purple-500', 'from-emerald-500 to-teal-500'];
                        const textColors = ['text-indigo-600', 'text-emerald-600'];
                        return (
                            <div key={member.uid}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${colors[idx % 2]} flex items-center justify-center text-white text-[10px] font-bold`}>
                                            {(member.displayName || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-sm font-semibold text-gray-700 dark:text-white/80">
                                            {member.displayName?.split(' ')[0]}
                                            {isMe && <span className="ml-1 text-[9px] text-blue-500 dark:text-blue-300 font-bold">VOS</span>}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-bold font-mono ${privacyMode ? 'blur-sm' : ''} ${textColors[idx % 2]} dark:text-opacity-80`}>{showMoney(member.aporte)}</p>
                                        <p className="text-[10px] text-gray-400 dark:text-white/30">{member.percentage}%</p>
                                    </div>
                                </div>
                                <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full bg-gradient-to-r ${colors[idx % 2]} transition-all duration-700`} style={{ width: barWidth }} />
                                </div>
                            </div>
                        );
                    })}
                    {/* Total */}
                    <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-white/10">
                        <span className="text-xs font-bold text-gray-500 dark:text-white/40 uppercase tracking-wide">Total compartido</span>
                        <span className={`text-base font-bold font-mono text-gray-900 dark:text-white ${privacyMode ? 'blur-sm' : ''}`}>{showMoney(splitData.grandTotal)}</span>
                    </div>
                </div>
            ) : (
                <div className="p-5 text-center">
                    <div className="flex justify-center mb-2"><Wallet size={32} className="text-yellow-500 dark:text-yellow-400 drop-shadow-sm" /></div>
                    <p className="text-sm font-bold text-gray-700 dark:text-white/80 mb-1">Cargá los sueldos para ver el reparto</p>
                    <p className="text-xs text-gray-400 dark:text-white/40 mb-3">Cada uno tiene que ingresar su sueldo mensual neto para que podamos calcular cuánto le corresponde de cada gasto compartido.</p>
                    <button onClick={(e) => { e.stopPropagation(); setView('household'); }} className="text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-600/80 dark:hover:bg-indigo-500/80 px-4 py-2 rounded-xl transition-colors dark:border dark:border-indigo-400/30">
                        Ir a Grupo Familiar →
                    </button>
                </div>
            )}
        </div>
    );
}

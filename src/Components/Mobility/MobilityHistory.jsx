import React, { useState, useMemo } from 'react';
import { Trash2, Pencil, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { useMobility } from '../../context/MobilityContext';
import MobilityForm from './MobilityForm';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;

export default function MobilityHistory({ isGlass, privacyMode }) {
    const { sessions, deleteSession } = useMobility();
    const [editingId, setEditingId] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);

    // Selector de mes
    const now = new Date();
    const [year, setYear]   = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth()); // 0-indexed

    const changeMonth = (dir) => {
        let m = month + dir;
        let y = year;
        if (m < 0)  { m = 11; y--; }
        if (m > 11) { m = 0;  y++; }
        setMonth(m);
        setYear(y);
    };

    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    const filtered = useMemo(() =>
        sessions.filter(s => s.date?.startsWith(monthKey)),
        [sessions, monthKey]
    );

    // Totales del mes
    const totals = useMemo(() => ({
        total:  filtered.reduce((a, s) => a + (s.total || 0), 0),
        hours:  filtered.reduce((a, s) => a + (s.hoursWorked || 0), 0),
        km:     filtered.reduce((a, s) => a + (s.kilometers || 0), 0),
        days:   filtered.length,
    }), [filtered]);

    const card = `rounded-2xl p-4 ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-white shadow-sm border border-gray-100'}`;
    const text = isGlass ? 'text-white' : 'text-gray-800';
    const sub  = isGlass ? 'text-white/50' : 'text-gray-400';

    if (editingId) {
        const session = sessions.find(s => s.id === editingId);
        return (
            <div className="space-y-4">
                <div className={`${card} flex items-center gap-3`}>
                    <button onClick={() => setEditingId(null)} className={`p-2 rounded-xl ${isGlass ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'} transition-all`}>
                        <X size={16} />
                    </button>
                    <p className={`font-bold text-sm ${text}`}>Editando jornada del {session?.date}</p>
                </div>
                <MobilityForm
                    isGlass={isGlass}
                    initialData={session}
                    onSuccess={() => setEditingId(null)}
                    onCancel={() => setEditingId(null)}
                />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* SELECTOR MES */}
            <div className={`${card} flex items-center justify-between`}>
                <button onClick={() => changeMonth(-1)} className={`p-2 rounded-xl transition-all ${isGlass ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'}`}>
                    <ChevronLeft size={16} />
                </button>
                <p className={`font-bold text-sm ${text}`}>{MONTHS[month]} {year}</p>
                <button onClick={() => changeMonth(1)} className={`p-2 rounded-xl transition-all ${isGlass ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'}`}>
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* RESUMEN DEL MES */}
            {filtered.length > 0 && (
                <div className={`${card} grid grid-cols-4 gap-2 text-center`}>
                    {[
                        { label: 'Jornadas', value: totals.days },
                        { label: 'Total',    value: privacyMode ? '••••' : fmt(totals.total) },
                        { label: 'Horas',    value: `${totals.hours}h` },
                        { label: 'KM',       value: `${totals.km}` },
                    ].map(({ label, value }) => (
                        <div key={label}>
                            <p className={`text-base font-bold ${text}`}>{value}</p>
                            <p className={`text-xs ${sub}`}>{label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* LISTA */}
            {filtered.length === 0 ? (
                <div className={`${card} text-center py-10`}>
                    <p className="text-4xl mb-2">🚗</p>
                    <p className={`font-semibold ${text}`}>Sin registros este mes</p>
                    <p className={`text-sm ${sub}`}>Usá la pestaña "Registrar" para agregar jornadas</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(session => (
                        <div key={session.id} className={`${card} transition-all`}>
                            {confirmDelete === session.id ? (
                                /* CONFIRM DELETE */
                                <div className="flex items-center justify-between gap-3">
                                    <p className={`text-sm font-medium ${text}`}>¿Eliminar esta jornada?</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => setConfirmDelete(null)} className={`p-2 rounded-xl ${isGlass ? 'bg-white/10' : 'bg-gray-100'}`}><X size={14} /></button>
                                        <button
                                            onClick={async () => { await deleteSession(session.id); setConfirmDelete(null); }}
                                            className="p-2 rounded-xl bg-red-500 text-white"
                                        ><Check size={14} /></button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start justify-between gap-2">
                                    {/* INFO */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <p className={`font-bold text-sm ${text}`}>{session.date}</p>
                                            <span className={`text-xs capitalize px-2 py-0.5 rounded-full ${isGlass ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-500'}`}>
                                                {session.dayOfWeek}
                                            </span>
                                            {session.importedFromCSV && (
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${isGlass ? 'bg-amber-400/20 text-amber-300' : 'bg-amber-50 text-amber-500'}`}>
                                                    CSV
                                                </span>
                                            )}
                                        </div>

                                        {/* PLATAFORMAS */}
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {session.uber   > 0 && <PlatformBadge label="Uber"   value={session.uber}   isGlass={isGlass} privacyMode={privacyMode} color="bg-gray-800 text-white" />}
                                            {session.didi   > 0 && <PlatformBadge label="DiDi"   value={session.didi}   isGlass={isGlass} privacyMode={privacyMode} color="bg-orange-500 text-white" />}
                                            {session.cabify > 0 && <PlatformBadge label="Cabify" value={session.cabify} isGlass={isGlass} privacyMode={privacyMode} color="bg-purple-600 text-white" />}
                                            {session.others > 0 && <PlatformBadge label="Otros"  value={session.others} isGlass={isGlass} privacyMode={privacyMode} color="bg-gray-500 text-white" />}
                                        </div>

                                        {/* MÉTRICAS */}
                                        <div className={`flex gap-3 text-xs ${sub}`}>
                                            {session.hoursWorked > 0 && <span>⏱ {session.hoursWorked}h</span>}
                                            {session.kilometers  > 0 && <span>🛣 {session.kilometers}km</span>}
                                            {session.earningsPerHour > 0 && <span>💵 {privacyMode ? '••' : `$${session.earningsPerHour}/hr`}</span>}
                                        </div>
                                    </div>

                                    {/* TOTAL + ACCIONES */}
                                    <div className="flex flex-col items-end gap-2">
                                        <p className={`text-base font-bold ${text}`}>
                                            {privacyMode ? '••••' : fmt(session.total)}
                                        </p>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => setEditingId(session.id)}
                                                className={`p-1.5 rounded-lg transition-all ${isGlass ? 'bg-white/10 hover:bg-white/20 text-white/60' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}
                                            ><Pencil size={13} /></button>
                                            <button
                                                onClick={() => setConfirmDelete(session.id)}
                                                className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-all"
                                            ><Trash2 size={13} /></button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function PlatformBadge({ label, value, isGlass, privacyMode, color }) {
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
            {label}: {privacyMode ? '••' : `$${Number(value).toLocaleString('es-AR')}`}
        </span>
    );
}

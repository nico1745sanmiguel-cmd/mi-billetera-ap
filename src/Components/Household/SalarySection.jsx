import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getLatestSalary, calcularProporciones } from '../../utils/salaryUtils';
import { formatMoney, formatInputNumber, parseInputNumber } from '../../utils';
import { Pencil } from 'lucide-react';
import LoadingState from '../UI/LoadingState';

export default function SalarySection({ memberIds, currentUserUid, isGlass }) {
    const [membersData, setMembersData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingUid, setEditingUid] = useState(null);
    const [inputValue, setInputValue] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchMembers = async () => {
        if (!memberIds || memberIds.length === 0) return;
        try {
            const promises = memberIds.map(uid => getDoc(doc(db, 'users', uid)));
            const snapshots = await Promise.all(promises);
            const data = snapshots.map(snap => {
                if (snap.exists()) return { id: snap.id, ...snap.data() };
                return { id: snap.id, displayName: 'Desconocido', photoURL: null, salaryHistory: [] };
            });
            setMembersData(data);
        } catch (err) {
            console.error('Error fetching salary data:', err);
        } finally {
            setLoading(false);
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchMembers(); }, [memberIds]);

    const handleStartEdit = (member) => {
        const currentSalary = getLatestSalary(member.salaryHistory);
        setInputValue(currentSalary > 0 ? String(currentSalary) : '');
        setEditingUid(member.id);
    };

    const handleSaveSalary = async (uid) => {
        const amount = parseInputNumber(inputValue);
        if (!amount || amount <= 0) {
            setEditingUid(null);
            return;
        }
        setSaving(true);
        try {
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);
            const existing = userSnap.exists() ? (userSnap.data().salaryHistory || []) : [];
            const newEntry = { amount, date: new Date().toISOString() };
            const updated = [newEntry, ...existing];
            await updateDoc(userRef, { salaryHistory: updated });
            setEditingUid(null);
            await fetchMembers();
        } catch (err) {
            console.error('Error saving salary:', err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-4"><LoadingState message="Cargando sueldos..." /></div>;

    const proporciones = calcularProporciones(membersData.map(m => ({
        uid: m.id,
        displayName: m.displayName,
        salaryHistory: m.salaryHistory || []
    })));

    const allHaveSalary = membersData.every(m => getLatestSalary(m.salaryHistory) > 0);

    return (
        <div className="space-y-3">
            {membersData.map((member) => {
                const isMe = member.id === currentUserUid;
                const salary = getLatestSalary(member.salaryHistory);
                const prop = proporciones.find(p => p.uid === member.id);
                const initial = member.displayName ? member.displayName.charAt(0).toUpperCase() : '?';

                return (
                    <div key={member.id} className={`p-4 rounded-2xl border transition-colors ${isGlass ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                        <div className="flex items-center gap-3 mb-3">
                            {member.photoURL ? (
                                <img src={member.photoURL} alt={member.displayName} className="w-9 h-9 rounded-full object-cover" />
                            ) : (
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white">{initial}</div>
                            )}
                            <div className="flex-1">
                                <p className={`font-semibold text-sm ${isGlass ? 'text-white' : 'text-gray-800'}`}>
                                    {member.displayName}
                                    {isMe && <span className="ml-2 text-[10px] bg-blue-500/20 text-blue-500 px-1.5 py-0.5 rounded border border-blue-500/30">VOS</span>}
                                </p>
                                {allHaveSalary && prop && (
                                    <p className={`text-xs font-bold ${isGlass ? 'text-indigo-300' : 'text-indigo-500'}`}>{prop.percentage}% del ingreso familiar</p>
                                )}
                            </div>
                        </div>

                        {isMe ? (
                            editingUid === member.id ? (
                                <div className="flex gap-2">
                                    <input id="input-field"
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="Ej: 500.000"
                                        value={formatInputNumber(inputValue)}
                                        onChange={(e) => setInputValue(parseInputNumber(e.target.value))}
                                        autoFocus
                                        className={`flex-1 px-3 py-2 rounded-xl text-sm border focus:outline-none focus:border-indigo-500 ${isGlass ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-800'}`}
                                    />
                                    <button aria-label="Acción" type="button" onClick={() => handleSaveSalary(member.id)} disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors">
                                        {saving ? '...' : 'Guardar'}
                                    </button>
                                    <button aria-label="Acción" type="button" onClick={() => setEditingUid(null)} className={`px-3 py-2 rounded-xl text-sm font-bold transition-colors ${isGlass ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>✕</button>
                                </div>
                            ) : (
                                <button aria-label="Acción" type="button" onClick={() => handleStartEdit(member)} className={`w-full flex items-center justify-between p-3 rounded-xl border-dashed border-2 transition-colors group ${salary > 0 ? (isGlass ? 'border-indigo-500/40 hover:border-indigo-400' : 'border-indigo-200 hover:border-indigo-400') : (isGlass ? 'border-white/20 hover:border-white/40' : 'border-gray-200 hover:border-gray-400')}`}>
                                    <div className="text-left">
                                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${ isGlass ? 'text-gray-400' : 'text-gray-400'}`}>Sueldo mensual neto</p>
                                        <p className={`text-lg font-bold font-mono ${ salary > 0 ? (isGlass ? 'text-white' : 'text-gray-900') : (isGlass ? 'text-gray-500' : 'text-gray-400')}`}>
                                            {salary > 0 ? formatMoney(salary) : 'Cargar sueldo'}
                                        </p>
                                    </div>
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full transition-colors flex items-center gap-1 ${ isGlass ? 'bg-white/10 text-gray-300 group-hover:bg-indigo-500/30 group-hover:text-indigo-200' : 'bg-gray-100 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}><Pencil size={12} /> Editar</span>
                                </button>
                            )
                        ) : (
                            <div className={`flex items-center justify-between p-3 rounded-xl ${isGlass ? 'bg-white/5' : 'bg-white'}`}>
                                <div>
                                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${isGlass ? 'text-gray-400' : 'text-gray-400'}`}>Sueldo mensual neto</p>
                                    <p className={`text-lg font-bold font-mono ${salary > 0 ? (isGlass ? 'text-white' : 'text-gray-900') : (isGlass ? 'text-gray-500' : 'text-gray-400')}`}>
                                        {salary > 0 ? formatMoney(salary) : 'No cargado aún'}
                                    </p>
                                </div>
                                {salary > 0 && <div className={`text-xs px-2 py-1 rounded-full font-bold ${isGlass ? 'bg-green-500/20 text-green-300' : 'bg-green-50 text-green-600'}`}>✓</div>}
                            </div>
                        )}
                    </div>
                );
            })}

            {!allHaveSalary && (
                <p className={`text-xs text-center pt-1 ${isGlass ? 'text-gray-500' : 'text-gray-400'}`}>
                    Cuando ambos carguen su sueldo, verás el porcentaje de aporte de cada uno.
                </p>
            )}
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { Wallet, CreditCard, ShoppingCart, Lightbulb } from 'lucide-react';
import { db } from '../../firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { checkAndMigrateToHousehold } from '../../utils/householdMigration';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import LoadingState from '../UI/LoadingState';
import ConfirmDialog from '../UI/ConfirmDialog';

import HouseholdMembersList from './HouseholdMembersList';
import SalarySection from './SalarySection';
import HouseholdJoinOrCreate from './HouseholdJoinOrCreate';

/**
 * Componente principal para la gestión del hogar (Household).
 * Permite crear un hogar, unirse a uno existente mediante código de invitación,
 * gestionar los sueldos de los miembros y las preferencias de visibilidad.
 * 
 * @param {Object} props
 * @param {Function} props.onBack - Función callback para regresar a la vista anterior.
 * @returns {JSX.Element}
 */
export default function HouseholdManager({ onBack }) {
    const { isGlass } = useUI();
    const { user, userData } = useAuth();
    const householdId = userData?.householdId;
    const [household, setHousehold] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isLeaveOpen, setIsLeaveOpen] = useState(false);
    const [copyFeedback, setCopyFeedback] = useState("");
    const [createStatus, setCreateStatus] = useState("idle");
    const [joinCode, setJoinCode] = useState("");
    const [joinStatus, setJoinStatus] = useState("");

    const [sharePreferences, setSharePreferences] = useState({ shareCards: true, shareSupermarket: true, shareServices: true });
    const [savingPrefs, setSavingPrefs] = useState(false);

    useEffect(() => {
        if (user) {
            const fetchPrefs = async () => {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists() && userDoc.data().sharePreferences) {
                    setSharePreferences(userDoc.data().sharePreferences);
                }
            };
            fetchPrefs();
        }
    }, [user]);

    useEffect(() => {
        if (!householdId) {
            setLoading(false);
            return;
        }
        const fetchHousehold = async () => {
            try {
                const snap = await getDoc(doc(db, 'households', householdId));
                if (snap.exists()) setHousehold(snap.data());
            } catch (error) {
                console.error("Error fetching household:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchHousehold();
         
    }, [householdId]);

    const handleToggleShare = async (key) => {
        const newPrefs = { ...sharePreferences, [key]: !sharePreferences[key] };
        setSharePreferences(newPrefs);
        setSavingPrefs(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), { sharePreferences: newPrefs });
        } catch (error) {
            console.error("Error updating share prefs:", error);
        } finally {
            setTimeout(() => setSavingPrefs(false), 800);
        }
    };

    const copyCode = () => {
        if (household?.inviteCode) {
            navigator.clipboard.writeText(household.inviteCode);
            setCopyFeedback("¡Copiado!");
            setTimeout(() => setCopyFeedback(""), 2000);
        }
    };

    const handleJoin = async () => {
        if (joinCode.length < 6) return;
        setJoinStatus("searching");
        try {
            const q = query(collection(db, 'households'), where("inviteCode", "==", joinCode));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) return setJoinStatus("error_not_found");

            const targetHouseholdDoc = querySnapshot.docs[0];
            const targetHouseholdId = targetHouseholdDoc.id;
            const targetHouseholdData = targetHouseholdDoc.data();

            await updateDoc(doc(db, 'users', user.uid), { householdId: targetHouseholdId });
            const newMembers = [...(targetHouseholdData.members || []), user.uid];
            await updateDoc(doc(db, 'households', targetHouseholdId), { members: newMembers });

            const batch = writeBatch(db);
            const collectionsToUpdate = ['cards', 'transactions', 'supermarket_items', 'services'];
            const snaps = await Promise.all(collectionsToUpdate.map(collName => 
                getDocs(query(collection(db, collName), where("ownerId", "==", user.uid)))
            ));
            snaps.forEach(snap => snap.forEach(docSnap => batch.update(docSnap.ref, { householdId: targetHouseholdId })));
            await batch.commit();

            setJoinStatus("success");
            setTimeout(() => window.location.reload(), 2000);
        } catch (error) {
            console.error(error);
            setJoinStatus("error");
        }
    };

    const handleCreate = async () => {
        setCreateStatus("creating");
        try {
            const newId = await checkAndMigrateToHousehold(user);
            if (!newId) return setCreateStatus("error");
            const snap = await getDoc(doc(db, 'households', newId));
            if (snap.exists()) setHousehold(snap.data());
            setCreateStatus("success");
        } catch (error) {
            console.error(error);
            setCreateStatus("error");
        }
    };

    const handleLeaveRequest = () => {
        setIsLeaveOpen(true);
    };

    const confirmLeave = async () => {
        setLoading(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), { householdId: null });
            if (householdId && household) {
                const newMembers = (household.members || []).filter(id => id !== user.uid);
                await updateDoc(doc(db, 'households', householdId), { members: newMembers });
            }
            window.location.reload();
        } catch (error) {
            console.error(error);
            alert("Hubo un error al salir del grupo.");
            setLoading(false);
        }
    };

    if (loading) return <LoadingState message="Cargando tu hogar..." fullScreen={true} />;

    return (
        <div className={`min-h-screen p-4 font-sans pb-20 ${isGlass ? 'bg-[#0f0c29] text-white' : 'bg-[#f3f4f6] text-gray-800'}`}>
            <div className="flex items-center gap-4 mb-8">
                <button aria-label="Acción" type="button" onClick={onBack} className={`p-2 rounded-xl transition-colors ${isGlass ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white shadow-sm text-gray-600 hover:bg-gray-100'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isGlass ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600'}`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <div>
                        <h1 className={`text-xl font-bold ${isGlass ? 'text-white' : 'text-gray-800'}`}>Grupo Familiar</h1>
                        <p className={`text-xs ${isGlass ? 'text-gray-400' : 'text-gray-500'}`}>Gestioná tu hogar</p>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto space-y-8">
                {household ? (
                    <>
                        <div className={`backdrop-blur-lg border p-6 rounded-3xl relative overflow-hidden ${isGlass ? 'bg-white/10 border-white/10' : 'bg-white border-blue-100 shadow-md'}`}>
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <svg className={`w-24 h-24 ${isGlass ? 'text-white' : 'text-blue-500'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                            </div>
                            <h2 className={`text-lg mb-2 ${isGlass ? 'text-gray-300' : 'text-gray-600 font-bold'}`}>Código de Invitación</h2>
                            <p className={`text-sm mb-4 ${isGlass ? 'text-gray-400' : 'text-gray-500'}`}>Compartí este código con tu pareja para unirse a este hogar.</p>
                            <div className="flex items-center gap-3">
                                <div className={`flex-1 p-4 rounded-2xl text-center text-3xl font-mono tracking-widest shadow-inner border ${isGlass ? 'bg-black/30 text-blue-300 border-white/5' : 'bg-gray-50 text-blue-600 border-gray-200'}`}>
                                    {household.inviteCode}
                                </div>
                                <button aria-label="Acción" type="button" onClick={copyCode} className="p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition-colors shadow-lg shadow-blue-500/30">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                </button>
                            </div>
                            {copyFeedback && <p className="text-green-500 text-sm mt-2 text-center font-bold animate-pulse">{copyFeedback}</p>}
                        </div>

                        <div className={`border p-6 rounded-3xl ${isGlass ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
                            <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isGlass ? 'text-white' : 'text-gray-800'}`}>
                                <span className="w-2 h-8 bg-purple-500 rounded-full"></span>Miembros del Hogar
                            </h3>
                            <div className="space-y-3">
                                <HouseholdMembersList memberIds={household.members || []} currentUserUid={user.uid} isGlass={isGlass} />
                            </div>
                        </div>

                        <div className={`border p-6 rounded-3xl ${isGlass ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
                            <div className="mb-4">
                                <h3 className={`text-lg font-bold flex items-center gap-2 mb-1 ${isGlass ? 'text-white' : 'text-gray-800'}`}>
                                    <span className="w-2 h-6 bg-green-500 rounded-full"></span><Wallet size={20} className="text-green-500" /> Sueldos del Hogar
                                </h3>
                                <p className={`text-xs ${isGlass ? 'text-gray-400' : 'text-gray-500'}`}>Usamos los sueldos para calcular cuánto aporta cada uno.</p>
                            </div>
                            <SalarySection memberIds={household.members || []} currentUserUid={user.uid} isGlass={isGlass} />
                        </div>

                        <div className={`border p-6 rounded-3xl ${isGlass ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className={`text-lg font-bold flex items-center gap-2 ${isGlass ? 'text-white' : 'text-gray-800'}`}>
                                    <span className="w-2 h-6 bg-blue-500 rounded-full"></span>¿Qué comparto?
                                </h3>
                                {savingPrefs && <span className="text-xs text-green-500 font-bold animate-pulse">Guardando...</span>}
                            </div>
                            <p className={`text-xs mb-6 ${isGlass ? 'text-gray-400' : 'text-gray-500'}`}>Elegí qué información querés que vean los otros miembros del hogar.</p>
                            <div className="space-y-4">
                                <div className={`flex items-center justify-between p-3 rounded-2xl transition-colors ${isGlass ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}>
                                    <span className="text-sm font-bold flex items-center gap-2"><CreditCard size={18} className="text-indigo-400" /> Mis Tarjetas y Gastos</span>
                                    <button aria-label="Acción" type="button" onClick={() => handleToggleShare('shareCards')} className={`w-12 h-6 rounded-full p-1 transition-colors ${sharePreferences.shareCards ? 'bg-green-500' : 'bg-gray-400'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${sharePreferences.shareCards ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                                <div className={`flex items-center justify-between p-3 rounded-2xl transition-colors ${isGlass ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}>
                                    <span className="text-sm font-bold flex items-center gap-2"><ShoppingCart size={18} className="text-purple-400" /> Lista de Supermercado</span>
                                    <button aria-label="Acción" type="button" onClick={() => handleToggleShare('shareSupermarket')} className={`w-12 h-6 rounded-full p-1 transition-colors ${sharePreferences.shareSupermarket ? 'bg-green-500' : 'bg-gray-400'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${sharePreferences.shareSupermarket ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                                <div className={`flex items-center justify-between p-3 rounded-2xl transition-colors ${isGlass ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}>
                                    <span className="text-sm font-bold flex items-center gap-2"><Lightbulb size={18} className="text-yellow-400" /> Servicios y Fijos</span>
                                    <button aria-label="Acción" type="button" onClick={() => handleToggleShare('shareServices')} className={`w-12 h-6 rounded-full p-1 transition-colors ${sharePreferences.shareServices ? 'bg-green-500' : 'bg-gray-400'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${sharePreferences.shareServices ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button aria-label="Acción" type="button" onClick={handleLeaveRequest} className="w-full py-4 text-red-500 font-bold text-sm tracking-widest hover:bg-red-50 rounded-2xl transition-colors border border-transparent hover:border-red-100">
                                Salir del Grupo de Hogar
                            </button>
                        </div>
                    </>
                ) : (
                    <HouseholdJoinOrCreate isGlass={isGlass} handleCreate={handleCreate} createStatus={createStatus} joinCode={joinCode} setJoinCode={setJoinCode} handleJoin={handleJoin} joinStatus={joinStatus} />
                )}
            </div>

            <ConfirmDialog
                isOpen={isLeaveOpen}
                title="¿Salir del grupo?"
                message="¿Seguro que querés salir de este grupo? Volverás a ver solo tus datos individuales."
                confirmText="Salir del grupo"
                isDanger={true}
                onConfirm={confirmLeave}
                onCancel={() => setIsLeaveOpen(false)}
            />
        </div>
    );
}

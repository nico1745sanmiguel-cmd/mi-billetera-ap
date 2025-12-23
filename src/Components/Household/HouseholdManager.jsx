import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { checkAndMigrateToHousehold } from '../../utils/householdMigration';

// Subcomponente para listar miembros con datos reales de Firestore
const HouseholdMembersList = ({ memberIds, currentUserUid }) => {
    const [membersData, setMembersData] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(true);

    useEffect(() => {
        const fetchMembers = async () => {
            if (!memberIds || memberIds.length === 0) return;
            try {
                // Opción 1: Fetch individual (más simple para un array de IDs)
                const promises = memberIds.map(uid => getDoc(doc(db, 'users', uid)));
                const snapshots = await Promise.all(promises);
                const data = snapshots.map(snap => {
                    if (snap.exists()) return { id: snap.id, ...snap.data() };
                    return { id: snap.id, displayName: 'Usuario Desconocido', photoURL: null };
                });
                setMembersData(data);
            } catch (err) {
                console.error("Error fetching members:", err);
            } finally {
                setLoadingMembers(false);
            }
        };
        fetchMembers();
    }, [memberIds]);

    if (loadingMembers) return <div className="text-sm text-gray-500 animate-pulse">Cargando miembros...</div>;

    return (
        <>
            {membersData.map((member, index) => {
                const isMe = member.id === currentUserUid;
                // Avatar fallback if photoURL is missing
                const initial = member.displayName ? member.displayName.charAt(0).toUpperCase() : '?';

                return (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                            {member.photoURL ? (
                                <img src={member.photoURL} alt={member.displayName} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-lg text-white shadow-lg">
                                    {initial}
                                </div>
                            )}
                            <div>
                                <p className="font-semibold text-white text-sm">
                                    {member.displayName}
                                    {isMe && <span className="ml-2 text-[10px] bg-blue-500/20 text-blue-200 px-1.5 py-0.5 rounded border border-blue-500/30">TÚ</span>}
                                </p>
                                <p className="text-xs text-gray-400 text-ellipsis overflow-hidden max-w-[150px]">{member.email}</p>
                            </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${isMe ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'bg-gray-500'}`}></div>
                    </div>
                );
            })}
        </>
    );
};

export default function HouseholdManager({ user, householdId, onBack }) {
    const [household, setHousehold] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copyFeedback, setCopyFeedback] = useState("");
    const [createStatus, setCreateStatus] = useState("idle");

    /* --- JOIN LOGIC --- */
    const [joinCode, setJoinCode] = useState("");
    const [joinStatus, setJoinStatus] = useState(""); // idle, searching, success, error

    useEffect(() => {
        if (!householdId) {
            setLoading(false);
            return;
        }
        const fetchHousehold = async () => {
            try {
                const ref = doc(db, 'households', householdId);
                const snap = await getDoc(ref);
                if (snap.exists()) {
                    setHousehold(snap.data());
                } else {
                    console.error("Household document does not exist");
                }
            } catch (error) {
                console.error("Error fetching household:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchHousehold();
    }, [householdId]);

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
            // 1. Buscar hogar por código
            // NOTA: Esto requiere un índice o query scan. Para MVP query scan sobre 'households' es aceptable si son pocos, 
            // pero lo ideal es un `where("inviteCode", "==", joinCode)`.
            const q = query(collection(db, 'households'), where("inviteCode", "==", joinCode));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setJoinStatus("error_not_found");
                return;
            }

            const targetHouseholdDoc = querySnapshot.docs[0];
            const targetHouseholdId = targetHouseholdDoc.id;
            const targetHouseholdData = targetHouseholdDoc.data();

            // 2. Unirse
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { householdId: targetHouseholdId });

            // 3. Añadir a lista de miembros
            const newMembers = [...(targetHouseholdData.members || []), user.uid];
            const householdRef = doc(db, 'households', targetHouseholdId);
            await updateDoc(householdRef, { members: newMembers });

            // 4. Migrar mis datos (si tenía un hogar 'temporal' o datos sueltos)
            // Simplemente actualizamos mis items para que apunten al nuevo hogar
            const batch = writeBatch(db);
            const collectionsToMigrate = ['cards', 'transactions', 'supermarket_items', 'services'];
            for (const collName of collectionsToMigrate) {
                const myDataQ = query(collection(db, collName), where("ownerId", "==", user.uid));
                const snap = await getDocs(myDataQ);
                snap.forEach(docSnap => {
                    batch.update(docSnap.ref, { householdId: targetHouseholdId });
                });
            }
            await batch.commit();

            setJoinStatus("success");
            setTimeout(() => window.location.reload(), 2000); // Recargar para limpiar estados

        } catch (error) {
            console.error(error);
            setJoinStatus("error");
        }
    };

    const handleCreate = async () => {
        setCreateStatus("creating");
        try {
            const newId = await checkAndMigrateToHousehold(user);

            if (!newId) {
                console.error("Migration returned no ID.");
                setCreateStatus("error");
                return;
            }

            // Inmediatamente buscar la data para mostrarla sin recargar
            const ref = doc(db, 'households', newId);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                setHousehold(snap.data());
            }
            setCreateStatus("success");

            // Importante: No recargamos la página para no sacar al usuario de la pantalla.
        } catch (error) {
            console.error("Error creating household:", error);
            setCreateStatus("error");
        }
    };

    if (loading) return <div className="p-8 text-center text-white">Cargando tu hogar...</div>;

    return (
        <div className="min-h-screen bg-[#0f0c29] text-white p-4 font-sans pb-20">

            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                    Mi Hogar Digital
                </h1>
            </div>

            <div className="max-w-md mx-auto space-y-8">

                {/* Card: Código de Invitación y Miembros (SOLO SI TIENE HOGAR) */}
                {household ? (
                    <>
                        <div className="bg-white/10 backdrop-blur-lg border border-white/10 p-6 rounded-3xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                            </div>

                            <h2 className="text-lg text-gray-300 mb-2">Código de Invitación</h2>
                            <p className="text-sm text-gray-400 mb-4">Compartí este código con tu pareja para unirse a este hogar.</p>

                            <div className="flex items-center gap-3">
                                <div className="flex-1 bg-black/30 p-4 rounded-2xl text-center text-3xl font-mono tracking-widest text-blue-300 border border-white/5 shadow-inner">
                                    {household.inviteCode}
                                </div>
                                <button onClick={copyCode} className="p-4 bg-blue-600 hover:bg-blue-500 rounded-2xl transition-colors shadow-lg shadow-blue-900/50">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                </button>
                            </div>
                            {copyFeedback && <p className="text-green-400 text-sm mt-2 text-center font-bold animate-pulse">{copyFeedback}</p>}
                        </div>

                        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="w-2 h-8 bg-purple-500 rounded-full"></span>
                                Miembros del Hogar
                            </h3>
                            <div className="space-y-3">
                                <HouseholdMembersList memberIds={household.members || []} currentUserUid={user.uid} />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-3xl text-center space-y-4">
                        <div>
                            <p className="text-yellow-200 font-bold mb-2">¡Sin Hogar Asignado!</p>
                            <p className="text-sm text-yellow-100/70">Es necesario activar tu hogar para generar un código y compartir gastos.</p>
                        </div>
                        <button
                            onClick={handleCreate}
                            disabled={createStatus === 'creating'}
                            className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition-colors disabled:opacity-50"
                        >
                            {createStatus === 'creating' ? 'Creando...' : 'Crear Mi Hogar (Código Random)'}
                        </button>
                    </div>
                )}

                {/* Card: UNIRSE A OTRO HOGAR */}
                <div className="bg-gradient-to-br from-indigo-900/40 to-black p-6 rounded-3xl border border-indigo-500/30">
                    <h3 className="text-lg font-bold text-indigo-200 mb-2">¿Te invitaron?</h3>
                    <p className="text-sm text-gray-400 mb-4">Si tu pareja creó el hogar, ingresá su código aquí para unirte.</p>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="000-000"
                            maxLength={6}
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-center tracking-widest font-mono text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                        <button
                            onClick={handleJoin}
                            disabled={joinStatus === 'searching' || joinCode.length < 6}
                            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50 hover:bg-indigo-500 transition-all active:scale-95"
                        >
                            Unirme
                        </button>
                    </div>
                    {joinStatus === 'searching' && <p className="text-indigo-400 text-sm mt-2 text-center animate-pulse">Buscando hogar...</p>}
                    {joinStatus === 'success' && <p className="text-green-400 text-sm mt-2 text-center font-bold">¡Éxito! Recargando...</p>}
                    {joinStatus === 'error_not_found' && <p className="text-red-400 text-sm mt-2 text-center">Código incorrecto.</p>}
                    {joinStatus === 'error' && <p className="text-red-400 text-sm mt-2 text-center">Ocurrió un error.</p>}
                </div>

            </div>
        </div>
    );
}

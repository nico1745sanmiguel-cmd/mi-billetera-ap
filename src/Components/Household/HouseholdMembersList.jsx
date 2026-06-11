import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import LoadingState from '../UI/LoadingState';

export default function HouseholdMembersList({ memberIds, currentUserUid, isGlass }) {
    const [membersData, setMembersData] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(true);

    useEffect(() => {
        const fetchMembers = async () => {
            if (!memberIds || memberIds.length === 0) return;
            try {
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

    if (loadingMembers) return <div className="p-4"><LoadingState message="Cargando miembros..." /></div>;

    return (
        <>
            {membersData.map((member) => {
                const isMe = member.id === currentUserUid;
                const initial = member.displayName ? member.displayName.charAt(0).toUpperCase() : '?';

                return (
                    <div key={member.id} className={`flex items-center justify-between p-3 rounded-2xl border transition-colors ${isGlass ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <div className="flex items-center gap-3">
                            {member.photoURL ? (
                                <img src={member.photoURL} alt={member.displayName} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-lg text-white shadow-lg">
                                    {initial}
                                </div>
                            )}
                            <div>
                                <p className={`font-semibold text-sm ${isGlass ? 'text-white' : 'text-gray-800'}`}>
                                    {member.displayName}
                                    {isMe && <span className="ml-2 text-[10px] bg-blue-500/20 text-blue-500 px-1.5 py-0.5 rounded border border-blue-500/30">TÚ</span>}
                                </p>
                                <p className={`text-xs text-ellipsis overflow-hidden max-w-[150px] ${isGlass ? 'text-gray-400' : 'text-gray-500'}`}>{member.email}</p>
                            </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${isMe ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'bg-gray-500'}`}></div>
                    </div>
                );
            })}
        </>
    );
}

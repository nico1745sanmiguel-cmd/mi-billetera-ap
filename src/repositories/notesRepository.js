import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';
import { COLLECTIONS } from '../config/constants';

const COL = COLLECTIONS.NOTES;

export const addNote = (payload) =>
    addDoc(collection(db, COL), {
        ...payload,
        createdAt: new Date().toISOString(),
    });

export const deleteNote = (id) =>
    deleteDoc(doc(db, COL, id));

export const toggleNoteChecked = (id, checked) =>
    updateDoc(doc(db, COL, id), { checked });

export const updateNote = (id, payload) =>
    updateDoc(doc(db, COL, id), payload);

export const subscribeToNotes = (uid, callback) => {
    const q = query(collection(db, COL), where("userId", "==", uid));
    return onSnapshot(q, (snapshot) => {
        const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(notes);
    });
};


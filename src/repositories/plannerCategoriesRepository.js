import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { COLLECTIONS } from '../config/constants';

const COL = COLLECTIONS.PLANNER_CATEGORIES;

export const addPlannerCategory = (payload) =>
    addDoc(collection(db, COL), {
        ...payload,
        createdAt: new Date().toISOString(),
    });

export const deletePlannerCategory = (id) =>
    deleteDoc(doc(db, COL, id));

export const updatePlannerCategory = (id, data) =>
    updateDoc(doc(db, COL, id), data);

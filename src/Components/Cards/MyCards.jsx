import React, { useState } from 'react';
import { db } from '../../firebase';
import { doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';

export default function MyCards({ cards }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  
  // Formulario inicial vacío
  const initialForm = { name: '', bank: '', limit: '', closeDay: '', dueDay: '', color: '#3483fa' };
  const [form, setForm] = useState(initialForm);

  // Función para abrir el formulario (modo Crear o modo Editar)
  const openForm = (card = null) => {
    if (card) {
      // Si recibimos una tarjeta, llenamos el formulario con sus datos
      setForm(card);
      setEditingId(card.id);
    } else {
      // Si no, limpiamos el formulario para crear una nueva
      setForm(initialForm);
      setEditingId(null);
    }
    setIsEditing(true);
  };

  // Función para borrar tarjeta
  const handleDelete = async (id) => {
    if (window.confirm('¿Seguro que quieres borrar esta tarjeta?')) {
      try {
        await deleteDoc(doc(db, 'cards', id));
      } catch (error) {
        console.error("Error al borrar:", error);
        alert("No se pudo borrar la tarjeta.");
      }
    }
  };

  // Función para guardar (Crear o Editar)
  const handleSave = async (e) => {
    e.preventDefault();
    const dataToSave = {
      name: form.name,
      bank: form.bank,
      limit: Number(form.limit),
      closeDay: Number(form.closeDay),
      dueDay: Number(form.dueDay),
      color: form.color
    };

    try {
      if (editingId) {
        // Modo Edición: Actualizamos la existente
        await updateDoc(doc(db, 'cards', editingId), dataToSave);
      } else {
        // Modo Creación: Creamos una nueva con ID basado en la fecha
        const newId = Date.now().toString();
        await setDoc(doc(db, 'cards', newId), dataToSave);
      }
      setIsEditing(false); // Cerramos el formulario
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Hubo un error al guardar.");
    }
  };

  // --- VISTA 1: FORMULARIO DE EDICIÓN ---
  if (isEditing) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 max-w-lg mx-auto animate-fade-in">
        <h3 className="text-lg font-bold mb-4 text-gray-800">
            {editingId ? 'Editar Tarjeta' : 'Nueva Tarjeta'}
        </h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nombre (ej: Visa Santander)</label>
            <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Banco</label>
              <input required type="text" value={form.bank} onChange={e => setForm({...form, bank: e.target.value})} className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Color Identificativo</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="w-10 h-10 border-0 p-0 rounded cursor-pointer" />
                <span className="text-xs text-gray-400">{form.color}</span>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Límite Total ($)</label>
            <input required type="number" value={form.limit} onChange={e => setForm({...form, limit: e.target.value})} className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Día de Cierre</label>
              <input required type="number" min="1" max="31" value={form.closeDay} onChange={e => setForm({...form, closeDay: e.target.value})} className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Día de Vencimiento</label>
              <input required type="number" min="1" max="31" value={form.dueDay} onChange={e => setForm({...form, dueDay: e.target.value})} className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors">Cancelar</button>
            <button type="submit" className="px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm transition-colors">Guardar Tarjeta</button>
          </div>
        </form>
      </div>
    );
  }

  // --- VISTA 2: LISTADO DE TARJETAS ---
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-medium text-gray-900">Mis Tarjetas</h2>
        <button onClick={() => openForm()} className="bg-[#3483fa] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#2968c8] shadow-sm transition-colors">
          + Nueva Tarjeta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: card.color }}></div>
            <div className="pl-3 relative">
                <div className="flex justify-between items-start mb-4">
                  <div>
                      <h3 className="font-bold text-gray-800 text-lg">{card.name}</h3>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">{card.bank}</p>
                  </div>
                  {/* Botones de acción */}
                  <div className="flex gap-1">
                    <button onClick={() => openForm(card)} title="Editar" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">✏️</button>
                    <button onClick={() => handleDelete(card.id)} title="Eliminar" className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">🗑️</button>
                  </div>
                </div>

                <div className="space-y-3 mt-4">
                  <div>
                      <p className="text-xs text-gray-400">Límite Total</p>
                      <p className="font-medium text-gray-900 text-lg">${Number(card.limit).toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-gray-50">
                      <div>
                        <p className="text-xs text-gray-400">Cierre</p>
                        <p className="text-sm font-medium text-gray-700">Día {card.closeDay}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Vencimiento</p>
                        <p className="text-sm font-medium text-gray-700">Día {card.dueDay}</p>
                      </div>
                  </div>
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
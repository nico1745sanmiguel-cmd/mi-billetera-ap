import React, { useState } from 'react';
import { useSavings } from '../../context/SavingsContext';
import { useAuth } from '../../../context/AuthContext';

// Importamos el JSON que generó el script. 
// En Vite podemos importar JSON directamente.
import nexoData from '../../../../ahorros/nexo_parsed_transactions_safe.json';

export default function NexoInjector({ isGlass }) {
    const { addSavingsTransaction } = useSavings();
    const { user } = useAuth();
    const [status, setStatus] = useState('idle');

    const handleInject = async () => {
        if (!user) {
            alert("No estás logueado.");
            return;
        }
        if (!window.confirm(`¿Estás seguro de inyectar ${nexoData.length} transacciones de Nexo en tu historial?`)) return;
        
        setStatus('loading');
        try {
            // Inyectar de a una para que Firebase asigne IDs y fechas de creación (createdAt)
            for (let i = 0; i < nexoData.length; i++) {
                const tx = nexoData[i];
                await addSavingsTransaction(tx);
            }
            setStatus('success');
            alert("¡Inyección completada perfectamente!");
        } catch (error) {
            console.error(error);
            setStatus('error');
            alert("Hubo un error: " + error.message);
        }
    };

    if (status === 'success') return null;

    return (
        <button 
            onClick={handleInject}
            disabled={status === 'loading'}
            className={`w-full sm:w-auto px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                isGlass 
                ? 'bg-purple-500/20 text-purple-200 border border-purple-500/50 hover:bg-purple-500/40' 
                : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
            }`}
        >
            <span className="text-lg">⚡</span>
            {status === 'loading' ? 'Inyectando operaciones...' : 'Inyectar Historial Nexo'}
        </button>
    );
}

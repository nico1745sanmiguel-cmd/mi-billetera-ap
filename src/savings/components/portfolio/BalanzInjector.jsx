import React, { useState } from 'react';
import { useSavings } from '../../context/SavingsContext';
import { useAuth } from '../../../context/AuthContext';

// Importamos el JSON que generó el script. 
// En Vite podemos importar JSON directamente.
import balanzData from '../../../../ahorros/balanz_parsed_transactions_safe.json';

export default function BalanzInjector({ isGlass }) {
    const { addSavingsTransaction, savingsTransactions, deleteSavingsTransaction } = useSavings();
    const { user } = useAuth();
    const [status, setStatus] = useState('idle');

    const handleInject = async () => {
        if (!user) {
            alert("No estás logueado.");
            return;
        }
        if (!window.confirm(`¿Estás seguro de inyectar las transacciones y LIMPIAR las anteriores de Balanz para evitar duplicados?`)) return;
        
        setStatus('loading');
        try {
            // Borrar transacciones de Balanz previas (para evitar duplicados y purgar el error)
            const oldBalanzTxs = savingsTransactions.filter(tx => tx.cartera === 'Balanz');
            for (let i = 0; i < oldBalanzTxs.length; i++) {
                await deleteSavingsTransaction(oldBalanzTxs[i].id);
            }

            // Inyectar el JSON
            for (let i = 0; i < balanzData.length; i++) {
                const tx = balanzData[i];
                await addSavingsTransaction(tx);
            }
            setStatus('success');
            alert("¡Corrección e inyección completadas perfectamente!");
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
                ? 'bg-blue-500/20 text-blue-200 border border-blue-500/50 hover:bg-blue-500/40' 
                : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
            }`}
        >
            <span className="text-lg">📈</span>
            {status === 'loading' ? 'Inyectando operaciones...' : 'Inyectar Historial Balanz'}
        </button>
    );
}

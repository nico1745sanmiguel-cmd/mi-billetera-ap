import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CriticalAlert = ({ criticalAlert, showMoney }) => {
    const navigate = useNavigate();

    if (!criticalAlert || !criticalAlert.active) return null;

    return (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/30 p-4 rounded-xl flex items-center justify-between mx-1 animate-pulse dark:shadow-lg dark:shadow-red-900/10">
            <div className="flex items-center gap-3">
                <div className="bg-red-100 dark:bg-red-500/20 p-2 rounded-full text-red-600 dark:text-red-200 dark:border dark:border-red-500/30">
                    <AlertCircle size={20} />
                </div>
                <div>
                    <p className="text-sm font-bold text-red-800 dark:text-red-100">{criticalAlert.msg}</p>
                    <button aria-label="Acción" type="button" 
                        className="text-xs text-red-600 dark:text-red-300/80 font-medium cursor-pointer underline dark:decoration-red-300/50" 
                        onClick={() => navigate('/services_manager')}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') navigate('/services_manager');
                        }}
                    >
                        Ir a pagar ahora
                    </button>
                </div>
            </div>
            <p className="font-bold text-red-800 dark:text-red-100">{showMoney(criticalAlert.amount)}</p>
        </div>
    );
};

export default CriticalAlert;

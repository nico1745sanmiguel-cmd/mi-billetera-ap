import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../UI/Button';

const CriticalAlert = ({ criticalAlert, showMoney }) => {
    const navigate = useNavigate();

    if (!criticalAlert || !criticalAlert.active) return null;

    const targetRoute = criticalAlert.itemType === 'card_item' ? '/cards' : '/services_manager';
    const itemLabel = criticalAlert.itemName ? `el vencimiento de ${criticalAlert.itemName}` : 'vencimiento';

    return (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/30 p-4 rounded-xl flex items-center justify-between mx-1 animate-pulse dark:shadow-lg dark:shadow-red-900/10">
            <div className="flex items-center gap-3">
                <div className="bg-red-100 dark:bg-red-500/20 p-2 rounded-full text-red-600 dark:text-red-200 dark:border dark:border-red-500/30 shrink-0">
                    <AlertCircle size={20} />
                </div>
                <div>
                    <p className="text-sm font-bold text-red-800 dark:text-red-100">{criticalAlert.msg}</p>
                    <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Ir a pagar ${itemLabel} ahora`}
                        className="!min-h-[44px] !px-2 !py-1 text-xs text-red-600 dark:text-red-300/90 font-medium underline hover:bg-red-100/50 dark:hover:bg-red-500/20 justify-start -ml-2"
                        onClick={() => navigate(targetRoute)}
                    >
                        Ir a pagar ahora
                    </Button>
                </div>
            </div>
            <p className="font-bold text-red-800 dark:text-red-100 shrink-0">{showMoney(criticalAlert.amount)}</p>
        </div>
    );
};

export default CriticalAlert;

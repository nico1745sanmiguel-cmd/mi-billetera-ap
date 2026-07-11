import React from 'react';
import Skeleton from './Skeleton';
import { CreditCard, Car, Briefcase, ChevronRight, Target, Users, Calendar, ShoppingCart } from 'lucide-react';

// Un widget de Skeleton genérico que se vea como los reales
const WidgetSkeleton = ({ title, icon: Icon, isGlass, colorClass = "from-gray-100 to-gray-50 dark:from-white/10 dark:to-white/5", height = "h-48" }) => {
    const bgCard = isGlass ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100';
    return (
        <div className={`rounded-2xl p-5 shadow-sm border bg-gradient-to-r ${colorClass} ${bgCard} ${height} relative overflow-hidden flex flex-col justify-center`}>
            {/* Glow decorativo */}
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/20 dark:bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl" />
            
            {/* Header del widget */}
            <div className="relative z-10 flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-gray-200 dark:bg-white/10 p-2.5 rounded-xl text-gray-500 dark:text-white/40">
                        <Icon size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-base text-gray-800 dark:text-white leading-tight">{title}</h3>
                        <Skeleton type="text" width="60px" className="!h-2 mt-1 opacity-50" />
                    </div>
                </div>
                <ChevronRight size={20} className="text-gray-300 dark:text-white/20" />
            </div>

            {/* Contenido (números) del widget */}
            <div className="relative z-10 flex flex-col gap-3">
                <Skeleton type="title" width="140px" className="!h-8" />
                <div className="flex gap-2">
                    <Skeleton type="text" width="60px" />
                    <Skeleton type="text" width="40px" />
                </div>
                <div className="h-1.5 rounded-full bg-gray-200 dark:bg-white/10 w-full mt-2" />
            </div>
        </div>
    );
};

export default function SkeletonDashboard({ isGlass }) {
    return (
        <div className="max-w-5xl mx-auto p-4 mt-2 pb-28 md:pb-10 md:mt-4 space-y-6">
            
            {/* Header: Hola Nico */}
            <div className="flex justify-between items-center px-2 pt-2 mb-2">
                <div className="flex flex-col gap-1.5">
                    <Skeleton type="text" width="60px" className="!h-3" />
                    <Skeleton type="title" width="180px" className="!h-7" />
                </div>
                <Skeleton type="circle" width="40px" height="40px" />
            </div>

            {/* Grid de Widgets (Simulando la vista real) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min">
                
                {/* Target Financiero (Ocupa todo el ancho) */}
                <div className="md:col-span-2 lg:col-span-3">
                    <WidgetSkeleton title="Objetivo Financiero" icon={Target} isGlass={isGlass} height="h-56" />
                </div>

                {/* Widgets secundarios */}
                <WidgetSkeleton title="Movilidad" icon={Car} isGlass={isGlass} colorClass="from-violet-50/50 to-indigo-50/50 dark:from-violet-500/10 dark:to-indigo-500/5" />
                <WidgetSkeleton title="Sueldo del mes" icon={Briefcase} isGlass={isGlass} colorClass="from-emerald-50/50 to-green-50/50 dark:from-emerald-500/10 dark:to-green-500/5" />
                <WidgetSkeleton title="Agenda" icon={Calendar} isGlass={isGlass} />
                <WidgetSkeleton title="Tarjetas" icon={CreditCard} isGlass={isGlass} />
                <WidgetSkeleton title="Supermercado" icon={ShoppingCart} isGlass={isGlass} />
                <WidgetSkeleton title="Aportes" icon={Users} isGlass={isGlass} />
                
            </div>
        </div>
    );
}
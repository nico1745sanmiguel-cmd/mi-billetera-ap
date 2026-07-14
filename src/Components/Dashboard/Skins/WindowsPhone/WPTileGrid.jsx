import React from 'react';
import { isModuleEnabled } from '../../../../utils/modulesUtils';

// Importar todos los tiles
import BudgetTile from './tiles/BudgetTile';
import SavingsTile from './tiles/SavingsTile';
import CardsTile from './tiles/CardsTile';
import ServicesTile from './tiles/ServicesTile';
import SuperTile from './tiles/SuperTile';
import MobilityTile from './tiles/MobilityTile';
import SalaryTile from './tiles/SalaryTile';
import SplitTile from './tiles/SplitTile';

const WPTileGrid = ({ 
    navigate, 
    privacyMode, 
    showMoney, 
    totalNeed, 
    totalPaid, 
    cardsWithDebt, 
    agenda, 
    services, 
    superData, 
    currentDate, 
    splitData 
}) => {
    return (
        <div className="wp-grid wp-grid-animate mt-6">
            <div className="grid grid-cols-2 gap-2">
                
                {/* ── FILA 1: Presupuesto y Ahorros ── */}
                {isModuleEnabled('planner') && (
                    <BudgetTile 
                        totalNeed={totalNeed} 
                        totalPaid={totalPaid} 
                        showMoney={showMoney} 
                        navigate={navigate} 
                        animDelay={0} 
                    />
                )}
                
                {isModuleEnabled('savings') && (
                    <SavingsTile 
                        privacyMode={privacyMode} 
                        navigate={navigate} 
                        animDelay={50} 
                    />
                )}

                {/* ── FILA 2: Tarjetas, Servicios, Super, Movilidad (1x1) ── */}
                <div className="col-span-2 grid grid-cols-4 gap-2">
                    {isModuleEnabled('cards') && (
                        <div className="col-span-2 sm:col-span-1">
                            <CardsTile 
                                cardsWithDebt={cardsWithDebt} 
                                showMoney={showMoney} 
                                navigate={navigate} 
                                animDelay={100} 
                            />
                        </div>
                    )}
                    
                    {isModuleEnabled('agenda') && (
                        <div className="col-span-2 sm:col-span-1">
                            <ServicesTile 
                                agenda={agenda} 
                                services={services} 
                                showMoney={showMoney} 
                                navigate={navigate} 
                                animDelay={150} 
                            />
                        </div>
                    )}

                    {isModuleEnabled('supermarket') && (
                        <div className="col-span-2 sm:col-span-1">
                            <SuperTile 
                                superData={superData} 
                                showMoney={showMoney} 
                                navigate={navigate} 
                                animDelay={200} 
                            />
                        </div>
                    )}

                    {isModuleEnabled('mobility') && (
                        <div className="col-span-2 sm:col-span-1">
                            <MobilityTile 
                                privacyMode={privacyMode} 
                                navigate={navigate} 
                                currentDate={currentDate} 
                                animDelay={250} 
                            />
                        </div>
                    )}
                </div>

                {/* ── FILA 3: Salario y Reparto (2x1) ── */}
                {isModuleEnabled('salary') && (
                    <SalaryTile 
                        privacyMode={privacyMode} 
                        navigate={navigate} 
                        animDelay={300} 
                    />
                )}

                {isModuleEnabled('household') && splitData && (
                    <SplitTile 
                        splitData={splitData} 
                        privacyMode={privacyMode} 
                        navigate={navigate} 
                        animDelay={350} 
                    />
                )}

            </div>
        </div>
    );
};

export default WPTileGrid;

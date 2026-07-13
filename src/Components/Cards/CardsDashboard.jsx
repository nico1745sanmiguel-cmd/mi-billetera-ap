import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { useCards } from '../../context/CardsContext';
import { formatMonthKey } from '../../utils/cardDebtUtils';
import CardsList from './CardsList';
import CardDetail from './CardDetail';


export default function CardsDashboard({ initialCard }) {
    const { isGlass, privacyMode, currentDate } = useUI();
    const navigate = useNavigate();
    const { userData } = useAuth();
    const householdId = userData?.householdId;
    const { cards } = useCards();
    const [selectedCard, setSelectedCard] = useState(null);
    const [isNew, setIsNew] = useState(false);

    const [prevInitialCard, setPrevInitialCard] = useState(null);

    if (initialCard !== prevInitialCard) {
        // react-doctor-disable-next-line react-doctor/no-impure-state-updater
        setPrevInitialCard(initialCard);
        if (initialCard) {
            // react-doctor-disable-next-line react-doctor/no-impure-state-updater
            setSelectedCard(initialCard);
            setIsNew(false);
        }
    }

    const monthKey = formatMonthKey(currentDate);

    if (selectedCard || isNew) {
        return (
            <CardDetail
                card={selectedCard}
                isNewCard={isNew}
                currentDate={currentDate}
                privacyMode={privacyMode}
                isGlass={isGlass}
                householdId={householdId}
                onBack={() => { setSelectedCard(null); setIsNew(false); }}
            />
        );
    }

    return (
        <CardsList
            cards={cards}
            monthKey={monthKey}
            privacyMode={privacyMode}
            isGlass={isGlass}
            // react-doctor-disable-next-line react-doctor/no-impure-state-updater
            onSelectCard={(card) => { setSelectedCard(card); setIsNew(false); }}
            onNewCard={() => { setSelectedCard(null); setIsNew(true); }}
            onBack={() => { setSelectedCard(null); navigate('/dashboard'); }}
        />
    );
}

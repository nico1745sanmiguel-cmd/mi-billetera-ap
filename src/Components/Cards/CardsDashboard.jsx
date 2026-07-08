import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { useCards } from '../../context/CardsContext';
import CardsList from './CardsList';
import CardDetail from './CardDetail';

export const getMonthKey = (date) => {
    const d = date || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

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
        setPrevInitialCard(initialCard);
        if (initialCard) {
            setSelectedCard(initialCard);
            setIsNew(false);
        }
    }

    const monthKey = getMonthKey(currentDate);

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
            onSelectCard={(card) => { setSelectedCard(card); setIsNew(false); }}
            onNewCard={() => { setSelectedCard(null); setIsNew(true); }}
            onBack={() => { setSelectedCard(null); navigate('/dashboard'); }}
        />
    );
}

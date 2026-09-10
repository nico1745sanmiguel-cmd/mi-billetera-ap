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
    const { cards, loading } = useCards();
    
    const [selectedCardId, setSelectedCardId] = useState(() => initialCard?.id || null);
    const [isNew, setIsNew] = useState(false);
    const [prevInitialCard, setPrevInitialCard] = useState(initialCard);

    if (initialCard !== prevInitialCard) {
        setPrevInitialCard(initialCard);
        if (initialCard?.id) {
            setSelectedCardId(initialCard.id);
            setIsNew(false);
        } else if (!initialCard) {
            setSelectedCardId(null);
            setIsNew(false);
        }
    }

    // Buscamos la versión más fresca en el contexto global, con fallback a initialCard mientras sincroniza
    const activeCard = selectedCardId 
        ? (cards.find(c => c.id === selectedCardId) || (initialCard?.id === selectedCardId ? initialCard : null)) 
        : null;

    const monthKey = formatMonthKey(currentDate);

    if (activeCard || isNew) {
        return (
            <CardDetail
                card={activeCard}
                isNewCard={isNew}
                currentDate={currentDate}
                privacyMode={privacyMode}
                isGlass={isGlass}
                householdId={householdId}
                onBack={() => { setSelectedCardId(null); setIsNew(false); }}
            />
        );
    }

    return (
        <CardsList
            cards={cards}
            loading={loading}
            monthKey={monthKey}
            privacyMode={privacyMode}
            isGlass={isGlass}
            onSelectCard={(card) => { setSelectedCardId(card.id); setIsNew(false); }}
            onNewCard={() => { setSelectedCardId(null); setIsNew(true); }}
            onBack={() => { setSelectedCardId(null); navigate('/dashboard'); }}
        />
    );
}

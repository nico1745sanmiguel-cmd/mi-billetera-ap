import React from 'react';
import OperationModal from '../../savings/components/operations/OperationModal';

export default function AddSavingsModal({ onClose, isGlass, initialData }) {
    return (
        <OperationModal
            isOpen={true}
            onClose={onClose}
            isGlass={isGlass}
            initialData={initialData}
        />
    );
}

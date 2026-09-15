import React, { memo } from 'react';
import Toast from './Toast';
import { useUIState, useUIDispatch } from '../../context/UIContext';

function GlobalToast() {
    const { toast } = useUIState();
    const { hideToast } = useUIDispatch();

    if (!toast) return null;

    return <Toast message={toast.message} type={toast.type} onClose={hideToast} />;
}

export default memo(GlobalToast);

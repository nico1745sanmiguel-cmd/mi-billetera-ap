import React, { useState } from 'react';
import { parseInputNumber } from '../../utils';

/**
 * CurrencyInput — Input con formato automático de miles (es-AR: puntos de miles, coma decimal).
 *
 * Props:
 *   value        — número (o string parseable) controlado desde afuera
 *   onChange     — fn(rawNumber: number) — devuelve el número sin formato
 *   placeholder  — string
 *   className    — clases extra para el <input autoComplete="off" id="input-field">
 *   prefix       — si true, el padre maneja el $ afuera (default: false)
 *   disabled     — boolean
 *   allowDecimals — si false, solo enteros (default: true)
 */
// Convierte string con formato → número (limpiando puntos y reemplazando coma)
const toRaw = (str) => {
    if (!str) return '';
    // Quitar puntos de miles, reemplazar coma decimal por punto
    const clean = str.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(clean);
    return isNaN(n) ? '' : n;
};

export default function CurrencyInput({
    value,
    onChange,
    placeholder = '0',
    className = '',
    disabled = false,
    allowDecimals = true,
    ...rest
}) {
    // Convierte número → string formateado (1234567.89 → "1.234.567,89")
    const toDisplay = (num) => {
        if (num === '' || num === null || num === undefined || isNaN(num)) return '';
        const n = Number(num);
        if (isNaN(n) || n === 0) return '';
        return n.toLocaleString('es-AR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: allowDecimals ? 2 : 0,
        });
    };


    const [display, setDisplay] = useState(() => toDisplay(value));
    const [lastPropValue, setLastPropValue] = useState(value);

    // Sincronizar si el valor externo cambia (ej: reset del form)
    if (value !== lastPropValue) {
        // react-doctor-disable-next-line react-doctor/no-impure-state-updater
        setLastPropValue(value);
        if (parseInputNumber(display) !== value) {
            setDisplay(toDisplay(value));
        }
    }

    const handleChange = (e) => {
        const raw = e.target.value;

        // Permitir solo dígitos, puntos (separador de miles que el usuario puede tipear)
        // y coma/punto como decimal
        // Lógica: tomamos lo que escribe, lo limpiamos y reformateamos
        const digitsAndSep = allowDecimals
            ? raw.replace(/[^\d,.]/g, '')   // solo dígitos, coma, punto
            : raw.replace(/[^\d.]/g, '');   // solo dígitos y punto (para miles)

        // Si el string termina en coma, dejar que siga escribiendo el decimal
        if (allowDecimals && digitsAndSep.endsWith(',')) {
            setDisplay(digitsAndSep);
            return;
        }

        // Separar parte entera y decimal
        const parts = digitsAndSep.replace(/\./g, '').split(',');
        const intPart = parts[0] || '';
        const decPart = parts[1];

        if (!intPart && decPart === undefined) {
            setDisplay('');
            onChange('');
            return;
        }

        // Formatear parte entera con puntos de miles
        const intFormatted = intPart
            ? Number(intPart).toLocaleString('es-AR', { maximumFractionDigits: 0 })
            : '';

        const newDisplay = decPart !== undefined
            ? `${intFormatted},${decPart}`
            : intFormatted;

        const finalDisplay = allowDecimals && decPart === ''
            ? `${intFormatted},`
            : newDisplay;

        setDisplay(finalDisplay);
        
        // Disparar onChange
        const numericStr = decPart !== undefined
            ? `${intPart}.${decPart}`
            : intPart;
        const numeric = parseFloat(numericStr);
        onChange(isNaN(numeric) ? '' : numeric);
    };

    const handleBlur = () => {
        // Al salir del campo, reformatear limpio
        const n = toRaw(display);
        setDisplay(n !== '' ? toDisplay(n) : '');
    };

    return (
        <input autoComplete="off"
            type="text"
            inputMode="numeric"
            value={display}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={className}
            {...rest}
        />
    );
}

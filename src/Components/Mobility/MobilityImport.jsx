import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, Info, Download } from 'lucide-react';
import { useMobilityDispatch } from '../../context/MobilityContext';
import { parseAmount, sanitizeMobilitySession } from '../../utils/security';

// Columnas esperadas del CSV (case-insensitive, se mapean por posición también)
// Formato: Fecha,Dia,Uber ($),Didi ($),Otros ($),Cabify ($),Total,Horas Trabajadas,Kilómetros (KM),...
const parseCSV = (text) => {
    if (!text || typeof text !== 'string') {
        throw new Error('El archivo está vacío o el formato es inválido.');
    }

    // Dividir líneas respetando posibles saltos de línea dentro de comillas RFC 4180
    const lines = [];
    let currentLine = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            inQuotes = !inQuotes;
            currentLine += char;
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && text[i + 1] === '\n') {
                i++; // saltar \r\n
            }
            if (currentLine.trim()) {
                lines.push(currentLine.trim());
            }
            currentLine = '';
        } else {
            currentLine += char;
        }
    }
    if (currentLine.trim()) {
        lines.push(currentLine.trim());
    }

    if (lines.length < 2) {
        throw new Error('El archivo está vacío o solo tiene encabezado.');
    }

    // Autodetectar delimitador en la cabecera (, ; \t)
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;

    let delimiter = ',';
    if (semicolonCount > commaCount && semicolonCount >= tabCount) {
        delimiter = ';';
    } else if (tabCount > commaCount && tabCount > semicolonCount) {
        delimiter = '\t';
    }

    // Función para separar columnas respetando comillas RFC 4180 y comillas escapadas ("")
    const splitColumns = (line) => {
        const cols = [];
        let cur = '';
        let inside = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"') {
                if (inside && line[i + 1] === '"') {
                    cur += '"';
                    i++; // escapar comilla doble "" -> "
                } else {
                    inside = !inside;
                }
            } else if (c === delimiter && !inside) {
                cols.push(cur.trim());
                cur = '';
            } else {
                cur += c;
            }
        }
        cols.push(cur.trim());
        return cols;
    };

    const headers = splitColumns(lines[0]).map(h => h.toLowerCase().replace(/['"]/g, ''));

    const colIndex = (keywords) => {
        return headers.findIndex(h => keywords.some(k => h.includes(k)));
    };

    const iDate   = colIndex(['fecha', 'date']);
    const iHours  = colIndex(['hora', 'horas', 'hours']);
    const iKm     = colIndex(['kil', 'km', 'kilometros']);
    const iUber   = colIndex(['uber']);
    const iDidi   = colIndex(['didi']);
    const iCabify = colIndex(['cabify']);
    const iOthers = colIndex(['otro', 'otros', 'other']);
    const iTotal  = colIndex(['total']);

    const rows = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
        const cols = splitColumns(lines[i]);
        if (cols.every(c => !c || c === '0' || c === '$0')) continue; // fila vacía

        let rawDate = iDate >= 0 ? cols[iDate] : '';
        let date = '';

        // Formatos posibles: DD/MM/YYYY, D/M/YYYY o YYYY-MM-DD
        const dmyMatch = rawDate.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
        const isoMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);

        if (dmyMatch) {
            date = `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
        } else if (isoMatch) {
            date = rawDate;
        } else {
            errors.push(`Fila ${i + 1}: fecha inválida "${rawDate}"`);
            continue;
        }

        const parseCSVNumber = (idx) => {
            if (idx < 0 || !cols[idx]) return 0;
            return parseAmount(cols[idx]);
        };

        const uber = parseCSVNumber(iUber);
        const didi = parseCSVNumber(iDidi);
        const cabify = parseCSVNumber(iCabify);
        const others = parseCSVNumber(iOthers);
        const total = parseCSVNumber(iTotal);

        // Excluir los días donde no hubo ningún ingreso
        if (uber + didi + cabify + others === 0 && total === 0) continue;

        const hoursWorked = parseCSVNumber(iHours);
        const kilometers = parseCSVNumber(iKm);

        const session = sanitizeMobilitySession({
            date,
            hoursWorked,
            kilometers,
            uber,
            didi,
            cabify,
            others,
            total,
            importedFromCSV: true,
        });

        rows.push(session);
    }

    return { rows, errors };
};

const downloadCSVTemplate = () => {
    const headers = 'Fecha,Horas Trabajadas,Kilómetros (KM),Uber ($),Didi ($),Cabify ($),Otros ($)';
    const sampleRows = [
        '2026-09-01,8.5,120,35000,22000,15000,0',
        '2026-09-02,7.0,95,28000,18500,12000,5000',
    ];
    const csvContent = '\uFEFF' + [headers, ...sampleRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_movilidad.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export default function MobilityImport({ isGlass, onSuccess }) {
    const { importSessions } = useMobilityDispatch();
    const fileRef = useRef();
    const [preview, setPreview] = useState(null);   // { rows, errors }
    const [result,  setResult]  = useState(null);   // { ok, errors }
    const [loading, setLoading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const processFile = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = parseCSV(e.target.result);
                setPreview(parsed);
                setResult(null);
            } catch (err) {
                setPreview({ rows: [], errors: [err.message] });
            }
        };
        reader.readAsText(file, 'UTF-8');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file?.name && file.name.toLowerCase().endsWith('.csv')) processFile(file);
    };

    const handleImport = async () => {
        if (!preview?.rows?.length) return;
        setLoading(true);
        try {
            const res = await importSessions(preview.rows);
            setResult(res);
            setPreview(null);
            if (res.ok > 0 && res.errors === 0) {
                setTimeout(() => onSuccess?.(), 1500);
            }
        } catch (e) {
            console.error(e);
            setResult({ ok: 0, errors: 1 });
        } finally {
            setLoading(false);
        }
    };

    const card = `rounded-2xl p-4 ${isGlass ? 'bg-white/10 border border-white/10' : 'bg-white shadow-sm border border-gray-100'}`;
    const text = isGlass ? 'text-white' : 'text-gray-800';
    const sub  = isGlass ? 'text-white/50' : 'text-gray-400';

    return (
        <div className="space-y-4">
            {/* INSTRUCCIONES */}
            <div className={`${card} flex gap-3`}>
                <Info size={16} className="text-blue-400 mt-0.5 shrink-0" />
                <div>
                    <p className={`text-sm font-semibold ${text} mb-1`}>Formato esperado del CSV</p>
                    <p className={`text-xs leading-relaxed ${sub}`}>
                        El archivo debe tener las columnas de tu Excel: <strong>Fecha, Horas Trabajadas, Kilómetros (KM), Uber ($), Didi ($), Cabify ($), Otros ($)</strong>. El orden puede variar; el sistema detecta las columnas por nombre.
                    </p>
                    <p className={`text-xs mt-1 ${sub}`}>
                        Fecha aceptada: <code className={isGlass ? 'text-violet-300' : 'text-violet-600'}>DD/MM/YYYY</code> o <code className={isGlass ? 'text-violet-300' : 'text-violet-600'}>YYYY-MM-DD</code>
                    </p>
                    <button
                        type="button"
                        onClick={downloadCSVTemplate}
                        className={`mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            isGlass
                                ? 'bg-white/10 hover:bg-white/20 text-violet-300'
                                : 'bg-violet-50 hover:bg-violet-100 text-violet-700'
                        }`}
                    >
                        <Download size={14} />
                        Descargar Plantilla CSV
                    </button>
                </div>
            </div>

            {/* DROP ZONE */}
            {!preview && !result && (
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all ${
                        dragOver
                            ? 'border-violet-400 bg-violet-500/10'
                            : isGlass
                                ? 'border-white/20 bg-white/5 hover:bg-white/10'
                                : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                    }`}
                >
                    <input autoComplete="off" id="input-field"
                        ref={fileRef}
                        type="file"
                        accept=".csv,.CSV,text/csv"
                        className="hidden"
                        onChange={e => processFile(e.target.files[0])}
                    />
                    <Upload size={32} className={`mx-auto mb-3 ${isGlass ? 'text-white/40' : 'text-gray-300'}`} />
                    <p className={`font-semibold text-sm ${text}`}>Arrastrá tu archivo CSV aquí</p>
                    <p className={`text-xs mt-1 ${sub}`}>o hacé click para seleccionarlo (.csv o .CSV)</p>
                </div>
            )}

            {/* PREVIEW */}
            {preview && (
                <div className="space-y-3">
                    <div className={`${card}`}>
                        <div className="flex items-center gap-2 mb-3">
                            <FileText size={16} className={isGlass ? 'text-violet-300' : 'text-violet-600'} />
                            <p className={`font-bold text-sm ${text}`}>
                                {preview.rows.length} registros listos para importar
                            </p>
                        </div>

                        {preview.errors.length > 0 && (
                            <div className={`rounded-xl p-3 mb-3 ${isGlass ? 'bg-amber-400/10 border border-amber-400/20' : 'bg-amber-50 border border-amber-100'}`}>
                                <p className="text-amber-500 font-semibold text-xs mb-1">⚠️ {preview.errors.length} filas con errores (se saltearán):</p>
                                {preview.errors.slice(0, 3).map((e) => (
                                    <p key={e} className="text-amber-600 text-xs">{e}</p>
                                ))}
                                {preview.errors.length > 3 && <p className="text-amber-500 text-xs">... y {preview.errors.length - 3} más.</p>}
                            </div>
                        )}

                        {/* MUESTRA LAS PRIMERAS 3 FILAS */}
                        <div className="space-y-1">
                            {preview.rows.slice(0, 3).map((r, i) => (
                                <div key={r.date || i} className={`flex justify-between text-xs rounded-lg px-3 py-2 ${isGlass ? 'bg-white/5' : 'bg-gray-50'}`}>
                                    <span className={sub}>{r.date}</span>
                                    <span className={text}>${(r.uber + r.didi + r.cabify + r.others).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                    <span className={sub}>{r.hoursWorked}h · {r.kilometers}km</span>
                                </div>
                            ))}
                            {preview.rows.length > 3 && (
                                <p className={`text-xs text-center py-1 ${sub}`}>... y {preview.rows.length - 3} registros más</p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button aria-label="Acción" type="button"
                            onClick={() => { setPreview(null); setResult(null); }}
                            className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all ${isGlass ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            Cancelar
                        </button>
                        <button aria-label="Acción" type="button"
                            onClick={handleImport}
                            disabled={loading || !preview.rows.length}
                            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading
                                ? <><RefreshCw size={14} className="animate-spin" /> Importando...</>
                                : <>Importar {preview.rows.length} registros</>
                            }
                        </button>
                    </div>
                </div>
            )}

            {/* RESULTADO */}
            {result && (
                <div className={`${card} text-center py-8`}>
                    {result.errors === 0
                        ? <CheckCircle2 size={40} className="mx-auto mb-3 text-green-400" />
                        : <AlertCircle size={40} className="mx-auto mb-3 text-amber-400" />
                    }
                    <p className={`font-bold text-lg ${text}`}>{result.ok} registros importados</p>
                    {result.errors > 0 && (
                        <p className="text-amber-500 text-sm">{result.errors} errores</p>
                    )}
                    <button aria-label="Acción" type="button"
                        onClick={() => { setResult(null); setPreview(null); }}
                        className="mt-4 px-6 py-2 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-all"
                    >
                        Importar otro archivo
                    </button>
                </div>
            )}
        </div>
    );
}

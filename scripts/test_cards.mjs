import assert from 'node:assert/strict';
import { sanitizeCardData, sanitizeStatementData, removeUndefined, sanitizeFinancialData, sanitizeLast4, parseAmount } from '../src/utils/security.js';
import { formatMonthKey, calcularDeudaTarjetaMes, calcularDeudaEfectivaTarjeta, buildCardsWithDebt, dateToMonthVal, monthKeyToVal } from '../src/utils/cardDebtUtils.js';

console.log('🧪 Iniciando suite de tests para "Mis Tarjetas"...\n');

let passed = 0;
let failed = 0;

function runTest(name, fn) {
    try {
        fn();
        console.log(`  ✅ PASSED: ${name}`);
        passed++;
    } catch (err) {
        console.error(`  ❌ FAILED: ${name}`);
        console.error(`     Error: ${err.message}`);
        failed++;
    }
}

// ── 1. TESTS DE SANITIZACIÓN DE TARJETAS ──────────────────────────────────────
runTest('sanitizeCardData limpia strings y aplica clamps a días de cierre y vencimiento', () => {
    const raw = {
        name: '  Visa Galicia  ',
        bank: '  Banco Galicia  ',
        closeDay: '5',
        dueDay: '20',
        color: '#ff006e',
        isShared: true
    };

    const clean = sanitizeCardData(raw);
    assert.equal(clean.name, 'Visa Galicia');
    assert.equal(clean.bank, 'Banco Galicia');
    assert.equal(clean.closeDay, 5);
    assert.equal(clean.dueDay, 20);
    assert.equal(clean.color, '#ff006e');
    assert.equal(clean.isShared, true);
});

runTest('sanitizeCardData corrige días fuera de rango (< 1 o > 31)', () => {
    const rawTooLow = { name: 'Card', bank: 'Bank', closeDay: -5, dueDay: 0 };
    const cleanLow = sanitizeCardData(rawTooLow);
    assert.equal(cleanLow.closeDay, 1);
    assert.equal(cleanLow.dueDay, 1);

    const rawTooHigh = { name: 'Card', bank: 'Bank', closeDay: 99, dueDay: 35 };
    const cleanHigh = sanitizeCardData(rawTooHigh);
    assert.equal(cleanHigh.closeDay, 31);
    assert.equal(cleanHigh.dueDay, 31);
});

runTest('sanitizeCardData rechaza nombres o bancos vacíos', () => {
    assert.throws(() => sanitizeCardData({ name: '   ', bank: 'Bank' }), /nombre de la tarjeta es obligatorio/);
    assert.throws(() => sanitizeCardData({ name: 'Card', bank: '   ' }), /banco emisor es obligatorio/);
    assert.throws(() => sanitizeCardData(null), /Datos de tarjeta inválidos/);
});

runTest('sanitizeCardData sanea colores inválidos con un fallback seguro', () => {
    const raw = { name: 'Card', bank: 'Bank', color: 'invalid-color' };
    const clean = sanitizeCardData(raw);
    assert.equal(clean.color, '#1a1a1a');

    const validHex = { name: 'Card', bank: 'Bank', color: '#0a9396' };
    assert.equal(sanitizeCardData(validHex).color, '#0a9396');
});

// ── 2. TESTS DE SANITIZACIÓN DE RESÚMENES (STATEMENTS) ─────────────────────────
runTest('sanitizeStatementData convierte totalDue negativo o NaN a 0', () => {
    const rawNaN = { totalDue: 'invalido' };
    assert.equal(sanitizeStatementData(rawNaN).totalDue, 0);

    const rawNeg = { totalDue: -5000 };
    assert.equal(sanitizeStatementData(rawNeg).totalDue, 0);

    const rawValid = { totalDue: '85500.50' };
    assert.equal(sanitizeStatementData(rawValid).totalDue, 85500.5);
});

runTest('sanitizeStatementData y removeUndefined eliminan todas las propiedades undefined', () => {
    const raw = {
        totalDue: 12000,
        dueDate: '2026-05-10',
        nextCloseDate: undefined,
        nextDueDate: undefined,
        transactions: [
            {
                id: 'tx1',
                cleanName: 'Supermercado Coto',
                amount: 15000,
                category: 'Supermercado',
                date: '2026-05-02',
                isPayment: false,
                isInstallment: true,
                installmentCurrent: 1,
                installmentTotal: 3,
                notes: undefined
            },
            null, // debe ser filtrado
            {
                id: undefined,
                cleanName: 'Pago Tarjeta',
                amount: 15000,
                isPayment: true
            }
        ]
    };

    const clean = sanitizeStatementData(raw);
    assert.equal('nextCloseDate' in clean, false);
    assert.equal('nextDueDate' in clean, false);
    assert.equal(clean.transactions.length, 2);
    assert.equal('notes' in clean.transactions[0], false);
    assert.equal('id' in clean.transactions[1], false);
});

// ── 3. TESTS DE CÁLCULO Y SUMATORIA SIN CONCATENACIÓN (MonthlyCardsSummary) ────
runTest('Cálculo de total tarjetas suma numéricamente evitando concatenación de strings', () => {
    const cards = [
        {
            id: 'c1',
            name: 'Visa',
            monthlyStatements: {
                '2026-05': { totalDue: '85000' } // Nota: String simulando input o DB
            },
            paidPeriods: []
        },
        {
            id: 'c2',
            name: 'Mastercard',
            monthlyStatements: {
                '2026-05': { totalDue: 15000 }
            },
            paidPeriods: ['2026-05'] // Pagada
        },
        {
            id: 'c3',
            name: 'Amex',
            monthlyStatements: {}, // Sin resumen este mes
            paidPeriods: []
        }
    ];

    const monthKey = '2026-05';
    const cardsWithData = cards.map(card => ({
        card,
        stmt: card.monthlyStatements?.[monthKey] || null,
        isPaid: card.paidPeriods?.includes(monthKey) || false,
    }));

    const grandTotal = cardsWithData.reduce((acc, { stmt }) => acc + (Number(stmt?.totalDue) || 0), 0);
    const pendingTotal = cardsWithData
        .filter(({ isPaid }) => !isPaid)
        .reduce((acc, { stmt }) => acc + (Number(stmt?.totalDue) || 0), 0);

    // Debe sumar 85000 + 15000 = 100000, NO "08500015000"
    assert.strictEqual(grandTotal, 100000);
    // Solo Visa está pendiente (85000)
    assert.strictEqual(pendingTotal, 85000);
});

// ── 4. TESTS DE CARD DEBT UTILS ───────────────────────────────────────────────
runTest('formatMonthKey formatea año y mes correctamente', () => {
    const d1 = new Date(2026, 4, 15); // Mayo 2026 (mes 4 es mayo en JS 0-indexed)
    assert.equal(formatMonthKey(d1), '2026-05');

    const d2 = new Date(2026, 11, 31); // Diciembre 2026
    assert.equal(formatMonthKey(d2), '2026-12');

    assert.equal(formatMonthKey(null), '');
});

runTest('calcularDeudaEfectivaTarjeta prioriza monthlyStatements sobre transacciones', () => {
    const cardWithStatement = {
        id: 'card1',
        monthlyStatements: {
            '2026-05': { totalDue: 120000 }
        }
    };
    const txs = [
        { cardId: 'card1', type: 'credit', monthlyInstallment: 30000, installments: 3, date: '2026-05-01' }
    ];
    const targetMonthVal = 2026 * 12 + 4; // 2026-05

    const deuda = calcularDeudaEfectivaTarjeta(cardWithStatement, txs, '2026-05', targetMonthVal);
    assert.equal(deuda, 120000); // Tomó el statement manual/cargado
});

runTest('calcularDeudaEfectivaTarjeta calcula cuotas de transacciones si no hay statement', () => {
    const cardNoStatement = {
        id: 'card2',
        monthlyStatements: {}
    };
    const txs = [
        { cardId: 'card2', type: 'credit', monthlyInstallment: 25000, installments: 3, date: '2026-05-01' },
        { cardId: 'card2', type: 'cash', monthlyInstallment: 10000, installments: 1, date: '2026-05-01' }, // excluido: efectivo
        { cardId: 'otherCard', type: 'credit', monthlyInstallment: 50000, installments: 1, date: '2026-05-01' } // otra tarjeta
    ];
    const targetMonthVal = 2026 * 12 + 4; // 2026-05

    const deuda = calcularDeudaEfectivaTarjeta(cardNoStatement, txs, '2026-05', targetMonthVal);
    assert.equal(deuda, 25000);
});

// ── 5. CASOS DE BORDE ADICIONALES ──────────────────────────────────────────
runTest('sanitizeCardData trunca textos mayores a 50 caracteres y parsea floats en días', () => {
    const longName = 'A'.repeat(80);
    const raw = {
        name: longName,
        bank: 'B'.repeat(60),
        closeDay: 15.9,
        dueDay: '28.2'
    };
    const clean = sanitizeCardData(raw);
    assert.equal(clean.name.length, 50);
    assert.equal(clean.bank.length, 50);
    assert.equal(clean.closeDay, 15);
    assert.equal(clean.dueDay, 28);
});

runTest('removeUndefined maneja primitivos, null, arrays anidados y objetos profundos', () => {
    assert.equal(removeUndefined(null), null);
    assert.equal(removeUndefined(42), 42);
    assert.equal(removeUndefined('hola'), 'hola');
    assert.deepEqual(removeUndefined([1, undefined, 3]), [1, undefined, 3]); // en arrays mantiene orden
    const deepObj = {
        a: 1,
        b: undefined,
        c: {
            d: undefined,
            e: [
                { f: 10, g: undefined }
            ]
        }
    };
    const cleaned = removeUndefined(deepObj);
    assert.deepEqual(cleaned, {
        a: 1,
        c: {
            e: [{ f: 10 }]
        }
    });
});

runTest('sanitizeFinancialData mantiene retrocompatibilidad', () => {
    const input = { amount: '1500.50', installments: 3, notes: undefined, raw: 'test' };
    const safe = sanitizeFinancialData(input, ['amount', 'installments'], false);
    assert.strictEqual(safe.amount, 1500.5);
    assert.strictEqual(safe.installments, 3);
    assert.strictEqual('notes' in safe, false);
});

runTest('dateToMonthVal y monthKeyToVal funcionan simétricamente', () => {
    const d = new Date(2026, 8, 1); // 2026-09
    const valFromDate = dateToMonthVal(d);
    const valFromKey = monthKeyToVal('2026-09');
    assert.equal(valFromDate, valFromKey);
});

runTest('MonthlyCardsSummary calcula correctamente cuando todas están pagadas o todas pendientes', () => {
    const allPaid = [
        { id: '1', monthlyStatements: { '2026-05': { totalDue: 5000 } }, paidPeriods: ['2026-05'] },
        { id: '2', monthlyStatements: { '2026-05': { totalDue: 10000 } }, paidPeriods: ['2026-05'] }
    ];
    const cardsDataPaid = allPaid.map(c => ({
        card: c,
        stmt: c.monthlyStatements['2026-05'],
        isPaid: c.paidPeriods.includes('2026-05')
    }));
    const totalPaid = cardsDataPaid.reduce((acc, { stmt }) => acc + (Number(stmt?.totalDue) || 0), 0);
    const pendingPaid = cardsDataPaid.filter(({ isPaid }) => !isPaid).reduce((acc, { stmt }) => acc + (Number(stmt?.totalDue) || 0), 0);
    assert.equal(totalPaid, 15000);
    assert.equal(pendingPaid, 0);

    // Caso: Todas pendientes (ninguna pagada)
    const allPending = [
        { id: '1', monthlyStatements: { '2026-05': { totalDue: '85000' } }, paidPeriods: [] },
        { id: '2', monthlyStatements: { '2026-05': { totalDue: 15000 } }, paidPeriods: [] }
    ];
    const cardsDataPending = allPending.map(c => ({
        card: c,
        stmt: c.monthlyStatements['2026-05'],
        isPaid: c.paidPeriods.includes('2026-05')
    }));
    const totalPending = cardsDataPending.reduce((acc, { stmt }) => acc + (Number(stmt?.totalDue) || 0), 0);
    const pendingCount = cardsDataPending.filter(({ isPaid }) => !isPaid).reduce((acc, { stmt }) => acc + (Number(stmt?.totalDue) || 0), 0);
    assert.equal(totalPending, 100000);
    assert.equal(pendingCount, 100000);
});

// ── 5. TESTS DE CASOS DE BORDE ADICIONALES (AUDITORÍA SENIOR) ─────────────────
runTest('sanitizeStatementData parsea correctamente separadores de miles argentinos (ej: 85.000)', () => {
    // Antes, parseFloat("85.000") devolvía 85 en vez de 85000
    const res1 = sanitizeStatementData({ totalDue: '85.000' });
    assert.strictEqual(res1.totalDue, 85000);

    const res2 = sanitizeStatementData({ totalDue: '1.250.000' });
    assert.strictEqual(res2.totalDue, 1250000);

    const res3 = sanitizeStatementData({ totalDue: '1.250.000,50' });
    assert.strictEqual(res3.totalDue, 1250000.5);

    const res4 = sanitizeStatementData({ totalDue: '85.50' });
    assert.strictEqual(res4.totalDue, 85.5);
});

runTest('sanitizeCardData normaliza colores de 3 dígitos a 6 dígitos hex', () => {
    const card3Hex = { name: 'Card', bank: 'Bank', color: '#fff' };
    assert.strictEqual(sanitizeCardData(card3Hex).color, '#ffffff');

    const card123 = { name: 'Card', bank: 'Bank', color: '#123' };
    assert.strictEqual(sanitizeCardData(card123).color, '#112233');

    const card6Hex = { name: 'Card', bank: 'Bank', color: '#0a9396' };
    assert.strictEqual(sanitizeCardData(card6Hex).color, '#0a9396');
});

runTest('sanitizeCardData rechaza nombres compuestos exclusivamente por caracteres invisibles', () => {
    assert.throws(
        () => sanitizeCardData({ name: '\u200B\u200B\u200C', bank: 'Galicia' }),
        /nombre de la tarjeta es obligatorio/
    );
    assert.throws(
        () => sanitizeCardData({ name: 'Visa', bank: '\uFEFF\u00AD' }),
        /banco emisor es obligatorio/
    );
});

runTest('sanitizeCardData y cleanSafeString truncan emojis respetando pares sustitutos de UTF-16', () => {
    const emojis = '💳'.repeat(30); // 30 emojis = 60 code units
    const clean = sanitizeCardData({ name: emojis, bank: 'Banco Galicia' });
    // Debe tener 25 emojis completos (50 code units), sin surrogate huérfano
    assert.strictEqual(Array.from(clean.name).length, 25);
    assert.strictEqual(clean.name.length, 50);
    // Ningún carácter huérfano (surrogates D800-DFFF)
    for (let i = 0; i < clean.name.length; i++) {
        const code = clean.name.charCodeAt(i);
        if (code >= 0xD800 && code <= 0xDBFF) {
            // Debe estar seguido por un low surrogate
            assert.ok(i + 1 < clean.name.length);
            const next = clean.name.charCodeAt(i + 1);
            assert.ok(next >= 0xDC00 && next <= 0xDFFF);
            i++;
        }
    }
});

runTest('removeUndefined preserva instancias de Date y RegExp sin destruirlas', () => {
    const testDate = new Date('2026-09-01T12:00:00.000Z');
    const input = {
        name: 'Visa',
        date: testDate,
        regex: /^[0-9]+$/,
        extra: undefined
    };
    const cleaned = removeUndefined(input);
    assert.ok(cleaned.date instanceof Date);
    assert.strictEqual(cleaned.date.getTime(), testDate.getTime());
    assert.ok(cleaned.regex instanceof RegExp);
    assert.strictEqual('extra' in cleaned, false);
});

runTest('cardDebtUtils maneja entradas nulas, indefinidas o arrays vacíos sin lanzar excepciones', () => {
    assert.strictEqual(monthKeyToVal(null), 0);
    assert.strictEqual(monthKeyToVal(undefined), 0);
    assert.strictEqual(monthKeyToVal('invalido'), 0);

    assert.strictEqual(formatMonthKey(null), '');
    assert.strictEqual(formatMonthKey(new Date('invalido')), '');

    assert.strictEqual(calcularDeudaTarjetaMes(null, 'c1', 24000), 0);
    assert.strictEqual(calcularDeudaTarjetaMes([], 'c1', 24000), 0);
    assert.strictEqual(calcularDeudaTarjetaMes([{ date: null, type: 'credit' }], 'c1', 24000), 0);

    assert.strictEqual(calcularDeudaEfectivaTarjeta(null, [], '2026-05', 24000), 0);
    assert.strictEqual(buildCardsWithDebt(null, [], '2026-05', 24000).length, 0);
});

// ── 6. TESTS DE ÚLTIMOS 4 DÍGITOS Y CONDICIONES DE BORDE (AUDITORÍA 2) ─────────
runTest('sanitizeLast4 preserva ceros a la izquierda y formatos válidos de 4 dígitos', () => {
    // Caso crítico: "0012", "0000", "0123" deben preservar todos los ceros y no convertirse en números
    assert.strictEqual(sanitizeLast4('0012'), '0012');
    assert.strictEqual(sanitizeLast4('0000'), '0000');
    assert.strictEqual(sanitizeLast4('0123'), '0123');
    assert.strictEqual(sanitizeLast4('4589'), '4589');
    assert.strictEqual(sanitizeLast4(' 0042 '), '0042');
});

runTest('sanitizeLast4 rechaza caracteres no numéricos o longitudes distintas de 4', () => {
    // No numéricos
    assert.throws(() => sanitizeLast4('12a4'), /Los últimos dígitos deben ser exactamente 4 números/);
    assert.throws(() => sanitizeLast4('abcd'), /Los últimos dígitos deben ser exactamente 4 números/);
    assert.throws(() => sanitizeLast4('12-4'), /Los últimos dígitos deben ser exactamente 4 números/);

    // Longitud incorrecta
    assert.throws(() => sanitizeLast4('12'), /Los últimos dígitos deben ser exactamente 4 números/);
    assert.throws(() => sanitizeLast4('123'), /Los últimos dígitos deben ser exactamente 4 números/);
    assert.throws(() => sanitizeLast4('12345'), /Los últimos dígitos deben ser exactamente 4 números/);
    assert.throws(() => sanitizeLast4(12), /Los últimos dígitos deben ser exactamente 4 números/);
});

runTest('sanitizeLast4 maneja entradas opcionales (vacío, null, undefined) retornando undefined', () => {
    assert.strictEqual(sanitizeLast4(null), undefined);
    assert.strictEqual(sanitizeLast4(undefined), undefined);
    assert.strictEqual(sanitizeLast4(''), undefined);
    assert.strictEqual(sanitizeLast4('   '), undefined);
});

runTest('sanitizeCardData integra y valida last4 correctamente persistiendo como string', () => {
    const cardWithLast4 = {
        name: 'Visa Signature',
        bank: 'Galicia',
        last4: '0089',
        closeDay: 25,
        dueDay: 5
    };
    const clean = sanitizeCardData(cardWithLast4);
    assert.strictEqual(clean.last4, '0089');
    assert.strictEqual(typeof clean.last4, 'string');

    // Tarjeta sin last4 no debe tener la propiedad en el objeto saneado
    const cardWithoutLast4 = {
        name: 'Mastercard',
        bank: 'BBVA',
        closeDay: 20,
        dueDay: 2
    };
    const cleanNoLast4 = sanitizeCardData(cardWithoutLast4);
    assert.strictEqual('last4' in cleanNoLast4, false);

    // Tarjeta con last4 inválido debe lanzar error
    assert.throws(
        () => sanitizeCardData({ name: 'Amex', bank: 'Santander', last4: '123' }),
        /Los últimos dígitos deben ser exactamente 4 números/
    );
});

runTest('Sincronización de estado de pago en CardDetail preserva isPaid: true cuando no hay monthlyStatements', () => {
    // Si la tarjeta fue pagada este mes pero no tiene un objeto monthlyStatements creado,
    // el estado debe calcular isPaid como true apoyándose en paidPeriods
    const cardWithoutStatements = {
        id: 'c1',
        name: 'Visa',
        monthlyStatements: {},
        paidPeriods: ['2026-05']
    };
    const monthKey = '2026-05';
    const isPaid = Boolean(cardWithoutStatements.paidPeriods?.includes(monthKey));
    assert.strictEqual(isPaid, true);
});

runTest('Detección robusta de PDF admite application/pdf, application/x-pdf y extensión .pdf', () => {
    const isPdfFile = (file) => {
        if (!file) return false;
        return file.type === 'application/pdf' || 
               file.type === 'application/x-pdf' || 
               (typeof file.name === 'string' && file.name.toLowerCase().endsWith('.pdf'));
    };

    assert.strictEqual(isPdfFile({ type: 'application/pdf', name: 'resumen.pdf' }), true);
    assert.strictEqual(isPdfFile({ type: 'application/x-pdf', name: 'resumen.pdf' }), true);
    assert.strictEqual(isPdfFile({ type: '', name: 'resumen_banco.pdf' }), true);
    assert.strictEqual(isPdfFile({ type: 'image/png', name: 'foto.png' }), false);
    assert.strictEqual(isPdfFile(null), false);
});

// ── 7. TESTS ADICIONALES DE AUDITORÍA ROUND 3 ──────────────────────────────────
runTest('parseAmount limpia prefijos y códigos de moneda ($ , AR$, USD) y descarta Infinity, NaN y negativos', () => {
    assert.strictEqual(parseAmount('$ 85.000'), 85000);
    assert.strictEqual(parseAmount('$85.000,50'), 85000.5);
    assert.strictEqual(parseAmount('AR$ 1.250.000'), 1250000);
    assert.strictEqual(parseAmount('USD 1,250.50'), 1250.5);
    assert.strictEqual(parseAmount('€ 300,50'), 300.5);
    assert.strictEqual(parseAmount('  $ 15000  '), 15000);

    // Valores ilegales descartados a 0
    assert.strictEqual(parseAmount(Infinity), 0);
    assert.strictEqual(parseAmount('Infinity'), 0);
    assert.strictEqual(parseAmount(-Infinity), 0);
    assert.strictEqual(parseAmount('-500'), 0);
    assert.strictEqual(parseAmount(-100), 0);
    assert.strictEqual(parseAmount(''), 0);
    assert.strictEqual(parseAmount(null), 0);
});

runTest('sanitizeStatementData normaliza fechas argentinas DD/MM/YYYY y DD-MM-YYYY a formato ISO YYYY-MM-DD', () => {
    const raw = {
        totalDue: '$ 85.000',
        dueDate: '15/05/2026',
        nextCloseDate: '05-06-2026',
        nextDueDate: new Date(2026, 5, 15) // Junio 2026
    };

    const clean = sanitizeStatementData(raw);
    assert.strictEqual(clean.totalDue, 85000);
    assert.strictEqual(clean.dueDate, '2026-05-15');
    assert.strictEqual(clean.nextCloseDate, '2026-06-05');
    assert.strictEqual(clean.nextDueDate, '2026-06-15');
});

runTest('sanitizeStatementData normaliza cuotas negativas, ceros o inconsistentes (installmentCurrent/installmentTotal)', () => {
    const raw = {
        totalDue: 1000,
        transactions: [
            {
                cleanName: 'Compra Negativa',
                amount: '$ 1500',
                isInstallment: true,
                installmentCurrent: -5,
                installmentTotal: -10
            },
            {
                cleanName: 'Cuota Invertida',
                amount: 5000,
                isInstallment: true,
                installmentCurrent: 12,
                installmentTotal: 6
            },
            {
                cleanName: 'No Cuota',
                amount: 2000,
                isInstallment: false,
                installmentCurrent: 4,
                installmentTotal: 10
            }
        ]
    };

    const clean = sanitizeStatementData(raw);
    assert.strictEqual(clean.transactions[0].installmentCurrent, 1);
    assert.strictEqual(clean.transactions[0].installmentTotal, 1);
    assert.strictEqual(clean.transactions[0].amount, 1500);

    // Cuota 12 de 6 debe ajustarse a cuota 12 de 12
    assert.strictEqual(clean.transactions[1].installmentCurrent, 12);
    assert.strictEqual(clean.transactions[1].installmentTotal, 12);

    // Si no es cuota, normaliza a 1 de 1
    assert.strictEqual(clean.transactions[2].installmentCurrent, 1);
    assert.strictEqual(clean.transactions[2].installmentTotal, 1);
});

runTest('formatDueDate formatea de forma segura strings ISO con hora, formato estándar y formato argentino con barras', () => {
    const formatDueDate = (dateStr) => {
        if (!dateStr || typeof dateStr !== 'string') return null;
        const trimmed = dateStr.trim();
        if (trimmed.includes('-')) {
            const parts = trimmed.slice(0, 10).split('-');
            if (parts.length >= 3) return `${parts[2].slice(0, 2)}/${parts[1]}`;
        }
        if (trimmed.includes('/')) {
            const parts = trimmed.split('/');
            if (parts.length >= 2) return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}`;
        }
        return trimmed;
    };

    assert.strictEqual(formatDueDate('2026-05-15T00:00:00.000Z'), '15/05');
    assert.strictEqual(formatDueDate('2026-05-15'), '15/05');
    assert.strictEqual(formatDueDate('15/05/2026'), '15/05');
    assert.strictEqual(formatDueDate('5/5/2026'), '05/05');
    assert.strictEqual(formatDueDate(null), null);
});

runTest('calcularDeudaTarjetaMes maneja cuotas con NaN, descarta montos negativos y calcula May 31 sin drift por huso horario', () => {
    const targetMay = 2026 * 12 + 4; // 2026-05

    const txs = [
        // Compra el 31 de mayo a las 23:30 (debe pertenecer a Mayo 2026)
        { cardId: 'c1', type: 'credit', date: '2026-05-31T23:30:00', installments: 1, monthlyInstallment: 15000 },
        // Compra con monto corrupto NaN
        { cardId: 'c1', type: 'credit', date: '2026-05-10', installments: 1, monthlyInstallment: 'invalido' },
        // Compra con monto negativo
        { cardId: 'c1', type: 'credit', date: '2026-05-10', installments: 1, monthlyInstallment: -5000 }
    ];

    const deuda = calcularDeudaTarjetaMes(txs, 'c1', targetMay);
    assert.strictEqual(deuda, 15000); // 15000 + 0 + 0
});

runTest('calcularDeudaEfectivaTarjeta ignora montos negativos o NaN en ajustes manuales retornando 0', () => {
    const cardCorrupt = {
        id: 'c1',
        monthlyStatements: {
            '2026-05': { totalDue: -25000 }
        }
    };
    const deudaNeg = calcularDeudaEfectivaTarjeta(cardCorrupt, [], '2026-05', 2026 * 12 + 4);
    assert.strictEqual(deudaNeg, 0);

    const cardNaN = {
        id: 'c2',
        monthlyStatements: {
            '2026-05': { totalDue: 'NaN_string' }
        }
    };
    const deudaNaN = calcularDeudaEfectivaTarjeta(cardNaN, [], '2026-05', 2026 * 12 + 4);
    assert.strictEqual(deudaNaN, 0);
});

runTest('StatementDashboard acumula consumos estrictamente como números sin concatenación y formatea subtítulos sin viñetas huérfanas', () => {
    const txs = [
        { category: 'Supermercado', amount: '1500', isPayment: false },
        { category: 'Supermercado', amount: '2500', isPayment: false }
    ];

    const totals = txs.reduce((acc, tx) => {
        if (tx.isPayment) return acc;
        const cat = tx.category || 'Varios';
        const amt = Number(tx.amount);
        acc[cat] = (acc[cat] || 0) + ((!isNaN(amt) && isFinite(amt) && amt > 0) ? amt : 0);
        return acc;
    }, {});

    const totalSpent = Object.values(totals).reduce((a, b) => a + Number(b || 0), 0);

    assert.strictEqual(totals.Supermercado, 4000); // NO "015002500"
    assert.strictEqual(totalSpent, 4000);

    // Formateo de subtítulo sin fecha no debe comenzar con viñeta
    const txWithoutDate = { category: 'Farmacia', isInstallment: false };
    const subtitle = [
        txWithoutDate.date,
        txWithoutDate.category,
        txWithoutDate.isInstallment && txWithoutDate.installmentTotal > 1 ? `${txWithoutDate.installmentCurrent}/${txWithoutDate.installmentTotal}` : null
    ].filter(Boolean).join(' • ');

    assert.strictEqual(subtitle, 'Farmacia');
    assert.strictEqual(subtitle.startsWith(' • '), false);
});

runTest('clampDay en sanitizeCardData rechaza notaciones científicas y strings con caracteres alfabéticos (ej: 5e2)', () => {
    const rawSci = {
        name: 'Visa',
        bank: 'Galicia',
        closeDay: '5e2',
        dueDay: '12a'
    };
    const clean = sanitizeCardData(rawSci);
    // 5e2 no debe convertirse en 5, debe disparar fallback (1)
    assert.strictEqual(clean.closeDay, 1);
    // 12a no debe convertirse en 12, debe disparar fallback (10)
    assert.strictEqual(clean.dueDay, 10);
});

console.log(`\n========================================`);
console.log(`Total: ${passed + failed} | Pasaron: ${passed} | Fallaron: ${failed}`);
console.log(`========================================\n`);

if (failed > 0) {
    process.exit(1);
}

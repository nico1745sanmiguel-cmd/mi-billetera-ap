/**
 * testMobilityChartsAdversarial.mjs
 * Pruebas Empíricas Adversariales de Renderizado y Desbordamiento en Gráficos M2:
 * - MobilityTrendChart.jsx
 * - MobilityWeeklyBreakdown.jsx
 *
 * Casos Evaluados:
 * 1. Déficit severo: $0 ingresos y $500.000 gastos en el mes.
 *    - Comprobar que la escala máxima sea 500.000 (y no 0 o 1).
 *    - Comprobar que la barra de gastos alcance el 100% de la altura visual.
 *    - Comprobar que la barra de ingresos muestre la línea base vacía (h-1) sin romper maquetación.
 *    - Comprobar que el contenedor de 82px no desborde.
 *    - Comprobar que el indicador de déficit visual y tooltip se activen ("Déficit").
 * 2. Superávit puro: $500.000 ingresos y $0 gastos.
 *    - Comprobar que la barra de ingresos alcance el 100% de altura.
 *    - Comprobar que la barra de gastos muestre la línea base vacía sin arrojar NaN o colapso.
 * 3. Mes inactivo / vacío: $0 ingresos y $0 gastos.
 *    - Comprobar chartMax >= 1 para prevenir división por cero.
 *    - Comprobar que ambas barras muestren línea base vacía sin NaN ni estilos inválidos.
 * 4. Desglose semanal con gastos superiores a ingresos (MobilityWeeklyBreakdown.jsx):
 *    - Caso A: Semana con $50.000 ingresos y $200.000 gastos (gasto > ingreso).
 *    - Caso B: Semana con $0 ingresos y $300.000 gastos (solo gastos en la semana).
 *    - Caso C: totalEarnings = $0 y semana con gastos.
 *    - Caso D: Comprobar acotamiento estricto al 100% (Math.min(100, Math.max(0, pct))).
 *    - Comprobar que ningún ancho en style contenga NaN% o supere el 100%.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../../');

describe('M2 Adversarial Stress Suite: MobilityTrendChart & MobilityWeeklyBreakdown', async () => {
    let vite;
    let MobilityTrendChart;
    let MobilityWeeklyBreakdown;

    const fmt = (val) => `$ ${Number(val || 0).toLocaleString('es-AR')}`;

    before(async () => {
        // Inicializar Vite en modo SSR para transpilar y cargar componentes JSX reales de producción
        vite = await createServer({
            root: rootDir,
            server: { middlewareMode: true },
            appType: 'custom'
        });

        const trendMod = await vite.ssrLoadModule('/src/Components/Mobility/MobilityTrendChart.jsx');
        MobilityTrendChart = trendMod.default;

        const weeklyMod = await vite.ssrLoadModule('/src/Components/Mobility/MobilityWeeklyBreakdown.jsx');
        MobilityWeeklyBreakdown = weeklyMod.default;
    });

    after(async () => {
        if (vite) {
            await vite.close();
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // CASO 1: DÉFICIT SEVERO ($0 INGRESOS, $500.000 GASTOS)
    // ─────────────────────────────────────────────────────────────────────────
    describe('1. Caso Límite: Mes con $0 ingresos y $500.000 gastos (Déficit Severo)', () => {
        const trendData = [
            { label: 'Abr', total: 100000, gastos: 40000, key: '2026-04' },
            { label: 'May', total: 120000, gastos: 50000, key: '2026-05' },
            { label: 'Jun', total: 150000, gastos: 60000, key: '2026-06' },
            { label: 'Jul', total: 180000, gastos: 70000, key: '2026-07' },
            { label: 'Ago', total: 200000, gastos: 80000, key: '2026-08' },
            { label: 'Sep', total: 0, gastos: 500000, key: '2026-09' } // Mes en evaluación
        ];

        it('debe renderizar el gráfico sin arrojar excepciones', () => {
            const html = ReactDOMServer.renderToStaticMarkup(
                React.createElement(MobilityTrendChart, {
                    trend6: trendData,
                    maxTrend: 0,
                    monthKey: '2026-09',
                    isGlass: false,
                    privacyMode: false,
                    fmt
                })
            );
            assert.ok(html.length > 0);
            assert.ok(html.includes('Tendencia · últimos 6 meses'));
        });

        it('debe calcular la escala máxima basada en el gasto de 500.000 y asignar altura 100% a la barra de gastos', () => {
            const html = ReactDOMServer.renderToStaticMarkup(
                React.createElement(MobilityTrendChart, {
                    trend6: trendData,
                    maxTrend: 0,
                    monthKey: '2026-09',
                    isGlass: false,
                    privacyMode: false,
                    fmt
                })
            );

            // La barra de gastos de Sep debe tener height: 100%
            assert.ok(html.includes('style="height:100%"'), 'La barra de gastos de 500k debe alcanzar el 100% de la escala');
            // El tooltip debe reportar el déficit
            assert.ok(html.includes('(Déficit)'), 'El tooltip de la barra debe indicar déficit explícitamente');
            // Debe incluir el monto formateado en el título
            assert.ok(html.includes('Gastos: $ 500.000 (Déficit)'));
        });

        it('no debe ocultar la barra de gastos ni truncarla artificialmente al 80%', () => {
            const html = ReactDOMServer.renderToStaticMarkup(
                React.createElement(MobilityTrendChart, {
                    trend6: trendData,
                    maxTrend: 0,
                    monthKey: '2026-09',
                    isGlass: false,
                    privacyMode: false,
                    fmt
                })
            );

            // Verificar que no exista el cap arbitrario de 80%
            // La barra de gastos debe estar al 100%, no al 80%
            assert.ok(!html.includes('style="height:80%"'));
            assert.ok(html.includes('style="height:100%"'));
        });

        it('debe mostrar la línea base (placeholder h-1) para los $0 ingresos sin romper el layout flex', () => {
            const html = ReactDOMServer.renderToStaticMarkup(
                React.createElement(MobilityTrendChart, {
                    trend6: trendData,
                    maxTrend: 0,
                    monthKey: '2026-09',
                    isGlass: false,
                    privacyMode: false,
                    fmt
                })
            );

            // Debe contener el placeholder redondeado para ingresos 0
            assert.ok(html.includes('w-full h-1 rounded-full bg-gray-100'));
        });

        it('no debe contener valores NaN ni desbordes en el estilo de alturas', () => {
            const html = ReactDOMServer.renderToStaticMarkup(
                React.createElement(MobilityTrendChart, {
                    trend6: trendData,
                    maxTrend: 0,
                    monthKey: '2026-09',
                    isGlass: false,
                    privacyMode: false,
                    fmt
                })
            );

            assert.ok(!html.includes('NaN'), 'El HTML no debe contener NaN');
            assert.ok(!html.includes('undefined'), 'El HTML no debe contener undefined en atributos');
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // CASO 2: SUPERÁVIT PURO ($500.000 INGRESOS, $0 GASTOS)
    // ─────────────────────────────────────────────────────────────────────────
    describe('2. Caso Límite: Mes con $500.000 ingresos y $0 gastos (Superávit Puro)', () => {
        const trendData = [
            { label: 'Sep', total: 500000, gastos: 0, key: '2026-09' }
        ];

        it('debe escalar la barra de ingresos al 100% y mostrar la línea base para gastos', () => {
            const html = ReactDOMServer.renderToStaticMarkup(
                React.createElement(MobilityTrendChart, {
                    trend6: trendData,
                    maxTrend: 0,
                    monthKey: '2026-09',
                    isGlass: false,
                    privacyMode: false,
                    fmt
                })
            );

            // Barra de ingresos al 100%
            assert.ok(html.includes('style="height:100%"'));
            assert.ok(html.includes('title="Ingresos: $ 500.000"'));
            // Barra de gastos en placeholder h-1
            assert.ok(html.includes('w-full h-1 rounded-full bg-gray-100'));
            // NO debe marcar déficit
            assert.ok(!html.includes('(Déficit)'));
            assert.ok(!html.includes('NaN'));
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // CASO 3: MES VACÍO ($0 INGRESOS, $0 GASTOS)
    // ─────────────────────────────────────────────────────────────────────────
    describe('3. Caso Límite: Mes con $0 ingresos y $0 gastos (Inactivo)', () => {
        const trendData = [
            { label: 'Sep', total: 0, gastos: 0, key: '2026-09' }
        ];

        it('debe proteger contra división por cero (chartMax >= 1) y renderizar ambas barras como líneas base', () => {
            const html = ReactDOMServer.renderToStaticMarkup(
                React.createElement(MobilityTrendChart, {
                    trend6: trendData,
                    maxTrend: 0,
                    monthKey: '2026-09',
                    isGlass: false,
                    privacyMode: false,
                    fmt
                })
            );

            // Ninguna barra debe tener altura porcentual activa (>0)
            assert.ok(!html.includes('style="height:100%"'));
            // Ambas columnas deben renderizar el placeholder h-1
            const countPlaceholders = (html.match(/w-full h-1 rounded-full/g) || []).length;
            assert.strictEqual(countPlaceholders, 2, 'Deben existir 2 placeholders de línea base (ingresos y gastos)');
            assert.ok(!html.includes('NaN'));
            assert.ok(!html.includes('Infinity'));
        });

        it('debe tolerar array trend6 completamente vacío sin lanzar excepción', () => {
            const html = ReactDOMServer.renderToStaticMarkup(
                React.createElement(MobilityTrendChart, {
                    trend6: [],
                    maxTrend: 0,
                    monthKey: '2026-09',
                    isGlass: false,
                    privacyMode: false,
                    fmt
                })
            );

            assert.ok(html.includes('Tendencia · últimos 6 meses'));
            assert.ok(!html.includes('NaN'));
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // CASO 4: SEMANA CON GASTOS > INGRESOS EN MobilityWeeklyBreakdown.jsx
    // ─────────────────────────────────────────────────────────────────────────
    describe('4. Desbordamiento y Clamping en MobilityWeeklyBreakdown.jsx', () => {

        it('debe acotar la barra visual de gastos estrictamente al 100% cuando gasto supera ingreso total', () => {
            // Semana 1: total $50.000, gastos $250.000 (gasto 5 veces mayor)
            // totalEarnings del mes informado como $50.000
            const weeksData = [
                { label: 'S1', total: 50000, gastos: 250000 }
            ];

            const html = ReactDOMServer.renderToStaticMarkup(
                React.createElement(MobilityWeeklyBreakdown, {
                    weeks: weeksData,
                    totalEarnings: 50000,
                    isGlass: false,
                    privacyMode: false,
                    text: 'text-gray-900',
                    sub: 'text-gray-400',
                    fmt
                })
            );

            // maxScale = Math.max(50000, 250000, 1) = 250000
            // totalPct = (50000 / 250000) * 100 = 20%
            // gastosPct = (250000 / 250000) * 100 = 100%
            assert.ok(html.includes('style="width:20%"'), 'Ingreso debe ser 20%');
            assert.ok(html.includes('style="width:100%"'), 'Gasto debe acotarse a exactamente 100%');
            assert.ok(!html.includes('width:500%'), 'No debe desbordar al 500%');
            assert.ok(html.includes('-$ 250.000'), 'Debe mostrar el importe de gasto formateado');
            assert.ok(!html.includes('NaN'));
        });

        it('debe proteger contra totalEarnings = 0 y gastos > 0 sin desbordar ni arrojar NaN', () => {
            const weeksData = [
                { label: 'S1', total: 0, gastos: 180000 }
            ];

            const html = ReactDOMServer.renderToStaticMarkup(
                React.createElement(MobilityWeeklyBreakdown, {
                    weeks: weeksData,
                    totalEarnings: 0,
                    isGlass: false,
                    privacyMode: false,
                    text: 'text-gray-900',
                    sub: 'text-gray-400',
                    fmt
                })
            );

            // totalPct = 0%
            // gastosPct = 100% (porque maxScale toma 180000)
            assert.ok(html.includes('style="width:0%"'), 'Ingreso 0 debe ser ancho 0%');
            assert.ok(html.includes('style="width:100%"'), 'Gasto debe ser ancho 100% sin desbordar');
            assert.ok(html.includes('-$ 180.000'));
            assert.ok(!html.includes('NaN'));
        });

        it('debe manejar semana con ambos valores en $0 sin romper estilos', () => {
            const weeksData = [
                { label: 'S1', total: 0, gastos: 0 }
            ];

            const html = ReactDOMServer.renderToStaticMarkup(
                React.createElement(MobilityWeeklyBreakdown, {
                    weeks: weeksData,
                    totalEarnings: 0,
                    isGlass: false,
                    privacyMode: false,
                    text: 'text-gray-900',
                    sub: 'text-gray-400',
                    fmt
                })
            );

            assert.ok(html.includes('style="width:0%"'));
            assert.ok(!html.includes('NaN'));
            // Cuando gastosVal === 0, el bloque de barra de gastos no se renderiza (gastosVal > 0)
            assert.ok(!html.includes('bg-red-400/70'));
        });

        it('debe devolver null cuando weeks es un array vacío o undefined', () => {
            const htmlEmpty = ReactDOMServer.renderToStaticMarkup(
                React.createElement(MobilityWeeklyBreakdown, {
                    weeks: [],
                    totalEarnings: 0,
                    fmt
                })
            );
            assert.strictEqual(htmlEmpty, '');

            const htmlNull = ReactDOMServer.renderToStaticMarkup(
                React.createElement(MobilityWeeklyBreakdown, {
                    weeks: null,
                    totalEarnings: 0,
                    fmt
                })
            );
            assert.strictEqual(htmlNull, '');
        });

        it('debe soportar privacyMode ofuscando montos con •• sin alterar proporciones de ancho', () => {
            const weeksData = [
                { label: 'S1', total: 100000, gastos: 50000 }
            ];

            const html = ReactDOMServer.renderToStaticMarkup(
                React.createElement(MobilityWeeklyBreakdown, {
                    weeks: weeksData,
                    totalEarnings: 100000,
                    isGlass: false,
                    privacyMode: true,
                    text: 'text-gray-900',
                    sub: 'text-gray-400',
                    fmt
                })
            );

            assert.ok(html.includes('••'));
            assert.ok(!html.includes('100.000'));
            assert.ok(!html.includes('50.000'));
            assert.ok(html.includes('style="width:100%"'), 'Ingreso es 100% de escala');
            assert.ok(html.includes('style="width:50%"'), 'Gasto es 50% de escala');
        });

        it('resistencia adversarial: clamp matemático Math.min(100, Math.max(0, rawPct))', () => {
            // Caso donde totalEarnings sea artificialmente menor que la semana y weeks contenga valores anormales
            const weeksData = [
                { label: 'S1', total: -5000, gastos: 999999999 }
            ];

            const html = ReactDOMServer.renderToStaticMarkup(
                React.createElement(MobilityWeeklyBreakdown, {
                    weeks: weeksData,
                    totalEarnings: -10000,
                    isGlass: false,
                    privacyMode: false,
                    text: 'text-gray-900',
                    sub: 'text-gray-400',
                    fmt
                })
            );

            // Para total negativo (-5000), totalVal = -5000, rawTotalPct = negativo, clamp Math.max(0, rawTotalPct) debe dar 0%
            assert.ok(html.includes('style="width:0%"'));
            // Para gasto gigante, debe estar en 100% exacto
            assert.ok(html.includes('style="width:100%"'));
            assert.ok(!html.includes('NaN'));
        });
    });
});

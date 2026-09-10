# TEST_READY: Módulo de Grupo Familiar y Reparto de Gastos (Automated Test Suite)

**Estado de la Suite**: `READY` (100% de tests aprobados, código de salida 0)  
**Fecha de Publicación**: 2026-09-10  
**Autor**: `test_writer_fam_1` (Test Architect & QA Lead)  
**Comando de Ejecución Maestro**:  
```bash
node test-reparto-e2e.js
```
o también:
```bash
node tests/reparto/runAllTests.mjs
```

---

## 1. Resumen Ejecutivo de Cobertura

La suite de pruebas automatizadas para el módulo de Grupo Familiar y Reparto de Gastos ha sido construida e integrada íntegramente utilizando Node.js nativo (`node:test` y `node:assert/strict`) con arquitectura ESM (.mjs / .js), sin dependencias externas pesadas, garantizando una ejecución ultrarrápida (~3 segundos) y 100% determinista en cualquier entorno.

| Nivel | Archivo de Prueba | Tests | Estado | Alcance y Capacidades Validadas |
|---|---|:---:|:---:|---|
| **Tier 1: Feature Coverage** | `tests/reparto/tier1-features.test.mjs` | **30** | `PASSED` | Proporciones salariales, cuotas Largest Remainder sin drift, suma 100%, selector unificado de 5 categorías, balances netos de acreedores/deudores y transferencias. |
| **Tier 2: Boundary & Corner Cases** | `tests/reparto/tier2-boundaries.test.mjs` | **40** | `PASSED` | 0 miembros, 1 miembro, 3+ miembros, sueldos en 0, asimetría extrema ($5.000.000 vs $0), división por 0, gastos en 0, inputs negativos, `NaN`/`Infinity` y formatos con coma/punto. |
| **Tier 3: Cross-Feature Combinations** | `tests/reparto/tier3-combinations.test.mjs` | **12** | `PASSED` | Modalidad Equitativo vs Proporcional, compensaciones cruzadas (servicios vs tarjetas vs súper), aportes manuales a caja común, superávit y cancelación circular de deudas. |
| **Tier 4: Real-World Scenarios** | `tests/reparto/tier4-scenarios.test.mjs` | **5** | `PASSED` | Escenarios realistas de hogares en Argentina: pareja 65/35 con liquidación Mercado Pago, roommates en Palermo, desempleo temporal con absorción, pozo en efectivo y mes inflacionario ($777.067). |
| **TOTAL GENERAL** | **4 Tiers + Runner Maestro** | **87** | **100% PASS** | **Tiempo total de ejecución: ~3.2s** |

---

## 2. Invariantes Matemáticos Certificados

1. **Conservación Absoluta del Dinero**:
   $$\sum_{i=1}^N \text{cuota}_i = \text{totalGastos}$$
   Para cualquier monto total (divisible, par, impar o primo como $777.067) el algoritmo de *Largest Remainder* (Hare-Niemeyer) asegura que no se crea ni se pierde ni un solo peso o centavo.

2. **Cierre Exacto de Porcentajes al 100.0%**:
   $$\sum_{i=1}^N \text{porcentaje}_i = 100.0\%$$
   Se elimina definitivamente el problema de sumas de $99.9\%$ en hogares de 3, 6, 7 o más integrantes.

3. **Conservación de Saldos Netos**:
   $$\sum_{i=1}^N \text{saldoNeto}_i = 0$$
   Todo lo que un deudor debe equivale exactamente a lo que los acreedores tienen a favor.

4. **Minimización de Transferencias**:
   El algoritmo de liquidación neta garantiza que las deudas se compensan en un máximo de $N-1$ transferencias directas, eliminando triangulaciones circulares.

5. **Protección Anti-Crash y Fallback Resiliente**:
   Ante datos salariales incompletos o en cero en modo proporcional, el sistema previene la exigencia del 100% a un único miembro y activa de forma transparente el fallback equitativo con alerta informativa (`hasIncompleteSalaries: true`).

---

## 3. Evidencia de Ejecución Limpia

Salida del comando `node test-reparto-e2e.js`:

```
==================================================================================
  MI BILLETERA — SUITE E2E AUTOMATIZADA: GRUPO FAMILIAR Y REPARTO DE GASTOS
==================================================================================
  Fecha de ejecución : 10/9/2026, 15:17:35
  Versión de Node.js : v24.13.1
  Modo de ejecución  : ESM Nativo (node:test)

[1/4] Ejecutando Tier 1: Feature Coverage...
✔ Tier 1: Feature Coverage — Módulo Grupo Familiar y Reparto (30 tests)

[2/4] Ejecutando Tier 2: Boundary & Corner Cases...
✔ Tier 2: Boundary & Corner Cases — Robustez y Límites Extremos (40 tests)

[3/4] Ejecutando Tier 3: Cross-Feature Combinations...
✔ Tier 3: Cross-Feature Combinations — Interacciones y Modalidades (12 tests)

[4/4] Ejecutando Tier 4: Real-World Scenarios...
✔ Tier 4: Real-World Application Scenarios — Hogares y Parejas (5 tests)

==================================================================================
  RESUMEN EJECUTIVO DE EJECUCIÓN DE PRUEBAS — GRUPO FAMILIAR
==================================================================================
  ✔  Tier 1: Feature Coverage               : [PASÓ] (0.88s)
  ✔  Tier 2: Boundary & Corner Cases        : [PASÓ] (1.19s)
  ✔  Tier 3: Cross-Feature Combinations     : [PASÓ] (0.46s)
  ✔  Tier 4: Real-World Scenarios           : [PASÓ] (0.70s)
----------------------------------------------------------------------------------
  Tiers Aprobados : 4 de 4
  Tiers Fallados  : 0
  Tiempo Total    : 3.23s
==================================================================================

✅ ÉXITO: Todos los niveles de pruebas (Tiers 1-4) pasaron satisfactoriamente.
Exit code: 0
```

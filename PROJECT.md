# Project: mi-billetera-ap (Módulo de Grupo Familiar y Reparto de Gastos)

## Architecture
El módulo de Grupo Familiar y Reparto de Gastos gestiona la convivencia financiera de los integrantes del hogar, el cálculo de aportes (equitativo vs proporcional por ingresos), el pozo de gastos compartidos (servicios, tarjetas, supermercado, compras frescas y gastos en efectivo) y la liquidación neta de compensaciones ("quién le debe transferir a quién").

- **Capa de Utilidades Matemáticas y Lógica de Reparto**:
  - `src/utils/salaryUtils.js`: Obtención de sueldos recientes, ordenamiento seguro retrocompatible, sanitización de montos.
  - `src/utils/repartoUtils.js`: Algoritmo de cuotas sin drift (Largest Remainder / Hare-Niemeyer), balances netos, cálculo de compensaciones ("quién debe a quién") y selector unificado de gastos compartidos del mes.
- **Capa de Estado y Persistencia**:
  - `src/context/SalaryContext.jsx`: Estado de sueldos, proporciones familiares y reactividad de integrantes.
  - `src/Components/Household/HouseholdManager.jsx`: Administración de miembros, código de invitación, preferencias de reparto y salida limpia del hogar.
  - `src/Components/Household/HouseholdMembersList.jsx` & `SalarySection.jsx`: Carga resiliente de integrantes y sueldos.
- **Capa de Presentación y Tableros de Reparto**:
  - `src/Components/Shared/SharedExpensesDashboard.jsx`: Tablero principal con Hero Card de Liquidación Neta, navegación temporal de meses, filtros, desglose por categorías y gestión de aportes (creación, edición, borrado).
  - `src/Components/Services/RepartoPanel.jsx`: Visualización tabular responsiva de la división de servicios.
  - `src/Components/Dashboard/Widgets/SplitSummaryWidget.jsx`: Widget de resumen en Home con datos sincronizados y consistentes.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---|---|---|---|
| 1 | F1: Núcleo Matemático y Compatibilidad | Eliminación de error de linter (`calcularTotalesMes`), retrocompatibilidad de `toSorted` y sanitización numérica (anti-NaN/Infinity/negativos). | M1 | Survey (Explorer 1 & 2) |
| 2 | F2: Reparto sin Drift y Modalidades | Reparto sin pérdidas ni sobrantes de centavos (*Largest Remainder* / Hare-Niemeyer) y soporte de modalidad (Equitativo vs Proporcional). | M1 | Survey (Explorer 1) |
| 3 | F3: Liquidación Neta ("Quién debe a quién") | Algoritmo de compensación cruzada directa entre pagadores reales y cuotas teóricas con simplificación de transferencias. | M1 | Survey (Explorer 1 & 3) |
| 4 | F4: Resiliencia en Carga de Miembros | Prevención de cuelgues infinitos de spinner en `HouseholdMembersList` y `SalarySection` cuando hay 0 miembros. | M2 | Survey (Explorer 2) |
| 5 | F5: Ciclo de Vida y Limpieza del Hogar | Desvinculación limpia al salir del hogar sin arrastrar deudas huérfanas, reactividad sin `window.location.reload()` ni `alert()`, unificación de badges a `VOS`. | M2 | Survey (Explorer 2 & 3) |
| 6 | F6: Hero Card de Liquidación Neta | Visualización clara y destacada de quién le transfiere a quién, montos netos y botón para copiar resumen para WhatsApp. | M3 | Survey (Explorer 3) |
| 7 | F7: Rediseño Mobile sin Truncamiento | Desacoplamiento de textos y cifras numéricas de los anchos porcentuales CSS, y tabla responsiva en `RepartoPanel`. | M3 | Survey (Explorer 1 & 3) |
| 8 | F8: Navegación de Períodos y CRUD Aportes | Selector de `< Mes >`, filtros por miembro y categoría, y edición/eliminación de aportes en `ContributionModal`. | M3 | Survey (Explorer 3) |
| 9 | F9: Unificación de Gastos Compartidos | Sincronización del total compartido entre Dashboard, Widget Home y Reparto mediante utilidad unificada. | M3 | Survey (Explorer 1 & 2) |
| 10 | F10: Suite de Pruebas E2E y Hardening | Arnés automatizado con Tiers 1-4, publicación de `TEST_READY.md` y hardening adversarial de casos límite (Tier 5). | E2E, M4 | Survey (Explorer 1, 2 & 3) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Núcleo Matemático y Liquidación Neta | `salaryUtils.js`, `repartoUtils.js` | none | IN_PROGRESS (worker: 3c42abcd) |
| M2 | Gestión de Hogar y Resiliencia de Estado | `HouseholdManager.jsx`, `HouseholdMembersList.jsx`, `SalarySection.jsx`, `SalaryContext.jsx` | M1 | PLANNED |
| M3 | UX/UI Premium y Tableros de Reparto | `SharedExpensesDashboard.jsx`, `RepartoPanel.jsx`, `SplitSummaryWidget.jsx` | M1, M2 | PLANNED |
| E2E | Suite de Pruebas E2E (Tiers 1-4) | Arnés automatizado, casos de prueba (Tiers 1-4) y publicación de `TEST_READY.md` | none (paralelo) | READY (87/87 tests PASS, exit code 0) |
| M4 | Integración Final y Hardening Adversarial | Aprobación 100% tests E2E y hardening adversarial (Tier 5) | M1, M2, M3, E2E | PLANNED |

## Interface Contracts
### `src/utils/repartoUtils.js` & `src/utils/salaryUtils.js`
- `calcularProporciones(members, splitMode = 'proportional')`: Devuelve arreglo de miembros con `proportion` (0 a 1) y `percentage` exacto (suma 100.0% mediante Largest Remainder). Si no todos tienen sueldo en modo proporcional, añade `hasIncompleteSalaries: true` y aplica fallback equitativo con alerta.
- `calcularAportesExactos(total, proporciones)`: Asigna cuotas enteras/centavos cuya suma coincide al 100% con `total` sin perder ni crear dinero.
- `calcularLiquidacionNeta(miembros, gastosCompartidos, aportesManuales)`: Calcula para cada integrante `totalPagado`, `totalDebe` y genera `transferencias: [{ fromUid, fromName, toUid, toName, amount }]`.
- `obtenerTotalGastosCompartidos(servicios, tarjetas, supermercado, frescos, efectivo)`: Selector único canónico para evitar discrepancias entre widgets y vistas.

## Code Layout
- `src/utils/salaryUtils.js`: Funciones de sanitización de sueldos y parsing retrocompatible.
- `src/utils/repartoUtils.js`: Lógica pura de cálculo de reparto, liquidación de saldos y compensaciones.
- `src/Components/Household/`: Componentes de gestión de miembros, sueldos y preferencias.
- `src/Components/Shared/`: Tableros de visualización, filtros y modales de aportes.
- `src/Components/Services/`: Paneles y tablas de reparto de servicios.
- `src/Components/Dashboard/Widgets/`: Widgets de resumen de gastos compartidos en Home.

# Project: mi-billetera-ap (Módulo de Movilidad)

## Architecture
El módulo de Movilidad gestiona los ingresos, jornadas laborales de aplicaciones (Uber, DiDi, Cabify, etc.), gastos operativos de vehículos (GNC, combustible, mantenimiento) y métricas de rentabilidad para conductores.

- **Capa de Persistencia e Integración**:
  - `src/repositories/mobilityRepository.js`: Acceso a Firestore (`mobility_sessions`, `mobility_expenses`).
  - `src/utils/security.js`: Sanitización de entradas, filtrado de `undefined`, parsing numérico seguro.
  - `src/utils/cache.js`: Gestión de caché en `localStorage` con claves prefijadas.
- **Capa de Estado React**:
  - `src/context/MobilityContext.jsx`: `MobilityStateContext` (datos) y `MobilityDispatchContext` (acciones).
- **Capa de Presentación y Componentes**:
  - `src/Components/Mobility/MobilityDashboard.jsx`: Contenedor principal con pestañas y navegación.
  - `src/Components/Mobility/MobilityExpenses.jsx` & `MobilityExpensesList.jsx`: Gestión y desglose de gastos.
  - `src/Components/Mobility/MobilityForm.jsx`: Registro de jornadas con soporte de borradores multidía.
  - `src/Components/Mobility/MobilityHistory.jsx`: Historial con filtros, edición y eliminación.
  - `src/Components/Mobility/MobilityStats.jsx`, `MobilityTrendChart.jsx`, `MobilityWeeklyBreakdown.jsx`: Análisis de KPIs, tendencias y desgloses.
  - `src/Components/Mobility/MobilityImport.jsx`: Importación de archivos CSV y migración de datos.
  - `src/Components/Mobility/MobilitySettings.jsx`: Configuración del módulo y zona de peligro.
- **Widgets de Dashboard**:
  - `src/Components/Dashboard/Widgets/MobilityWidget.jsx`: Visualización resumida en Home.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---|---|---|---|
| 1 | F1: Sanitización y Batching Firestore | Sanitización con security.js, blindaje ante undefined y borrado/importación en lotes <= 400 docs | M1 | Survey (Explorer 1 & 3) |
| 2 | F2: Optimización y Estabilidad Contexto | Desacoplar sessions de dispatchValue, captura de excepciones en promesas y limpieza de estado en logout | M1 | Survey (Explorer 1) |
| 3 | F3: Fechas Locales y Zona Horaria | Helper de fecha local (en-CA) para evitar saltos UTC a las 21hs y corrección de mes previo en widget | M1, M2 | Survey (Explorer 1 & 2) |
| 4 | F4: Lógica de Estadísticas y Gráficos | Reemplazo de toSorted (ES2023), cómputo correcto de días trabajados (gastos != días) y rediseño de barras de tendencia | M2 | Survey (Explorer 2 & 3) |
| 5 | F5: Parser CSV Robusto y Exportación | Parser RFC 4180 con autodetección de delimitador (, o ;) y decimales, más exportación a CSV | M3 | Survey (Explorer 2 & 3) |
| 6 | F6: UX/UI Premium y Formularios | Campos Horas/Km en formulario, estados de carga Skeletons, botones táctiles en móviles y animaciones suaves | M3 | Survey (Explorer 2 & 3) |
| 7 | F7: Suite E2E y Pruebas Automatizadas | Arnés de pruebas automatizadas Tiers 1-4, publicación de TEST_READY.md y hardening adversarial Tier 5 | E2E, M4 | Survey (Explorer 3) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Núcleo de Persistencia y Estado | `mobilityRepository.js`, `MobilityContext.jsx`, sanitización y batching seguro | none | DONE |
| M2 | Lógica de Negocio y Gráficos | `MobilityStats.jsx`, `MobilityTrendChart.jsx`, `MobilityWeeklyBreakdown.jsx`, `MobilityWidget.jsx` | M1 | DONE |
| M3 | Formularios, CSV y UX/UI Premium | `MobilityForm.jsx`, `MobilityExpenses.jsx`, `MobilityExpensesList.jsx`, `MobilityImport.jsx`, `MobilityDashboard.jsx`, `MobilitySettings.jsx`, `MobilityHistory.jsx` | M1, M2 | DONE |
| E2E | Suite de Pruebas E2E (Tiers 1-4) | Arnés de pruebas automatizadas, casos de prueba y publicación de `TEST_READY.md` | none (paralelo) | DONE |
| M4 | Integración Final y Hardening | Aprobación del 100% de tests E2E y hardening adversarial (Tier 5) | M1, M2, M3, E2E | DONE |

## Interface Contracts
### `mobilityRepository.js` ↔ `MobilityContext.jsx`
- `deleteAllSessions(userId)`: Consulta y elimina en chunks de máximo 400 por `writeBatch`. [IMPLEMENTADO & VERIFICADO]
- `importSessions(userId, rows)`: Valida filas mediante `sanitizeMobilitySession` y persiste en lotes (`writeBatch`) de 200 documentos. [IMPLEMENTADO & VERIFICADO]
- `sanitizeMobilitySession(data)`: Limpia strings, convierte números con `parseAmount`, elimina `undefined` y previene `NaN`/`Infinity`. [IMPLEMENTADO & VERIFICADO]
- `sanitizeMobilityExpense(data)`: Sanitiza fecha, categoría, monto y notas. [IMPLEMENTADO & VERIFICADO]
- `getLocalDateString(d, timeZone)`: Retorna formato `YYYY-MM-DD` en hora local argentina (`America/Argentina/Buenos_Aires`). [IMPLEMENTADO & VERIFICADO]

### `MobilityContext.jsx` ↔ Componentes de UI
- `useMobilityState()`: `{ sessions, expenses, loading, settings }`.
- `useMobilityDispatch()`: Funciones con referencias estables inmutables ante cambios en jornadas o gastos. [IMPLEMENTADO & VERIFICADO]

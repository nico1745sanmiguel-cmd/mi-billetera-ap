# Original User Request

## Initial Request — 2026-09-10T11:54:44Z

This is a single self-contained fix; keep it small and focused. Auditoría, corrección de bugs y optimización UX/UI de la sección "Mis Tarjetas" en Mi Billetera.

Working directory: z:\Mi billetera
Integrity mode: development

## Requirements

### R1. Auditoría QA y Corrección por Dev Senior
El equipo (QA Experto + Dev Senior de 10+ años de experiencia) debe realizar ciclos de revisión y corrección en la sección "Mis Tarjetas", detectando fallos lógicos, errores de estado y casos de borde en los flujos de agregar, editar, eliminar y visualizar tarjetas.

### R2. Seguridad Práctica para App Personal
Revisar el almacenamiento local/remoto de datos de tarjetas y sanitizar inputs para evitar exposición innecesaria de información o corrupción de estado en la base de datos personal.

### R3. Refinamiento UX/UI Premium
Optimizar visual y funcionalmente la sección "Mis Tarjetas" garantizando estados de carga (spinners/skeletons), manejo claro de errores y un diseño responsivo alineado con los estándares UX de la app.

## Acceptance Criteria

### Funcionalidad y Estabilidad
- [ ] Flujos de creación, modificación, eliminación y listado de tarjetas libres de bugs.
- [ ] Control de errores y estados de carga bien integrados.

### Seguridad
- [ ] Sin logs expuestos ni sanitización faltante en formulario de tarjetas.

### UX/UI
- [ ] Interfaz pulida, moderna y responsivo con feedback inmediato al usuario.

## Follow-up — 2026-09-10T13:00:00Z

Revisión, auditoría y optimización integral del módulo de Movilidad (`src/Components/Mobility` y `src/context/MobilityContext.jsx`) de la aplicación personal "mi-billetera-ap".

Working directory: z:\Mi billetera
Integrity mode: development

Requested team: Un desarrollador Senior con 10 años de experiencia y un QA experto trabajando en conjunto. El QA prueba y busca debilidades, y el Dev Senior las corrige de manera profesional.

## Requirements

### R1. Auditoría de Código y Corrección de Bugs (QA + Dev)
El equipo de QA identificará fallos de flujo, estados inconsistentes, errores de renderizado o excepciones no capturadas en la sección de Movilidad. El Dev Senior corregirá cada hallazgo manteniendo la solidez del código.

### R2. Optimización UX/UI y Rendimiento
Refinar la experiencia de usuario y la interfaz visual del módulo de Movilidad acorde a estándares premium (re-renders innecesarios, responsividad, animaciones y fluidez de interacción).

### R3. Seguridad Sanitaria para App Personal
Revisar posibles vulnerabilidades o baches groseros de seguridad (manejo de datos sensibles en almacenamiento local, sanitización básica de entradas, fugas de memoria o validaciones de importación de datos).

## Acceptance Criteria

### Funcionalidad y Estabilidad
- [ ] Cero excepciones no capturadas o errores en consola durante el flujo completo de movilidad (agregar, editar, historial, importación, estadísticas).
- [ ] Validación correcta de formularios e importación de datos.

### Calidad de Código y UX
- [ ] Interfaz limpia, fluida y con UX/UI cuidada sin baches estéticos ni retardos de respuesta.
- [ ] Compilación y build limpios sin errores de bundling.

## Follow-up — 2026-09-10T18:00:00Z

Un desarrollador Senior (10+ años de experiencia) y un QA Experto trabajan en conjunto auditando, detectando debilidades/bugs y optimizando la sección de Grupo Familiar y Reparto de Gastos de la app personal "Mi Billetera". El QA reporta fallas y casos borde, mientras el Dev los soluciona manteniendo altos estándares de calidad y UX/UI.

Working directory: c:\Users\Nico\.gemini\antigravity\scratch\mi-billetera-ap
Integrity mode: development

## Requirements

### R1. Auditoría QA y Corrección de Bugs en Reparto de Gastos
- Revisar y probar exhaustivamente los componentes RepartoPanel.jsx, SharedExpensesDashboard.jsx, HouseholdManager.jsx y widgets/contextos relacionados (SalaryContext.jsx, salaryUtils.js).
- Corregir cualquier error en cálculos de distribución de gastos (equitativa o proporcional por salarios), actualización de saldos, división de servicios o deudas entre miembros de la familia.

### R2. Seguridad Práctica y Resiliencia en App Personal
- Asegurar validaciones rigurosas en la entrada de datos: prevenir cantidades negativas no deseadas, entradas vacías, NaN, división por cero al calcular proporciones salariales, y estados inconsistentes si un miembro o gasto se borra.
- Garantizar que la app maneje errores de forma elegante sin romper la interfaz (crashes de React).

### R3. Optimización de UX/UI y Claridad de Balances
- Mejorar la legibilidad de la interfaz: visualización clara de quién le debe a quién, totales compartidos, filtros por miembro o fecha y feedback visual inmediato tras cada cambio.
- Mantener una experiencia de usuario fluida, limpia y con un acabado visual premium acorde al resto de la aplicación.

## Verification Plan

### Automated Verification
- Ejecutar npm run build para asegurar que el empaquetado del proyecto no contenga errores de sintaxis o compilación TypeScript/JSX.
- Ejecutar npm run lint para garantizar limpieza de código y ausencia de variables no utilizadas o reglas violadas.

### Manual & QA Inspection
- Simulación por parte del QA de casos límite: salarios en cero, 0 miembros en el grupo, montos decimales complejos, eliminación de miembros con gastos pendientes y cambio rápido de pestañas/filtros.

## Acceptance Criteria

### Estabilidad y Corrección Funcional
- [ ] No hay errores en consola ni cierres inesperados (React crash) durante el flujo de creación, edición y cálculo de reparto de gastos.
- [ ] Los cálculos de balance entre integrantes ("quién debe a quién" y saldos netos) concuerdan exactamente con las operaciones matemáticas esperadas.

### Robustez y Manejo de Bordes
- [ ] La interfaz bloquea o maneja limpiamente valores inválidos (como salarios nulos/cero en repartos proporcionales o montos vacíos).
- [ ] Si un miembro o servicio se modifica o elimina, la vista de reparto actualiza adecuadamente los saldos sin dejar referencias huérfanas.

### Calidad de Código y UX
- [ ] El proyecto compila limpiamente mediante npm run build.
- [ ] La UI de la sección de Grupo Familiar y Reparto presenta un diseño limpio, intuitivo y sin inconsistencias visuales.

## Follow-up — 2026-09-10T23:18:40Z

Requested team: Equipo de 3 especialistas:
- 🕵️♂️ AGENTE QA: usar modelo flash (Auditor de Seguridad)
- 🛠️ AGENTE DEV: usar modelo pro (Desarrollador Firebase)
- 🔍 AGENTE REVIEWER: usar modelo pro (Verificador Final)

Auditoría integral de seguridad y blindaje de reglas de Firebase en "Mi Billetera" (React + Vite + Firebase), garantizando estricto aislamiento de datos entre usuarios y verificación de fugas de credenciales.

Working directory: c:\Users\Nico\.gemini\antigravity\scratch\mi-billetera-ap
Integrity mode: development

## Requirements

### R1. Auditoría de Seguridad e Informe de Vulnerabilidades (QA - Flash)
- Analizar `firestore.rules`, `firebase.json` y `functions/index.js`.
- Identificar colecciones o rutas donde los datos de un usuario puedan ser leídos, modificados o eliminados por otro, o donde no se exija autenticación (`request.auth != null`).
- Verificar que en el código cliente y archivos de configuración no existan llaves privadas de servicio ni secretos sensibles expuestos.
- Generar un informe estructurado de vulnerabilidades con impacto y ubicación exacta, sin modificar código fuente.

### R2. Corrección y Blindaje de Reglas (DEV - Pro)
- Implementar las correcciones necesarias en `firestore.rules` y `functions/`.
- Garantizar que cada regla exija autenticación obligatoria y restrinja el acceso exclusivamente al propietario del recurso (`request.auth.uid == userId` o validación correspondiente según la estructura del documento).
- Notificar al Agente Reviewer con el detalle de los cambios aplicados.

### R3. Validación y Aprobación Final (REVIEWER - Pro)
- Revisar exhaustivamente las reglas y funciones corregidas.
- Validar que el endurecimiento de la seguridad no rompa el flujo legítimo de lectura y escritura del usuario sobre sus propios datos en la aplicación cliente.
- Emitir la aprobación final técnica o requerir ajustes específicos.

## Acceptance Criteria

### Aislamiento de Datos y Autenticación
- [ ] Ninguna colección ni documento de usuario puede ser leído o modificado sin sesión activa (`request.auth != null`).
- [ ] Cada usuario puede acceder única y exclusivamente a sus propios registros (`request.auth.uid == userId`).
- [ ] No existen reglas permisivas globales (como `allow read, write: if true;` o lectura pública no intencionada).

### Seguridad de Credenciales y Backend
- [ ] No hay llaves privadas de Service Account ni variables de entorno sensibles commiteadas o expuestas al bundle de frontend.
- [ ] Las Cloud Functions en `functions/index.js` validan contexto de autenticación en llamadas invocables (Callable / HTTP).

### Continuidad Operativa
- [ ] La estructura de reglas respeta las consultas reales que hace la aplicación React para no bloquear la UX del usuario.

## Follow-up — 2026-09-10T23:59:44Z

# Teamwork Project Prompt

Requested team: Equipo de 3 especialistas (QA Inspector [flash], DEV Frontend/CSS [flash], REVIEWER Diseñador Líder [inherit])

Auditar y refinar el Sistema de Diseño y los componentes UX/UI base de "Mi Billetera" (React, Vite, Tailwind CSS), garantizando una experiencia financiera sobria, moderna y premium con plena responsividad móvil (sin desbordes ni touch targets diminutos) y coherencia de estados interactivos y de carga.

Working directory: z:\Mi billetera
Integrity mode: development

## Requested Team & Workflow

1. 🕵️♂️ AGENTE QA — UX Inspector (flash):
   - Audita estilos globales (index.css, tailwind.config.js), botones, modales, inputs y tarjetas (`src/Components/UI/*` y componentes comunes).
   - Revisa responsividad en pantallas chicas (celular): desbordes horizontales, touch targets menores a 44x44px, textos con contraste insuficiente o ilegibles.
   - Detecta incoherencias de paleta, falta de contraste o estados de carga (spinners / skeletons) ausentes o toscos.
   - Emite un reporte técnico detallado al Dev. NO modifica código directamente.

2. 🛠️ AGENTE DEV — Frontend & CSS Specialist (flash):
   - Toma el reporte del QA y ajusta los componentes base de UI y la configuración de estilos.
   - Asegura una estética financiera "Premium": sobria, moderna, sin bordes toscos, espaciados consistentes, feedback háptico/visual en hover/active/focus.
   - Mantiene la compatibilidad y no rompe lógica funcional ni imports.

3. 🔍 AGENTE REVIEWER — Diseñador Líder (inherit):
   - Audita el diff y los cambios introducidos por el Dev.
   - Valida que la estructura visual no se haya roto y que se cumpla la estética premium solicitada.
   - Da el veredicto final.

## Requirements

### R1. Auditoría exhaustiva de componentes base y estilos globales
Inspeccionar `tailwind.config.js`, `index.css` y los componentes en `src/Components/UI/` (botones, tarjetas GlassCard, modales ConfirmDialog, estados de carga Skeleton/LoadingState, Inputs). Identificar desalineaciones de color, falta de variantes consistentes, contrastes pobres y áreas no responsivas.

### R2. Refactorización y estandarización UI/UX base
Implementar mejoras en los componentes base para garantizar touch targets mínimos de 44px en móviles, variantes claras (primary, secondary, danger, ghost), estados focus/active visibles y elegantes, skeletons pulidos y una paleta financiera oscura/clara sin elementos estridentes ni placeholders genéricos.

### R3. Preservación funcional y verificación de compilación
Garantizar que no existan errores de sintaxis, variables de Tailwind rotas ni imports quebrados en Vite. El proyecto debe compilar limpiamente (`npm run build`).

## Acceptance Criteria

### UX & Responsividad Móvil
- [ ] Todos los botones e inputs interactivos en pantallas móviles tienen un área de toque accesible (mínimo 44x44px o padding suficiente).
- [ ] No existen desbordes horizontales (`overflow-x` no deseado) causados por componentes base o modales en anchos de pantalla reducidos (360px - 414px).
- [ ] Los estados de carga (skeletons / spinners) existen y están armonizados con la paleta de la aplicación.

### Estética Financiera Premium
- [ ] Jerarquía tipográfica definida y sobria, con contrastes de texto que cumplan legibilidad sin saturación innecesaria.
- [ ] Modales y diálogos de confirmación estilizados con efectos modernos (glassmorphism sutil, bordes suaves, backdrop blur coherente).

### Estabilidad del Código
- [ ] El comando de compilación del proyecto se ejecuta exitosamente sin errores de Tailwind o JSX.
- [ ] Los componentes existentes que consumen `Components/UI` mantienen su contrato de props y funcionamiento.

## Follow-up — 2026-09-11T01:58:01Z

# Teamwork Project Prompt — Draft

> Goal: Poner a punto el módulo Freshmarket en Mi Billetera con validaciones, UX de carga, listas vacías y robustez en CRUD.
> Requested team: 🕵️♂️ AGENTE QA (flash), 🛠️ AGENTE DEV (pro), 🔍 AGENTE REVIEWER (inherit)

Poner a punto y robustecer el módulo Freshmarket de "Mi Billetera", auditando y corrigiendo validaciones en formularios, estados de carga/esqueletos, estados vacíos y manejo de montos/fechas.

Working directory: z:\Mi billetera
Integrity mode: development

## Requirements

### R1. Auditoría y Robustez de Flujos de Negocio (QA)
Auditar el flujo completo de Freshmarket (`FreshShop.jsx`, `PlannerSection.jsx`, `TripCard.jsx`):
- Creación, edición, eliminación y filtrado de gastos/ítems por fecha y categoría.
- Detección de casos borde: montos negativos, montos en cero o no numéricos, campos de nombre/nota vacíos, fechas inválidas o fuera de rango, y errores al sincronizar con Firestore.
- Verificación de estados vacíos ("Sin movimientos aún" o feedback visual correspondiente) y estados de carga (`loading`, skeletons/spinners).

### R2. Correcciones de Desarrollo y Experiencia de Usuario (DEV)
- Validaciones consistentes antes de enviar o persistir datos en `freshRepository`.
- Mensajes de error claros, comprensibles y accionables para el usuario (toasts/alertas contextuales).
- Skeletons o spinners en cargas asíncronas para evitar saltos visuales o pantallas congeladas.
- Prevención de montos negativos sin control y protección contra entradas malformadas.

### R3. Control de Calidad y No Regresión (REVIEWER)
- Verificación cruzada de cada fallo reportado por QA contra las correcciones implementadas por DEV.
- Asegurar que no se introduzcan regresiones de estado, bugs de renderizado ni degradación en la estética Glassmorphic/UI existente.

## Acceptance Criteria

### Formularios y Validaciones
- [ ] No es posible ingresar ni guardar montos negativos, nulos o cadenas no numéricas en creación ni en edición rápida de total (`TripCard`).
- [ ] La fecha de ítems y compras no permite valores vacíos ni formatos inválidos.
- [ ] Los nombres de nuevas categorías o notas de gastos no se pueden guardar en blanco o con solo espacios.

### Feedback Visual y UX
- [ ] Se muestran estados de carga (skeletons/spinners) mientras `freshItems` o las categorías están cargando.
- [ ] Cuando una categoría no tiene movimientos, se muestra un estado vacío amigable e instructivo ("Sin movimientos aún" o similar con icono).
- [ ] Los mensajes de error al usuario son claros, pedagógicos y sin tecnicismos crudos.

### Integridad y Rendimiento
- [ ] Cero regresiones en el cálculo de totales por categoría y presupuesto mensual.
- [ ] Sincronización limpia con Firestore sin llamadas redundantes o errores en consola.

## 2026-09-11T15:12:27Z

# Teamwork Project Prompt

> Requested team: 🕵️♂️ AGENTE QA (flash), 🛠️ AGENTE DEV (pro), 🔍 AGENTE REVIEWER (inherit)

Poner a punto de forma robusta y con UX premium el flujo de Purchase (gastos/compras) en "Mi Billetera", incluyendo validaciones estrictas, manejo de errores, estados de carga y gestión de transacciones.

Working directory: z:\Mi billetera

## Requirements

### R1. Robustez en Carga y Validación de Compras (NewPurchase)
- Validación de montos (impedir negativos, ceros, valores no numéricos).
- Manejo de errores en UI (reemplazar alert() nativo por toasts/mensajes en pantalla integrados con el diseño Glassmorphism).
- Skeletons y estados de carga claros mientras se guardan o leen datos.
- Preselección y validación de tarjeta cuando el tipo de gasto es "Crédito".

### R2. Flujo Completo de Transacciones (CRUD & Filtros)
- Identificar y cubrir las operaciones de creación, edición, borrado y filtrado de transacciones (por fecha y categoría).
- Soporte en CardsContext para actualización y eliminación segura de movimientos.
- Estados vacíos informativos ("Sin movimientos aún") amigables para el usuario.

### R3. Flujo Multi-Agente Secuencial
- **Agente QA (Flash)**: Auditoría exhaustiva de casos borde (negativos, vacíos, fechas inválidas, filtros rotos). Entrega informe sin modificar código.
- **Agente Dev (Pro)**: Implementación de validaciones, mensajes de error UX y estados de carga.
- **Agente Reviewer (Inherit)**: Verificación contra el reporte de QA, asegurando cero regresiones.

## Acceptance Criteria

### Validaciones y UX
- [ ] No es posible ingresar montos negativos, vacíos o inválidos en NewPurchase.
- [ ] No existen alert() nativos; todos los avisos se muestran mediante toasts o mensajes inline con diseño consistente.
- [ ] Las operaciones asíncronas muestran feedback visual inmediato (spinners/skeletons).

### Integridad de Datos
- [ ] Las transacciones se guardan saneadas en Firestore/Context sin campos corruptos.
- [ ] Los estados vacíos están presentes y estilizados cuando no hay registros.

## 2026-09-15T11:46:28Z

Auditoría integral y optimización de rendimiento en la aplicación web "Mi Billetera" (React 18, Vite, Firebase, Tailwind, Framer Motion), ejecutada por un equipo de agentes especializados para maximizar la velocidad de carga inicial, eliminar re-renders innecesarios, reducir lecturas de base de datos y garantizar transiciones fluidas a 60 FPS sin alterar la funcionalidad existente.

Requested team: Equipo de 5 agentes especializados: Bundle Analyzer, React Profiler, Firebase Optimizer, Animation Auditor, PWA & Network Auditor.

Working directory: z:\Mi billetera
Integrity mode: development

## Requirements

### R1. División de Código y Optimización del Bundle Inicial
- Reducir drásticamente el tamaño del chunk JavaScript inicial (`index.html` / bundle principal) separando rutas y componentes pesados mediante carga diferida (`React.lazy` / `Suspense`).
- Configurar la segmentación manual de chunks (`manualChunks`) en Vite para aislar librerías de gran escala (`recharts`, `framer-motion`, `pdfjs-dist`).
- Garantizar importaciones modulares y granulares del SDK de Firebase para evitar la inclusión de módulos innecesarios en producción.
- Restricción estricta: No añadir dependencias externas nuevas a `package.json`; optimizar usando exclusivamente los paquetes ya instalados.

### R2. Diagnóstico y Optimización del Ciclo de Renderizado React
- Auditar y desacoplar componentes sobrecargados (especialmente `App.jsx`), dividiendo estados locales y lógica de negocio.
- Auditar los Context Providers en `src/context/` para aislar valores que cambian frecuentemente de aquellos estáticos, previniendo re-renders en cascada en componentes consumidores.
- Aplicar técnicas de memorización (`useMemo`, `useCallback`, `React.memo`) donde se identifiquen recreaciones de funciones y cálculos costosos redundantes.

### R3. Optimización de Consultas y Conectividad Firebase Firestore
- Auditar todos los puntos de acceso a Firestore en `src/services/`, `src/repositories/` y `src/hooks/`.
- Garantizar que todos los listeners en tiempo real (`onSnapshot`) tengan un mecanismo de desuscripción limpio en el desmontaje de componentes para evitar memory leaks.
- Habilitar y verificar la persistencia de datos offline (IndexedDB cache) para reducir llamadas de red repetidas.
- Eliminar lecturas redundantes o duplicadas en las cargas iniciales y navegación.

### R4. Fluidez de Interfaz, Animaciones y Listados
- Sustituir animaciones y transiciones que provoquen reflujo de diseño (layout thrashing) por propiedades aceleradas por hardware (`transform`, `opacity`).
- Reducir el impacto computacional de `AnimatePresence` en montajes y desmontajes recurrentes.
- Optimizar la renderización de listas extensas (transacciones, balances) para evitar sobrecarga del DOM sin degradar la experiencia visual.

### R5. Rendimiento de Red, PWA y Políticas de Caché
- Configurar estrategias de almacenamiento en caché en tiempo de ejecución (runtime caching de Workbox) mediante `vite-plugin-pwa`.
- Eliminar recursos que bloqueen el primer renderizado en `index.html`.
- Configurar cabeceras de caché estático y compresión en `vercel.json`.

## Acceptance Criteria

### Integridad de Compilación
- [ ] El comando `npm run build` se ejecuta exitosamente sin errores de TypeScript, sintaxis o empaquetado tras cada intervención.
- [ ] No se modifican ni agregan dependencias en `package.json`.

### Verificación de Rendimiento
- [ ] El chunk principal generado en `dist/` reduce su peso relativo respecto a la versión previa, evidenciado en el output de Vite.
- [ ] Todos los listeners `onSnapshot` devuelven una función de cleanup que se ejecuta al desmontar.
- [ ] No existen accesos repetidos innecesarios a las mismas colecciones de Firestore durante una misma sesión o ciclo de render.

### Documentación de Cambios
- [ ] Cada agente documenta en un informe final estructurado: archivo afectado, línea de código exacta, diagnóstico del problema previo y solución implementada.

## 2026-09-15T22:00:36Z

Implementar la Fase 1 de mejoras críticas de UX/UI para "Mi Billetera" (React 18, Vite, Tailwind CSS, PWA), enfocada en seguridad contra pérdida de datos, ergonomía de áreas seguras en celulares y corrección de formularios.

Working directory: c:\Users\Nico\.gemini\antigravity\scratch\mi-billetera-ap
Integrity mode: development

## Requirements

### R1. Safe Areas y Ergonomía PWA en Pantallas con Notch / Barra de Gestos
- Configurar el meta-tag de viewport en `index.html` con `viewport-fit=cover`.
- Incorporar variables seguras de CSS (`env(safe-area-inset-top)` y `env(safe-area-inset-bottom)`) en la cabecera móvil (`MobileHeader.jsx`) y en elementos anclados al fondo (como `SupermarketAddInput.jsx`), evitando solapamientos con la barra de estado y la barra de navegación gestual del sistema operativo.

### R2. Desacoplamiento y Unicidad de Campos en Formularios
- Eliminar los identificadores duplicados `id="input-field"` en todos los formularios de la app (especialmente `Login.jsx`, `NewPurchase.jsx` y `ServiceModal.jsx`).
- Asegurar que cada `<label htmlFor="...">` esté correctamente enlazado a su `<input id="...">` único (o migrar a `useId` / componente `Input.jsx`), permitiendo que el foco táctil y los gestores de contraseñas funcionen sin desvíos erráticos.

### R3. Confirmación Obligatoria y Prevención de Doble Clic en Acciones Destructivas
- Proteger contra borrados accidentales directos integrando `ConfirmDialog` antes de eliminar:
  - Fuentes de ingreso en `SalarySourcesEditor.jsx`.
  - Carteras en `CarterasPanel.jsx`.
  - Notas en `NotesDashboard.jsx`.
- En todos los diálogos de confirmación (`ConfirmDialog`), pasar y respetar `isLoading` para desactivar el botón y mostrar feedback visual mientras la operación asíncrona se procesa, previniendo dobles clics y peticiones duplicadas.
- Reemplazar cualquier llamada residual a `window.confirm()` y `alert()` del navegador por `ConfirmDialog` o avisos integrados.

## Acceptance Criteria

### Ergonomía y Visualización Móvil
- [ ] La cabecera superior y los inputs inferiores respetan los márgenes seguros del dispositivo sin solaparse con la barra de batería/reloj ni la línea de gestos del sistema.
- [ ] La interfaz se adapta limpiamente sin saltos visuales ni scroll horizontal no deseado.

### Accesibilidad de Formularios
- [ ] En `Login.jsx`, hacer tap en "Contraseña" enfoca el campo de contraseña y no el de email.
- [ ] No existen IDs repetidos en los componentes auditados.

### Seguridad y Resiliencia en Borrados
- [ ] Ninguna acción destructiva en salarios, carteras o notas borra datos sin que el usuario confirme explícitamente en un modal UI.
- [ ] Durante el proceso de borrado, el botón queda deshabilitado (`disabled`) y en estado de carga impidiendo toques repetidos.
- [ ] No existen llamadas a `window.confirm()` ni `alert()` nativos en los flujos modificados.
- [ ] El proyecto compila limpiamente (`npm run build`).

## 2026-09-16T10:28:27Z

This is a single self-contained fix; keep it small and focused.
Implementar la Fase 2 de mejoras críticas de UX/UI para "Mi Billetera" (React 18, Vite, Tailwind CSS, PWA), enfocada en Navegación fluida (reparación de rutas rotas y retroceso contextual), Accesibilidad Táctil (touch targets mínimo 44x44px) y Contraste Visual legible (cumplimiento WCAG AA).

Working directory: c:\Users\Nico\.gemini\antigravity\scratch\mi-billetera-ap
Integrity mode: development

## Requirements

### R1. Reparación de Enlaces y Navegación Contextual
- En `SuperTile.jsx`, corregir la navegación de `navigate('/supermarket')` a `navigate('/super')`.
- En pantallas con botón "Volver" (`onBack`), como `ModuleDetailSettings.jsx`, permitir retroceso contextual con `navigate(-1)` o vuelta al módulo de origen en lugar de expulsar rígidamente al usuario a `/dashboard` o romper el historial de navegación.

### R2. Touch Targets Mínimos de 44x44px (Ergonomía Táctil)
- Asegurar que todos los elementos interactivos cumplan el estándar de accesibilidad de al menos 44px de área de toque mediante padding o contenedores táctiles invisibles (`min-h-[44px] min-w-[44px]` o `p-2.5`/`p-3`):
  - Switches y toggles en `HouseholdManager.jsx`, `ModulesSettings.jsx`, `PlannerSettings.jsx`, `MobilitySettings.jsx`, `NewPurchase.jsx` y `StopLossModal.jsx`.
  - Botones de acción, iconos y tachos de basura en `ServicesList.jsx`, `NotesDashboard.jsx`, `OperationsTab.jsx`, `SharedExpensesDashboard.jsx`, `TradeForm.jsx` y `MobilitySettings.jsx`.
  - Selectores de color en `CardDetail.jsx` y `EnvelopeEditor.jsx`.
  - Pestañas secundarias en `ServicesManager.jsx` y selector ARS/USD en `SavingsDashboard.jsx`.

### R3. Contraste Visual Legible (Estándar WCAG AA 4.5:1)
- Corregir textos con bajo contraste sobre fondos claros:
  - Reemplazar `text-gray-400` y `text-gray-300` sobre fondos blancos por `text-gray-600` o `text-gray-500` en subtítulos, metadata y montos en `NewPurchase.jsx`, `CardsList.jsx`, `PlannerSection.jsx`, `CardDetail.jsx` y `FinancialTarget.jsx`.
  - Reemplazar `text-amber-500` sobre fondo blanco por `text-amber-600` o `text-amber-700` en `SavingsGoalView.jsx` y `CardsList.jsx`.
- En modo oscuro / glass, elevar la opacidad de textos secundarios (`text-white/30` o `text-white/40` a `text-white/70` o `text-white/60`) en `WidgetSystem.jsx`, `AgendaWidget.jsx`, `SalaryWidget.jsx` y `ThemeSelector.jsx`.

## Acceptance Criteria

### Navegación
- [ ] Hacer clic en el widget de supermercado (`SuperTile.jsx`) abre correctamente la vista `/super` sin redirecciones al Dashboard.
- [ ] El botón volver en `ModuleDetailSettings.jsx` y vistas secundarias retorna limpiamente a la pantalla anterior sin atrapar al usuario.

### Touch Targets
- [ ] Todos los botones de acción, switches y selectores auditados tienen un área de pulsación de al menos 44x44px sin alterar la estética visual de los componentes pequeños.

### Contraste
- [ ] No existen textos de contenido ni montos con ratio inferior a 4.5:1 en modo claro ni en modo oscuro.

### Verificación Técnica
- [ ] `npm run build` compila con éxito (Exit Code 0).
- [ ] Tests automatizados validan que la ruta `/super` es invocada y que los touch targets cumplen la cota mínima.

## 2026-09-16T11:51:28Z

This is a single self-contained fix; keep it small and focused.
Implementar la Fase 3 de mejoras críticas de UX/UI para "Mi Billetera" (React 18, Vite, Tailwind CSS, PWA), enfocada en Feedback visual claro, Skeletons de carga consistentes (eliminación de parpadeos de 'vacío') y Validación visual accesible de formularios y errores.

Working directory: c:\Users\Nico\.gemini\antigravity\scratch\mi-billetera-ap
Integrity mode: development

## Requirements

### R1. Skeletons de Carga y Eliminación de Falsos 'Empty States'
- En `NotesDashboard.jsx` y `ServicesList.jsx`, incorporar un indicador explícito de carga (`loading`) para que durante la conexión a la base de datos se muestre un esqueleto visual pulsante (`Skeleton.jsx`) en lugar de mostrar prematuramente "No se encontraron notas" o "Nada pendiente".
- En `PortfolioTab.jsx`, mostrar feedback de carga inicial mientras se resuelven las operaciones de inversión antes de desplegar el mensaje de lista vacía.
- En `SuperList.jsx`, unificar los divs de carga hardcodeados para reutilizar el componente base `Skeleton.jsx`.
- En `ReconciliationDesk.jsx`, proporcionar un empty state claro con feedback si `parsedItems.length === 0` en el paso de revisión.

### R2. Soporte Completo de Notificaciones Toast (Variante 'warning' y Accesibilidad)
- En `Toast.jsx`, implementar la variante `'warning'` con paleta ámbar/amarilla e ícono de advertencia (`AlertTriangle`), asegurando que las llamadas existentes en `TripCard.jsx`, `PlannerSection.jsx` y `NotesSettings.jsx` ya no se muestren erróneamente de color verde de éxito.
- Para mensajes de tipo `'error'`, configurar accesibilidad auditiva con `role="alert"` y `aria-live="assertive"`.

### R3. Validación Visual de Formularios y Manejo de Excepciones
- En `ServicesManager.jsx`, reemplazar el `return;` silencioso ante campos vacíos por marcado visual de error (borde rojo) y toast informativo indicando qué campo falta.
- En `StatsDetails.jsx`, agregar notificación toast ante fallos en los bloques `catch` de edición y borrado de movimientos para que el usuario reciba feedback si la operación falla, en lugar de quedar en silencio.
- En `NewPurchase.jsx` y `OperationModal.jsx`, resaltar visualmente los campos obligatorios incompletos cuando se intenta enviar el formulario.

## Acceptance Criteria

### Skeletons y Estados de Carga
- [ ] En la carga inicial de Notas, Servicios y Portafolio, se renderizan Skeletons y no se muestra el mensaje de lista vacía durante el tiempo de espera de red.
- [ ] `SuperList.jsx` utiliza el componente atómico `Skeleton.jsx`.

### Notificaciones Toast
- [ ] Invocaciones con tipo `'warning'` muestran estilos ámbar e ícono de advertencia, nunca el tilde verde de éxito.
- [ ] Errores en Toasts tienen atributos accesibles `role="alert"` y `aria-live="assertive"`.

### Formularios y Errores
- [ ] Intentar guardar un servicio sin monto o nombre en `ServicesManager.jsx` produce feedback visual inmediato y advertencia al usuario.
- [ ] Los errores en `StatsDetails.jsx` notifican al usuario con un Toast de error.
- [ ] Formularios con campos faltantes destacan visualmente el error.

### Verificación Técnica
- [ ] `npm run build` compila limpiamente (Exit Code 0).
- [ ] Tests automatizados validan la presencia de la variante warning, el uso de Skeletons y el feedback en formularios.

## 2026-09-16T16:22:43Z

This is a single self-contained fix; keep it small and focused.
Implementar la Fase 4 de mejoras de UX/UI para "Mi Billetera" (React 18, Vite, Tailwind CSS, PWA), enfocada en Ergonomía Móvil (Bottom Navigation Bar persistente), Resiliencia (Error Boundaries a nivel de módulo), Accesibilidad (Modo Privacidad con aria-hidden y screen-reader tags) y Consistencia de Navegación en Desktop (Navbar completa con módulos activos).

Working directory: c:\Users\Nico\.gemini\antigravity\scratch\mi-billetera-ap
Integrity mode: development

## Requirements

### R1. Bottom Navigation Bar Móvil (Ergonomía de Pulgar)
- Crear un componente `BottomNav.jsx` persistente para pantallas móviles (`md:hidden`), posicionado en la parte inferior respetando el área segura (`env(safe-area-inset-bottom)`).
- Debe ofrecer accesos directos principales con touch targets >= 44x44px e iconos intuitivos (ej. Inicio/Dashboard, Nueva Compra, Servicios, Ahorro/Inversiones, Menú de Módulos).
- Indicar visualmente la pestaña activa según `location.pathname` y permitir navegación rápida sin obligar al usuario a volver al Dashboard.
- Asegurar que el contenido de la pantalla tenga padding inferior compensatorio en móvil para no quedar oculto detrás de la barra.

### R2. Error Boundaries Granulares por Módulo
- Extender el uso del componente `ErrorBoundary.jsx` existente envolviendo cada ruta o módulo principal en `App.jsx` de forma individual (en lugar de tener únicamente un boundary global que tire abajo toda la app si falla un módulo).
- El fallback visual del ErrorBoundary modular debe mantener el header/navegación y ofrecer un botón accesible "Reintentar" o "Volver al Dashboard" con touch target >= 44px.

### R3. Accesibilidad Semántica en Modo Privacidad
- En los lugares donde `privacyMode` oculta montos (reemplazando por '****' o '••••'), envolver el texto oculto con atributos accesibles: `aria-hidden="true"` en los asteriscos y añadir un `span` con clase `sr-only` que indique "Monto oculto por privacidad" para que los lectores de pantalla anuncien el contexto y no deletreen asteriscos.

### R4. Navbar Desktop Completa y Contextual
- En `src/Components/Layout/Navbar.jsx`, actualizar la lista de enlaces para incluir los módulos activados que estaban omitidos (Servicios, Supermercado, Sueldos, Gastos Compartidos) según el resultado de `isModuleEnabled(...)` o agruparlos de forma elegante para evitar sobrecargar el ancho de pantalla.

## Acceptance Criteria

### Bottom Navigation Móvil
- [ ] En pantallas móviles (`< 768px`) se visualiza una barra de navegación inferior fija con soporte de safe area (`pb-[env(safe-area-inset-bottom)]`).
- [ ] Los botones tienen touch target >= 44x44px y cambian de estilo cuando su ruta está activa.
- [ ] La barra no tapa contenido inferior (se añade padding o margen compensatorio en el layout).

### Error Boundaries Modulares
- [ ] Las rutas secundarias y módulos en `App.jsx` están protegidos por `ErrorBoundary`. Si una vista falla, el resto de la aplicación y la navegación continúan operativas.
- [ ] El componente de error modular provee un botón de recuperación accesible.

### Modo Privacidad Accesible
- [ ] Los montos ocultos usan `aria-hidden="true"` y texto accesible para lectores de pantalla.

### Navbar Desktop
- [ ] Los módulos activos están accesibles desde desktop sin quedar truncados ni desbordar la barra.

### Verificación Técnica
- [ ] `npm run build` compila con éxito (Exit Code 0).
- [ ] Test automatizado valida la presencia de `BottomNav`, la cobertura de `ErrorBoundary` en rutas clave y las etiquetas accesibles de privacidad.


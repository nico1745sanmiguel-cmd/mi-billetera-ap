import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('\n=== SUITE 1: R1 SKELETONS DE CARGA Y ELIMINACIÓN DE FALSOS EMPTY STATES ===');

const rootDir = process.cwd();
const read = (relPath) => fs.readFileSync(path.join(rootDir, relPath), 'utf8');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
    totalTests++;
    try {
        fn();
        console.log(`  [PASS] ${name}`);
        passedTests++;
    } catch (err) {
        console.error(`  [FAIL] ${name}: ${err.message}`);
        throw err;
    }
}

// 1. NotesDashboard.jsx & notesRepository.js
runTest('NotesDashboard: Skeleton import, loading state, loadingUser guard, and error handling', () => {
    const code = read('src/Components/Notes/NotesDashboard.jsx');
    assert.ok(code.includes("import Skeleton from '../UI/Skeleton'"), 'Debe importar Skeleton');
    assert.ok(code.includes('const [loading, setLoading] = useState(true)'), 'Debe tener estado loading');
    assert.ok(code.includes('loading ? ('), 'Debe renderizar condicionalmente según loading');
    assert.ok(code.includes('[1, 2, 3, 4, 5, 6].map') || code.includes('Array.from({ length: 6 })'), 'Debe renderizar skeletons de notas mientras carga');
    assert.ok(code.includes('loading ?') && code.includes('filteredNotes.length === 0'), 'Empty state debe estar dentro de rama no-loading');
    assert.ok(code.includes('loadingUser'), 'Debe esperar loadingUser de useAuth para evitar parpadeo de vacío');
    assert.ok(code.includes('Error cargando notas') || code.includes('Error al cargar las notas'), 'Debe manejar error de carga con toast');

    const repoCode = read('src/repositories/notesRepository.js');
    assert.ok(repoCode.includes('subscribeToNotes = (uid, callback, onError)'), 'subscribeToNotes debe soportar callback onError');
});

// 2. ServicesList.jsx & ServicesContext.jsx
runTest('ServicesList & ServicesContext: loading prop, Skeleton placeholders, and loadingUser guard', () => {
    const code = read('src/Components/Services/ServicesList.jsx');
    assert.ok(code.includes("import Skeleton from '../UI/Skeleton'"), 'Debe importar Skeleton');
    assert.ok(code.includes('loading = false'), 'Debe aceptar prop loading con default false');
    assert.ok(code.includes('if (loading)'), 'Debe chequear if (loading) antes del empty state');
    assert.ok(code.includes('allItems.length === 0'), 'Empty state solo se evalúa tras descartar loading');

    const ctxCode = read('src/context/ServicesContext.jsx');
    assert.ok(ctxCode.includes('loading,'), 'ServicesContext debe exponer loading');
    assert.ok(ctxCode.includes('loadingUser'), 'ServicesContext debe considerar loadingUser para evitar falso vacío');
    assert.ok(ctxCode.includes('[uid, householdId, loadingUser]'), 'ServicesContext debe incluir loadingUser en las dependencias de useEffect');

    const mgrCode = read('src/Components/Services/ServicesManager.jsx');
    assert.ok(mgrCode.includes('loading: loadingServices'), 'ServicesManager debe obtener loading de useServices');
    assert.ok(mgrCode.includes('loading={loadingServices}'), 'ServicesManager debe pasar loading a ServicesList');
});

// 3. PortfolioTab.jsx & useSavingsData.js
runTest('PortfolioTab & SavingsContext: initial loading state with Skeletons and loadingUser guard', () => {
    const hookCode = read('src/savings/hooks/useSavingsData.js');
    assert.ok(hookCode.includes('const [loading, setLoading] = useState('), 'useSavingsData debe tener loading');
    assert.ok(hookCode.includes('loading,'), 'useSavingsData debe retornar loading');
    assert.ok(hookCode.includes('loadingUser'), 'useSavingsData debe contemplar loadingUser para no resetear loading a false');
    assert.ok(hookCode.includes('[uid, householdId, loadingUser]'), 'useSavingsData debe incluir loadingUser en las dependencias de useEffect');

    const tabCode = read('src/savings/components/portfolio/PortfolioTab.jsx');
    assert.ok(tabCode.includes("import Skeleton from '../../../Components/UI/Skeleton'"), 'PortfolioTab debe importar Skeleton');
    assert.ok(tabCode.includes('loading'), 'PortfolioTab debe desestructurar loading de useSavings');
    assert.ok(tabCode.includes('if (loading)'), 'PortfolioTab debe mostrar Skeletons antes del empty state');
});

// 4. SuperList.jsx
runTest('SuperList: unified Skeleton placeholders replacing raw divs', () => {
    const code = read('src/Components/Supermarket/SuperList.jsx');
    assert.ok(code.includes("import Skeleton from '../UI/Skeleton'"), 'SuperList debe importar Skeleton');
    assert.ok(code.includes('<Skeleton type="rectangular" className="h-24 !rounded-3xl" />'), 'Debe usar componente Skeleton');
});

// 5. ReconciliationDesk.jsx
runTest('ReconciliationDesk: empty state for parsedItems.length === 0 with 44px touch targets and labels', () => {
    const code = read('src/Components/Reconciliation/ReconciliationDesk.jsx');
    assert.ok(code.includes('FileSearch'), 'Debe importar ícono FileSearch');
    assert.ok(code.includes('parsedItems.length === 0'), 'Debe contemplar parsedItems.length === 0');
    assert.ok(code.includes('No se detectaron movimientos'), 'Debe mostrar mensaje claro de vacío');
    assert.ok(code.includes('Volver a intentar'), 'Debe ofrecer botón de acción para reintentar');
    assert.ok(code.includes('min-h-[44px]') && code.includes('Volver al ingreso de comprobante'), 'Botones deben cumplir touch targets de 44px y etiquetas accesibles');
    assert.ok(!code.includes('aria-label="Acción"'), 'ReconciliationDesk no debe tener aria-label genérico');
    assert.ok(code.includes("value={item.newAliasName || ''}"), 'Input de alias debe estar controlado con value');
    assert.ok(code.includes("value={item.suggestedCategory || ''}"), 'Selector de categoría debe estar controlado con value');
});

console.log('\n=== SUITE 2: R2 TOAST NOTIFICATIONS & ACCESSIBILITY ===');

// 6. Toast.jsx
runTest('Toast: warning variant with amber palette, AlertTriangle icon, aria-atomic, and 44px touch target', () => {
    const code = read('src/Components/UI/Toast.jsx');
    assert.ok(code.includes('AlertTriangle'), 'Debe importar AlertTriangle');
    assert.ok(code.includes('warning:') || code.includes("type === 'warning'"), 'Debe contemplar tipo warning');
    assert.ok(code.includes('amber-400') || code.includes('amber-500'), 'Debe usar paleta ámbar para warning');
    assert.ok(code.includes('role={isError ? "alert" : "status"}'), 'Debe asignar role="alert" en errores');
    assert.ok(code.includes('aria-live={isError ? "assertive" : "polite"}'), 'Debe asignar aria-live="assertive" en errores');
    assert.ok(code.includes('aria-atomic="true"'), 'Debe incluir aria-atomic="true" para lectura íntegra');
    assert.ok(code.includes('min-h-[44px] min-w-[44px]'), 'Botón de cierre debe cumplir tamaño táctil accesible de 44px');
});

console.log('\n=== SUITE 3: R3 VISUAL FORM VALIDATION & ERROR FEEDBACK ===');

// 7. ServicesManager.jsx & ServiceModal.jsx
runTest('ServicesManager: validation blocking save with warning toast and errors state', () => {
    const code = read('src/Components/Services/ServicesManager.jsx');
    assert.ok(code.includes('const [errors, setErrors] = useState({})'), 'Debe tener estado errors');
    assert.ok(code.includes('newErrors.name'), 'Debe validar campo name');
    assert.ok(code.includes('newErrors.amount'), 'Debe validar campo amount');
    assert.ok(code.includes("showToast(firstMessage, 'warning')") || (code.includes('showToast(') && code.includes('warning')), 'Debe alertar con toast de tipo warning');
    assert.ok(code.includes('errors={errors}'), 'Debe pasar errors a ServiceModal');
    assert.ok(code.includes('Debes iniciar sesión para realizar esta acción'), 'Debe emitir feedback si el usuario no está autenticado');
});

runTest('ServiceModal: visual red borders and error helper text', () => {
    const code = read('src/Components/Services/ServiceModal.jsx');
    assert.ok(code.includes('errors = {}'), 'Debe recibir prop errors');
    assert.ok(code.includes('errors.name'), 'Debe aplicar validación visual a name');
    assert.ok(code.includes('errors.amount'), 'Debe aplicar validación visual a amount');
    assert.ok(code.includes('border-red-500'), 'Debe estilizar inputs con border-red-500');
    assert.ok(!code.includes('aria-label="Acción"'), 'ServiceModal no debe tener botones con aria-label genérico');
    assert.ok(code.includes('aria-label="Cerrar modal de servicio"'), 'Botón cerrar debe tener etiqueta accesible');
});

// 8. StatsDetails.jsx
runTest('StatsDetails: error notifications in catch blocks', () => {
    const code = read('src/Components/Dashboard/StatsDetails.jsx');
    assert.ok(code.includes('showToast?.("Error al actualizar el movimiento", "error")'), 'Catch de edición debe emitir toast error');
    assert.ok(code.includes('showToast?.("Error al eliminar el movimiento", "error")'), 'Catch de eliminación debe emitir toast error');
});

// 9. NewPurchase.jsx
runTest('NewPurchase: visual error highlighting on incomplete submission and accessible card labels', () => {
    const code = read('src/Components/Purchase/NewPurchase.jsx');
    assert.ok(code.includes('const [submitAttempted, setSubmitAttempted] = useState(false)'), 'Debe trackear submitAttempted');
    assert.ok(code.includes('amountHasError'), 'Debe computar flag de error de monto');
    assert.ok(code.includes('creditCardHasError'), 'Debe computar flag de error de tarjeta');
    assert.ok(code.includes('border-red-500'), 'Debe aplicar bordes rojos en monto y selector de tarjeta');
    assert.ok(!code.includes('disabled={isSubmitDisabled}'), 'Botón no debe ser deshabilitado silenciosamente');
    assert.ok(code.includes('Seleccionar tarjeta ${card.name}'), 'Selector de tarjeta debe identificar la tarjeta');
    assert.ok(code.includes('if (submitAttempted) setSubmitAttempted(false)'), 'Debe limpiar submitAttempted al interactuar o alternar medio de pago');
});

// 10. Savings Operations: OperationModal, TradeForm, CaucionForm, CouponForm
runTest('OperationModal: comprehensive validation and error propagation', () => {
    const code = read('src/savings/components/operations/OperationModal.jsx');
    assert.ok(code.includes('const [errors, setErrors] = useState({})'), 'Debe tener estado errors');
    assert.ok(code.includes('newErrors.cartera'), 'Debe validar cartera');
    assert.ok(code.includes('showToast(Object.values(newErrors)[0], "warning")'), 'Debe alertar con toast de tipo warning');
    assert.ok(code.includes('errors={errors} setErrors={setErrors}'), 'Debe propagar errors a subformularios');
});

runTest('TradeForm: visual error styling, error clearing, and accessible custom cancel buttons', () => {
    const code = read('src/savings/components/operations/TradeForm.jsx');
    assert.ok(code.includes('errors = {}'), 'Debe recibir prop errors');
    assert.ok(code.includes('border-red-500'), 'Debe usar clase border-red-500');
    assert.ok(code.includes('errors?.fecha'), 'Debe validar fecha');
    assert.ok(code.includes('errors?.cartera'), 'Debe validar cartera');
    assert.ok(code.includes('errors?.especie'), 'Debe validar especie');
    assert.ok(code.includes('errors?.cantidad'), 'Debe validar cantidad');
    assert.ok(code.includes('errors?.precioUnitario'), 'Debe validar precioUnitario');
    assert.ok(code.includes("clearError('cartera')"), 'Debe limpiar error de cartera al cancelar personalizada');
    assert.ok(code.includes("clearError('especie')"), 'Debe limpiar error de especie al cancelar personalizada');
    assert.ok(code.includes('aria-label="Moneda del precio"'), 'Selector de moneda debe tener aria-label');
    assert.ok(code.includes('min-h-[44px] min-w-[44px]'), 'Botones de cancelación deben ser 44px');
});

runTest('CaucionForm: visual error styling, error clearing, and accessible custom cancel buttons', () => {
    const code = read('src/savings/components/operations/CaucionForm.jsx');
    assert.ok(code.includes('errors = {}'), 'Debe recibir prop errors');
    assert.ok(code.includes('border-red-500'), 'Debe usar clase border-red-500');
    assert.ok(code.includes('errors?.cartera'), 'Debe validar cartera');
    assert.ok(code.includes('errors?.montoARS'), 'Debe validar montoARS');
    assert.ok(code.includes('errors?.tna'), 'Debe validar tna');
    assert.ok(code.includes('errors?.plazo'), 'Debe validar plazo');
    assert.ok(code.includes("clearError('cartera')"), 'Debe limpiar error de cartera al cancelar personalizada');
    assert.ok(code.includes('aria-label="Cancelar cartera personalizada"'), 'Debe tener aria-label en cancelar cartera');
    assert.ok(code.includes('min-h-[44px] min-w-[44px]'), 'Botón cancelar deben ser 44px');
});

runTest('CouponForm: visual error styling, error clearing, and accessible custom cancel buttons', () => {
    const code = read('src/savings/components/operations/CouponForm.jsx');
    assert.ok(code.includes('errors = {}'), 'Debe recibir prop errors');
    assert.ok(code.includes('border-red-500'), 'Debe usar clase border-red-500');
    assert.ok(code.includes('errors?.fecha'), 'Debe validar fecha');
    assert.ok(code.includes('errors?.cartera'), 'Debe validar cartera');
    assert.ok(code.includes('errors?.especie'), 'Debe validar especie');
    assert.ok(code.includes('errors?.montoTotal'), 'Debe validar montoTotal');
    assert.ok(code.includes("clearError('cartera')"), 'Debe limpiar error de cartera al cancelar personalizada');
    assert.ok(code.includes("clearError('especie')"), 'Debe limpiar error de especie al cancelar personalizada');
    assert.ok(code.includes('aria-label="Cancelar cartera personalizada"'), 'Debe tener aria-label en cancelar cartera');
    assert.ok(code.includes('aria-label="Cancelar activo personalizado"'), 'Debe tener aria-label en cancelar especie');
    assert.ok(code.includes('aria-label="Moneda del cobro"'), 'Debe tener aria-label en selector de moneda');
    assert.ok(code.includes('min-h-[44px] min-w-[44px]'), 'Botones cancelar deben ser 44px');
});

console.log('\n========================================');
console.log(`Phase 3 Test Results: ${passedTests} passed, 0 failed, ${totalTests} total.`);
console.log('========================================\n');

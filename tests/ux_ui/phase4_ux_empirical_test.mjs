// Empirical Test Suite for Phase 4: BottomNav, Modular Error Boundaries, Semantic Privacy, and Desktop Navbar
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import React from 'react';

const rootDir = process.cwd();
const read = (relPath) => fs.readFileSync(path.join(rootDir, relPath), 'utf8');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  [FAIL] ${name}: ${err.message}`);
  }
}

console.log('=== SUITE 1: R1 BOTTOM NAVIGATION BAR MÓVIL (ERGONOMÍA DE PULGAR) ===');

const bottomNav = read('src/Components/Layout/BottomNav.jsx');
const appJsx = read('src/App.jsx');

runTest('BottomNav.jsx exists, is memoized and imported into App.jsx', () => {
  assert.ok(bottomNav.includes('export default memo(BottomNav)'), 'BottomNav must be memoized');
  assert.ok(appJsx.includes("import BottomNav from './Components/Layout/BottomNav'"), 'App.jsx must import BottomNav');
  assert.ok(appJsx.includes('<BottomNav />'), 'App.jsx must render <BottomNav />');
});

runTest('BottomNav is fixed at bottom, hidden on desktop (md:hidden) and respects safe-area-inset-bottom', () => {
  assert.ok(bottomNav.includes('md:hidden'), 'BottomNav must be hidden on desktop (md:hidden)');
  assert.ok(bottomNav.includes('fixed bottom-0'), 'BottomNav must be positioned fixed at bottom');
  assert.ok(bottomNav.includes('env(safe-area-inset-bottom'), 'BottomNav must incorporate safe area padding');
  assert.ok(bottomNav.includes('aria-label="Navegación inferior móvil"'), 'BottomNav nav tag must have accessible aria-label');
});

runTest('BottomNav items have accessible touch targets >= 44x44px and aria-current for active state', () => {
  assert.ok(bottomNav.includes('min-h-[44px] min-w-[44px]'), 'BottomNav buttons must meet >= 44x44px touch targets');
  assert.ok(bottomNav.includes("aria-current={active ? 'page' : undefined}"), 'BottomNav active item must set aria-current="page"');
  assert.ok(bottomNav.includes('/dashboard') && bottomNav.includes('/services_manager') && bottomNav.includes('/purchase') && bottomNav.includes('/savings') && bottomNav.includes('/settings_modules'), 'BottomNav must include key shortcuts');
});

runTest('App.jsx layout provides compensatory bottom padding in mobile to avoid bottom nav clipping', () => {
  assert.ok(appJsx.includes('pb-24') || appJsx.includes('pb-[calc('), 'App.jsx <main> must have compensatory bottom padding for mobile layout');
  assert.ok(appJsx.includes('md:pb-10') || appJsx.includes('md:pb-0'), 'App.jsx <main> should reduce bottom padding on desktop');
});

console.log('\n=== SUITE 2: R2 ERROR BOUNDARIES GRANULARES POR MÓDULO ===');

const errorBoundary = read('src/Components/UI/ErrorBoundary.jsx');

runTest('ErrorBoundary.jsx supports modular fallback mode preserving outer layout', () => {
  assert.ok(errorBoundary.includes('fullPage = false'), 'ErrorBoundary must default to modular mode (fullPage = false)');
  assert.ok(errorBoundary.includes('moduleName'), 'ErrorBoundary must accept moduleName prop');
  assert.ok(errorBoundary.includes('role="alert"') && errorBoundary.includes('aria-live="assertive"'), 'Modular fallback must be accessible with role="alert" and aria-live="assertive"');
});

runTest('ErrorBoundary.jsx provides accessible recovery buttons with min-h-[44px]', () => {
  assert.ok(errorBoundary.includes('handleReset'), 'ErrorBoundary must have reset handler');
  assert.ok(errorBoundary.includes('handleGoHome'), 'ErrorBoundary must have home navigation handler');
  assert.ok(errorBoundary.includes('Reintentar'), 'Fallback must offer Reintentar button');
  assert.ok(errorBoundary.includes('Volver al Dashboard'), 'Fallback must offer Volver al Dashboard button');
  assert.ok(errorBoundary.includes('min-h-[44px]'), 'Recovery buttons must have minimum 44px touch target');
});

runTest('App.jsx wraps main and secondary routes in individual ErrorBoundary components', () => {
  const expectedModules = [
    'Dashboard',
    'Servicios',
    'Conciliación',
    'Hogar',
    'Estadísticas',
    'Nueva Compra',
    'Supermercado',
    'Frescos',
    'Gastos Compartidos',
    'Escáner',
    'Ahorros',
    'Tarjetas',
    'Movilidad',
    'Sueldos',
    'Módulos',
    'Detalle de Módulo',
    'Notas',
  ];

  expectedModules.forEach(mod => {
    assert.ok(
      appJsx.includes(`<ErrorBoundary moduleName="${mod}">`),
      `App.jsx must wrap ${mod} in an individual ErrorBoundary`
    );
  });
});

console.log('\n=== SUITE 3: R3 ACCESIBILIDAD SEMÁNTICA EN MODO PRIVACIDAD ===');

const privateMask = read('src/Components/UI/PrivateMask.jsx');
const utilsJs = read('src/utils.js');

runTest('PrivateMask.jsx and utils.js export accessible privacy mask components with aria-hidden and sr-only', () => {
  assert.ok(privateMask.includes('aria-hidden="true"'), 'PrivateMask must hide asterisks with aria-hidden="true"');
  assert.ok(privateMask.includes('sr-only'), 'PrivateMask must include sr-only element for screen readers');
  assert.ok(privateMask.includes('Monto oculto por privacidad'), 'PrivateMask default text must indicate hidden amount');
  assert.ok(utilsJs.includes('renderHiddenAmount'), 'utils.js must export renderHiddenAmount');
  assert.ok(utilsJs.includes('aria-hidden') && utilsJs.includes('sr-only'), 'utils.js renderHiddenAmount must use aria-hidden and sr-only');
});

runTest('Cards components use accessible privacy masking', () => {
  const cardsList = read('src/Components/Cards/CardsList.jsx');
  const cardVisual = read('src/Components/Cards/CardVisual.jsx');
  const cardsWidget = read('src/Components/Dashboard/Widgets/CardsWidget.jsx');

  assert.ok(cardsList.includes('renderHiddenAmount'), 'CardsList must use renderHiddenAmount');
  assert.ok(cardVisual.includes('renderHiddenAmount'), 'CardVisual must use renderHiddenAmount');
  assert.ok(cardsWidget.includes('renderHiddenAmount'), 'CardsWidget must use renderHiddenAmount');
});

runTest('Services and Shared Expenses components use accessible privacy masking', () => {
  const servicesMgr = read('src/Components/Services/ServicesManager.jsx');
  const sharedExp = read('src/Components/Shared/SharedExpensesDashboard.jsx');
  const splitWidget = read('src/Components/Dashboard/Widgets/SplitSummaryWidget.jsx');
  const agendaWidget = read('src/Components/Dashboard/Widgets/AgendaWidget.jsx');

  assert.ok(servicesMgr.includes('renderHiddenAmount'), 'ServicesManager must use renderHiddenAmount');
  assert.ok(sharedExp.includes('renderHiddenAmount'), 'SharedExpensesDashboard must use renderHiddenAmount');
  assert.ok(splitWidget.includes('renderHiddenAmount'), 'SplitSummaryWidget must use renderHiddenAmount');
  assert.ok(agendaWidget.includes('renderHiddenAmount'), 'AgendaWidget must use renderHiddenAmount');
});

runTest('Salary and Stats components use accessible privacy masking', () => {
  const salaryDash = read('src/Components/Salary/SalaryDashboard.jsx');
  const stats = read('src/Components/Dashboard/Stats.jsx');
  const superWidget = read('src/Components/Dashboard/Widgets/SuperActionsWidget.jsx');

  assert.ok(salaryDash.includes('renderHiddenAmount'), 'SalaryDashboard must use renderHiddenAmount');
  assert.ok(stats.includes('renderHiddenAmount'), 'Stats must use renderHiddenAmount');
  assert.ok(superWidget.includes('renderHiddenAmount'), 'SuperActionsWidget must use renderHiddenAmount');
});

runTest('Savings and Portfolio components use accessible privacy masking', () => {
  const savingsWidget = read('src/Components/Dashboard/Widgets/SavingsWidget.jsx');
  const savingsDash = read('src/Components/Savings/SavingsDashboard.jsx');
  const savingsGoal = read('src/Components/Savings/SavingsGoal.jsx');
  const savingsGoalView = read('src/Components/Savings/SavingsGoalView.jsx');
  const operationsTab = read('src/Components/Savings/Tabs/OperationsTab.jsx');
  const portfolioTab = read('src/savings/components/portfolio/PortfolioTab.jsx');
  const tenenciasLista = read('src/savings/components/portfolio/TenenciasLista.jsx');
  const caucionesActivas = read('src/savings/components/portfolio/CaucionesActivas.jsx');
  const resumenPortfolio = read('src/savings/components/portfolio/ResumenPortfolio.jsx');

  assert.ok(savingsWidget.includes('renderHiddenAmount'), 'SavingsWidget must use renderHiddenAmount');
  assert.ok(savingsDash.includes('renderHiddenAmount'), 'SavingsDashboard must use renderHiddenAmount');
  assert.ok(savingsGoal.includes('renderHiddenAmount'), 'SavingsGoal must use renderHiddenAmount');
  assert.ok(savingsGoalView.includes('PrivateMask'), 'SavingsGoalView must use PrivateMask');
  assert.ok(operationsTab.includes('renderHiddenAmount'), 'OperationsTab must use renderHiddenAmount');
  assert.ok(portfolioTab.includes('renderHiddenAmount'), 'PortfolioTab must use renderHiddenAmount');
  assert.ok(tenenciasLista.includes('renderHiddenAmount'), 'TenenciasLista must use renderHiddenAmount');
  assert.ok(caucionesActivas.includes('renderHiddenAmount'), 'CaucionesActivas must use renderHiddenAmount');
  assert.ok(resumenPortfolio.includes('renderHiddenAmount'), 'ResumenPortfolio must use renderHiddenAmount');
});

console.log('\n=== SUITE 4: R4 NAVBAR DESKTOP COMPLETA Y CONTEXTUAL ===');

const navbar = read('src/Components/Layout/Navbar.jsx');

runTest('Navbar.jsx dynamically evaluates active modules using isModuleEnabled', () => {
  assert.ok(navbar.includes("isModuleEnabled('cards')"), "Navbar must check cardsEnabled");
  assert.ok(navbar.includes("isModuleEnabled('savings')"), "Navbar must check savingsEnabled");
  assert.ok(navbar.includes("isModuleEnabled('agenda')"), "Navbar must check servicesEnabled");
  assert.ok(navbar.includes("isModuleEnabled('supermarket')"), "Navbar must check superEnabled");
  assert.ok(navbar.includes("isModuleEnabled('salary')"), "Navbar must check salaryEnabled");
  assert.ok(navbar.includes("isModuleEnabled('household')"), "Navbar must check sharedEnabled");
  assert.ok(navbar.includes("isModuleEnabled('mobility')"), "Navbar must check mobilityEnabled");
});

runTest('Navbar.jsx groups overflow modules into accessible "Más" dropdown', () => {
  assert.ok(navbar.includes('aria-haspopup="true"'), 'Dropdown button must specify aria-haspopup');
  assert.ok(navbar.includes('aria-expanded={isDropdownOpen}'), 'Dropdown button must reflect aria-expanded');
  assert.ok(navbar.includes('role="menu"'), 'Dropdown menu container must have role="menu"');
  assert.ok(navbar.includes('role="menuitem"'), 'Dropdown items must have role="menuitem"');
  assert.ok(navbar.includes('min-h-[44px]'), 'Navbar interactive items must have min-h-[44px]');
  assert.ok(navbar.includes("e.key === 'Escape'"), 'Dropdown must close on Escape key');
});

console.log('\n=== SUITE 5: RUNTIME SEMANTIC & ACCESSIBILITY OBJECT STRUCTURE ===');

runTest('renderHiddenAmount in utils.js returns valid React Element with aria-hidden and sr-only children', async () => {
  const { renderHiddenAmount } = await import('../../src/utils.js');
  const element = renderHiddenAmount('••••', 'Monto oculto por privacidad');

  assert.ok(React.isValidElement(element), 'renderHiddenAmount must return a valid React element');
  assert.strictEqual(element.type, 'span', 'Outer element must be a span');
  assert.ok(element.props.className.includes('inline-flex'), 'Outer element should have inline-flex');

  const children = React.Children.toArray(element.props.children);
  assert.strictEqual(children.length, 2, 'Must have 2 children (aria-hidden and sr-only)');

  const [hiddenMask, srOnly] = children;
  assert.strictEqual(hiddenMask.props['aria-hidden'], 'true', 'Visual mask must have aria-hidden="true"');
  assert.strictEqual(hiddenMask.props.children, '••••', 'Visual mask text must match placeholder');

  assert.ok(srOnly.props.className.includes('sr-only'), 'Screen-reader text must have sr-only class');
  assert.strictEqual(srOnly.props.children, 'Monto oculto por privacidad', 'Screen-reader text must match descriptive text');
});

console.log('\n========================================');
console.log(`Phase 4 Test Results: ${passedTests} passed, ${failedTests} failed, ${totalTests} total.`);
console.log('========================================\n');

if (failedTests > 0) {
  process.exit(1);
}

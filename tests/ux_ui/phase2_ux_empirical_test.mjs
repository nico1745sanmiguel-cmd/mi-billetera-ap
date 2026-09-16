// Empirical Test Suite for Phase 2: Navigation, Touch Targets (44x44px), and Visual Contrast
import fs from 'fs';
import path from 'path';
import assert from 'assert';

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

console.log('=== SUITE 1: R1 NAVIGATION & CONTEXTUAL BACK ===');

const superTile = fs.readFileSync('src/Components/Dashboard/Skins/WindowsPhone/tiles/SuperTile.jsx', 'utf8');
const moduleDetailSettings = fs.readFileSync('src/Components/Settings/ModuleDetailSettings.jsx', 'utf8');
const appJsx = fs.readFileSync('src/App.jsx', 'utf8');

runTest('SuperTile navigates to /super and not /supermarket', () => {
  assert(superTile.includes("navigate('/super')"), "SuperTile should navigate to '/super'");
  assert(!superTile.includes("navigate('/supermarket')"), "SuperTile should not navigate to '/supermarket'");
});

runTest('ModuleDetailSettings implements contextual back with history fallback and 44x44px back button', () => {
  assert(moduleDetailSettings.includes('window.history.state') && moduleDetailSettings.includes('navigate(-1)'), 'Missing history state check or navigate(-1) in ModuleDetailSettings');
  assert(moduleDetailSettings.includes("navigate('/settings_modules')"), 'Missing fallback to /settings_modules');
  assert(moduleDetailSettings.includes('min-h-[44px] min-w-[44px]'), 'Back button must be at least 44x44px');
  assert(moduleDetailSettings.includes('onBack={handleBack}'), 'Sub-settings should receive handleBack');
});

runTest('App.jsx secondary routes use contextual onBack with navigate(-1)', () => {
  assert(appJsx.includes('ModuleDetailSettings onBack=') && appJsx.includes('navigate(-1)'), 'App.jsx must pass contextual navigate(-1) to ModuleDetailSettings');
  assert(appJsx.includes('ModulesSettings onBack=') && appJsx.includes('navigate(-1)'), 'App.jsx must pass contextual navigate(-1) to ModulesSettings');
  assert(appJsx.includes('NotesDashboard onBack=') && appJsx.includes('navigate(-1)'), 'App.jsx must pass contextual navigate(-1) to NotesDashboard');
});

console.log('\n=== SUITE 2: R2 TOUCH TARGETS (MIN 44x44px) ===');

const householdMgr = fs.readFileSync('src/Components/Household/HouseholdManager.jsx', 'utf8');
const modulesSettings = fs.readFileSync('src/Components/Settings/ModulesSettings.jsx', 'utf8');
const plannerSettings = fs.readFileSync('src/Components/Settings/PlannerSettings.jsx', 'utf8');
const mobilitySettings = fs.readFileSync('src/Components/Mobility/MobilitySettings.jsx', 'utf8');
const newPurchase = fs.readFileSync('src/Components/Purchase/NewPurchase.jsx', 'utf8');
const stopLossModal = fs.readFileSync('src/Components/Savings/StopLossModal.jsx', 'utf8');
const servicesList = fs.readFileSync('src/Components/Services/ServicesList.jsx', 'utf8');
const notesDashboard = fs.readFileSync('src/Components/Notes/NotesDashboard.jsx', 'utf8');
const operationsTab = fs.readFileSync('src/Components/Savings/Tabs/OperationsTab.jsx', 'utf8');
const sharedExp = fs.readFileSync('src/Components/Shared/SharedExpensesDashboard.jsx', 'utf8');
const tradeForm = fs.readFileSync('src/savings/components/operations/TradeForm.jsx', 'utf8');
const cardDetail = fs.readFileSync('src/Components/Cards/CardDetail.jsx', 'utf8');
const envelopeEditor = fs.readFileSync('src/Components/Salary/EnvelopeEditor.jsx', 'utf8');
const servicesManager = fs.readFileSync('src/Components/Services/ServicesManager.jsx', 'utf8');
const savingsDashboard = fs.readFileSync('src/Components/Savings/SavingsDashboard.jsx', 'utf8');

runTest('HouseholdManager: back button and switches have min 44x44px target', () => {
  assert(householdMgr.includes('min-h-[44px] min-w-[44px]'), 'Back button must be min 44x44px');
  assert(householdMgr.includes('min-h-[44px] min-w-[48px]'), 'Switch label container must be min 44x48px');
});

runTest('ModulesSettings: back button, switch containers and settings buttons have min 44x44px', () => {
  assert(modulesSettings.includes('min-h-[44px] min-w-[44px]'), 'Buttons must be min 44x44px');
  assert(modulesSettings.includes('min-h-[44px] min-w-[48px]'), 'Switch container must be min 44x48px');
});

runTest('PlannerSettings: buttons and hideCompleted switch have min-h-[44px]', () => {
  assert(plannerSettings.includes('min-h-[44px] min-w-[48px]'), 'Switch container must be min 44x48px');
  assert(plannerSettings.includes('min-h-[44px]'), 'Buttons must be min-h-[44px]');
});

runTest('MobilitySettings: category buttons and switches meet 44px touch targets', () => {
  assert(mobilitySettings.includes('min-h-[44px] min-w-[44px]'), 'Buttons must be min 44x44px');
});

runTest('NewPurchase: Hoy/Ayer buttons and share switch meet 44px touch targets', () => {
  assert(newPurchase.includes('min-h-[44px]'), 'Hoy/Ayer buttons must have min-h-[44px]');
  assert(newPurchase.includes('min-h-[44px] min-w-[48px]'), 'Share switch must have min-h-[44px] min-w-[48px]');
});

runTest('StopLossModal: close button, alarm switch and trash button meet 44x44px', () => {
  assert(stopLossModal.includes('min-h-[44px] min-w-[44px] p-2.5'), 'Close button must be min 44x44px');
  assert(stopLossModal.includes('min-h-[44px] min-w-[48px]'), 'Alarm switch must be min 44x48px');
  assert(stopLossModal.includes('min-h-[44px] min-w-[44px] p-3'), 'Trash button must be min 44x44px');
});

runTest('ServicesList: edit button and paid toggle meet 44x44px touch targets', () => {
  assert(servicesList.includes('min-h-[44px] min-w-[44px] p-2.5 inline-flex'), 'Edit button must be min 44x44px');
  assert(servicesList.includes('min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer'), 'Paid toggle container must be min 44x44px');
});

runTest('NotesDashboard: category pills, action buttons and checkboxes meet 44x44px', () => {
  assert(notesDashboard.includes('min-h-[44px] px-4 py-2 rounded-full'), 'Category pills must be min-h-[44px]');
  assert(notesDashboard.includes('min-h-[44px] min-w-[44px] p-2 rounded-lg'), 'Pin/Edit/Trash buttons must be min 44x44px');
  assert(notesDashboard.includes('min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0'), 'Checkboxes must have min 44x44px container');
});

runTest('OperationsTab: filter chips and edit/delete buttons meet 44x44px', () => {
  assert(operationsTab.includes('shrink-0 min-h-[44px] px-3.5 py-2'), 'Filter chips must have min-h-[44px]');
  assert(operationsTab.includes('min-h-[44px] min-w-[44px] p-2.5 rounded-full'), 'Action buttons must be min 44x44px');
});

runTest('SharedExpensesDashboard: close, back, splitMode, and copy buttons meet 44x44px', () => {
  assert(sharedExp.includes('min-h-[44px] min-w-[44px] bg-white/20'), 'Close button must be min 44x44px');
  assert(sharedExp.includes('min-h-[44px] min-w-[44px] flex items-center justify-center p-2'), 'Back button must be min 44x44px');
  assert(sharedExp.includes('min-h-[44px] px-3.5 py-2 text-xs font-bold'), 'Split mode buttons must be min-h-[44px]');
  assert(sharedExp.includes('min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold'), 'Copy button must be min-h-[44px]');
});

runTest('TradeForm: date toggle and cancel buttons meet 44x44px', () => {
  assert(tradeForm.includes('min-h-[44px] inline-flex items-center px-2'), 'Date mode button must be min-h-[44px]');
  assert(tradeForm.includes('min-h-[44px] min-w-[44px] px-3 flex items-center'), 'Custom input cancel buttons must be min 44x44px');
});

runTest('CardDetail: color picker buttons meet min 44x44px touch targets', () => {
  assert(cardDetail.includes('min-h-[44px] min-w-[44px] flex items-center justify-center p-1 rounded-full'), 'Color buttons must have min 44x44px container');
});

runTest('EnvelopeEditor: close button, icons, color buttons and save button meet 44x44px', () => {
  assert(envelopeEditor.includes('min-h-[44px] min-w-[44px] flex items-center justify-center p-2'), 'Close button must be min 44x44px');
  assert(envelopeEditor.includes('min-h-[44px] h-11 rounded-xl'), 'Icon buttons must have min-h-[44px]');
  assert(envelopeEditor.includes('min-h-[44px] min-w-[44px] flex items-center justify-center p-1 rounded-full'), 'Color buttons must have min 44x44px container');
  assert(envelopeEditor.includes('min-h-[44px] mt-6 w-full py-3.5'), 'Save button must be min-h-[44px]');
});

runTest('ServicesManager: view mode toggles and nuevo fijo button meet 44px touch target', () => {
  assert(servicesManager.includes('min-h-[44px] px-4 py-2 rounded-lg'), 'Desktop view toggle must have min-h-[44px]');
  assert(servicesManager.includes('flex-1 min-h-[44px] px-4 py-2.5 rounded-lg'), 'Mobile view toggle must have min-h-[44px]');
  assert(servicesManager.includes('min-h-[44px] text-xs px-4 py-2.5 rounded-2xl'), 'Nuevo fijo button must have min-h-[44px]');
});

runTest('SavingsDashboard: settings button, currency button, and tabs meet 44px touch target', () => {
  assert(savingsDashboard.includes('min-h-[44px] min-w-[44px] rounded-2xl'), 'Settings button must be min 44x44px');
  assert(savingsDashboard.includes('min-h-[44px] px-3.5 py-2 rounded-full'), 'Currency toggle must have min-h-[44px]');
  assert(savingsDashboard.includes('min-h-[44px] py-2.5 px-2 rounded-xl'), 'Tabs must have min-h-[44px]');
});

console.log('\n=== SUITE 3: R3 VISUAL CONTRAST (WCAG AA COMPLIANCE) ===');

const cardsList = fs.readFileSync('src/Components/Cards/CardsList.jsx', 'utf8');
const plannerSection = fs.readFileSync('src/Components/Supermarket/PlannerSection.jsx', 'utf8');
const financialTarget = fs.readFileSync('src/Components/Dashboard/FinancialTarget.jsx', 'utf8');
const savingsGoalView = fs.readFileSync('src/Components/Savings/SavingsGoalView.jsx', 'utf8');
const widgetSystem = fs.readFileSync('src/Components/Dashboard/WidgetSystem.jsx', 'utf8');
const agendaWidget = fs.readFileSync('src/Components/Dashboard/Widgets/AgendaWidget.jsx', 'utf8');
const salaryWidget = fs.readFileSync('src/Components/Dashboard/Widgets/SalaryWidget.jsx', 'utf8');
const themeSelector = fs.readFileSync('src/Components/Dashboard/ThemeSelector.jsx', 'utf8');

runTest('CardsList: sub uses text-gray-500 and text-white/60; amber has dark variant', () => {
  assert(cardsList.includes("sub  = isGlass ? 'text-white/60' : 'text-gray-500'"), 'CardsList subtext contrast must be at least 4.5:1');
  assert(cardsList.includes('text-amber-600 dark:text-amber-400'), 'Amber badges must use text-amber-600 dark:text-amber-400');
});

runTest('PlannerSection: budget and empty state texts have elevated contrast', () => {
  assert(plannerSection.includes("isGlass ? 'text-white/60' : 'text-gray-500'"), 'PlannerSection subtext must use text-white/60 and text-gray-500');
  assert(!plannerSection.includes("isGlass ? 'text-white/40' : 'text-gray-400'"), 'PlannerSection must not have low-contrast text-white/40 or text-gray-400');
});

runTest('FinancialTarget: CategoryItem, tabs and breakdown labels have elevated contrast', () => {
  assert(financialTarget.includes('text-[10px] text-gray-600 dark:text-white/60'), 'CategoryItem subtext must use text-gray-600 dark:text-white/60');
  assert(financialTarget.includes('text-gray-500 dark:text-white/60 hover:text-indigo-500'), 'Tab button contrast must be elevated');
  assert(financialTarget.includes('text-gray-500 dark:text-white/60 text-[9px] uppercase'), 'Total/Paid labels must be text-gray-500 dark:text-white/60');
});

runTest('SavingsGoalView: progress percentage and subtext have elevated contrast', () => {
  assert(savingsGoalView.includes('text-amber-600 dark:text-amber-400'), 'Progress percentage must use text-amber-600 dark:text-amber-400');
  assert(savingsGoalView.includes("isGlass ? 'text-white/60' : 'text-gray-500'"), 'Progress labels must use text-white/60 and text-gray-500');
});

runTest('WidgetSystem: SizeMenu and empty state have elevated contrast', () => {
  assert(widgetSystem.includes('text-gray-600 dark:text-white/60 tracking-widest'), 'SizeMenu header must use text-gray-600 dark:text-white/60');
  assert(widgetSystem.includes('text-gray-600 dark:text-white/60'), 'Empty state must use text-gray-600 dark:text-white/60');
});

runTest('AgendaWidget: list, week, and compact views have elevated contrast', () => {
  assert(agendaWidget.includes('text-[10px] text-gray-600 dark:text-white/60 flex items-center gap-1'), 'Empty compact view must use text-gray-600 dark:text-white/60');
  assert(agendaWidget.includes('text-gray-500 dark:text-white/60 hover:text-gray-700 dark:hover:text-white'), 'View switches must use text-gray-500 dark:text-white/60');
  assert(agendaWidget.includes('text-gray-600 dark:text-white/70 cursor-pointer'), 'Ver todo link must use text-gray-600 dark:text-white/70');
});

runTest('SalaryWidget: labels, unconfigured state and assigned percentage have elevated contrast', () => {
  assert(salaryWidget.includes('text-gray-600 dark:text-white/60 tracking-wider'), 'Salary labels must use text-gray-600 dark:text-white/60');
  assert(salaryWidget.includes('text-xs text-gray-600 dark:text-white/60 font-medium'), 'Sin configurar text must use text-gray-600 dark:text-white/60');
  assert(salaryWidget.includes('text-[10px] text-gray-500 dark:text-white/60 mt-1'), 'Assigned percentage must use text-gray-500 dark:text-white/60');
});

runTest('ThemeSelector: inactive buttons have elevated contrast and light icon has dark variant', () => {
  assert(themeSelector.includes("text-white/60 hover:text-white"), 'Inactive glass button must use text-white/60');
  assert(themeSelector.includes("text-gray-600 hover:text-gray-900"), 'Inactive standard button must use text-gray-600');
  assert(themeSelector.includes("text-amber-600 dark:text-amber-400"), 'Sun icon must use text-amber-600 dark:text-amber-400');
});

console.log(`\n========================================`);
console.log(`Test Results: ${passedTests} passed, ${failedTests} failed, ${totalTests} total.`);
console.log(`========================================`);

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

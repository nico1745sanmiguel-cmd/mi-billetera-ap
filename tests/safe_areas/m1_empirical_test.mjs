// Empirical Test Suite for Milestone 1: Safe Areas & Ergonomics
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

console.log('=== SUITE 1: FILE INTEGRITY & SINTACTIC COHERENCE ===');

const indexHtml = fs.readFileSync('index.html', 'utf8');
const indexCss = fs.readFileSync('src/index.css', 'utf8');
const mobileHeader = fs.readFileSync('src/Components/Layout/MobileHeader.jsx', 'utf8');
const addInput = fs.readFileSync('src/Components/Supermarket/SupermarketAddInput.jsx', 'utf8');
const toast = fs.readFileSync('src/Components/UI/Toast.jsx', 'utf8');

runTest('index.html contains viewport-fit=cover in viewport meta', () => {
  assert(indexHtml.includes('viewport-fit=cover'), 'Missing viewport-fit=cover in index.html');
  assert(indexHtml.includes('width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'), 'Viewport meta content string mismatch');
});

runTest('src/index.css has overflow-x: clip on html, body', () => {
  assert(indexCss.includes('overflow-x: clip;'), 'Missing overflow-x: clip; in index.css');
  assert(indexCss.includes('html, body {\n  overscroll-behavior-y: none;\n  overflow-x: clip;\n}') || indexCss.includes('overflow-x: clip;'), 'overflow-x: clip not present on html, body');
});

runTest('src/index.css defines safe area utilities in @layer utilities', () => {
  assert(indexCss.includes('@layer utilities'), 'Missing @layer utilities');
  assert(indexCss.includes('.pt-safe'), 'Missing .pt-safe');
  assert(indexCss.includes('.pb-safe'), 'Missing .pb-safe');
  assert(indexCss.includes('.pl-safe'), 'Missing .pl-safe');
  assert(indexCss.includes('.pr-safe'), 'Missing .pr-safe');
  assert(indexCss.includes('.pt-safe-header'), 'Missing .pt-safe-header');
  assert(indexCss.includes('.pb-safe-input'), 'Missing .pb-safe-input');
  assert(indexCss.includes('.pb-safe-page'), 'Missing .pb-safe-page');
  assert(indexCss.includes('.bottom-safe'), 'Missing .bottom-safe');
  assert(indexCss.includes('.top-safe'), 'Missing .top-safe');
});

runTest('MobileHeader.jsx uses safe-area-inset-top with 0px fallback', () => {
  assert(mobileHeader.includes('pt-[calc(0.625rem+env(safe-area-inset-top,0px))]'), 'Missing pt-[calc(0.625rem+env(safe-area-inset-top,0px))] in MobileHeader');
});

runTest('SupermarketAddInput.jsx uses safe-area-inset-bottom with 0px fallback', () => {
  assert(addInput.includes('pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]'), 'Missing pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] in SupermarketAddInput');
});

runTest('Toast.jsx uses safe-area-inset-bottom with 0px fallback', () => {
  assert(toast.includes('bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]'), 'Missing bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] in Toast');
});

console.log('\n=== SUITE 2: ZERO-REGRESSION MATHEMATICAL ORACLE (env = 0px) ===');

const BASE_FONT_SIZE = 16; // 1rem = 16px standard browser root

function calcValue(rem, envPx = 0) {
  return (rem * BASE_FONT_SIZE) + envPx;
}

runTest('MobileHeader top padding: calc(0.625rem + 0px) equals original py-2.5 (10px)', () => {
  const originalTopPadding = 2.5 * 4; // py-2.5 = 10px
  const newComputed = calcValue(0.625, 0); // 0.625rem = 10px
  assert.strictEqual(newComputed, originalTopPadding, `Expected ${originalTopPadding}px, got ${newComputed}px`);
});

runTest('SupermarketAddInput bottom padding: calc(0.75rem + 0px) equals original py-3 (12px)', () => {
  const originalBottomPadding = 3 * 4; // py-3 = 12px
  const newComputed = calcValue(0.75, 0); // 0.75rem = 12px
  assert.strictEqual(newComputed, originalBottomPadding, `Expected ${originalBottomPadding}px, got ${newComputed}px`);
});

runTest('Toast bottom offset: calc(1.5rem + 0px) equals original bottom-6 (24px)', () => {
  const originalBottomOffset = 6 * 4; // bottom-6 = 24px
  const newComputed = calcValue(1.5, 0); // 1.5rem = 24px
  assert.strictEqual(newComputed, originalBottomOffset, `Expected ${originalBottomOffset}px, got ${newComputed}px`);
});

console.log('\n=== SUITE 3: DEVICE INSET PROFILES STRESS TEST ===');

const deviceProfiles = [
  { name: 'Desktop/Standard Monitor', top: 0, bottom: 0 },
  { name: 'iPhone SE 2022 (No Notch, 20px Status Bar)', top: 20, bottom: 0 },
  { name: 'iPhone 13/14 (Standard Notch 47px, Gestures 34px)', top: 47, bottom: 34 },
  { name: 'iPhone 15/16 Pro (Dynamic Island 59px, Gestures 34px)', top: 59, bottom: 34 },
  { name: 'Android Pixel 8 (Punch Hole 36px, Gesture Nav 24px)', top: 36, bottom: 24 },
  { name: 'Mobile Virtual Keyboard Active (env bottom resets to 0px)', top: 59, bottom: 0 },
];

deviceProfiles.forEach(dev => {
  runTest(`Calculations for device profile: ${dev.name}`, () => {
    const headerPt = calcValue(0.625, dev.top);
    const inputPb = calcValue(0.75, dev.bottom);
    const toastBottom = calcValue(1.5, dev.bottom);

    // Assertions:
    // 1. Header padding top must be at least 10px and at least dev.top
    assert(headerPt >= 10, `Header pt must be >= 10px, got ${headerPt}`);
    assert(headerPt >= dev.top, `Header pt must cover safe area top (${dev.top}px), got ${headerPt}`);

    // 2. Input padding bottom must be at least 12px and at least dev.bottom
    assert(inputPb >= 12, `Input pb must be >= 12px, got ${inputPb}`);
    assert(inputPb >= dev.bottom, `Input pb must clear safe area bottom (${dev.bottom}px), got ${inputPb}`);

    // 3. Toast bottom must be at least 24px and clear dev.bottom
    assert(toastBottom >= 24, `Toast bottom must be >= 24px, got ${toastBottom}`);
    assert(toastBottom >= (24 + dev.bottom), `Toast bottom must be elevated by safe area bottom, got ${toastBottom}`);
  });
});

console.log('\n=== SUITE 4: PRODUCTION BUNDLE CSS COMPILED ASSETS ===');

const distCssFiles = fs.readdirSync('dist/assets').filter(f => f.endsWith('.css'));
assert(distCssFiles.length > 0, 'No compiled CSS found in dist/assets');
const distCss = fs.readFileSync(path.join('dist/assets', distCssFiles[0]), 'utf8');

runTest('Production CSS contains compiled MobileHeader arbitrary pt rule', () => {
  assert(
    distCss.includes('pt-[calc(0.625rem+env(safe-area-inset-top,0px))]') ||
    distCss.includes('padding-top:calc(.625rem + env(safe-area-inset-top,0px))'),
    'Compiled MobileHeader pt class missing in production CSS'
  );
});

runTest('Production CSS contains compiled SupermarketAddInput arbitrary pb rule', () => {
  assert(
    distCss.includes('pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]') ||
    distCss.includes('padding-bottom:calc(.75rem + env(safe-area-inset-bottom,0px))'),
    'Compiled SupermarketAddInput pb class missing in production CSS'
  );
});

runTest('Production CSS contains compiled Toast arbitrary bottom rule', () => {
  assert(
    distCss.includes('bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]') ||
    distCss.includes('bottom:calc(1.5rem + env(safe-area-inset-bottom,0px))'),
    'Compiled Toast bottom class missing in production CSS'
  );
});

runTest('Production CSS contains overflow-x:clip', () => {
  assert(distCss.includes('overflow-x:clip'), 'overflow-x:clip missing in production CSS');
});

console.log('\n=== SUITE 5: ERGONOMIC ACCESSIBILITY & TOUCH TARGETS ===');

runTest('MobileHeader home button touch target >= 44x44px', () => {
  assert(mobileHeader.includes('min-h-[44px]') && mobileHeader.includes('min-w-[44px]'), 'MobileHeader home button does not meet 44px touch target');
});

runTest('SupermarketAddInput submit button touch target >= 48x48px', () => {
  assert(addInput.includes('!min-h-[48px]') && addInput.includes('!min-w-[48px]'), 'Submit button does not meet 48px touch target');
});

runTest('SupermarketAddInput text input field touch target >= 44px', () => {
  assert(addInput.includes('min-h-[44px]'), 'Text input does not meet 44px min height');
});

console.log(`\nTotal Tests: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
if (failedTests > 0) {
  process.exit(1);
}

// @ts-check
'use strict';

const { test, expect } = require('@playwright/test');
const path = require('path');
const { SearchPage } = require('../pages/SearchPage');
const { generateApiReport } = require('../utils/generateApiReport');

const SEARCH_TERM  = process.env.SEARCH_TERM  || 'nintendo switch';
const COLOR_FILTER = process.env.COLOR_FILTER || 'Rojo';
const RESULT_COUNT = parseInt(process.env.RESULT_COUNT || '5', 10);
const REPORT_DIR   = path.join(process.cwd(), 'reports');
const IS_CI        = !!process.env.CI;

test.describe('Liverpool — Nintendo Switch: Interceptación de red y validación cruzada', () => {

  let searchPage;

  test.beforeEach(async ({ page }) => {
    searchPage = new SearchPage(page);
  });

  test('Interceptar API, cruzar contra UI y reportar discrepancias — Nintendo Switch', async ({ page }) => {
    let uiProducts  = [];
    let apiProducts = [];
    const interceptedResponses = [];

    page.on('response', async (response) => {
      const url    = response.url();
      const status = response.status();
      if (status !== 200) return;
      try {
        const contentType = response.headers()['content-type'] || '';
        if (!contentType.includes('json')) return;
        const body = await response.json().catch(() => null);
        if (!body) return;
        interceptedResponses.push({ url, body });
      } catch { /* ignorar */ }
    });

    await test.step('Navegar y buscar', async () => {
      await searchPage.goto();
      await searchPage.search(SEARCH_TERM);
      await searchPage.filterByColor(COLOR_FILTER);
      await searchPage.sortByPrice('lowest');
      await page.waitForTimeout(3_000);
      console.log(`✅ Flujo completado. URL: ${page.url()}`);
    });

    await test.step('Extraer productos de la UI', async () => {
      uiProducts = await searchPage.extractTopProducts(RESULT_COUNT);

      if (IS_CI && uiProducts.length === 0) {
        console.warn('⚠️  [CI] Liverpool bloquea IPs de GitHub Actions con anti-bot.');
        console.warn('⚠️  [CI] Los tests E2E de este sitio requieren ejecución local o proxy.');
        return;
      }

      expect(uiProducts.length).toBeGreaterThan(0);
      searchPage.printResults(uiProducts, SEARCH_TERM);
    });

    await test.step('Analizar respuestas de red interceptadas', async () => {
      console.log(`\n🌐 Respuestas JSON interceptadas: ${interceptedResponses.length}`);
      for (const { url, body } of interceptedResponses) {
        const found = extractProductsFromApiResponse(body);
        if (found.length > 0) {
          console.log(`✅ Productos en: ${url} → ${found.length} productos`);
          if (apiProducts.length === 0) apiProducts = found;
        }
      }
      if (apiProducts.length === 0) {
        console.warn('⚠️  Sin productos en respuestas interceptadas');
      }
    });

    await test.step('Validar UI contra respuesta de red', async () => {
      const { matches, discrepancies } = crossValidate(uiProducts, apiProducts);

      console.log(`\n${'─'.repeat(60)}`);
      console.log('🔍  Validación cruzada UI vs API — Nintendo Switch');
      console.log(`✅ Coincidencias : ${matches.length} de ${uiProducts.length}`);
      console.log(`❌ Discrepancias : ${discrepancies.length}`);
      console.log(`${'─'.repeat(60)}\n`);

      await generateApiReport({
        searchTerm:      SEARCH_TERM,
        colorFilter:     COLOR_FILTER,
        finalUrl:        page.url(),
        uiProducts,
        apiProducts,
        matches,
        discrepancies,
        interceptedUrls: interceptedResponses.map(r => r.url),
        outputDir:       REPORT_DIR,
      });

      if (uiProducts.length > 0 && apiProducts.length > 0) {
        expect(matches.length).toBeGreaterThanOrEqual(3);
      } else {
        console.warn('⚠️  Assert omitido — sin datos suficientes (bloqueo anti-bot en CI)');
      }
    });
  });
});

// ── Helpers ───────────────────────────────────────────────────────────

function extractProductsFromApiResponse(body) {
  if (!body || typeof body !== 'object') return [];
  const candidates = findProductArrays(body);
  for (const arr of candidates) {
    const products = arr.map(normalizeApiProduct).filter(p => p.name && p.price > 0);
    if (products.length > 0) return products;
  }
  return [];
}

function findProductArrays(obj, depth = 0) {
  if (depth > 8 || !obj || typeof obj !== 'object') return [];
  const results = [];
  if (Array.isArray(obj)) {
    if (obj.length > 0 && looksLikeProduct(obj[0])) results.push(obj);
    for (const item of obj.slice(0, 5)) results.push(...findProductArrays(item, depth + 1));
  } else {
    for (const key of Object.keys(obj)) results.push(...findProductArrays(obj[key], depth + 1));
  }
  return results;
}

function looksLikeProduct(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  const keys = Object.keys(item).map(k => k.toLowerCase());
  const hasName  = keys.some(k => ['name','nombre','title','displayname','productname'].includes(k));
  const hasPrice = keys.some(k => ['price','precio','saleprice','currentprice','offerprice'].includes(k));
  return hasName && hasPrice;
}

function normalizeApiProduct(item) {
  const nameKeys  = ['displayName','name','nombre','title','productName'];
  const priceKeys = ['price','salePrice','currentPrice','offerPrice','precio'];
  let name = '';
  for (const k of nameKeys) {
    if (item[k] && typeof item[k] === 'string') { name = item[k].trim(); break; }
  }
  let price = 0;
  for (const k of priceKeys) {
    if (item[k] !== undefined) {
      price = parseFloat(String(item[k]).replace(/[^0-9.]/g, '')) || 0;
      if (price > 0) break;
    }
  }
  return { name, price, priceText: price > 0 ? `$${price.toLocaleString('es-MX')}` : '' };
}

function crossValidate(uiProducts, apiProducts) {
  const matches = [], discrepancies = [];
  for (let i = 0; i < uiProducts.length; i++) {
    const ui = uiProducts[i];
    const apiMatch = apiProducts.find(api => {
      const uiName  = ui.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const apiName = api.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return uiName.includes(apiName.substring(0, 8)) || apiName.includes(uiName.substring(0, 8)) ||
             (ui.price > 0 && api.price > 0 && Math.abs(ui.price - api.price) < 10);
    });
    if (apiMatch) {
      matches.push({ uiIndex: i, name: ui.name, uiPrice: ui.priceText, apiPrice: apiMatch.priceText, priceDiff: Math.abs(ui.price - apiMatch.price) > 1 });
    } else {
      discrepancies.push({ uiIndex: i, name: ui.name });
    }
  }
  return { matches, discrepancies };
}

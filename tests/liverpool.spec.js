// @ts-check
'use strict';

const { test, expect } = require('@playwright/test');
const path = require('path');
const { SearchPage } = require('../pages/SearchPage');
const { generateReport } = require('../utils/generateReport');

// ── Config ────────────────────────────────────────────────────────────
const SEARCH_TERM  = process.env.SEARCH_TERM  || 'playstation 5';
const COLOR_FILTER = process.env.COLOR_FILTER || 'Blanco';
const RESULT_COUNT = parseInt(process.env.RESULT_COUNT || '5', 10);
const REPORT_DIR   = path.join(process.cwd(), 'reports');

// ─────────────────────────────────────────────────────────────────────
test.describe('Liverpool — Parte 1: Flujo E2E de búsqueda', () => {

  /** @type {SearchPage} */
  let searchPage;

  test.beforeEach(async ({ page }) => {
    searchPage = new SearchPage(page);
  });

  test('Buscar, filtrar, ordenar y extraer los primeros 5 productos', async ({ page }) => {
    let uiProducts   = [];
    let totalResults = 0;

    // ── 1. Navegar ────────────────────────────────────────────────
    await test.step('Navegar a Liverpool.com.mx', async () => {
      await searchPage.goto();
      await expect(page).toHaveURL(/liverpool\.com\.mx/);
      console.log(`\n✅ Página cargada: ${page.url()}`);
    });

    // ── 2. Buscar ─────────────────────────────────────────────────
    await test.step(`Buscar "${SEARCH_TERM}"`, async () => {
      await searchPage.search(SEARCH_TERM);
      console.log(`✅ Búsqueda completada. URL: ${page.url()}`);
    });

    // ── 3. Filtrar por color ──────────────────────────────────────
    await test.step(`Filtrar por color: "${COLOR_FILTER}"`, async () => {
      await searchPage.filterByColor(COLOR_FILTER);
    });

    // ── 4. Ordenar precio menor a mayor ───────────────────────────
    await test.step('Ordenar por precio: menor a mayor', async () => {
      await searchPage.sortByPrice('lowest');
      console.log(`✅ Orden aplicado. URL: ${page.url()}`);
    });

    // ── 5. Contar total de resultados ─────────────────────────────
    await test.step('Contar total de resultados', async () => {
      totalResults = await searchPage.getTotalResults();
      console.log(`✅ Total resultados: ${totalResults}`);
    });

    // ── 6. Extraer top 5 ──────────────────────────────────────────
    await test.step(`Extraer los primeros ${RESULT_COUNT} productos`, async () => {
      uiProducts = await searchPage.extractTopProducts(RESULT_COUNT);
      expect(uiProducts.length).toBeGreaterThan(0);
    });

    // ── 7. Imprimir en consola ────────────────────────────────────
    await test.step('Imprimir resultados en consola', async () => {
      searchPage.printResults(uiProducts, SEARCH_TERM);
    });

    // ── 8. Generar reporte Word ───────────────────────────────────
    await test.step('Generar reporte Word con los datos extraídos', async () => {
      await generateReport({
        searchTerm:   SEARCH_TERM,
        colorFilter:  COLOR_FILTER,
        sortOrder:    'Menor a Mayor precio',
        totalResults,
        finalUrl:     page.url(),
        products:     uiProducts,
        outputDir:    REPORT_DIR,
      });
    });

  });
});

// @ts-check
'use strict';

class SearchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // ─────────────────────────────────────────────────────────────
  // NAVEGACIÓN
  // ─────────────────────────────────────────────────────────────

  async goto() {
    await this.page.context().grantPermissions([]);
    await this.page.goto('/');
    await this.page.waitForLoadState('domcontentloaded');
  }

  // ─────────────────────────────────────────────────────────────
  // BÚSQUEDA — navega directo a la URL de resultados
  // Más robusto en CI donde el input puede no cargar
  // ─────────────────────────────────────────────────────────────

  async search(term) {
    const encoded = encodeURIComponent(term).replace(/%20/g, '+');
    await this.page.goto(`/tienda?s=${encoded}`);
    await this._waitForResults();
  }

  // ─────────────────────────────────────────────────────────────
  // FILTRO POR COLOR
  // ─────────────────────────────────────────────────────────────

  async filterByColor(color) {
    const chip = this.page.locator(`button:text-is("${color}"), a:text-is("${color}")`).first();
    if (await chip.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await chip.click();
      await this._waitForResults();
      console.log(`✅ Filtro "${color}" aplicado`);
      return;
    }

    const activeChip = this.page.locator(`text="${color}"`).first();
    if (await activeChip.isVisible({ timeout: 3_000 }).catch(() => false)) {
      console.log(`✅ Filtro "${color}" ya estaba activo`);
      return;
    }

    console.warn(`⚠️  Filtro "${color}" no encontrado`);
  }

  // ─────────────────────────────────────────────────────────────
  // ORDENAMIENTO
  // ─────────────────────────────────────────────────────────────

  async sortByPrice(direction) {
    const sortLabels = {
      lowest:  ['Menor precio', 'Precio: menor a mayor', 'De menor a mayor'],
      highest: ['Mayor precio', 'Precio: mayor a menor', 'De mayor a menor'],
    };

    // Intentar con <select> nativo
    const selects = this.page.locator('select');
    const selectCount = await selects.count();

    for (let i = 0; i < selectCount; i++) {
      const sel = selects.nth(i);
      for (const label of sortLabels[direction]) {
        const ok = await sel.selectOption({ label }).then(() => true).catch(() => false);
        if (ok) {
          await this._waitForResults();
          console.log(`✅ Ordenado: ${label}`);
          return;
        }
      }
      const valueMap = { lowest: ['priceAsc', 'price_asc', 'LOW'], highest: ['priceDesc', 'price_desc', 'HIGH'] };
      for (const val of valueMap[direction]) {
        const ok = await sel.selectOption({ value: val }).then(() => true).catch(() => false);
        if (ok) {
          await this._waitForResults();
          console.log(`✅ Ordenado por value: ${val}`);
          return;
        }
      }
    }

    // Dropdown custom
    const sortTrigger = this.page.locator('text=/Ordenar por/i').first();
    if (await sortTrigger.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await sortTrigger.click();
      await this.page.waitForTimeout(600);
      for (const label of sortLabels[direction]) {
        const option = this.page.locator(`[role="option"]:has-text("${label}"), li:has-text("${label}")`).first();
        if (await option.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await option.click();
          await this._waitForResults();
          console.log(`✅ Ordenado: ${label}`);
          return;
        }
      }
    }

    // Fallback URL
    console.warn(`⚠️  Ordenamiento no encontrado en UI — aplicando vía URL`);
    const url = new URL(this.page.url());
    url.searchParams.set('sortBy', direction === 'lowest' ? 'priceAsc' : 'priceDesc');
    await this.page.goto(url.toString());
    await this._waitForResults();
    console.log(`✅ Orden aplicado vía URL`);
  }

  // ─────────────────────────────────────────────────────────────
  // TOTAL DE RESULTADOS
  // ─────────────────────────────────────────────────────────────

  async getTotalResults() {
    const totalEl = this.page.locator('text=/\\d+ Producto/i').first();
    if (await totalEl.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const text = (await totalEl.textContent() || '').trim();
      const match = text.match(/(\d[\d,]*)/);
      return match ? parseInt(match[1].replace(',', ''), 10) : 0;
    }
    return 0;
  }

  // ─────────────────────────────────────────────────────────────
  // EXTRACCIÓN DE PRODUCTOS
  // ─────────────────────────────────────────────────────────────

  async extractTopProducts(count) {
    const cardSelectors = [
      '[class*="ProductCard"]',
      '[class*="product-card"]',
      '[class*="ProductTile"]',
      '[class*="product_tile"]',
      '[class*="item-card"]',
      'article',
      'li[class*="product"]',
    ];

    let cards = null;
    for (const selector of cardSelectors) {
      const locator = this.page.locator(selector);
      if (await locator.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        cards = locator;
        console.log(`\n📦 Selector: "${selector}"`);
        break;
      }
    }

    if (!cards) throw new Error('❌ No se encontraron tarjetas de producto');

    const total = await cards.count();
    console.log(`📦 ${total} productos en página`);

    const products = [];
    const limit = Math.min(count, total);

    for (let i = 0; i < limit; i++) {
      const card = cards.nth(i);

      let brand = '';
      const brandSelectors = ['[class*="brand"]', '[class*="Brand"]', '[class*="marca"]'];
      for (const sel of brandSelectors) {
        const el = card.locator(sel).first();
        if (await el.isVisible({ timeout: 1_000 }).catch(() => false)) {
          brand = (await el.textContent().catch(() => '')).trim();
          break;
        }
      }

      let name = '';
      const nameSelectors = [
        '[class*="product-name"]', '[class*="ProductName"]',
        '[class*="product_name"]', '[class*="description"]',
        'h2', 'h3',
      ];
      for (const sel of nameSelectors) {
        const el = card.locator(sel).first();
        if (await el.isVisible({ timeout: 1_000 }).catch(() => false)) {
          const text = (await el.textContent().catch(() => '')).trim();
          if (text && text !== brand && text.length > brand.length) {
            name = text;
            break;
          }
        }
      }

      if (!name) {
        const link = card.locator('a').first();
        if (await link.isVisible({ timeout: 1_000 }).catch(() => false)) {
          name = (await link.getAttribute('title') || '').trim();
          if (!name) name = (await link.textContent() || '').trim();
        }
      }

      const fullName = brand && name ? `${brand} — ${name}` : name || brand || '(sin nombre)';

      const priceEl = card.locator(
        '[class*="price"]:not([class*="old"]):not([class*="before"]):not([class*="original"]):not([class*="regular"]),' +
        '[class*="Price"]:not([class*="old"]):not([class*="before"]):not([class*="original"]):not([class*="regular"])'
      ).first();
      const priceText = (await priceEl.textContent().catch(() => '')).trim();

      products.push({
        name: fullName,
        price: this._parsePrice(priceText),
        priceText,
      });
    }

    return products;
  }

  // ─────────────────────────────────────────────────────────────
  // UTILIDADES
  // ─────────────────────────────────────────────────────────────

  printResults(products, term) {
    const line = '═'.repeat(60);
    console.log(`\n${line}`);
    console.log(`🛒  Liverpool — Top ${products.length} resultados: "${term}"`);
    console.log(line);
    products.forEach((p, i) => {
      console.log(`\n  #${i + 1}`);
      console.log(`  📦 Nombre : ${p.name     || '(no encontrado)'}`);
      console.log(`  💰 Precio : ${p.priceText || '(no encontrado)'}`);
    });
    console.log(`\n${line}\n`);
  }

  async _waitForResults() {
    await this.page.waitForLoadState('load', { timeout: 30_000 });
    await this.page.waitForTimeout(1_500);
  }

  _parsePrice(text) {
    if (!text) return 0;
    const cleaned = text.replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
  }
}

module.exports = { SearchPage };

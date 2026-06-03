// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,

  use: {
    baseURL: 'https://www.liverpool.com.mx',
    headless: process.env.HEADED !== 'true',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    viewport: {
      width:  parseInt(process.env.VIEWPORT_WIDTH  || '1440', 10),
      height: parseInt(process.env.VIEWPORT_HEIGHT || '900',  10),
    },
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City',
    permissions: [],

    // User-agent real para evitar detección de bot en CI
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

    // Headers extra para parecer un navegador real
    extraHTTPHeaders: {
      'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    },

    // Argumentos para evitar detección de automatización
    launchOptions: {
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    },
  },

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],

  outputDir: 'test-results',

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        permissions: [],
        viewport: {
          width:  parseInt(process.env.VIEWPORT_WIDTH  || '1900', 10),
          height: parseInt(process.env.VIEWPORT_HEIGHT || '700',  10),
        },
      },
    },
  ],
});

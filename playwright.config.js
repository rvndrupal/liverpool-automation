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
    viewport: { width: 1900, height: 700 },
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City',

    // ✅ Bloquear el popup de geolocalización del navegador
    permissions: [],
    geolocation: undefined,
    contextOptions: {
      permissions: [],
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
          width: parseInt(process.env.VIEWPORT_WIDTH || '1900', 10),
          height: parseInt(process.env.VIEWPORT_HEIGHT || '700', 10),
        },
      },
    },



  ],
});

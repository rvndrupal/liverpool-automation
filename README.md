# 🛒 Liverpool E2E Automation Suite

**Autor:** Ing. Rodrigo Igor Villanueva Nieto | **Framework:** Playwright + JavaScript (Node.js)

> ⚠️ Liverpool.com.mx tiene protecciones anti-bot activas (Akamai). Las IPs de GitHub Actions son detectadas y bloqueadas. Los tests están diseñados para ejecutarse **localmente**. En CI el pipeline no falla — documenta el comportamiento esperado.

---

## 📦 Instalación

```bash
git clone https://github.com/rvndrupal/liverpool-automation.git
cd liverpool-automation
npm install
npx playwright install
```

---

## ▶️ Cómo ejecutar

| Comando | Descripción |
|---|---|
| `npx playwright test` | Todos los tests en **headless** (modo CI) |
| `npx playwright test --headed` | Todos los tests con **browser visible** |
| `npx playwright test tests/liverpool.spec.js --headed` | Solo PlayStation 5 — UI |
| `npx playwright test tests/liverpool-api.spec.js --headed` | Solo PlayStation 5 — API |
| `npx playwright test tests/xbox-seriesx.spec.js --headed` | Solo Xbox Series X — UI |
| `npx playwright test tests/xbox-seriesx-api.spec.js --headed` | Solo Xbox Series X — API |
| `npx playwright test tests/nintendo-switch.spec.js --headed` | Solo Nintendo Switch — UI |
| `npx playwright test tests/nintendo-switch-api.spec.js --headed` | Solo Nintendo Switch — API |
| `npx playwright show-report` | Abre el reporte HTML del último run |
| `npx playwright test --ui` | UI interactiva de Playwright |

---

## 🎯 Qué hace el proyecto

### Parte 1 — Flujo E2E UI (`*.spec.js`)
1. Navega a `liverpool.com.mx`
2. Busca el producto (PS5 / Xbox / Nintendo Switch)
3. Filtra por color
4. Ordena por precio menor a mayor
5. Extrae nombre y precio de los primeros 5 productos
6. Imprime en consola y genera reporte Word en `/reports`

### Parte 2 — Interceptación de red (`*-api.spec.js`)
1. Registra listener de red antes de navegar
2. Ejecuta el mismo flujo UI
3. Analiza respuestas JSON del backend
4. Cruza UI vs API — verifica que al menos **3 de 5** productos coincidan
5. Genera reporte Word con coincidencias y discrepancias

### Parte 3 — Reportes y CI
- Reporte HTML de Playwright automático tras cada run
- Screenshots automáticos en fallo (configurado en `playwright.config.js`)
- Reportes `.docx` por ejecución en `/reports`
- Pipeline de GitHub Actions en `.github/workflows/test.yml`

---

## 🔧 Variables de entorno

Parametriza cualquier test sin modificar código:

```bash
# Cambiar color del filtro
COLOR_FILTER="Blanco" npx playwright test tests/xbox-seriesx.spec.js --headed

# Cambiar término de búsqueda
SEARCH_TERM="ipad pro" COLOR_FILTER="Gris" npx playwright test tests/liverpool.spec.js --headed
```

| Variable | Default | Descripción |
|---|---|---|
| `SEARCH_TERM` | `playstation 5` | Término a buscar |
| `COLOR_FILTER` | `Blanco` / `Negro` / `Rojo` | Filtro de color |
| `RESULT_COUNT` | `5` | Productos a extraer |

---

## 🗂️ Estructura

```
├── .github/workflows/test.yml       # GitHub Actions CI
├── pages/SearchPage.js              # Page Object Model
├── tests/
│   ├── liverpool.spec.js            # E2E UI — PlayStation 5
│   ├── liverpool-api.spec.js        # API — PlayStation 5
│   ├── xbox-seriesx.spec.js         # E2E UI — Xbox Series X
│   ├── xbox-seriesx-api.spec.js     # API — Xbox Series X
│   ├── nintendo-switch.spec.js      # E2E UI — Nintendo Switch
│   └── nintendo-switch-api.spec.js  # API — Nintendo Switch
├── utils/
│   ├── generateReport.js            # Reporte Word Parte 1
│   └── generateApiReport.js         # Reporte Word Parte 2
├── reports/                         # .docx generados localmente
├── playwright.config.js
└── TEST_STRATEGY.md
```

---

## 🔄 CI/CD — GitHub Actions

El pipeline se ejecuta en cada push a `main`:
- Instala dependencias y navegadores
- Corre los tests en **headless**
- Sube el reporte HTML como **artefacto descargable**

---

## 📄 Estrategia de pruebas

Ver [`TEST_STRATEGY.md`](./TEST_STRATEGY.md) para el documento completo.

| Tema | Decisión |
|---|---|
| No se automatiza | Flujos de pago, login real, pruebas de carga en producción |
| CAPTCHA | Ambiente staging sin CAPTCHA — no servicios de bypass |
| Flakiness | Selectores en cascada, `waitForLoadState("load")`, manejo graceful del bloqueo anti-bot |
| Escalar a 50+ suites | Tags `@smoke/@regression`, sharding, fail fast en PRs |

---

*Ing. Rodrigo Igor Villanueva Nieto — QA Automation Engineer — Liverpool E2E Challenge 2026*

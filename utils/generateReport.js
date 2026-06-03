// @ts-check
'use strict';

const fs   = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  Header, Footer, PageNumber,
} = require('docx');

const LIVERPOOL_PINK = 'D6006E';
const HEADER_BG      = 'F5F5F5';
const ROW_ALT_BG     = 'FFF0F7';
const WHITE          = 'FFFFFF';
const DARK_TEXT      = '1A1A1A';
const GRAY_TEXT      = '666666';

const border  = { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' };
const borders = { top: border, bottom: border, left: border, right: border };

function cell(text, opts = {}) {
  return new TableCell({
    borders,
    width:   { size: opts.width || 4680, type: WidthType.DXA },
    shading: { fill: opts.bg || WHITE,   type: ShadingType.CLEAR },
    margins: { top: 100, bottom: 100, left: 150, right: 150 },
    children: [new Paragraph({
      alignment: opts.align || AlignmentType.LEFT,
      children: [new TextRun({
        text,
        bold:  opts.bold  || false,
        color: opts.color || DARK_TEXT,
        size:  opts.size  || 20,
        font:  'Arial',
      })],
    })],
  });
}

/**
 * Genera el reporte Word con los datos reales extraídos del test.
 * @param {Object} opts
 * @param {string} opts.searchTerm
 * @param {string} opts.colorFilter
 * @param {string} opts.sortOrder
 * @param {number} opts.totalResults
 * @param {string} opts.finalUrl
 * @param {Array<{name:string, priceText:string, price:number}>} opts.products
 * @param {string} opts.outputDir   carpeta donde se guarda el .docx
 * @returns {Promise<string>}       ruta del archivo generado
 */
async function generateReport(opts) {
  const { searchTerm, colorFilter, sortOrder, totalResults, finalUrl, products, outputDir } = opts;

  const dateStr = new Date().toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 20 } } },
      paragraphStyles: [
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 26, bold: true, font: 'Arial', color: LIVERPOOL_PINK },
          paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 1 },
        },
      ],
    },

    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1080, bottom: 1080, left: 1080 },
        },
      },

      headers: {
        default: new Header({
          children: [new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: LIVERPOOL_PINK } },
            spacing: { after: 200 },
            children: [new TextRun({
              text: '🛒  Liverpool — Reporte de Resultados de Búsqueda',
              bold: true, size: 22, font: 'Arial', color: LIVERPOOL_PINK,
            })],
          })],
        }),
      },

      footers: {
        default: new Footer({
          children: [new Paragraph({
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' } },
            alignment: AlignmentType.CENTER,
            spacing: { before: 160 },
            children: [
              new TextRun({ text: 'Liverpool E2E Automation Suite  •  Página ', size: 18, font: 'Arial', color: GRAY_TEXT }),
              new TextRun({ children: [PageNumber.CURRENT], size: 18, font: 'Arial', color: GRAY_TEXT }),
            ],
          })],
        }),
      },

      children: [

        // ── Título ────────────────────────────────────────────────
        new Paragraph({
          shading: { fill: LIVERPOOL_PINK, type: ShadingType.CLEAR },
          spacing: { before: 0, after: 0 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '  Reporte de Resultados — Liverpool.com.mx', bold: true, size: 40, font: 'Arial', color: WHITE })],
        }),
        new Paragraph({
          shading: { fill: LIVERPOOL_PINK, type: ShadingType.CLEAR },
          spacing: { before: 0, after: 400 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `  Automatización E2E — ${dateStr}`, size: 22, font: 'Arial', color: 'FFCCE8' })],
        }),

        // ── Parámetros ────────────────────────────────────────────
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: '📋  Parámetros de Búsqueda', font: 'Arial', size: 26, bold: true, color: LIVERPOOL_PINK })],
        }),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2500, 6860],
          rows: [
            new TableRow({ children: [cell('Sitio',            { width: 2500, bold: true, bg: HEADER_BG }), cell('https://www.liverpool.com.mx', { width: 6860 })] }),
            new TableRow({ children: [cell('Término buscado',  { width: 2500, bold: true, bg: HEADER_BG }), cell(searchTerm,   { width: 6860 })] }),
            new TableRow({ children: [cell('Filtro de color',  { width: 2500, bold: true, bg: HEADER_BG }), cell(colorFilter,  { width: 6860 })] }),
            new TableRow({ children: [cell('Ordenamiento',     { width: 2500, bold: true, bg: HEADER_BG }), cell(sortOrder,    { width: 6860 })] }),
            new TableRow({ children: [cell('Total resultados', { width: 2500, bold: true, bg: HEADER_BG }), cell(`${totalResults} productos`, { width: 6860 })] }),
            new TableRow({ children: [cell('URL final',        { width: 2500, bold: true, bg: HEADER_BG }), cell(finalUrl,     { width: 6860 })] }),
            new TableRow({ children: [cell('Fecha ejecución',  { width: 2500, bold: true, bg: HEADER_BG }), cell(dateStr,      { width: 6860 })] }),
          ],
        }),

        // ── Top productos ─────────────────────────────────────────
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: `🏆  Top ${products.length} Productos Extraídos`, font: 'Arial', size: 26, bold: true, color: LIVERPOOL_PINK })],
        }),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [600, 6360, 2400],
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                cell('#',      { width: 600,  bold: true, bg: LIVERPOOL_PINK, color: WHITE, align: AlignmentType.CENTER }),
                cell('Nombre', { width: 6360, bold: true, bg: LIVERPOOL_PINK, color: WHITE }),
                cell('Precio', { width: 2400, bold: true, bg: LIVERPOOL_PINK, color: WHITE, align: AlignmentType.CENTER }),
              ],
            }),
            ...products.map((p, i) => new TableRow({
              children: [
                cell(String(i + 1), { width: 600,  align: AlignmentType.CENTER, bg: i % 2 === 0 ? WHITE : ROW_ALT_BG, bold: true }),
                cell(p.name,        { width: 6360, bg: i % 2 === 0 ? WHITE : ROW_ALT_BG }),
                cell(p.priceText,   { width: 2400, align: AlignmentType.CENTER, bg: i % 2 === 0 ? WHITE : ROW_ALT_BG, bold: true, color: LIVERPOOL_PINK }),
              ],
            })),
          ],
        }),

        new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: '' })] }),

        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'EEEEEE' } },
          spacing: { before: 200 },
          children: [new TextRun({ text: 'Generado automáticamente · Liverpool E2E Automation Suite', size: 18, font: 'Arial', color: GRAY_TEXT })],
        }),
      ],
    }],
  });

  // Guardar en la carpeta indicada
  fs.mkdirSync(outputDir, { recursive: true });
  const fileName   = `Reporte_Liverpool_${searchTerm.replace(/\s+/g, '_')}_${Date.now()}.docx`;
  const outputPath = path.join(outputDir, fileName);

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  console.log(`\n📄 Reporte Word generado: ${outputPath}\n`);
  return outputPath;
}

module.exports = { generateReport };

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
const GREEN          = '1E7E34';
const RED            = 'C0392B';
const YELLOW         = 'F39C12';
const HEADER_BG      = 'F5F5F5';
const WHITE          = 'FFFFFF';
const DARK_TEXT      = '1A1A1A';
const GRAY_TEXT      = '666666';
const GREEN_BG       = 'EAFAF1';
const RED_BG         = 'FDEDEC';
const YELLOW_BG      = 'FEF9E7';

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
 * Genera reporte Word de validación cruzada UI vs API.
 * @param {Object} opts
 * @param {string} opts.searchTerm
 * @param {string} opts.colorFilter
 * @param {string} opts.finalUrl
 * @param {Array<{name:string, priceText:string, price:number}>} opts.uiProducts
 * @param {Array<{name:string, priceText:string, price:number}>} opts.apiProducts
 * @param {Array<{uiIndex:number, name:string, uiPrice:string, apiPrice:string, priceDiff:boolean}>} opts.matches
 * @param {Array<{uiIndex:number, name:string}>} opts.discrepancies
 * @param {string} opts.outputDir
 */
async function generateApiReport(opts) {
  const { searchTerm, colorFilter, finalUrl, uiProducts, apiProducts, matches, discrepancies, outputDir } = opts;

  const dateStr = new Date().toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const totalUI      = uiProducts.length;
  const totalAPI     = apiProducts.length;
  const totalMatches = matches.length;
  const passed       = totalMatches >= 3;

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
              text: '🔍  Liverpool — Reporte de Validación UI vs API',
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
              new TextRun({ text: 'Liverpool E2E Automation Suite — Parte 2  •  Página ', size: 18, font: 'Arial', color: GRAY_TEXT }),
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
          children: [new TextRun({ text: '  Validación UI vs API — Liverpool.com.mx', bold: true, size: 40, font: 'Arial', color: WHITE })],
        }),
        new Paragraph({
          shading: { fill: LIVERPOOL_PINK, type: ShadingType.CLEAR },
          spacing: { before: 0, after: 400 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `  Parte 2: Interceptación de Red — ${dateStr}`, size: 22, font: 'Arial', color: 'FFCCE8' })],
        }),

        // ── Resumen ejecutivo ─────────────────────────────────────
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: '📊  Resumen Ejecutivo', font: 'Arial', size: 26, bold: true, color: LIVERPOOL_PINK })],
        }),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3120, 3120, 3120],
          rows: [
            new TableRow({ children: [
              cell('Productos en UI',   { width: 3120, bold: true, bg: HEADER_BG, align: AlignmentType.CENTER }),
              cell('Productos en API',  { width: 3120, bold: true, bg: HEADER_BG, align: AlignmentType.CENTER }),
              cell('Resultado',         { width: 3120, bold: true, bg: HEADER_BG, align: AlignmentType.CENTER }),
            ]}),
            new TableRow({ children: [
              cell(String(totalUI),     { width: 3120, align: AlignmentType.CENTER, size: 28, bold: true }),
              cell(String(totalAPI),    { width: 3120, align: AlignmentType.CENTER, size: 28, bold: true }),
              cell(passed ? '✅ PASSED' : '❌ FAILED', {
                width: 3120, align: AlignmentType.CENTER, size: 24, bold: true,
                bg: passed ? GREEN_BG : RED_BG,
                color: passed ? GREEN : RED,
              }),
            ]}),
          ],
        }),

        new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: '' })] }),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3120, 3120, 3120],
          rows: [
            new TableRow({ children: [
              cell('Coincidencias',               { width: 3120, bold: true, bg: HEADER_BG, align: AlignmentType.CENTER }),
              cell('Discrepancias',               { width: 3120, bold: true, bg: HEADER_BG, align: AlignmentType.CENTER }),
              cell('Mínimo requerido',            { width: 3120, bold: true, bg: HEADER_BG, align: AlignmentType.CENTER }),
            ]}),
            new TableRow({ children: [
              cell(`${totalMatches} de ${totalUI}`, { width: 3120, align: AlignmentType.CENTER, bold: true, color: GREEN }),
              cell(String(discrepancies.length),    { width: 3120, align: AlignmentType.CENTER, bold: true, color: discrepancies.length > 0 ? RED : GREEN }),
              cell('3 de 5',                        { width: 3120, align: AlignmentType.CENTER, bold: true }),
            ]}),
          ],
        }),

        // ── Parámetros ────────────────────────────────────────────
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: '📋  Parámetros de la Ejecución', font: 'Arial', size: 26, bold: true, color: LIVERPOOL_PINK })],
        }),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2500, 6860],
          rows: [
            new TableRow({ children: [cell('Término buscado', { width: 2500, bold: true, bg: HEADER_BG }), cell(searchTerm,  { width: 6860 })] }),
            new TableRow({ children: [cell('Filtro de color', { width: 2500, bold: true, bg: HEADER_BG }), cell(colorFilter, { width: 6860 })] }),
            new TableRow({ children: [cell('URL final',       { width: 2500, bold: true, bg: HEADER_BG }), cell(finalUrl,   { width: 6860 })] }),
            new TableRow({ children: [cell('Fecha',           { width: 2500, bold: true, bg: HEADER_BG }), cell(dateStr,    { width: 6860 })] }),
          ],
        }),

        // ── Detalle coincidencias ─────────────────────────────────
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: '✅  Coincidencias UI vs API', font: 'Arial', size: 26, bold: true, color: GREEN })],
        }),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [500, 4360, 2000, 2000, 500],
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                cell('#',           { width: 500,  bold: true, bg: LIVERPOOL_PINK, color: WHITE, align: AlignmentType.CENTER }),
                cell('Producto',    { width: 4360, bold: true, bg: LIVERPOOL_PINK, color: WHITE }),
                cell('Precio UI',   { width: 2000, bold: true, bg: LIVERPOOL_PINK, color: WHITE, align: AlignmentType.CENTER }),
                cell('Precio API',  { width: 2000, bold: true, bg: LIVERPOOL_PINK, color: WHITE, align: AlignmentType.CENTER }),
                cell('⚠️',          { width: 500,  bold: true, bg: LIVERPOOL_PINK, color: WHITE, align: AlignmentType.CENTER }),
              ],
            }),
            ...(matches.length > 0 ? matches.map(m => new TableRow({
              children: [
                cell(String(m.uiIndex + 1), { width: 500,  align: AlignmentType.CENTER, bg: GREEN_BG, bold: true, color: GREEN }),
                cell(m.name,                { width: 4360, bg: GREEN_BG }),
                cell(m.uiPrice,             { width: 2000, align: AlignmentType.CENTER, bg: GREEN_BG }),
                cell(m.apiPrice,            { width: 2000, align: AlignmentType.CENTER, bg: m.priceDiff ? YELLOW_BG : GREEN_BG, color: m.priceDiff ? YELLOW : GREEN }),
                cell(m.priceDiff ? '⚠️' : '✅', { width: 500, align: AlignmentType.CENTER, bg: m.priceDiff ? YELLOW_BG : GREEN_BG }),
              ],
            })) : [
              new TableRow({ children: [cell('Sin coincidencias encontradas', { width: 9360, align: AlignmentType.CENTER, color: GRAY_TEXT })] }),
            ]),
          ],
        }),

        // ── Detalle discrepancias ─────────────────────────────────
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: '❌  Discrepancias', font: 'Arial', size: 26, bold: true, color: discrepancies.length > 0 ? RED : GREEN })],
        }),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [500, 5860, 3000],
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                cell('#',        { width: 500,  bold: true, bg: LIVERPOOL_PINK, color: WHITE, align: AlignmentType.CENTER }),
                cell('Producto', { width: 5860, bold: true, bg: LIVERPOOL_PINK, color: WHITE }),
                cell('Detalle',  { width: 3000, bold: true, bg: LIVERPOOL_PINK, color: WHITE }),
              ],
            }),
            ...(discrepancies.length > 0 ? discrepancies.map(d => new TableRow({
              children: [
                cell(String(d.uiIndex + 1),          { width: 500,  align: AlignmentType.CENTER, bg: RED_BG, bold: true, color: RED }),
                cell(d.name,                          { width: 5860, bg: RED_BG }),
                cell('No encontrado en respuesta API', { width: 3000, bg: RED_BG, color: RED }),
              ],
            })) : [
              new TableRow({ children: [cell('✅ Sin discrepancias — todos los productos coinciden', { width: 9360, align: AlignmentType.CENTER, color: GREEN, bold: true })] }),
            ]),
          ],
        }),

        new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: '' })] }),

        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'EEEEEE' } },
          spacing: { before: 200 },
          children: [new TextRun({ text: 'Generado automáticamente · Liverpool E2E Automation Suite · Parte 2', size: 18, font: 'Arial', color: GRAY_TEXT })],
        }),
      ],
    }],
  });

  fs.mkdirSync(outputDir, { recursive: true });
  const fileName   = `Reporte_API_Liverpool_${searchTerm.replace(/\s+/g, '_')}_${Date.now()}.docx`;
  const outputPath = path.join(outputDir, fileName);

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  console.log(`\n📄 Reporte API generado: ${outputPath}\n`);
  return outputPath;
}

module.exports = { generateApiReport };

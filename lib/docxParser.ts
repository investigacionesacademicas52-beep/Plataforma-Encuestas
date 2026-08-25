import mammoth from 'mammoth';
import * as cheerio from 'cheerio';

export type QuestionType = 'single' | 'multiple' | 'text' | 'textarea' | 'number' | 'scale';

export interface ParsedQuestion {
  text: string;
  type: QuestionType;
  options: string[] | null;
  required: boolean;
}

const QUESTION_REGEX = /^(?:pregunta\s*)?(\d{1,3})[\.\)]\s+(.*)$/i;
const OPTION_REGEX = /^(?:[a-hA-H]|[ivxIVX]{1,4})[\.\)]\s+(.+)$|^[-•●▪○]\s+(.+)$/;
const OPEN_CUE_REGEX =
  /_{3,}|respuesta\s*abierta|responda\s+con\s+sus\s+propias\s+palabras|^explique|^describa|^comente/i;
const MULTIPLE_CUE_REGEX =
  /seleccione\s+todas|marque\s+todas|selecci[oó]n\s+m[uú]ltiple|puede\s+elegir\s+varias|elija\s+todas|puede\s+marcar\s+m[aá]s\s+de\s+una/i;
const NUMBER_CUE_REGEX = /\bedad\b|\baños\b|n[uú]mero\s+de|cu[aá]ntos|cu[aá]ntas/i;
const SCALE_CUE_REGEX = /\(\s*escala\s+1\s*a\s*5\s*\)/i;
// Cualquier símbolo inicial (casilla ☐, bullet, guion, etc.) seguido de texto
const LEADING_SYMBOL_REGEX = /^[^\p{L}\p{N}]+/u;

function textOf($: cheerio.CheerioAPI, el: unknown): string {
  return $(el as never)
    .text()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Intenta leer el cuestionario a partir de las TABLAS del documento Word.
 * Cubre dos patrones muy comunes en instrumentos de investigación:
 *
 * 1) Matriz tipo Likert: una tabla con una fila de encabezado que contiene
 *    varias columnas numéricas consecutivas (ej. 1, 2, 3, 4, 5) y, debajo,
 *    una fila por cada afirmación a evaluar.
 * 2) Tabla de opción única/múltiple con casillas de verificación: una tabla
 *    donde casi todas las filas tienen una sola celda con contenido, cada
 *    una representando una opción (con o sin símbolo de casilla al inicio).
 *    El enunciado de la pregunta se toma del párrafo de texto que aparece
 *    inmediatamente antes de la tabla en el documento.
 */
function parseFromTables($: cheerio.CheerioAPI): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  const body = $('body').length ? $('body') : $.root();
  const blocks = (body as cheerio.Cheerio<never>).children().toArray();

  let lastParagraphText = '';

  for (const block of blocks) {
    const tag = (block as { tagName?: string }).tagName?.toLowerCase();

    if (tag && tag !== 'table') {
      const t = textOf($, block);
      if (t) lastParagraphText = t;
      continue;
    }
    if (tag !== 'table') continue;

    const rows = $(block).find('tr').toArray();
    if (rows.length === 0) continue;

    const headerCells = $(rows[0])
      .find('td,th')
      .map((_, c) => textOf($, c))
      .get();
    const numericHeaders = headerCells.filter((h) => /^\d{1,2}$/.test(h));

    // --- Caso 1: matriz tipo Likert (se exige varias filas de afirmaciones,
    // para no confundir con una tabla de leyenda de la escala) ---
    if (numericHeaders.length >= 3 && rows.length > 3) {
      for (let i = 1; i < rows.length; i++) {
        const cells = $(rows[i])
          .find('td,th')
          .map((_, c) => textOf($, c))
          .get();
        if (cells.length === 0) continue;
        const candidateTexts = cells.filter((c) => c && !/^\d{1,2}$/.test(c));
        const text = candidateTexts.slice(-1)[0];
        if (!text || text.length < 3) continue;
        questions.push({
          text,
          type: 'scale',
          options: numericHeaders,
          required: true,
        });
      }
      continue;
    }

    // --- Caso 2: tabla de opciones con casillas (una opción por fila) ---
    const cellTexts = $(block)
      .find('td,th')
      .map((_, c) => textOf($, c))
      .get()
      .filter(Boolean);

    if (cellTexts.length >= 2) {
      const strippedOptions = cellTexts.map((c) => c.replace(LEADING_SYMBOL_REGEX, '').trim());
      const looksLikeOptionList =
        strippedOptions.every((o) => o.length > 0 && o.length < 80) &&
        strippedOptions.length === cellTexts.length;

      if (looksLikeOptionList && lastParagraphText) {
        const questionText = lastParagraphText;
        questions.push({
          text: questionText,
          type: MULTIPLE_CUE_REGEX.test(questionText) ? 'multiple' : 'single',
          options: strippedOptions,
          required: true,
        });
      }
    }
  }

  return questions;
}

/**
 * Método de respaldo: interpreta párrafos de texto plano con preguntas
 * numeradas ("1.", "2)"...) y opciones con letras o viñetas. Se usa solo
 * cuando el documento no tiene tablas reconocibles.
 */
function parseFromPlainText(rawText: string): ParsedQuestion[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const questions: ParsedQuestion[] = [];
  let current: ParsedQuestion | null = null;

  const pushCurrent = () => {
    if (!current) return;
    if ((!current.options || current.options.length === 0) && current.type === 'single') {
      current.type = NUMBER_CUE_REGEX.test(current.text) ? 'number' : 'text';
    }
    if (current.options && current.options.length > 0 && current.type !== 'multiple' && current.type !== 'scale') {
      current.type = 'single';
    }
    questions.push(current);
  };

  for (const line of lines) {
    const qMatch = line.match(QUESTION_REGEX);
    if (qMatch) {
      pushCurrent();
      const text = qMatch[2].trim();
      current = { text, type: 'single', options: [], required: true };
      if (SCALE_CUE_REGEX.test(text)) {
        current.type = 'scale';
        current.options = ['1', '2', '3', '4', '5'];
        current.text = text.replace(SCALE_CUE_REGEX, '').trim();
      } else if (MULTIPLE_CUE_REGEX.test(text)) {
        current.type = 'multiple';
      } else if (OPEN_CUE_REGEX.test(text)) {
        current.type = 'textarea';
      }
      continue;
    }

    const oMatch = line.match(OPTION_REGEX);
    if (oMatch && current) {
      const optText = (oMatch[1] || oMatch[2] || '').trim();
      if (optText) {
        current.options = current.options || [];
        current.options.push(optText);
      }
      continue;
    }

    if (current && OPEN_CUE_REGEX.test(line)) {
      if (!current.options || current.options.length === 0) current.type = 'textarea';
      continue;
    }

    if (current && (!current.options || current.options.length === 0)) {
      current.text = `${current.text} ${line}`.trim();
    }
  }
  pushCurrent();

  if (questions.length === 0) {
    for (const line of lines) {
      questions.push({
        text: line,
        type: NUMBER_CUE_REGEX.test(line) ? 'number' : 'text',
        options: null,
        required: true,
      });
    }
  }

  return questions;
}

export async function parseDocxToQuestions(buffer: Buffer): Promise<{
  questions: ParsedQuestion[];
  rawText: string;
}> {
  const { value: html } = await mammoth.convertToHtml({ buffer });
  const $ = cheerio.load(html);

  let questions = parseFromTables($);

  const { value: rawText } = await mammoth.extractRawText({ buffer });

  // Si no se detectaron tablas útiles, se recurre al método de texto plano.
  if (questions.length === 0) {
    questions = parseFromPlainText(rawText);
  }

  return { questions, rawText };
}

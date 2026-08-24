import mammoth from 'mammoth';

export type QuestionType = 'single' | 'multiple' | 'text' | 'textarea' | 'number';

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

/**
 * Convierte un archivo .docx (buffer) en texto plano conservando saltos de párrafo,
 * y luego lo interpreta como una lista de preguntas usando reglas heurísticas
 * pensadas para cuestionarios típicos de investigación (numeración "1.", "2)",
 * opciones con letras "a)", viñetas "-", frases guía como "Seleccione todas
 * las que apliquen", etc.
 */
export async function parseDocxToQuestions(buffer: Buffer): Promise<{
  questions: ParsedQuestion[];
  rawText: string;
}> {
  const { value: rawText } = await mammoth.extractRawText({ buffer });
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
    if (current.options && current.options.length > 0 && current.type !== 'multiple') {
      current.type = 'single';
    }
    questions.push(current);
  };

  for (const line of lines) {
    const qMatch = line.match(QUESTION_REGEX);
    if (qMatch) {
      pushCurrent();
      const text = qMatch[2].trim();
      current = {
        text,
        type: 'single',
        options: [],
        required: true,
      };
      if (MULTIPLE_CUE_REGEX.test(text)) current.type = 'multiple';
      if (OPEN_CUE_REGEX.test(text)) current.type = 'textarea';
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

    // Texto que continúa el enunciado de la pregunta (línea envuelta), solo si
    // aún no se han recolectado opciones para esa pregunta.
    if (current && (!current.options || current.options.length === 0)) {
      current.text = `${current.text} ${line}`.trim();
    }
  }
  pushCurrent();

  // Si el documento no tenía numeración reconocible, se usa un método de
  // respaldo: cada línea no vacía se interpreta como una pregunta abierta,
  // de modo que el usuario pueda ajustarlas manualmente en el panel.
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

  return { questions, rawText };
}

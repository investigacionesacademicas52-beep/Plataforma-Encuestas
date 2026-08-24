import ExcelJS from 'exceljs';

interface QuestionRow {
  id: string;
  order: number;
  text: string;
  type: string;
  options: string[] | null;
  varName: string | null;
}

interface ResponseRow {
  id: string;
  createdAt: Date;
  answers: Record<string, unknown>;
}

/**
 * Genera un libro de Excel con dos hojas:
 *  - "Datos": una fila por encuestado, una columna por variable, con
 *    codificación numérica para las preguntas de opción (ideal para
 *    importar en SPSS vía Archivo > Importar datos > Excel).
 *  - "Diccionario": el libro de códigos (nombre de variable, pregunta,
 *    tipo y las etiquetas de cada valor) para poder definir las
 *    "Etiquetas de valor" dentro de SPSS.
 */
export async function buildSpssWorkbook(
  studyName: string,
  questions: QuestionRow[],
  responses: ResponseRow[]
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Plataforma de Encuestas';
  workbook.created = new Date();

  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);

  // --------- Construir columnas de datos ---------
  type ColumnDef = {
    varName: string;
    header: string;
    kind: 'id' | 'date' | 'single' | 'multi-option' | 'text' | 'number';
    questionId: string;
    optionIndex?: number;
  };

  const columns: ColumnDef[] = [
    { varName: 'ID', header: 'ID', kind: 'id', questionId: '' },
    { varName: 'FECHA', header: 'Fecha y hora', kind: 'date', questionId: '' },
  ];

  sortedQuestions.forEach((q, idx) => {
    const varName = (q.varName || `P${idx + 1}`).toUpperCase();
    if (q.type === 'single' || q.type === 'scale') {
      columns.push({ varName, header: q.text, kind: 'single', questionId: q.id });
    } else if (q.type === 'multiple') {
      (q.options || []).forEach((_, optIdx) => {
        columns.push({
          varName: `${varName}_${optIdx + 1}`,
          header: `${q.text} [${(q.options || [])[optIdx]}]`,
          kind: 'multi-option',
          questionId: q.id,
          optionIndex: optIdx,
        });
      });
    } else if (q.type === 'number') {
      columns.push({ varName, header: q.text, kind: 'number', questionId: q.id });
    } else {
      columns.push({ varName: `${varName}_TXT`, header: q.text, kind: 'text', questionId: q.id });
    }
  });

  const dataSheet = workbook.addWorksheet('Datos');
  dataSheet.addRow(columns.map((c) => c.varName));
  const headerRow = dataSheet.addRow(columns.map((c) => c.header));
  headerRow.font = { italic: true, size: 9, color: { argb: 'FF666666' } };
  dataSheet.views = [{ state: 'frozen', ySplit: 2 }];

  responses.forEach((r, i) => {
    const row: (string | number | null)[] = [];
    columns.forEach((col) => {
      if (col.kind === 'id') {
        row.push(i + 1);
        return;
      }
      if (col.kind === 'date') {
        row.push(r.createdAt.toISOString());
        return;
      }
      const q = sortedQuestions.find((q) => q.id === col.questionId);
      const value = r.answers ? (r.answers as Record<string, unknown>)[col.questionId] : undefined;

      if (col.kind === 'single') {
        if (typeof value === 'string' && q?.options) {
          const idx = q.options.indexOf(value);
          row.push(idx >= 0 ? idx + 1 : null);
        } else {
          row.push(null);
        }
      } else if (col.kind === 'multi-option') {
        const selected = Array.isArray(value) ? (value as string[]) : [];
        const optionLabel = q?.options?.[col.optionIndex ?? -1];
        row.push(optionLabel && selected.includes(optionLabel) ? 1 : 0);
      } else if (col.kind === 'number') {
        const n = typeof value === 'string' || typeof value === 'number' ? Number(value) : null;
        row.push(Number.isFinite(n) ? (n as number) : null);
      } else {
        row.push(typeof value === 'string' ? value : value != null ? String(value) : null);
      }
    });
    dataSheet.addRow(row);
  });

  dataSheet.columns.forEach((col) => {
    col.width = 22;
  });

  // --------- Hoja de diccionario / libro de códigos ---------
  const dictSheet = workbook.addWorksheet('Diccionario');
  dictSheet.addRow(['Variable', 'Pregunta', 'Tipo', 'Código', 'Etiqueta']);
  dictSheet.getRow(1).font = { bold: true };

  sortedQuestions.forEach((q, idx) => {
    const varName = (q.varName || `P${idx + 1}`).toUpperCase();
    const tipoLegible =
      q.type === 'single'
        ? 'Opción única'
        : q.type === 'multiple'
        ? 'Selección múltiple'
        : q.type === 'number'
        ? 'Numérica'
        : q.type === 'scale'
        ? 'Escala'
        : 'Texto abierto';

    if ((q.type === 'single' || q.type === 'scale') && q.options?.length) {
      q.options.forEach((opt, i) => {
        dictSheet.addRow([varName, q.text, tipoLegible, i + 1, opt]);
      });
    } else if (q.type === 'multiple' && q.options?.length) {
      q.options.forEach((opt, i) => {
        dictSheet.addRow([`${varName}_${i + 1}`, q.text, tipoLegible, '0 = No / 1 = Sí', opt]);
      });
    } else {
      dictSheet.addRow([varName, q.text, tipoLegible, '-', 'Respuesta libre']);
    }
  });
  dictSheet.columns.forEach((col) => {
    col.width = 30;
  });

  const infoSheet = workbook.addWorksheet('Instrucciones SPSS');
  infoSheet.addRow([`Estudio: ${studyName}`]);
  infoSheet.addRow([`Total de respuestas: ${responses.length}`]);
  infoSheet.addRow(['']);
  infoSheet.addRow(['Cómo importar en SPSS:']);
  infoSheet.addRow(['1. Abra SPSS Statistics.']);
  infoSheet.addRow(['2. Vaya a Archivo > Importar datos > Excel...']);
  infoSheet.addRow(['3. Seleccione este archivo y la hoja "Datos".']);
  infoSheet.addRow(['4. Marque la opción "Leer nombres de variables desde la primera fila de datos".']);
  infoSheet.addRow([
    '5. Use la hoja "Diccionario" como referencia para configurar Vista de variables > Etiquetas de valor.',
  ]);
  infoSheet.getColumn(1).width = 100;

  return workbook;
}

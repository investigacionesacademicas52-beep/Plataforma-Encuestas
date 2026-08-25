import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { parseDocxToQuestions } from '@/lib/docxParser';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const study = await prisma.study.findUnique({ where: { id: params.id } });
  if (!study) return NextResponse.json({ error: 'Estudio no encontrado' }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Debe adjuntar un archivo .docx' }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith('.docx')) {
    return NextResponse.json(
      { error: 'Formato no soportado. Suba un archivo Word (.docx).' },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let parsed;
  try {
    parsed = await parseDocxToQuestions(buffer);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'No se pudo leer el archivo. Verifique que sea un .docx válido.' },
      { status: 400 }
    );
  }

  if (parsed.questions.length === 0) {
    return NextResponse.json(
      { error: 'No se encontraron preguntas en el documento.' },
      { status: 400 }
    );
  }

  // Si el estudio aún no tiene texto de instrucciones, se propone
  // automáticamente el preámbulo detectado en el Word (presentación /
  // instrucciones generales que aparecían antes de la primera pregunta).
  const instructionsUpdate =
    !study.instructions && parsed.preamble ? { instructions: parsed.preamble } : {};

  // Reemplaza las preguntas existentes del estudio por las recién importadas
  await prisma.$transaction([
    prisma.question.deleteMany({ where: { studyId: study.id } }),
    prisma.question.createMany({
      data: parsed.questions.map((q, idx) => ({
        studyId: study.id,
        order: idx,
        text: q.text,
        type: q.type,
        options: q.options ? q.options : undefined,
        required: q.required,
        varName: `P${idx + 1}`,
      })),
    }),
    ...(Object.keys(instructionsUpdate).length
      ? [prisma.study.update({ where: { id: study.id }, data: instructionsUpdate })]
      : []),
  ]);

  const questions = await prisma.question.findMany({
    where: { studyId: study.id },
    orderBy: { order: 'asc' },
  });

  return NextResponse.json({ questions, count: questions.length });
}

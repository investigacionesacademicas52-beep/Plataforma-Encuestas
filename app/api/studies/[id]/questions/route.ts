import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

interface IncomingQuestion {
  text: string;
  type: string;
  options: string[] | null;
  required: boolean;
  varName?: string | null;
}

const VALID_TYPES = ['single', 'multiple', 'text', 'textarea', 'number', 'scale'];

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const study = await prisma.study.findUnique({ where: { id: params.id } });
  if (!study) return NextResponse.json({ error: 'Estudio no encontrado' }, { status: 404 });

  const { questions }: { questions: IncomingQuestion[] } = await req.json();

  if (!Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: 'Debe existir al menos una pregunta.' }, { status: 400 });
  }

  for (const q of questions) {
    if (!q.text || !q.text.trim()) {
      return NextResponse.json({ error: 'Todas las preguntas deben tener un enunciado.' }, { status: 400 });
    }
    if (!VALID_TYPES.includes(q.type)) {
      return NextResponse.json({ error: `Tipo de pregunta inválido: ${q.type}` }, { status: 400 });
    }
    if ((q.type === 'single' || q.type === 'multiple' || q.type === 'scale')) {
      const opts = (q.options || []).filter((o) => o && o.trim());
      if (opts.length < 2) {
        return NextResponse.json(
          { error: `La pregunta "${q.text}" necesita al menos 2 opciones.` },
          { status: 400 }
        );
      }
    }
  }

  await prisma.$transaction([
    prisma.question.deleteMany({ where: { studyId: study.id } }),
    prisma.question.createMany({
      data: questions.map((q, idx) => ({
        studyId: study.id,
        order: idx,
        text: q.text.trim(),
        type: q.type,
        options:
          q.type === 'single' || q.type === 'multiple' || q.type === 'scale'
            ? (q.options || []).filter((o) => o && o.trim())
            : undefined,
        required: q.required !== false,
        varName: (q.varName && q.varName.trim()) || `P${idx + 1}`,
      })),
    }),
  ]);

  const saved = await prisma.question.findMany({
    where: { studyId: study.id },
    orderBy: { order: 'asc' },
  });

  return NextResponse.json({ questions: saved });
}

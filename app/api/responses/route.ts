import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { slug, answers } = await req.json();

  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'Encuesta no válida.' }, { status: 400 });
  }

  const study = await prisma.study.findUnique({
    where: { slug },
    include: { questions: true },
  });

  if (!study || !study.isActive) {
    return NextResponse.json({ error: 'Esta encuesta ya no está disponible.' }, { status: 404 });
  }

  // Validar preguntas obligatorias
  for (const q of study.questions) {
    if (!q.required) continue;
    const val = answers?.[q.id];
    const empty =
      val === undefined ||
      val === null ||
      (typeof val === 'string' && !val.trim()) ||
      (Array.isArray(val) && val.length === 0);
    if (empty) {
      return NextResponse.json(
        { error: `Falta responder: "${q.text}"` },
        { status: 400 }
      );
    }
  }

  const userAgent = req.headers.get('user-agent') || undefined;

  await prisma.response.create({
    data: {
      studyId: study.id,
      answers: answers || {},
      userAgent,
    },
  });

  return NextResponse.json({ ok: true });
}

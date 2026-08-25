import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const study = await prisma.study.findUnique({
    where: { slug: params.slug },
    include: { questions: { orderBy: { order: 'asc' } } },
  });

  if (!study || !study.isActive) {
    return NextResponse.json({ error: 'Encuesta no disponible' }, { status: 404 });
  }

  return NextResponse.json({
    study: {
      id: study.id,
      name: study.name,
      description: study.description,
      institution: study.institution,
      targetAudience: study.targetAudience,
      presentation: study.presentation,
      instructions: study.instructions,
      questions: study.questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options,
        required: q.required,
      })),
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { buildSpssWorkbook } from '@/lib/exportXlsx';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const study = await prisma.study.findUnique({
    where: { id: params.id },
    include: {
      questions: { orderBy: { order: 'asc' } },
      responses: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!study) return NextResponse.json({ error: 'Estudio no encontrado' }, { status: 404 });

  const workbook = await buildSpssWorkbook(
    study.name,
    study.questions.map((q) => ({
      id: q.id,
      order: q.order,
      text: q.text,
      type: q.type,
      options: (q.options as string[] | null) || null,
      varName: q.varName,
    })),
    study.responses.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      answers: (r.answers as Record<string, unknown>) || {},
    }))
  );

  const buffer = await workbook.xlsx.writeBuffer();
  const safeName = study.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${safeName || 'estudio'}_datos.xlsx"`,
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const study = await prisma.study.findUnique({
    where: { id: params.id },
    include: {
      questions: { orderBy: { order: 'asc' } },
      _count: { select: { responses: true } },
    },
  });

  if (!study) return NextResponse.json({ error: 'Estudio no encontrado' }, { status: 404 });
  return NextResponse.json({ study });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof body.name === 'string') data.name = body.name.trim();
  if (typeof body.description === 'string' || body.description === null)
    data.description = body.description?.trim() || null;
  if (typeof body.institution === 'string' || body.institution === null)
    data.institution = body.institution?.trim() || null;
  if (typeof body.targetAudience === 'string' || body.targetAudience === null)
    data.targetAudience = body.targetAudience?.trim() || null;
  if (typeof body.presentation === 'string' || body.presentation === null)
    data.presentation = body.presentation?.trim() || null;
  if (typeof body.instructions === 'string' || body.instructions === null)
    data.instructions = body.instructions?.trim() || null;
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

  const study = await prisma.study.update({ where: { id: params.id }, data });
  return NextResponse.json({ study });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  await prisma.study.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { generateSlug } from '@/lib/shortcode';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const studies = await prisma.study.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { questions: true, responses: true } },
    },
  });

  return NextResponse.json({ studies });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { name, description } = await req.json();
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'El nombre del estudio es obligatorio.' }, { status: 400 });
  }

  let slug = generateSlug();
  // Asegurar unicidad del slug (muy improbable colisión, pero se verifica igual)
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.study.findUnique({ where: { slug } });
    if (!exists) break;
    slug = generateSlug();
  }

  const study = await prisma.study.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      slug,
      isActive: false,
    },
  });

  return NextResponse.json({ study });
}

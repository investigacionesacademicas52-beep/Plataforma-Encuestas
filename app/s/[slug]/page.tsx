import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import SurveyForm from '@/components/SurveyForm';

export const dynamic = 'force-dynamic';

export default async function SurveyPage({ params }: { params: { slug: string } }) {
  const study = await prisma.study.findUnique({
    where: { slug: params.slug },
    include: { questions: { orderBy: { order: 'asc' } } },
  });

  if (!study || !study.isActive) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SurveyForm
        slug={study.slug}
        studyName={study.name}
        studyDescription={study.description}
        institution={study.institution}
        targetAudience={study.targetAudience}
        presentation={study.presentation}
        instructions={study.instructions}
        questions={study.questions.map((q) => ({
          id: q.id,
          text: q.text,
          type: q.type as 'single' | 'multiple' | 'text' | 'textarea' | 'number' | 'scale',
          options: (q.options as string[] | null) || null,
          required: q.required,
        }))}
      />
    </div>
  );
}

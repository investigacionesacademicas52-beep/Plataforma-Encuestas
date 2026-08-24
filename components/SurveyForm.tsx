'use client';

import { useState } from 'react';

interface Question {
  id: string;
  text: string;
  type: 'single' | 'multiple' | 'text' | 'textarea' | 'number' | 'scale';
  options: string[] | null;
  required: boolean;
}

interface Props {
  slug: string;
  studyName: string;
  studyDescription: string | null;
  questions: Question[];
}

type AnswerValue = string | string[] | number | undefined;

export default function SurveyForm({ slug, studyName, studyDescription, questions }: Props) {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  function setAnswer(id: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function toggleMultiple(id: string, option: string) {
    setAnswers((prev) => {
      const current = Array.isArray(prev[id]) ? (prev[id] as string[]) : [];
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      return { ...prev, [id]: next };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo enviar la encuesta.');
        return;
      }
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mb-3 text-4xl">✅</div>
        <h1 className="mb-2 text-xl font-semibold text-gray-900">¡Gracias por participar!</h1>
        <p className="text-gray-500">Sus respuestas han sido registradas correctamente.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:py-12">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">{studyName}</h1>
        {studyDescription && <p className="mt-2 text-sm text-gray-600">{studyDescription}</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {questions.map((q, idx) => (
          <div key={q.id} className="card">
            <p className="mb-3 font-medium text-gray-900">
              {idx + 1}. {q.text}
              {q.required && <span className="ml-1 text-red-500">*</span>}
            </p>

            {(q.type === 'single' || q.type === 'scale') && (
              <div className="space-y-2">
                {(q.options || []).map((opt) => (
                  <label
                    key={opt}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={() => setAnswer(q.id, opt)}
                      required={q.required}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}

            {q.type === 'multiple' && (
              <div className="space-y-2">
                {(q.options || []).map((opt) => (
                  <label
                    key={opt}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={Array.isArray(answers[q.id]) && (answers[q.id] as string[]).includes(opt)}
                      onChange={() => toggleMultiple(q.id, opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}

            {q.type === 'text' && (
              <input
                className="input"
                value={(answers[q.id] as string) || ''}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                required={q.required}
              />
            )}

            {q.type === 'textarea' && (
              <textarea
                className="input"
                rows={3}
                value={(answers[q.id] as string) || ''}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                required={q.required}
              />
            )}

            {q.type === 'number' && (
              <input
                className="input"
                type="number"
                value={(answers[q.id] as number | string) ?? ''}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                required={q.required}
              />
            )}
          </div>
        ))}

        {error && <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

        <button className="btn-primary w-full" type="submit" disabled={submitting}>
          {submitting ? 'Enviando...' : 'Enviar respuestas'}
        </button>
      </form>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import QuestionEditor, { EditableQuestion } from '@/components/QuestionEditor';

interface StudyDetail {
  id: string;
  name: string;
  description: string | null;
  institution: string | null;
  targetAudience: string | null;
  presentation: string | null;
  instructions: string | null;
  slug: string;
  isActive: boolean;
  questions: EditableQuestion[];
  _count: { responses: number };
}

export default function StudyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [study, setStudy] = useState<StudyDetail | null>(null);
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [surveyUrl, setSurveyUrl] = useState('');

  const [institution, setInstitution] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [presentation, setPresentation] = useState('');
  const [instructions, setInstructions] = useState('');
  const [savingFormal, setSavingFormal] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studies/${id}`);
    if (!res.ok) {
      router.push('/admin/dashboard');
      return;
    }
    const data = await res.json();
    setStudy(data.study);
    setQuestions(data.study.questions);
    setInstitution(data.study.institution || '');
    setTargetAudience(data.study.targetAudience || '');
    setPresentation(data.study.presentation || '');
    setInstructions(data.study.instructions || '');
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (study) {
      setSurveyUrl(`${window.location.origin}/s/${study.slug}`);
    }
  }, [study]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setMessage('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/studies/${id}/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo procesar el archivo.');
        return;
      }
      setQuestions(data.questions);
      setMessage(
        `Se importaron ${data.count} preguntas. Revíselas abajo y ajuste lo necesario antes de activar la encuesta.`
      );
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleSaveQuestions() {
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const res = await fetch(`/api/studies/${id}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudieron guardar las preguntas.');
        return;
      }
      setQuestions(data.questions);
      setMessage('Cuestionario guardado correctamente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveFormalInfo() {
    setError('');
    setMessage('');
    setSavingFormal(true);
    try {
      const res = await fetch(`/api/studies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institution, targetAudience, presentation, instructions }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo guardar la información formal.');
        return;
      }
      setStudy((prev) => (prev ? { ...prev, ...data.study } : prev));
      setMessage('Información formal guardada correctamente.');
    } finally {
      setSavingFormal(false);
    }
  }

  async function toggleActive() {
    if (!study) return;
    const res = await fetch(`/api/studies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !study.isActive }),
    });
    const data = await res.json();
    if (res.ok) setStudy((prev) => (prev ? { ...prev, isActive: data.study.isActive } : prev));
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este estudio y todas sus respuestas? Esta acción no se puede deshacer.')) return;
    const res = await fetch(`/api/studies/${id}`, { method: 'DELETE' });
    if (res.ok) router.push('/admin/dashboard');
  }

  function copyLink() {
    navigator.clipboard.writeText(surveyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!study) return <p className="text-gray-500">Cargando...</p>;

  return (
    <div className="space-y-6">
      <div>
        <button className="mb-2 text-sm text-brand-600" onClick={() => router.push('/admin/dashboard')}>
          ← Volver a mis estudios
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{study.name}</h1>
            {study.description && <p className="text-sm text-gray-500">{study.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                study.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {study.isActive ? 'Encuesta activa' : 'Encuesta inactiva'}
            </span>
            <button className="btn-secondary text-sm" onClick={toggleActive}>
              {study.isActive ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </div>
      </div>

      {/* Enlace corto */}
      <div className="card">
        <h2 className="mb-2 font-medium text-gray-900">Enlace para compartir</h2>
        {!study.isActive && (
          <p className="mb-2 text-sm text-amber-600">
            Active la encuesta para que el enlace funcione con los encuestados.
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className="input flex-1" readOnly value={surveyUrl} onFocus={(e) => e.target.select()} />
          <button className="btn-primary" onClick={copyLink}>
            {copied ? 'Copiado ✓' : 'Copiar enlace'}
          </button>
        </div>
      </div>

      {/* Subida de cuestionario en Word */}
      <div className="card">
        <h2 className="mb-1 font-medium text-gray-900">Cargar cuestionario desde Word</h2>
        <p className="mb-3 text-sm text-gray-500">
          Suba un archivo .docx con preguntas numeradas (1., 2., ...) y opciones con letras o
          viñetas (a), b)... o -, •...). La aplicación las acomodará automáticamente; luego
          podrá revisarlas y ajustarlas abajo.
        </p>
        <input
          type="file"
          accept=".docx"
          onChange={handleUpload}
          disabled={uploading}
          className="text-sm"
        />
        {uploading && <p className="mt-2 text-sm text-gray-500">Procesando documento...</p>}
      </div>

      {/* Encabezado formal del instrumento */}
      <div className="card">
        <h2 className="mb-1 font-medium text-gray-900">Encabezado formal de la encuesta</h2>
        <p className="mb-3 text-sm text-gray-500">
          Esta información aparece en la parte superior del cuestionario, tal como en un
          instrumento de investigación formal. Todos los campos son opcionales.
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Institución / Universidad
            </label>
            <input
              className="input"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="Ej. Universidad de Panamá — Facultad de Administración de Empresas"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Dirigido a</label>
            <input
              className="input"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="Ej. Colaboradores de empresas agroindustriales de la provincia de Veraguas"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Presentación</label>
            <textarea
              className="input"
              rows={4}
              value={presentation}
              onChange={(e) => setPresentation(e.target.value)}
              placeholder="Párrafo(s) de presentación del estudio. Separe párrafos dejando una línea en blanco entre ellos."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Instrucciones generales
            </label>
            <textarea
              className="input"
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Ej. Lea cuidadosamente cada afirmación antes de responder..."
            />
            <p className="mt-1 text-xs text-gray-400">
              Si subió el cuestionario desde Word, este campo se llenó automáticamente con el
              texto que estaba antes de la primera pregunta. Puede editarlo libremente.
            </p>
          </div>

          <button className="btn-primary" onClick={handleSaveFormalInfo} disabled={savingFormal}>
            {savingFormal ? 'Guardando...' : 'Guardar encabezado'}
          </button>
        </div>
      </div>

      {message && <div className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{message}</div>}
      {error && <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      {/* Editor de preguntas */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium text-gray-900">Preguntas del cuestionario</h2>
          <button className="btn-primary" onClick={handleSaveQuestions} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
        <QuestionEditor questions={questions} onChange={setQuestions} />
      </div>

      {/* Resultados */}
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium text-gray-900">Resultados</h2>
          <p className="text-sm text-gray-500">{study._count.responses} respuestas recibidas</p>
        </div>
        <a className="btn-primary" href={`/api/studies/${id}/export`}>
          Descargar Excel (para SPSS)
        </a>
      </div>

      <div className="card border-red-100">
        <h2 className="mb-2 font-medium text-red-700">Zona de riesgo</h2>
        <button className="btn-secondary text-red-600" onClick={handleDelete}>
          Eliminar este estudio
        </button>
      </div>
    </div>
  );
}

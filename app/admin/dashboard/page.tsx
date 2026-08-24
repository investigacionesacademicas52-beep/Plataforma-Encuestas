'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface StudySummary {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  isActive: boolean;
  createdAt: string;
  _count: { questions: number; responses: number };
}

export default function DashboardPage() {
  const [studies, setStudies] = useState<StudySummary[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function loadStudies() {
    const res = await fetch('/api/studies');
    const data = await res.json();
    setStudies(data.studies || []);
  }

  useEffect(() => {
    loadStudies();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('El nombre del estudio es obligatorio.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/studies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo crear el estudio.');
        return;
      }
      setName('');
      setDescription('');
      setShowForm(false);
      await loadStudies();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Mis estudios</h1>
          <p className="text-sm text-gray-500">
            Cada estudio tiene su propio cuestionario, enlace y base de datos independientes.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : '+ Nuevo estudio'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nombre del estudio</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Percepción del clima laboral 2026"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Descripción (opcional)
            </label>
            <textarea
              className="input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción del objetivo del estudio"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary" type="submit" disabled={creating}>
            {creating ? 'Creando...' : 'Crear estudio'}
          </button>
        </form>
      )}

      {studies === null && <p className="text-gray-500">Cargando...</p>}

      {studies && studies.length === 0 && (
        <div className="card text-center text-gray-500">
          Aún no ha creado ningún estudio. Use el botón &quot;+ Nuevo estudio&quot; para comenzar.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {studies?.map((s) => (
          <Link
            key={s.id}
            href={`/admin/studies/${s.id}`}
            className="card block transition hover:border-brand-300 hover:shadow-md"
          >
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-medium text-gray-900">{s.name}</h2>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {s.isActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            {s.description && <p className="mb-3 text-sm text-gray-500">{s.description}</p>}
            <div className="flex gap-4 text-xs text-gray-500">
              <span>{s._count.questions} preguntas</span>
              <span>{s._count.responses} respuestas</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

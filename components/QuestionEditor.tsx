'use client';

export interface EditableQuestion {
  id?: string;
  text: string;
  type: 'single' | 'multiple' | 'text' | 'textarea' | 'number' | 'scale';
  options: string[] | null;
  required: boolean;
  varName?: string | null;
}

const TYPE_LABELS: Record<EditableQuestion['type'], string> = {
  single: 'Opción única',
  multiple: 'Selección múltiple',
  text: 'Texto corto',
  textarea: 'Texto largo',
  number: 'Numérica',
  scale: 'Escala (Likert)',
};

const NEEDS_OPTIONS: EditableQuestion['type'][] = ['single', 'multiple', 'scale'];

interface Props {
  questions: EditableQuestion[];
  onChange: (questions: EditableQuestion[]) => void;
}

export default function QuestionEditor({ questions, onChange }: Props) {
  function update(idx: number, patch: Partial<EditableQuestion>) {
    const next = questions.map((q, i) => (i === idx ? { ...q, ...patch } : q));
    onChange(next);
  }

  function updateOption(idx: number, optIdx: number, value: string) {
    const q = questions[idx];
    const opts = [...(q.options || [])];
    opts[optIdx] = value;
    update(idx, { options: opts });
  }

  function addOption(idx: number) {
    const q = questions[idx];
    update(idx, { options: [...(q.options || []), ''] });
  }

  function removeOption(idx: number, optIdx: number) {
    const q = questions[idx];
    const opts = (q.options || []).filter((_, i) => i !== optIdx);
    update(idx, { options: opts });
  }

  function addQuestion() {
    onChange([
      ...questions,
      { text: '', type: 'text', options: null, required: true },
    ]);
  }

  function removeQuestion(idx: number) {
    onChange(questions.filter((_, i) => i !== idx));
  }

  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  function handleTypeChange(idx: number, type: EditableQuestion['type']) {
    const needsOptions = NEEDS_OPTIONS.includes(type);
    update(idx, {
      type,
      options: needsOptions ? questions[idx].options && questions[idx].options!.length > 0 ? questions[idx].options : ['', ''] : null,
    });
  }

  return (
    <div className="space-y-4">
      {questions.map((q, idx) => (
        <div key={q.id || idx} className="card">
          <div className="mb-2 flex items-start justify-between gap-2">
            <span className="mt-2 shrink-0 text-xs font-medium text-gray-400">#{idx + 1}</span>
            <textarea
              className="input flex-1"
              rows={2}
              value={q.text}
              placeholder="Enunciado de la pregunta"
              onChange={(e) => update(idx, { text: e.target.value })}
            />
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-3">
            <select
              className="input w-auto"
              value={q.type}
              onChange={(e) => handleTypeChange(idx, e.target.value as EditableQuestion['type'])}
            >
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-1 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={q.required}
                onChange={(e) => update(idx, { required: e.target.checked })}
              />
              Obligatoria
            </label>

            <div className="ml-auto flex gap-1">
              <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => move(idx, -1)}>
                ↑
              </button>
              <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => move(idx, 1)}>
                ↓
              </button>
              <button
                type="button"
                className="btn-secondary px-2 py-1 text-xs text-red-600"
                onClick={() => removeQuestion(idx)}
              >
                Eliminar
              </button>
            </div>
          </div>

          {NEEDS_OPTIONS.includes(q.type) && (
            <div className="space-y-2 border-t border-gray-100 pt-3">
              {(q.options || []).map((opt, optIdx) => (
                <div key={optIdx} className="flex items-center gap-2">
                  <input
                    className="input"
                    value={opt}
                    placeholder={`Opción ${optIdx + 1}`}
                    onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-secondary px-2 py-1 text-xs"
                    onClick={() => removeOption(idx, optIdx)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" className="btn-secondary text-xs" onClick={() => addOption(idx)}>
                + Agregar opción
              </button>
            </div>
          )}
        </div>
      ))}

      <button type="button" className="btn-secondary w-full" onClick={addQuestion}>
        + Agregar pregunta
      </button>
    </div>
  );
}

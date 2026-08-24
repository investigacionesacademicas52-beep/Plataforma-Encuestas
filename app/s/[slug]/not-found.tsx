export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 text-center">
      <div>
        <div className="mb-3 text-4xl">🔒</div>
        <h1 className="mb-2 text-xl font-semibold text-gray-900">Encuesta no disponible</h1>
        <p className="text-gray-500">
          Este enlace no existe o la encuesta ya no está activa. Contacte a la persona que se lo
          compartió.
        </p>
      </div>
    </div>
  );
}

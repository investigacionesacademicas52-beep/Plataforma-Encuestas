'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminNav() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/admin/dashboard" className="font-semibold text-brand-700">
          Panel de Investigación
        </Link>
        <button onClick={handleLogout} className="btn-secondary text-sm">
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}

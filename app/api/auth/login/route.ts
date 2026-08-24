import { NextRequest, NextResponse } from 'next/server';
import { createSession, verifyCredentials } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Correo y contraseña son obligatorios.' }, { status: 400 });
  }

  if (!verifyCredentials(email, password)) {
    return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 401 });
  }

  await createSession(email);
  return NextResponse.json({ ok: true });
}

import { customAlphabet } from 'nanoid';

// Alfabeto sin caracteres ambiguos (0/O, 1/l/I) para que el enlace sea fácil de transcribir
const alphabet = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';

export const generateSlug = customAlphabet(alphabet, 7);

export function buildSurveyUrl(slug: string) {
  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || '';
  return `${base}/s/${slug}`;
}

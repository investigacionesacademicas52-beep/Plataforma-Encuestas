# Plataforma de Encuestas para Investigación

Aplicación web para recolectar datos de investigación mediante cuestionarios en línea.
Permite manejar **varios estudios/cuestionarios de forma independiente**, cargar el
cuestionario desde un archivo de **Word (.docx)**, generar un **enlace corto** para
compartir con los encuestados, y **exportar los resultados a Excel** listos para
importar en **SPSS**.

## Características

- 📋 Múltiples estudios, cada uno con su propio cuestionario, enlace y respuestas.
- 📄 Carga de cuestionarios desde Word (.docx): la app detecta preguntas numeradas,
  opciones de respuesta y arma el formulario automáticamente.
- ✏️ Editor visual para revisar/ajustar preguntas (tipo de pregunta, opciones,
  obligatoriedad) antes de publicar la encuesta.
- 🔗 Enlace corto y funcional (`tudominio.com/s/xxxxxxx`) para cada estudio.
- 📱 Formulario 100% responsive: se ve bien en celular, tablet y computadora.
- 📊 Exportación a Excel (.xlsx) con:
  - Hoja **Datos**: una fila por encuestado, variables codificadas numéricamente.
  - Hoja **Diccionario**: libro de códigos con las etiquetas de cada valor.
  - Hoja **Instrucciones SPSS**: pasos para importarlo en SPSS.
- 🔒 Panel administrativo protegido con usuario/contraseña.

## Stack técnico

- [Next.js 14](https://nextjs.org/) (App Router) + TypeScript + Tailwind CSS
- [Prisma ORM](https://www.prisma.io/) + PostgreSQL
- [mammoth](https://github.com/mwilliamson/mammoth.js) para leer archivos Word
- [exceljs](https://github.com/exceljs/exceljs) para generar el Excel
- Pensado para desplegarse en **Vercel**, con el código en **GitHub**

---

## 1. Requisitos previos

- Node.js 18 o superior
- Una cuenta gratuita en [GitHub](https://github.com)
- Una cuenta gratuita en [Vercel](https://vercel.com)
- Una base de datos Postgres gratuita. Opciones recomendadas (todas tienen plan free):
  - [Neon](https://neon.tech) (recomendada, se integra fácil con Vercel)
  - [Vercel Postgres](https://vercel.com/storage/postgres)
  - [Supabase](https://supabase.com)

## 2. Configuración local (opcional, para probar antes de publicar)

```bash
npm install
cp .env.example .env
# Edite .env con su DATABASE_URL y credenciales de admin
npx prisma db push     # crea las tablas en su base de datos
npm run dev
```

Abra `http://localhost:3000` — le redirigirá al panel de administración.

## 3. Subir el proyecto a GitHub

```bash
git init
git add .
git commit -m "Plataforma de encuestas - versión inicial"
git branch -M main
git remote add origin https://github.com/SU_USUARIO/survey-app.git
git push -u origin main
```

> El archivo `.gitignore` ya está configurado para no subir `node_modules`, `.next`
> ni el archivo `.env` con sus credenciales.

## 4. Desplegar en Vercel

1. Entre a [vercel.com/new](https://vercel.com/new) e importe el repositorio de GitHub.
2. Vercel detectará automáticamente que es un proyecto Next.js (no requiere configuración
   adicional de build).
3. Antes de desplegar, agregue las **variables de entorno** (Project Settings → Environment
   Variables), tomando como referencia `.env.example`:

   | Variable | Descripción |
   |---|---|
   | `DATABASE_URL` | Cadena de conexión de su base de datos Postgres |
   | `ADMIN_EMAIL` | Correo para entrar al panel |
   | `ADMIN_PASSWORD` | Contraseña del panel |
   | `SESSION_SECRET` | Cadena aleatoria larga (ej. generada con `openssl rand -base64 32`) |
   | `NEXT_PUBLIC_BASE_URL` | URL pública de su app en Vercel, ej. `https://survey-app.vercel.app` |

4. Haga clic en **Deploy**.
5. Una vez desplegado, corra la sincronización del esquema de base de datos apuntando
   a la base de producción (puede hacerlo desde su computadora):

   ```bash
   DATABASE_URL="su_url_de_produccion" npx prisma db push
   ```

6. Vuelva a desplegar (o simplemente entre a la URL) — ya puede iniciar sesión en
   `/login` con las credenciales configuradas.

> Si más adelante cambia `NEXT_PUBLIC_BASE_URL` (por ejemplo, al usar un dominio propio),
> actualice la variable en Vercel y vuelva a desplegar para que los enlaces cortos
> se generen con el dominio correcto.

---

## 5. Cómo usar la aplicación

### Crear un estudio
1. Inicie sesión en el panel.
2. Clic en **"+ Nuevo estudio"**, ingrese nombre y descripción.

### Cargar el cuestionario desde Word
1. Entre al estudio creado.
2. En "Cargar cuestionario desde Word", suba su archivo `.docx`.
3. La aplicación intentará detectar automáticamente las preguntas y sus opciones.
4. Revise el resultado en el editor de preguntas: ajuste el tipo (opción única,
   selección múltiple, texto, numérica, escala), corrija opciones y marque cuáles
   son obligatorias.
5. Clic en **"Guardar cambios"**.

**Recomendaciones de formato para el Word** (mejoran la detección automática):
- Numere las preguntas: `1.`, `2.`, `3.` ...
- Las opciones de respuesta en líneas separadas, iniciando con letra y paréntesis
  o punto (`a)`, `b)`, `c)` ...) o con viñetas (`-`, `•`).
- Para preguntas de selección múltiple, incluya en el enunciado una frase guía como
  *"Seleccione todas las que apliquen"*.
- Para preguntas abiertas, puede dejar una línea con guiones bajos (`____________`)
  o simplemente no poner opciones.

Aunque la detección automática funciona con la mayoría de formatos comunes, siempre
revise el resultado en el editor antes de activar la encuesta — puede agregar,
eliminar o editar preguntas manualmente en cualquier momento.

### Publicar y compartir
1. Active la encuesta con el botón **"Activar"**.
2. Copie el enlace corto (`.../s/xxxxxxx`) y compártalo con los encuestados.
   El formulario es responsive y funciona en cualquier dispositivo.

### Descargar resultados para SPSS
1. En la página del estudio, clic en **"Descargar Excel (para SPSS)"**.
2. Abra SPSS → **Archivo → Importar datos → Excel...**
3. Seleccione la hoja **"Datos"** y marque "Leer nombres de variables desde la
   primera fila de datos".
4. Use la hoja **"Diccionario"** como guía para configurar las **Etiquetas de valor**
   de cada variable en la Vista de variables de SPSS.

---

## 6. Notas de seguridad y limitaciones

- El panel usa un único usuario administrador definido por variables de entorno
  (`ADMIN_EMAIL` / `ADMIN_PASSWORD`). Si necesita varios usuarios con permisos
  distintos, se debe agregar un modelo `Admin` en `prisma/schema.prisma` y
  ampliar la lógica en `lib/auth.ts`.
- El archivo generado es `.xlsx` (Excel moderno), que SPSS importa de forma nativa;
  no se genera un `.sav` binario propietario, pero la hoja "Diccionario" facilita
  configurar las etiquetas de valores en un par de minutos.
- El detector de preguntas desde Word es heurístico: cubre los formatos más comunes
  de cuestionarios, pero documentos con diseños muy particulares (tablas, columnas,
  preguntas sin numerar) pueden requerir ajuste manual en el editor — que está
  incluido precisamente para cubrir esos casos.

## 7. Estructura del proyecto

```
survey-app/
├── app/
│   ├── admin/            # Panel administrativo (protegido)
│   ├── api/               # Endpoints (estudios, preguntas, respuestas, export)
│   ├── s/[slug]/           # Página pública de cada encuesta
│   └── login/              # Login del panel
├── components/             # Componentes reutilizables (formulario, editor)
├── lib/                    # Prisma, autenticación, parser de Word, generador Excel
├── prisma/schema.prisma    # Modelo de datos
└── middleware.ts           # Protección de rutas /admin
```

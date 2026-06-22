# Generador de Estrategia de Instagram — Dúo Studio Digital

Herramienta para que clientes/prospectos completen un formulario sobre su empresa y reciban
una estrategia de Instagram generada con IA (estrategia, calendario, Reels, Stories, paleta,
tipografías, público, competencia, embudo y plan de anuncios).

## Estructura del proyecto

```
duo-instagram-tool/
├── index.html        ← la herramienta (formulario + resultados). Esto es lo que ve el usuario.
├── api/
│   └── generate.js    ← función serverless que llama a la IA de forma segura (con tu API key)
├── vercel.json         ← configuración de despliegue
└── package.json
```

¿Por qué dos partes? Porque la clave de la API de Anthropic **nunca puede vivir en el HTML**
(cualquiera que abra "Ver código fuente" la vería y podría gastar tu cuota). Por eso el
formulario le pide los datos a `/api/generate`, y esa función — que corre en el servidor,
no en el navegador del visitante — es la única que conoce la clave y habla con la IA.

## Pasos para publicarlo (con Vercel — gratis para este uso)

### 1. Conseguir una API key de Anthropic
- Entrá a [console.anthropic.com](https://console.anthropic.com)
- Creá una cuenta/organización si no tenés, cargá un método de pago (se cobra por uso, este
  tipo de generación cuesta centavos de dólar por cada estrategia).
- En **API Keys**, generá una clave nueva. Copiala, no se vuelve a mostrar completa.

### 2. Subir el proyecto a Vercel
**Opción A — sin usar terminal (más fácil):**
1. Creá un repositorio en GitHub y subí esta carpeta completa (`index.html`, `api/`, `vercel.json`, `package.json`).
2. Entrá a [vercel.com](https://vercel.com), conectá tu cuenta de GitHub.
3. "Add New Project" → elegí el repositorio → "Deploy" (no hace falta tocar ninguna configuración).

**Opción B — con terminal:**
```bash
npm i -g vercel
cd duo-instagram-tool
vercel
```
Seguí las preguntas (acepta los valores por defecto).

### 3. Configurar la API key en Vercel
1. En el dashboard de Vercel, abrí tu proyecto → **Settings → Environment Variables**.
2. Agregá:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** la clave que copiaste en el paso 1.
   - Aplicar a: Production, Preview y Development.
3. Volvé a **Deployments** y hacé "Redeploy" para que tome la variable nueva.

### 4. Conectar tu dominio
Si quieren algo como `estrategia.duostudiodigital.com.ar` o `herramientas.duostudiodigital.com.ar`:
1. En el proyecto de Vercel → **Settings → Domains** → agregá el subdominio.
2. Vercel te va a dar un registro CNAME para agregar en el panel de DNS donde tengan
   comprado el dominio (el mismo lugar donde configuraron `academia.duostudiodigital.com.ar`).
3. Una vez propagado (puede tardar de minutos a un par de horas), el subdominio queda activo.

Si prefieren no usar subdominio, también pueden usar el link gratuito que da Vercel
(`algo.vercel.app`) o embeber la herramienta como una página dentro de la web principal
(con un `<iframe>` apuntando a esa URL).

## Probarlo en local antes de subir (opcional)
```bash
npm i -g vercel
cd duo-instagram-tool
vercel dev
```
Esto levanta el sitio en `http://localhost:3000` con la función serverless funcionando,
así podés probar el formulario completo antes de publicarlo.

## Costos a tener en cuenta
- **Vercel:** el plan gratuito (Hobby) alcanza de sobra para este uso.
- **Anthropic API:** se cobra por uso (tokens). Cada estrategia generada consume una
  cantidad pequeña de tokens; conviene revisar el panel de uso en console.anthropic.com
  si lo van a ofrecer públicamente a muchos visitantes, para evitar sorpresas en la factura.

## Si quieren integrarlo dentro del proyecto Next.js de la academia
En vez de un proyecto aparte, esto se puede llevar como:
- Una página nueva (`/herramientas/estrategia-instagram`) dentro del repo de
  `academia.duostudiodigital.com.ar`.
- El contenido de `index.html` se adapta a un componente de React/Next.
- `api/generate.js` se mueve a `app/api/generate/route.ts` (App Router) o
  `pages/api/generate.ts` (Pages Router), con la misma lógica.
Avisame si quieren que lo prepare directamente en ese formato.

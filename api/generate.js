// api/generate.js
// Función serverless de Vercel. Recibe los datos del formulario,
// llama a la API de Anthropic con la clave guardada en el servidor
// (nunca expuesta al navegador) y devuelve el JSON de la estrategia.

export default async function handler(req, res) {
  // CORS: permite llamadas seguras a esta función.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Solo aceptamos POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Falta configurar ANTHROPIC_API_KEY en las variables de entorno del proyecto."
    });
  }

  const { datos } = req.body || {};

  if (!datos || !datos.nombre || !datos.rubro || !datos.descripcion) {
    return res.status(400).json({ error: "Faltan datos obligatorios del formulario." });
  }

  const systemPrompt = `Sos un equipo de estrategas de redes sociales de una agencia creativa. Hablás en español rioplatense (Argentina), con lenguaje inclusivo y cercano, nunca corporativo ni genérico. Generás estrategias de Instagram realistas, específicas y accionables para pequeñas empresas y emprendimientos de Latinoamérica.

Vas a recibir datos de una empresa y debés devolver EXCLUSIVAMENTE un objeto JSON válido (sin texto antes ni después, sin backticks de markdown) con esta estructura exacta:

{
  "empresa": "nombre de la empresa",
  "estrategia": "HTML simple (usando solo <h4>, <p>, <ul><li>) con: pilares de contenido (3 a 4 pilares con nombre y breve explicación), objetivo central reformulado, mensaje clave de marca, y frecuencia de publicación recomendada. Sea especifico al rubro, no generico.",
  "calendario": {
    "intro": "una frase breve introductoria",
    "semanas": [
      {"semana":"Semana 1", "items":[{"dia":"Lunes","formato":"Reel","tema":"tema especifico"}, ... 5 a 7 items por semana]}
      ... 4 semanas
    ]
  },
  "reels": "HTML simple (<h4><p><ul><li>) con 8 a 10 ideas de reels concretas y especificas al rubro, agrupadas en 2-3 categorias con encabezados h4",
  "stories": "HTML simple con 10 a 12 ideas de stories interactivas (encuestas, preguntas, cuentaregresivas, detras de escena) especificas al rubro, agrupadas en categorias con h4",
  "paleta": {
    "intro": "breve explicacion de por que esta paleta encaja con la marca",
    "colores": [{"hex":"#xxxxxx","nombre":"nombre del color","uso":"para que usarlo"}, ... 4 a 5 colores]
  },
  "tipografias": "HTML simple con 2 a 3 tipografias recomendadas (nombre real de fuente de Google Fonts), explicando el uso de cada una (titulos, cuerpo, acentos) y por que encajan con el tono de marca",
  "publico": "HTML simple con: datos demograficos (edad, genero, ubicacion), intereses, dolores y necesidades, donde los encuentra, que contenido consume",
  "competencia": "HTML simple con 3 competidores tipo (genericos del rubro, no inventar nombres de marcas reales) describiendo que hacen bien, que oportunidad dejan abierta, y como diferenciarse",
  "embudo": "HTML simple con las etapas Atraccion, Interes, Deseo, Accion y Fidelizacion, cada una con que contenido o accion de instagram corresponde a esa etapa especificamente para este negocio",
  "anuncios": "HTML simple con: tipo de campañas recomendadas segun el presupuesto declarado, objetivo de cada campaña, segmentacion sugerida, y presupuesto sugerido por campaña en USD"
}

Reglas importantes:
- Todo el contenido debe ser especifico a la empresa descripta, no generico.
- Usa lenguaje inclusivo (terminaciones neutras o "@" cuando sea natural, sin forzarlo en cada palabra).
- Los textos HTML deben usar SOLO las etiquetas h4, p, ul, li (nada de estilos inline, nada de h1/h2/h3, nada de markdown).
- No incluyas explicaciones fuera del JSON. Responde SOLO con el JSON.`;

  const userPrompt = `Datos de la empresa:
Nombre: ${datos.nombre}
Rubro: ${datos.rubro}
Descripcion: ${datos.descripcion}
Ubicacion: ${datos.ubicacion}
Publico actual: ${datos.publico_actual}
Objetivo principal: ${datos.objetivo}
Tono de marca deseado: ${datos.tono}
Presupuesto mensual de anuncios: ${datos.presupuesto}
Nivel actual en redes: ${datos.nivel}
Informacion adicional: ${datos.extra}

Genera el JSON completo siguiendo exactamente la estructura indicada.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 16000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Error de Anthropic:", errText);
      return res.status(502).json({ error: "Error al generar la estrategia. Intentá de nuevo." });
    }

    const data = await response.json();

    // Si Claude se quedó sin tokens, la respuesta viene cortada a mitad de un
    // string y el JSON.parse va a fallar sí o sí. En vez de intentar parsear
    // algo roto y devolver un error 500 genérico, avisamos claro qué pasó.
    if (data.stop_reason === "max_tokens") {
      console.error("Claude se quedo sin tokens (stop_reason: max_tokens). La respuesta vino incompleta.");
      return res.status(502).json({
        error: "La estrategia generada quedó demasiado larga y se cortó antes de terminar. Probá generarla de nuevo (a veces ayuda achicar un poco la descripción del negocio)."
      });
    }

    let text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    text = text.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      try {
        parsed = JSON.parse(text.substring(start, end + 1));
      } catch (e2) {
        console.error("No se pudo parsear el JSON de Claude:", e2);
        return res.status(502).json({
          error: "La respuesta de la IA no llegó en un formato válido. Probá generarla de nuevo."
        });
      }
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error inesperado del servidor." });
  }
}

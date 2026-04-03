const GEMINI_MODELS = (process.env.GEMINI_MODELS || 'gemini-2.5-flash,gemini-2.0-flash,gemini-flash-latest,gemini-2.0-flash-lite')
  .split(',').map(m => m.trim()).filter(Boolean);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  const { userMessage } = req.body;

  if (!userMessage || typeof userMessage !== 'string') {
    return res.status(400).json({ error: 'El campo userMessage es obligatorio' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en el servidor' });
  }

  try {
    let data = null;
    let selectedModel = null;
    let lastError = null;

    for (const modelName of GEMINI_MODELS) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Eres un asistente experto en economia circular y sustentabilidad para RenovaRed.
Ayudas con reciclaje, reutilizacion de materiales, puntos de acopio y productos ecologicos.
Responde de manera amable, concisa y en espanol.

Pregunta del usuario: ${userMessage}`
              }]
            }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
          })
        }
      );

      const modelResponse = await response.json().catch(() => ({}));

      if (response.ok) {
        data = modelResponse;
        selectedModel = modelName;
        break;
      }

      const errorMsg = modelResponse?.error?.message || 'Error desconocido';
      lastError = { status: response.status, model: modelName, details: errorMsg };

      const isModelNotFound = response.status === 404 && /not found|models\//i.test(errorMsg);
      if (!isModelNotFound) break;
    }

    if (!data) {
      console.error('Gemini error:', lastError);
      return res.status(200).json({
        reply: 'El servicio de IA esta temporalmente no disponible. Mientras se restablece: separa papel, plastico, vidrio y metales; limpia envases antes de reciclar; prioriza reutilizar antes de desechar.',
        model: 'fallback-static'
      });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      return res.status(200).json({
        reply: 'No pude generar una respuesta en este momento. Intenta de nuevo.',
        model: 'fallback-empty'
      });
    }

    return res.status(200).json({ reply, model: selectedModel });
  } catch (error) {
    console.error('Error en /api/chat:', error);
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
}

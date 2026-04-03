// api/chat.js (crea esta carpeta en la raíz de tu proyecto)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { messages, userMessage } = req.body;

  // Opción 1: Usar OpenAI
 /* const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    }),
  });
  */
   //Opción 2: Usar Google Gemini (alternativa)
   const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       contents: [{ parts: [{ text: userMessage }] }]
     })
   });
  const data = await geminiResponse.json();
  const reply = data.choices[0].message.content;



  res.status(200).json({ reply });
}
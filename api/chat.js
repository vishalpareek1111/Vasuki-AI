export default async function handler(req, res) {
  const API_KEY = process.env.GEMINI_API_KEY;

  const { message } = req.body;

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-002:generateContent?key=" + API_KEY,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: message }] }]
      })
    }
  );

  const data = await response.json();

  const reply =
    data.candidates?.[0]?.content?.parts?.[0]?.text || "No reply";

  res.status(200).json({ reply });
}

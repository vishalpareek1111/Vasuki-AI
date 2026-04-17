export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST allowed' });

  const groqKey = process.env.GROQ_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;

  if (!groqKey) return res.status(500).json({ error: 'API key not configured' });

  const { messages } = req.body;
  if (!messages || !messages.length) return res.status(400).json({ error: 'No messages' });

  const lastMsg = messages[messages.length - 1].content || '';
  const needsSearch = /aaj|today|abhi|live|score|news|price|weather|mausam|latest|2025|2026|ipl|cricket|match|current|kaun jeet|winner/i.test(lastMsg);

  let searchContext = '';
  if (needsSearch && tavilyKey) {
    try {
      const sr = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: tavilyKey, query: lastMsg, max_results: 3 })
      });
      const sd = await sr.json();
      if (sd.results && sd.results.length > 0) {
        searchContext = '\n\n[Real-time search results]\n' + sd.results.map(r => '- ' + r.title + ': ' + r.content).join('\n');
      }
    } catch (e) {}
  }

  const updatedMessages = [...messages];
  if (searchContext) {
    updatedMessages[updatedMessages.length - 1] = {
      role: 'user',
      content: lastMsg + searchContext
    };
  }

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + groqKey
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: updatedMessages,
        temperature: 0.8,
        max_tokens: 1024
      })
    });
    const data = await r.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

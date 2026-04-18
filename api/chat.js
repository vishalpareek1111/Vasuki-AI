export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST allowed' });

  const groqKey   = process.env.GROQ_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;

  if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY not set in Vercel environment variables' });

  const { messages } = req.body;
  if (!messages || !messages.length) return res.status(400).json({ error: 'No messages provided' });

  // Last user message
  const lastMsg = messages[messages.length - 1].content || '';

  // Check if real-time search is needed
  const needsSearch = /aaj|today|abhi|live|score|news|price|weather|mausam|latest|2025|2026|ipl|cricket|match|current|kaun jeet|winner|kya hua|update|breaking/i.test(lastMsg);

  let searchContext = '';

  if (needsSearch && tavilyKey) {
    try {
      const sr = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: tavilyKey,
          query: lastMsg,
          max_results: 4,
          search_depth: 'advanced',
          include_answer: true
        })
      });
      const sd = await sr.json();
      if (sd.answer) {
        searchContext += '\n\n[Live Search Answer]: ' + sd.answer;
      }
      if (sd.results && sd.results.length > 0) {
        searchContext += '\n[Live Search Results]:\n' + sd.results.map(r => '- ' + r.title + ': ' + (r.content || '').slice(0, 200)).join('\n');
      }
    } catch (e) {
      // Search fail ho to bhi chat chalti rahe
      console.error('Tavily error:', e.message);
    }
  }

  // Inject search context into last user message
  const finalMessages = [...messages];
  if (searchContext) {
    finalMessages[finalMessages.length - 1] = {
      role: 'user',
      content: lastMsg + searchContext + '\n\nUpar diye gaye live results ke aadhar pe jawab do.'
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
        messages: finalMessages,
        temperature: 0.8,
        max_tokens: 1024
      })
    });

    const data = await r.json();

    if (!r.ok) {
      const errMsg = (data && data.error && data.error.message) ? data.error.message : 'Groq API error ' + r.status;
      return res.status(r.status).json({ error: errMsg });
    }

    return res.status(200).json(data);

  } catch (e) {
    console.error('Groq error:', e);
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

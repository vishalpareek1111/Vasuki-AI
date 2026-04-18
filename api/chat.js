const GROQ_API_KEY   = process.env.GROQ_API_KEY;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

// Keywords jo search trigger karenge
const SEARCH_TRIGGERS = [
  'aaj', 'today', 'abhi', 'news', 'score', 'weather', 'mausam',
  'ipl', 'cricket', 'match', 'latest', 'current', 'live', 'price',
  'rate', '2024', '2025', '2026', 'kya hua', 'what happened',
  'stock', 'share', 'election', 'result', 'winner', 'trending'
];

function needsSearch(messages) {
  var lastMsg = messages.filter(m => m.role === 'user').pop();
  if (!lastMsg) return false;
  var text = lastMsg.content.toLowerCase();
  return SEARCH_TRIGGERS.some(kw => text.includes(kw));
}

async function tavilySearch(query) {
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: query,
        search_depth: 'basic',
        max_results: 3,
        include_answer: true
      })
    });
    const data = await res.json();
    if (data.answer) return `[Live Info]: ${data.answer}`;
    if (data.results && data.results.length > 0) {
      return '[Live Info]: ' + data.results
        .slice(0, 2)
        .map(r => r.title + ': ' + r.content.slice(0, 200))
        .join(' | ');
    }
    return null;
  } catch (e) {
    console.error('Tavily error:', e.message);
    return null;
  }
}

async function groqChat(messages) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: messages,
      max_tokens: 1024,
      temperature: 0.7
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Groq error ' + res.status);
  return data;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY missing — Vercel env set karo' });

  try {
    var { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array chahiye' });
    }

    // Live search check
    if (TAVILY_API_KEY && needsSearch(messages)) {
      var lastUser = messages.filter(m => m.role === 'user').pop();
      var searchResult = await tavilySearch(lastUser.content);
      if (searchResult) {
        // System message mein live data inject karo
        messages = messages.map(m => {
          if (m.role === 'system') {
            return { ...m, content: m.content + '\n\n' + searchResult };
          }
          return m;
        });
      }
    }

    var data = await groqChat(messages);
    return res.status(200).json(data);

  } catch (e) {
    console.error('VasuKi API error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}

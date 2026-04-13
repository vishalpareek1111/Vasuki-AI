export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const groqKey = process.env.GROQ_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;
  const { messages } = req.body;

  const lastMessage = messages[messages.length - 1].content;

  // Check karo real-time search chahiye ya nahi
  const needsSearch = /aaj|today|abhi|live|score|news|price|weather|mausam|latest|2024|2025|2026|ipl|cricket|match|current/i.test(lastMessage);

  let searchContext = '';

  if (needsSearch && tavilyKey) {
    try {
      const searchRes = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: tavilyKey,
          query: lastMessage,
          max_results: 3
        })
      });
      const searchData = await searchRes.json();
      if (searchData.results && searchData.results.length > 0) {
        searchContext = '\n\nReal-time search results:\n' +
          searchData.results.map(r => `- ${r.title}: ${r.content}`).join('\n');
      }
    } catch (e) {
      console.log('Search error:', e.message);
    }
  }

  // Add search context to last message
  const updatedMessages = [...messages];
  if (searchContext) {
    updatedMessages[updatedMessages.length - 1] = {
      role: 'user',
      content: lastMessage + searchContext
    };
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

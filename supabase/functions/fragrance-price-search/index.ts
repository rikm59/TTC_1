import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RETAILERS_NOTE =
  "Sephora, Ulta, Nordstrom, Macy's, FragranceX, FragranceNet, Notino, Perfumania, Jomashop, Amazon, Walmart, Target, and official brand sites"

const MAX_QUERY_LENGTH = 200

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    if (!ANTHROPIC_API_KEY) return json({ error: 'Price search is not configured' }, 500)

    const { query } = await req.json()
    if (!query || typeof query !== 'string' || !query.trim()) {
      return json({ error: 'Missing query' }, 400)
    }
    const searchName = query.trim().slice(0, MAX_QUERY_LENGTH)

    const instructions = `You are a fragrance price research assistant. Identify the exact fragrance named "${searchName}" (brand, full product name, and the most common retail size in the US market, e.g. 100ml/3.4oz). Then use web search to find its current price at legitimate, authorized retailers only — for example ${RETAILERS_NOTE}. Never include resale marketplaces, auction sites, or unverified third-party sellers.

Find at least 4 retailers if possible, prioritizing ones with a clear, current price for the same size/concentration (EDT vs EDP matters — note the concentration).

Respond with ONLY a raw JSON object, no markdown fences, no commentary, in exactly this shape:
{
  "brand": "string",
  "name": "string",
  "concentration": "string (e.g. Eau de Parfum)",
  "size": "string (e.g. 100ml / 3.4 oz)",
  "results": [
    { "retailer": "string", "price": "string (e.g. $128.00)", "size": "string", "url": "string", "inStock": true }
  ],
  "notes": "string, one short sentence on anything relevant (e.g. price varies by size, one retailer out of stock)"
}
If you cannot confidently identify the fragrance, set "brand" and "name" to your best guess and add a note explaining the uncertainty.`

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{ role: 'user', content: instructions }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      }),
    })

    if (!anthropicRes.ok) {
      const detail = await anthropicRes.text()
      return json({ error: `Price search failed (${anthropicRes.status})`, detail }, 502)
    }

    const data = await anthropicRes.json()
    const textBlocks = (data.content || [])
      .filter((item: { type: string }) => item.type === 'text')
      .map((item: { text: string }) => item.text)
      .join('\n')

    const cleaned = textBlocks.replace(/```json|```/g, '').trim()
    const jsonStart = cleaned.indexOf('{')
    const jsonEnd = cleaned.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) {
      return json({ error: 'Could not parse a result from the response', raw: cleaned.slice(0, 300) }, 502)
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1))
    } catch {
      return json({ error: 'Could not parse a result from the response', raw: cleaned.slice(0, 300) }, 502)
    }

    return json(parsed, 200)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

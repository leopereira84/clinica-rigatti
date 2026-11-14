// CI only: minimal stand-in for the OpenAI Chat Completions API, so the chat is
// tested end to end (real backend, real tools, real database) without credits.
// It plays the model: first asks the backend to run `search_products` with a
// keyword taken from the user message, then answers only from the tool result.
// GET /__log returns the request bodies it received (to check tenant isolation).
import http from 'node:http';

const PORT = 4010;
const log = [];

function completion(res, model, message, finishReason) {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(
    JSON.stringify({
      id: 'chatcmpl-stub',
      object: 'chat.completion',
      created: 0,
      model,
      choices: [{ index: 0, finish_reason: finishReason, message: { role: 'assistant', refusal: null, content: null, ...message } }],
      usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 },
    }),
  );
}

http
  .createServer((req, res) => {
    if (req.method === 'GET') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(req.url === '/__log' ? log : { status: 'ok' }));
      return;
    }
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      log.push(raw);
      const body = JSON.parse(raw);
      const last = body.messages.at(-1);
      if (last.role === 'user') {
        const text = String(last.content).toLowerCase();
        const keyword = ['banco', 'cadeira', 'luminária', 'vaso'].find((k) => text.includes(k)) ?? null;
        const args = { query: keyword, category: null, min_price: null, max_price: null, in_stock_only: null, sort: null, limit: 10 };
        completion(
          res,
          body.model,
          { tool_calls: [{ id: `call_${log.length}`, type: 'function', function: { name: 'search_products', arguments: JSON.stringify(args) } }] },
          'tool_calls',
        );
        return;
      }
      const result = JSON.parse(last.content);
      const answer = result.products?.length
        ? `Encontrei ${result.total_matches} produto(s):\n${result.products.map((p) => `- ${p.name} (${p.price_formatted})`).join('\n')}`
        : 'Não encontrei produtos correspondentes no catálogo da sua empresa.';
      completion(res, body.model, { content: answer }, 'stop');
    });
  })
  .listen(PORT, () => console.log(`LLM stub listening on ${PORT}`));

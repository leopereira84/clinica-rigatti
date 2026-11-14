// End-to-end checks of the Docker environment, through the frontend (nginx) URL.
// Usage:
//   node docker/ci/smoke-test.mjs full           # after `up` + `run --rm seed`
//   node docker/ci/smoke-test.mjs after-restart  # after `down` + `up` (no -v): data must persist
// Env: BASE_URL (default http://localhost:8080), SEED_PASSWORD (required),
//      STUB_URL (default http://127.0.0.1:4010, the simulated LLM of compose.ci.yml).
const MODE = process.argv[2];
const BASE = process.env.BASE_URL ?? 'http://localhost:8080';
const STUB = process.env.STUB_URL ?? 'http://127.0.0.1:4010';
const PASSWORD = process.env.SEED_PASSWORD;
if (!['full', 'after-restart'].includes(MODE) || !PASSWORD) {
  console.error('usage: SEED_PASSWORD=... node smoke-test.mjs full|after-restart');
  process.exit(2);
}

const CI_EMAIL = 'ci-transacao@vitrine.example';
const CI_PASSWORD = 'ci-senha-transacao-123';
const MARKER_SKU = 'CI-PERSIST-001';

const results = [];
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
async function check(name, fn) {
  try {
    await fn();
    results.push(['PASS', name]);
  } catch (error) {
    results.push(['FAIL', name, error.message]);
  }
}
async function http(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, text };
}
async function login(email, password = PASSWORD) {
  const res = await http('POST', '/api/auth/login', { body: { email, password } });
  assert(res.status === 200, `login ${email}: ${res.status}`);
  return res.json.token;
}
const listAll = async (token, query = '') => (await http('GET', `/api/products?limit=50${query}`, { token })).json;

await check('API saudável pelo proxy do frontend (MongoDB conectado)', async () => {
  const res = await http('GET', '/api/health');
  assert(res.status === 200 && res.json.database === 'up', `${res.status} ${res.text}`);
});

if (MODE === 'full') {
  await check('Frontend: index, rota da SPA e script de tema servidos pelo nginx', async () => {
    for (const path of ['/', '/produtos', '/theme-init.js']) {
      const res = await http('GET', path);
      assert(res.status === 200, `${path}: ${res.status}`);
    }
    assert((await http('GET', '/produtos')).text.includes('<div id="root">'), 'fallback da SPA');
  });

  await check('Transação no replica set: cadastro de empresa + admin (withTransaction)', async () => {
    const res = await http('POST', '/api/auth/register', {
      body: { companyName: 'Empresa CI Transação', name: 'Admin CI', email: CI_EMAIL, password: CI_PASSWORD },
    });
    assert(res.status === 201 && res.json.token && res.json.company?.id, `${res.status} ${res.text}`);
    const duplicate = await http('POST', '/api/auth/register', {
      body: { companyName: 'Outra', name: 'Outro', email: CI_EMAIL, password: CI_PASSWORD },
    });
    assert(duplicate.status === 409, `e-mail duplicado: ${duplicate.status}`);
  });
}

const aurora = await login('admin@aurora-moveis.example');
const verde = await login('admin@verde-jardim.example');
const auroraUser = await login('user@aurora-moveis.example');

await check('Seed no MongoDB do Docker: 12 produtos por empresa, todos com imagem Unsplash', async () => {
  const a = await listAll(aurora); // after the restart it also contains the CI marker product
  const v = await listAll(verde);
  const auroraDemo = a.items.filter((p) => p.sku?.startsWith('AUR-'));
  assert(auroraDemo.length === 12 && v.total === 12, `aurora ${auroraDemo.length}, verde ${v.total}`);
  assert(auroraDemo.every((p) => p.imageUrl?.startsWith('https://images.unsplash.com/')), 'imagens aurora');
  assert(v.items.every((p) => p.sku.startsWith('VJ-') && p.imageUrl?.startsWith('https://images.unsplash.com/')), 'imagens/sku verde');
});

await check('Isolamento: empresa A não lê, edita nem exclui produto da empresa B', async () => {
  const target = (await listAll(verde)).items[0];
  const expect404 = async (method, body) => {
    const res = await http(method, `/api/products/${target.id}`, { token: aurora, body });
    assert(res.status === 404, `${method}: ${res.status}`);
  };
  await expect404('GET');
  await expect404('PUT', { name: 'Invadido', category: 'Teste', price: 100, stock: 1 }); // valid body: only the tenant check can fail
  await expect404('DELETE');
  const still = await http('GET', `/api/products/${target.id}`, { token: verde });
  assert(still.status === 200 && still.json.name === target.name, 'produto de B foi alterado');
});

await check('Isolamento: busca "Banco" retorna só produtos da própria empresa', async () => {
  const a = await listAll(aurora, '&search=Banco');
  const v = await listAll(verde, '&search=Banco');
  assert(a.items.length > 0 && a.items.every((p) => p.sku?.startsWith('AUR-') || p.sku?.startsWith('CI-')), 'aurora');
  assert(v.items.length > 0 && v.items.every((p) => p.sku.startsWith('VJ-')), 'verde');
});

await check('Permissões: sem token 401; perfil user não cria produto (403); companyId no corpo é rejeitado (400)', async () => {
  assert((await http('GET', '/api/products')).status === 401, 'sem token');
  const product = { name: 'Teste', category: 'Teste', price: 100, stock: 1 };
  assert((await http('POST', '/api/products', { token: auroraUser, body: product })).status === 403, 'user');
  const verdeCompany = (await http('GET', '/api/auth/me', { token: verde })).json.company.id;
  const injected = await http('POST', '/api/products', { token: aurora, body: { ...product, companyId: verdeCompany } });
  assert(injected.status === 400, `injeção de companyId: ${injected.status}`);
});

await check('Chat { message } com provedor simulado: consulta o catálogo da própria empresa', async () => {
  const res = await http('POST', '/api/chat', { token: auroraUser, body: { message: 'Quais bancos vocês têm?' } });
  assert(res.status === 200 && res.json.status === 'completed', `${res.status} ${res.text}`);
  assert(res.json.toolCalls?.[0]?.name === 'search_products', JSON.stringify(res.json.toolCalls));
  assert(res.json.reply.includes('Banco Estofado para Penteadeira') && !res.json.reply.includes('Banco de Jardim'), res.json.reply);
});

await check('Chat { messages } (histórico) e isolamento no que chega ao modelo', async () => {
  const res = await http('POST', '/api/chat', {
    token: verde,
    body: { messages: [{ role: 'user', content: 'Oi' }, { role: 'assistant', content: 'Olá!' }, { role: 'user', content: 'Tem banco?' }] },
  });
  assert(res.status === 200 && res.json.reply.includes('Banco de Jardim em Madeira') && !res.json.reply.includes('Penteadeira'), res.json?.reply ?? res.text);
  const log = await (await fetch(`${STUB}/__log`)).json();
  const auroraCalls = log.filter((raw) => raw.includes('Banco Estofado para Penteadeira'));
  assert(auroraCalls.length > 0 && auroraCalls.every((raw) => !raw.includes('Banco de Jardim')), 'dados de B chegaram ao modelo em consulta de A');
});

if (MODE === 'full') {
  await check('Persistência (preparação): cria produto marcador', async () => {
    const res = await http('POST', '/api/products', {
      token: aurora,
      body: { name: 'Marcador de persistência', sku: MARKER_SKU, category: 'Teste', price: 100, stock: 1 },
    });
    assert(res.status === 201, `${res.status} ${res.text}`);
  });
} else {
  await check('Persistência após reiniciar: marcador, cadastro e dados do seed continuam no volume', async () => {
    const marker = await listAll(aurora, `&search=${MARKER_SKU}`);
    assert(marker.items.length === 1 && marker.items[0].sku === MARKER_SKU, 'marcador perdido');
    await login(CI_EMAIL, CI_PASSWORD);
    assert((await listAll(aurora)).total === 13, 'total de produtos da Aurora');
  });
}

for (const [status, name, detail] of results) console.log(`${status}  ${name}${detail ? `  -> ${detail}` : ''}`);
const failed = results.filter(([s]) => s === 'FAIL').length;
console.log(`\n[${MODE}] ${results.length - failed}/${results.length} verificações passaram.`);
process.exit(failed ? 1 : 0);

# Vitrine · SaaS multi-tenant de catálogo de produtos com assistente de IA

Aplicação full stack em que várias empresas compartilham a mesma infraestrutura para gerenciar seus catálogos de produtos, cada uma com dados totalmente isolados. Inclui um assistente de IA que responde perguntas sobre o catálogo consultando o MongoDB por **function calling**, sempre restrito à empresa do usuário autenticado.

- **Admin** cadastra, edita e exclui produtos e adiciona membros à própria empresa.
- **User** consulta o catálogo e usa o assistente de IA.
- O **cadastro público** cria uma nova empresa e o seu administrador inicial. Usuários adicionais entram apenas pelo fluxo controlado (um admin os cria).

## Sumário

- [Tecnologias](#tecnologias)
- [Execução com Docker](#execução-com-docker)
- [Início rápido](#início-rápido)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [MongoDB](#mongodb)
- [Seed de demonstração](#seed-de-demonstração)
- [OpenAI](#openai)
- [Testes](#testes)
- [Arquitetura](#arquitetura)
- [Isolamento multi-tenant](#isolamento-multi-tenant)
- [Agente de IA com function calling](#agente-de-ia-com-function-calling)
- [Endpoints](#endpoints)
- [Decisões arquiteturais](#decisões-arquiteturais)
- [Evolução planejada para produção](#evolução-planejada-para-produção)
- [Solução de problemas](#solução-de-problemas)

## Tecnologias

| Camada | Tecnologias |
|---|---|
| Backend | Node.js 22, Express 5, TypeScript (strict), Mongoose 9, Zod 4, jsonwebtoken (HS256), bcryptjs, helmet, express-rate-limit |
| IA | SDK oficial `openai` (Chat Completions com function calling em modo strict), modelo padrão `gpt-4.1-mini` |
| Frontend | React 19, TypeScript, Vite 8, React Router 7, CSS Modules, lucide-react |
| Testes | Vitest, Supertest, mongodb-memory-server (replica set em memória) |
| Banco | MongoDB Atlas (ou qualquer MongoDB em modo replica set) |
| Containers | Docker Compose: MongoDB 8 (replica set de um nó), API Node 22, nginx servindo o frontend |

## Execução com Docker

Caminho mais curto para avaliar a aplicação: **não exige Node.js, npm nem MongoDB instalados**, apenas Docker com Compose v2 (Docker Desktop ou Docker Engine). O MongoDB roda em um container local; nada é gravado no Atlas.

| Serviço | O que faz | Acesso |
|---|---|---|
| `mongo` | MongoDB 8 em replica set `rs0` (exigido pelas transações), dados no volume `mongo-data` | apenas na rede interna do Compose |
| `backend` | API compilada (`node dist/server.js`), `NODE_ENV=production` | apenas na rede interna; o navegador usa o proxy |
| `frontend` | nginx com o build de produção do React; encaminha `/api` para o `backend` | **http://localhost:8080** |
| `seed` | tarefa avulsa que cria as empresas de demonstração; nunca sobe com `up` | `docker compose run --rm seed` |

**1. Configuração** (a partir da raiz do repositório; funciona em Bash, PowerShell e Prompt de Comando com `copy`):

```bash
cp .env.example .env
```

Edite o `.env` (ele está no `.gitignore`):

| Variável | Obrigatória | Descrição |
|---|---|---|
| `JWT_SECRET` | sim | Mínimo de 32 caracteres. Gere com `docker run --rm node:22-alpine node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `SEED_PASSWORD` | para o seed | Senha dos usuários de demonstração (mínimo de 8 caracteres) |
| `OPENAI_API_KEY` | não | Entregue **somente ao container `backend`**. Vazia: o assistente responde `503` e o resto funciona |
| `FRONTEND_PORT` | não | Porta local da aplicação (padrão `8080`) |

**2. Subir, preparar os dados e acessar:**

```bash
docker compose up -d --build --wait   # constrói as imagens e espera os healthchecks
docker compose run --rm seed          # cria as 2 empresas de demonstração no MongoDB do Docker
```

Acesse **http://localhost:8080** e entre com um dos [usuários de demonstração](#seed-de-demonstração), usando a senha definida em `SEED_PASSWORD`.

O `--wait` só retorna quando os três serviços estão saudáveis: o MongoDB inicializa o replica set no primeiro start e só fica saudável como `PRIMARY`; a API depende do MongoDB saudável; o nginx depende da API saudável. Na primeira execução, o build das imagens baixa as imagens base e instala as dependências, o que leva alguns minutos; as execuções seguintes reaproveitam o cache.

**3. Conferir e testar:**

```bash
docker compose ps                     # estado e saúde de cada serviço
curl http://localhost:8080/api/health # {"status":"ok","database":"up"}
docker compose logs -f backend        # logs da API (Ctrl+C para sair)
```

**4. Encerrar:**

```bash
docker compose down        # para e remove os containers; os dados continuam no volume
```

Para recomeçar do zero, remova também o volume. **Isso apaga definitivamente todos os dados do MongoDB do Docker** (empresas de demonstração, cadastros e produtos criados durante a avaliação):

```bash
docker compose down -v
```

Observações:

- O seed recria **apenas** as 2 empresas de demonstração (identificadas pelos e-mails do seed) e pode ser executado novamente a qualquer momento; ele recusa rodar com `NODE_ENV=production` e por isso usa um serviço próprio.
- A API e o MongoDB não publicam portas na máquina: o único ponto de entrada é o nginx, que serve o frontend e encaminha `/api` (mesma origem, sem CORS).
- A execução tradicional com npm, descrita a seguir, continua igual e independente do Docker.
- O workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) constrói as imagens, sobe o ambiente, executa o seed e roda [`docker/ci/smoke-test.mjs`](docker/ci/smoke-test.mjs) (saúde, transação, login, isolamento entre empresas, chat com um provedor de LLM simulado e persistência após reinício), sem chave real da OpenAI.

## Início rápido

**Pré-requisitos:** Node.js **22.12 ou superior** (há um `.nvmrc`), npm, um cluster MongoDB (Atlas recomendado) e, opcionalmente, uma chave da OpenAI.

Os comandos abaixo funcionam em Bash, Git Bash, Windows PowerShell 5.1 e PowerShell 7, sempre partindo da raiz do repositório.

```bash
# 1. Dependências
cd backend
npm ci
cd ../frontend
npm ci

# 2. Configuração do backend
cd ../backend
cp .env.example .env        # preencha MONGODB_URI, JWT_SECRET, SEED_PASSWORD e OPENAI_API_KEY

# 3. Dados de demonstração (opcional): primeiro confira o plano, depois aplique
npm run seed                # simulação: mostra destino e plano, não grava nada
npm run seed:apply          # grava as 2 empresas de demonstração

# 4. Executar: terminal 1, ainda na pasta backend
npm run dev                 # backend em http://localhost:3333
```

Em um segundo terminal, a partir da raiz do repositório:

```bash
cd frontend
npm run dev                 # frontend em http://localhost:5173
```

Acesse **http://localhost:5173**. Em desenvolvimento, o Vite encaminha `/api` para o backend; o frontend não precisa de `.env`.

O backend valida as variáveis de ambiente ao iniciar e encerra com uma mensagem clara (apenas os **nomes** das variáveis inválidas, nunca os valores). No log de inicialização aparece também se o assistente de IA está habilitado.

## Variáveis de ambiente

Arquivo `backend/.env` (modelo em [`backend/.env.example`](backend/.env.example)). Ele está no `.gitignore` e nunca deve ser versionado.

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `MONGODB_URI` | sim | — | Connection string do MongoDB, **com o nome do banco** antes do `?` (ex.: `.../catalog?retryWrites=true&w=majority`) |
| `JWT_SECRET` | sim | — | Segredo de assinatura dos tokens, mínimo de 32 caracteres. Gere com `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `OPENAI_API_KEY` | não | — | Chave da OpenAI. Sem ela a API funciona normalmente e `POST /api/chat` responde `503` |
| `SEED_PASSWORD` | só para o seed | — | Senha dos usuários de demonstração (mínimo de 8 caracteres) |
| `OPENAI_MODEL` | não | `gpt-4.1-mini` | Modelo usado pelo assistente |
| `LLM_TIMEOUT_MS` | não | `20000` | Timeout de cada chamada ao provedor de LLM |
| `JWT_EXPIRES_IN` | não | `2h` | Validade do token (`15m`, `2h`, `1d`...) |
| `BCRYPT_ROUNDS` | não | `12` | Custo do hash de senhas (4–15) |
| `PORT` | não | `3333` | Porta da API |
| `CORS_ORIGIN` | não | `http://localhost:5173` | Origem permitida pelo CORS |
| `NODE_ENV` | não | `development` | `development`, `test` ou `production` |

No frontend existe apenas uma variável opcional, `VITE_API_PROXY_TARGET` ([`frontend/.env.example`](frontend/.env.example)), para apontar o proxy do Vite para outro endereço do backend.

## MongoDB

1. Crie um cluster no **MongoDB Atlas** (o plano gratuito M0 funciona).
2. Em **Database Access**, crie um usuário com permissão `readWrite` no banco da aplicação.
3. Em **Network Access**, libere o IP da sua máquina.
4. Copie a connection string para `MONGODB_URI`, incluindo o nome do banco antes do `?`. Caracteres especiais na senha (`@ : / ? # %`) precisam de URL encoding (ex.: `@` → `%40`).

O cadastro de empresa usa uma **transação** (empresa + administrador são criados juntos ou nenhum é criado). Transações exigem **replica set**: todo cluster Atlas já é um. Para usar um MongoDB local, inicie-o como replica set de um nó (`mongod --replSet rs0` e `rs.initiate()`).

Coleções e índices são criados automaticamente pelo Mongoose na inicialização. Todos os índices de produtos começam por `companyId`, e o SKU é único **por empresa**.

## Seed de demonstração

O seed cria **2 empresas**, cada uma com **1 admin, 1 user e 12 produtos** (alguns sem estoque, e com nomes parecidos entre as empresas para evidenciar o isolamento). Todos os produtos têm foto real do Unsplash (licença gratuita do Unsplash), servida pelo CDN `images.unsplash.com`.

```bash
npm run seed         # simulação: mostra o destino (sem host nem credenciais) e o plano
npm run seed:apply   # executa
```

Garantias de segurança:

- A simulação é o padrão: nada é gravado sem `seed:apply`.
- Recusa executar com `NODE_ENV=production`.
- Remove e recria **apenas** as empresas que possuem os e-mails de demonstração (e seus usuários e produtos). Nenhum outro dado é lido ou alterado, e o banco nunca é apagado.
- Executa em uma única transação: ou tudo é aplicado, ou nada.
- É idempotente: pode ser executado novamente para restaurar os dados de demonstração.
- O log mostra o destino como `mongodb+srv://<hidden host>/<banco>`.

### Contas de demonstração

Todas usam a senha definida por você em `SEED_PASSWORD` (não há senha fixa no código).

| Empresa | Perfil | E-mail |
|---|---|---|
| Aurora Móveis | admin | `admin@aurora-moveis.example` |
| Aurora Móveis | user | `user@aurora-moveis.example` |
| Verde Jardim | admin | `admin@verde-jardim.example` |
| Verde Jardim | user | `user@verde-jardim.example` |

## OpenAI

1. Crie uma chave em [platform.openai.com](https://platform.openai.com/api-keys).
2. Defina `OPENAI_API_KEY` no `backend/.env` (opcionalmente `OPENAI_MODEL`).
3. Reinicie o backend: o log deve mostrar `AI assistant enabled (openai:gpt-4.1-mini)`.

A chave existe **somente no backend**: o navegador conversa com `POST /api/chat` usando o JWT da sessão e nunca recebe a chave. Os logs não registram a chave nem o conteúdo das mensagens. Como referência, uma pergunta típica gera 2 chamadas ao modelo e cerca de 2 mil tokens.

## Testes

Backend, a partir da raiz do repositório (os comandos rodam dentro da pasta `backend`):

```bash
cd backend
npm test                    # 167 testes: API real (Supertest) + MongoDB em memória
npm run typecheck
npm run build
```

Frontend, a partir da raiz do repositório (os comandos rodam dentro da pasta `frontend`):

```bash
cd frontend
npm test                    # 96 testes: regras de dinheiro, formulários, erros, estados do chat, tema e carregamento de imagens
npm run typecheck
npm run build
```

- Os testes do backend **não precisam de `.env`, Atlas ou OpenAI**: usam um replica set em memória e um provedor de LLM simulado. Na primeira execução, o `mongodb-memory-server` baixa o binário do MongoDB (pode levar alguns minutos, apenas uma vez).
- Cobertura principal: autenticação (token adulterado, expirado, `alg` diferente), permissões por perfil, **isolamento entre empresas** (leitura, edição, exclusão, busca, categorias, injeção de `companyId`), transação do cadastro, seed, validação de entradas, tratamento de erros, agente de IA (fluxo de ferramentas, isolamento, filtros de preço, limites, erros do provedor) e o adaptador da OpenAI com `fetch` simulado.
- Nenhum teste chama a API real da OpenAI: o `vitest.config.ts` força `OPENAI_API_KEY` vazia.
- Integração contínua ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)): a cada push, roda typecheck, testes e build de backend e frontend com npm e valida o ambiente Docker de ponta a ponta (ver [Execução com Docker](#execução-com-docker)).

### Scripts

| Pacote | Script | Função |
|---|---|---|
| backend | `npm run dev` | API com recarga automática (lê `.env`) |
| backend | `npm run build` / `npm start` | Compila para `dist/` / executa a versão compilada |
| backend | `npm run seed` / `npm run seed:apply` | Simulação / execução do seed |
| backend | `npm test`, `npm run test:watch`, `npm run typecheck` | Testes e verificação de tipos |
| frontend | `npm run dev` | Vite em `http://localhost:5173` |
| frontend | `npm run build` / `npm run preview` | Typecheck + build estático em `dist/` / pré-visualização |
| frontend | `npm test`, `npm run typecheck` | Testes e verificação de tipos |

## Arquitetura

```
backend/
  src/
    config/          env.ts (validação com Zod, fail fast), database.ts
    modules/
      auth/          cadastro (transação), login, /me
      companies/     model e repository
      users/         membros da empresa (somente admin)
      products/      CRUD, busca, filtros
      chat/          agente de IA
        llm/         contrato neutro (LlmProvider) + adaptador OpenAI
        tools/       ferramentas do catálogo + executor com validação
      health/
    shared/          auth (JWT, senhas, permissões), middlewares, erros, validação, utilitários
    seed/            dados e script de demonstração
    app.ts           monta o Express (dependências injetáveis para testes)
    server.ts        conexão com o banco, provedor de LLM e HTTP
  Dockerfile         build multi-stage (TypeScript compilado, só dependências de produção)
  tests/             testes de integração e unitários
frontend/
  src/
    components/      layout e componentes de UI reutilizáveis (Button, Field, Alert, Toast...)
    features/        auth, products, users, chat (cada uma com api, tipos, páginas e componentes)
    lib/             cliente HTTP, sessão, dinheiro, erros, permissões, hooks
    styles/          tokens de design (cores, espaçamentos, tipografia)
  Dockerfile         build de produção + nginx (nginx.conf: SPA e proxy de /api)
docker/
  mongo/             inicialização do replica set (healthcheck do MongoDB)
  ci/                provedor de LLM simulado e testes de fumaça usados só no CI
docker-compose.yml   MongoDB, API, frontend e a tarefa de seed
```

**Backend** organizado por funcionalidade, com responsabilidades separadas:

- **Rotas**: encaminhamento e middlewares (`authenticate`, `authorize`, rate limit).
- **Controllers**: entrada e saída HTTP; validam `body`, `params` e `query` com Zod.
- **Services**: regras de negócio; recebem o contexto de autenticação.
- **Repositories**: único ponto de acesso aos dados de cada empresa; `companyId` é sempre o primeiro parâmetro.
- **Erros**: centralizados em `errorHandler`, no formato `{ "error": { "code", "message", "details?" } }`, sem stack ou detalhes internos.

**Frontend**: SPA com rotas protegidas (`/login`, `/cadastro`, `/produtos`, `/produtos/novo`, `/produtos/:id/editar`, `/usuarios`, `/assistente`). Ações não permitidas ao perfil ficam ocultas, mas o backend continua sendo a autoridade sobre permissões. Preços são exibidos em reais e convertidos para centavos sem aritmética de ponto flutuante. Todas as telas tratam carregamento, erro, vazio e confirmação. As imagens de produto mostram "Sem imagem" quando não há URL e "Imagem indisponível" quando o carregamento falha ou não termina em 8 segundos, para que um host externo que não responde não deixe o card carregando indefinidamente. Há tema claro e escuro: as cores são tokens CSS em `styles/global.css` (um bloco por tema). Na primeira visita vale a preferência do sistema operacional; a escolha manual fica salva em um cookie e é aplicada por `public/theme-init.js` antes da primeira pintura, sem flash de tema.

## Isolamento multi-tenant

O isolamento faz parte da arquitetura, não é uma verificação adicional:

1. **O tenant vem do servidor.** O JWT contém `sub` e `companyId`; a cada requisição, `authenticate` recarrega o usuário do banco, confere se o `companyId` do token corresponde ao do usuário e monta `req.auth`. Papel e empresa vêm do banco, nunca do cliente.
2. **Repositories exigem `companyId`.** Toda consulta a produtos e usuários inclui `companyId`; não existe método que acesse dados de uma empresa sem ele.
3. **Recurso de outra empresa = 404.** Um produto de outra empresa é indistinguível de um inexistente (não há 403 que revele sua existência).
4. **Entradas estritas.** Os schemas Zod rejeitam campos desconhecidos, incluindo `companyId`, `createdBy` e `role`. O cadastro público sempre cria o admin de uma **nova** empresa; membros criados por um admin recebem o perfil `user` na empresa dele.
5. **Proteção contra NoSQL injection.** `sanitizeFilter` do Mongoose neutraliza operadores (`$ne`, `$gt`...) vindos do cliente; a busca usa expressões regulares escapadas. Operadores montados pelo servidor (faixa de preço, por exemplo) são marcados explicitamente com `mongoose.trusted`.
6. **A IA segue as mesmas regras.** As ferramentas do agente chamam os mesmos services e repositories, com o contexto do usuário autenticado (detalhes abaixo).

Os testes de isolamento criam duas empresas com produtos de nomes e SKUs semelhantes e comprovam que uma não consegue listar, buscar, ler, editar, excluir nem consultar via assistente os dados da outra.

## Agente de IA com function calling

Fluxo de `POST /api/chat` (autenticado, perfis `admin` e `user`):

1. O cliente envia uma pergunta avulsa, `{ "message": "Quero consultar os produtos" }`, ou o histórico da conversa como **texto**, `{ "messages": [{ "role": "user", "content": "..." }] }` (`user`/`assistant`, até 20 mensagens). O frontend usa o histórico. Os dois formatos são normalizados para o mesmo histórico antes do agente, com até 2.000 caracteres por mensagem. Qualquer outro campo (`companyId`, `role` etc.), ou os dois formatos juntos, resultam em `400`. O cliente não pode enviar chamadas nem resultados de ferramentas, portanto não consegue forjar dados do catálogo.
2. O backend envia ao modelo o prompt de sistema, o histórico e a definição das ferramentas (JSON Schema em modo **strict**).
3. Quando o modelo pede uma ferramenta, o backend **revalida os argumentos com Zod**, executa a consulta no MongoDB com o `companyId` do usuário autenticado e devolve o resultado ao modelo.
4. O ciclo se repete até a resposta final, que é retornada com a lista das consultas efetivamente executadas.

| Ferramenta | Função |
|---|---|
| `search_products` | Busca por texto, categoria, faixa de preço (em reais, convertida para centavos), somente em estoque, ordenação e limite |
| `get_product_details` | Detalhes de um produto por id ou SKU; retorna `found: false` quando não existe na empresa |
| `list_categories` | Categorias existentes no catálogo da empresa |

Resposta:

```json
{
  "reply": "Produtos até R$ 600: ...",
  "status": "completed",
  "toolCalls": [{ "name": "search_products", "ok": true, "input": { "max_price": 600 }, "resultCount": 3 }]
}
```

**Garantias**

- Nenhuma ferramenta possui parâmetro `companyId`, e argumentos extras são rejeitados antes de qualquer acesso ao banco.
- As ferramentas são **somente leitura** e retornam apenas campos de catálogo (nunca `companyId`, `createdBy` ou dados de usuários).
- O prompt exige que produtos, preços e estoque venham exclusivamente dos resultados das ferramentas e que o assistente diga claramente quando algo não foi encontrado. Na interface, cada resposta mostra as consultas feitas ao catálogo, ou o aviso "Resposta sem consulta ao catálogo".

**Limites e erros**

| Situação | Comportamento |
|---|---|
| Mais de 6 chamadas ao modelo ou 8 execuções de ferramentas por mensagem | Resposta com `status: "limit_reached"` |
| Prazo total de 60 s por mensagem (timeout de 20 s por chamada, 1 nova tentativa) | `504 ASSISTANT_TIMEOUT` |
| Provedor indisponível, limite de cota ou credencial inválida | `503 ASSISTANT_UNAVAILABLE` (detalhes apenas no log, sem a mensagem do provedor) |
| Resposta inválida do modelo | `502 ASSISTANT_BAD_RESPONSE` |
| Chave não configurada | `503 ASSISTANT_NOT_CONFIGURED` |
| Mais de 20 mensagens em 5 minutos por usuário | `429 TOO_MANY_REQUESTS` |
| Argumentos inválidos ou ferramenta inexistente | Erro devolvido ao modelo, que pode corrigir ou explicar |
| Cliente desconecta | A chamada ao provedor é cancelada |

**Desacoplamento do provedor**: o agente depende apenas da interface `LlmProvider` ([`llm.types.ts`](backend/src/modules/chat/llm/llm.types.ts)). O SDK da OpenAI aparece somente em [`openai.provider.ts`](backend/src/modules/chat/llm/openai.provider.ts); outro provedor exigiria apenas um novo adaptador e a escolha em `createLlmProvider.ts`.

## Endpoints

Base: `/api`. Exceto `health`, `auth/register` e `auth/login`, todos exigem `Authorization: Bearer <token>`.

| Método | Rota | Perfis | Descrição |
|---|---|---|---|
| GET | `/health` | público | Status da API e do banco |
| POST | `/auth/register` | público | Cria empresa + admin; retorna `{ token, user, company }` |
| POST | `/auth/login` | público | Retorna `{ token, user, company }` |
| GET | `/auth/me` | autenticado | Usuário e empresa da sessão |
| GET | `/products` | admin, user | Lista com `search`, `category`, `page`, `limit` (≤ 50) e `sort` (`name`, `price`, `createdAt`, com `-` para decrescente) |
| GET | `/products/categories` | admin, user | Categorias da empresa |
| GET | `/products/:id` | admin, user | Detalhe |
| POST | `/products` | admin | Cria produto |
| PUT | `/products/:id` | admin | Substitui o produto (campos opcionais omitidos são removidos) |
| DELETE | `/products/:id` | admin | Exclui (`204`) |
| GET | `/users` | admin | Membros da empresa |
| POST | `/users` | admin | Adiciona membro com perfil `user` |
| POST | `/chat` | admin, user | Assistente de IA; corpo `{ message }` ou `{ messages }` |

Produto: `name`, `description`, `price` (**inteiro em centavos**), `category`, `imageUrl` (somente `http`/`https`), `sku` (único por empresa), `stock`. Rotas de autenticação têm limite de 20 tentativas a cada 15 minutos por IP; o corpo das requisições é limitado a 100 kB.

## Decisões arquiteturais

| Decisão | Motivo |
|---|---|
| Banco compartilhado com `companyId` em todos os documentos | Simples de operar e adequado ao volume esperado; o isolamento é garantido pelos repositories e coberto por testes |
| Isolamento nos repositories (não em plugin global do Mongoose) | Explícito e fácil de revisar: cada consulta mostra o filtro de empresa |
| Usuário recarregado do banco a cada requisição | Mudança de perfil ou exclusão de usuário vale imediatamente, ao custo de uma consulta por requisição |
| Apenas access token (2 h), guardado em `sessionStorage` | Menos complexidade que refresh tokens; `sessionStorage` não sobrevive ao fechamento da aba e não é compartilhado entre abas |
| Preços como inteiros em centavos | Evita erros de arredondamento; a conversão para reais acontece só na borda (interface e ferramentas da IA) |
| `PUT` como substituição completa | Contrato previsível para o formulário de edição |
| Contrato neutro de LLM com adaptador por provedor | A lógica do agente e os testes não dependem do SDK; trocar de provedor não afeta as regras de negócio |
| Loop do agente escrito no backend, sem frameworks de agentes | Controle total sobre limites, isolamento, erros e logs, e sem recursos beta |
| Histórico da conversa no cliente (sem persistência) | Simplicidade; o histórico só contém texto, então não permite forjar resultados de ferramentas |
| Preferência de tema em cookie (não em `localStorage`) | Persiste entre sessões, não contém dado sensível e pode ser lida de forma síncrona por um script externo no `<head>`, compatível com uma futura CSP |
| Frontend chama `/api` relativo | Mesma origem em desenvolvimento (proxy do Vite) e em produção (proxy reverso), sem CORS no navegador |

## Evolução planejada para produção

A versão atual concentra o escopo nos fluxos essenciais: autenticação, autorização por perfil, isolamento entre empresas, CRUD do catálogo e assistente de IA, todos cobertos por testes. Para operar em produção com múltiplas instâncias e volume real de clientes, a evolução está organizada nas frentes abaixo. Cada tabela separa o que **está implementado hoje** do que **está planejado**.

### Segurança e sessões

| Tema | Implementado hoje | Evolução planejada |
|---|---|---|
| Sessões e tokens | Access token JWT (HS256, 2 h), com usuário, perfil e empresa revalidados no banco a cada requisição. O logout encerra a sessão no cliente; o token permanece válido até expirar. | Refresh tokens com rotação e revogação em cookie `httpOnly`, ou sessão no servidor, permitindo encerrar sessões imediatamente. |
| Token no navegador | `sessionStorage` (restrito à aba) e interface sem `innerHTML`. | Cookie `httpOnly` e Content Security Policy servida pelo proxy reverso. |
| Cadastro público | Responde `409` quando o e-mail já existe, priorizando a clareza para quem se cadastra. | Resposta neutra com confirmação por e-mail, sem indicar se o endereço já está cadastrado. |
| Isolamento multi-tenant | `companyId` obrigatório em todos os repositories, coberto por testes de isolamento. | Plugin de tenant no Mongoose como segunda camada de defesa. |
| Gestão de usuários | Admin adiciona membros com perfil `user` e lista os membros da empresa. | Edição, desativação, promoção a admin, convites por e-mail e redefinição de senha. |

### Escala

| Tema | Implementado hoje | Evolução planejada |
|---|---|---|
| Rate limiting | Em memória, por instância: autenticação (20 tentativas a cada 15 min por IP) e assistente (20 mensagens a cada 5 min por usuário). | Armazenamento compartilhado (Redis) entre instâncias, `trust proxy` configurado para identificar o IP real atrás do proxy e cotas de IA por empresa. |
| Conversas com o assistente | Histórico mantido no cliente durante a sessão e enviado a cada mensagem (até 20). | Persistência por usuário e empresa, com política de retenção, e streaming das respostas. |
| Busca no catálogo | Expressões regulares escapadas sobre nome, SKU e descrição, com índices iniciados por `companyId`. | Índice de texto ou Atlas Search. |
| Imagens de produtos | URL externa (`http`/`https`). | Upload para armazenamento de objetos. |

### Monitoramento e observabilidade

| Tema | Implementado hoje | Evolução planejada |
|---|---|---|
| Logs | Logs de console sem credenciais e sem o conteúdo das mensagens. Cada interação com o assistente registra usuário, status, iterações, ferramentas usadas e tokens consumidos. | Logs estruturados (JSON) com request id, agregados em uma plataforma centralizada. |
| Métricas e alertas | `GET /api/health` informa o status da API e do banco. | Métricas de latência, taxa de erro e disponibilidade, com alertas. |
| Custo de IA | Limites por mensagem (chamadas ao modelo, ferramentas e prazo) e por usuário. | Painel de consumo de tokens por empresa, com cotas configuráveis. |

### Qualidade e entrega

| Tema | Implementado hoje | Evolução planejada |
|---|---|---|
| Testes automatizados | 167 testes de backend (API, isolamento, IA) e 96 de frontend (regras de negócio, formulários, erros, estados do chat, tema e carregamento de imagens). Os fluxos de tela foram validados no navegador durante o desenvolvimento. | Testes de componentes e testes E2E automatizados (Playwright) versionados no repositório. |
| Integração contínua | Typecheck, build e testes executados pelos scripts npm de cada pacote. | Pipeline de CI executando essas etapas a cada pull request. |
| Implantação | Execução local (backend com Node.js, frontend com Vite). | Containerização (Docker), proxy reverso servindo o frontend e `/api` na mesma origem, e deploy automatizado. |

## Solução de problemas

| Sintoma | Causa provável |
|---|---|
| Backend encerra com `Invalid environment variables` | Variável ausente ou inválida; a mensagem lista os nomes |
| Timeout ao conectar no Atlas | IP não liberado em **Network Access** |
| `bad auth` / autenticação falhou | Usuário ou senha incorretos, ou senha com caracteres especiais sem URL encoding |
| Cadastro falha com erro de transação | MongoDB local sem replica set |
| Dados gravados no banco `test` | `MONGODB_URI` sem nome de banco antes do `?` |
| Assistente responde "não configurado" | `OPENAI_API_KEY` ausente; reinicie o backend após configurar |
| Primeira execução de `npm test` demorada | Download único do binário do MongoDB pelo `mongodb-memory-server` |

# Diretrizes de desenvolvimento

## Sobre o projeto

Estou desenvolvendo uma aplicação Full Stack para demonstrar minha capacidade de estruturar uma solução SaaS, desde a modelagem dos dados até a experiência do usuário.

Quero uma aplicação bem construída, com uma arquitetura que faça sentido, código organizado e decisões técnicas que eu consiga justificar.

Minha prioridade é entregar algo funcional, seguro e fácil de manter. Não quero complicar a estrutura apenas para demonstrar conhecimento de padrões ou ferramentas.

## Como quero trabalhar

Tenho experiência com Node.js, TypeScript, React, MongoDB, integrações com APIs e automações.

Quero utilizar o Claude Code como apoio durante o desenvolvimento, principalmente para acelerar implementações, revisar decisões, identificar problemas e melhorar a qualidade do código.

Não quero que você simplesmente gere arquivos sem considerar o restante do projeto.

Antes de mudanças importantes, analise o contexto, explique brevemente a abordagem e identifique possíveis impactos.

Prefiro trabalhar com entregas menores, que possam ser executadas e verificadas antes de avançarmos.

## Tecnologias

Para o backend, vamos trabalhar com Node.js, Express, TypeScript e MongoDB utilizando Mongoose.

A autenticação será baseada em JWT, com senhas protegidas por hash e validação das entradas da API.

No frontend, vamos utilizar React, TypeScript e Vite.

Para a integração com inteligência artificial, vamos utilizar uma API de LLM com suporte a chamadas de ferramentas.

Podemos utilizar bibliotecas adicionais quando elas resolverem uma necessidade concreta, mas quero evitar dependências desnecessárias.

## Organização do backend

Prefiro organizar a aplicação por responsabilidades e funcionalidades.

Rotas devem cuidar do encaminhamento das requisições. Controllers devem coordenar a entrada e a saída HTTP. Services devem concentrar as regras de negócio, enquanto a camada de acesso a dados deve cuidar das consultas ao banco.

Não precisamos criar camadas artificiais quando uma solução mais simples resolver o problema.

Quero que a estrutura seja fácil de navegar e que outro desenvolvedor consiga entender rapidamente onde cada funcionalidade está implementada.

Também quero tratamento centralizado de erros, validação consistente e configurações separadas do código.

## Autenticação e permissões

A aplicação terá diferentes perfis de usuário.

Quero manter a autenticação e a autorização como responsabilidades distintas.

Um usuário autenticado não deve necessariamente ter acesso a todas as operações.

As permissões precisam ser verificadas no backend, independentemente dos controles exibidos na interface.

O cadastro público não deve permitir que alguém escolha privilégios administrativos em uma empresa existente.

## Isolamento de dados

A aplicação será utilizada por empresas diferentes, compartilhando a mesma infraestrutura.

Quero que o isolamento dos dados faça parte da arquitetura desde o início, e não seja uma verificação adicionada posteriormente.

O contexto da empresa deve ser identificado a partir do usuário autenticado.

Não devemos confiar em identificadores enviados pelo cliente para determinar quais dados ele pode acessar.

Todas as operações sobre recursos de uma empresa precisam respeitar esse contexto, inclusive consultas realizadas por ferramentas de inteligência artificial.

Também quero testes que demonstrem que um usuário não consegue acessar ou modificar dados de outra empresa.

## Integração com inteligência artificial

Quero implementar um agente que tenha uma função real dentro da aplicação.

Ele deve conseguir interpretar uma solicitação, utilizar ferramentas disponibilizadas pelo backend e consultar informações armazenadas no banco.

As consultas devem respeitar as mesmas regras de autenticação e isolamento utilizadas pelas demais funcionalidades.

Não quero respostas que aparentem consultar o sistema quando, na verdade, estejam sendo produzidas apenas pelo conhecimento do modelo.

Quando uma informação não estiver disponível, o agente deve deixar isso claro.

A integração precisa ter tratamento de erros, limites de execução e cuidado com dados sensíveis.

## Frontend e experiência do usuário

Quero uma interface moderna, limpa e responsiva.

Prefiro uma identidade visual consistente, com boa hierarquia, espaçamento adequado e componentes reutilizáveis.

A navegação deve ser simples, sem excesso de elementos.

As telas precisam comunicar claramente o estado da aplicação, incluindo carregamento, erros, confirmações e ausência de resultados.

Não quero apenas um frontend que funcione. Quero uma experiência que transmita qualidade profissional.

## Qualidade do código

Utilize TypeScript com tipagem rigorosa.

Prefiro funções pequenas, nomes claros e responsabilidades bem definidas.

Evite duplicação, abstrações prematuras e soluções difíceis de compreender.

Não utilize `any` sem necessidade e justificativa.

Siga os padrões estabelecidos no projeto e mantenha a consistência entre os módulos.

O código deve ser escrito em inglês, utilizando convenções comuns do ecossistema JavaScript e TypeScript.

As explicações, a documentação e a comunicação comigo devem ser em português brasileiro.

## Testes e validação

Não considere uma funcionalidade concluída apenas porque os arquivos foram criados.

Sempre que possível, execute a aplicação, verifique o comportamento e realize os testes relevantes.

Dê atenção especial aos fluxos de autenticação, autorização, isolamento de dados e integração entre serviços.

Se um teste falhar, investigue a causa antes de propor uma solução.

Não afirme que algo foi validado quando a verificação não tiver sido executada.

## Segurança

Nunca exponha credenciais, tokens ou chaves de API.

Utilize variáveis de ambiente e mantenha arquivos sensíveis fora do versionamento.

Não execute operações destrutivas sem minha autorização.

Não altere configurações globais do computador nem arquivos fora do projeto sem necessidade e aprovação.

Evite conceder permissões excessivas a usuários, serviços ou integrações.

## Documentação

Quero um README que explique o projeto de forma objetiva.

Ele deve permitir que outro desenvolvedor configure e execute a aplicação sem precisar descobrir informações importantes por tentativa e erro.

Também deve apresentar as principais decisões arquiteturais, os motivos das escolhas e os pontos que precisariam evoluir em um ambiente de produção.

A documentação deve refletir o que realmente foi implementado.

## Como conduzir as implementações

Antes de iniciar uma funcionalidade relevante:

1. Entenda o que já existe.
2. Apresente brevemente a solução proposta.
3. Identifique riscos e dependências.
4. Implemente de maneira incremental.
5. Execute as verificações necessárias.
6. Informe o resultado e possíveis pendências.

Quando houver mais de uma abordagem válida, apresente as diferenças e recomende aquela que oferece o melhor equilíbrio entre simplicidade, segurança e manutenção.

Não quero mudanças grandes e difíceis de revisar quando pudermos trabalhar em etapas menores.

## Prioridades

Neste momento, o prazo de desenvolvimento é curto.

Precisamos concentrar o esforço no funcionamento completo da aplicação, na segurança dos dados, na integração com IA e na qualidade da experiência.

Funcionalidades adicionais só devem ser consideradas depois que os fluxos principais estiverem implementados e validados.

Prefiro uma aplicação menor, consistente e bem testada a uma solução cheia de funcionalidades incompletas.

## Orientação final

Atue como um parceiro técnico experiente.

Questione decisões quando identificar riscos, apresente alternativas quando fizer sentido e mantenha o foco na qualidade da solução.

Quero utilizar a inteligência artificial para aumentar minha produtividade, sem abrir mão de compreender a arquitetura, o funcionamento e as decisões do projeto.
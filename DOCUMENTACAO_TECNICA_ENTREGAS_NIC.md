# Documentacao Tecnica de Entrega - NIC

## 1. Identificacao do documento

- Projeto: NIC - Nucleo Integrado de Conciliacoes
- Base de desenvolvimento: `develop`
- Tipo: documentacao tecnica de evolucao e entrega
- Finalidade: consolidar as melhorias implementadas recentemente no NIC para comunicacao com gestao, time de desenvolvimento e stakeholders internos

## 2. Resumo executivo

Nesta etapa, o NIC evoluiu de forma relevante na frente de atendimento juridico via WhatsApp, com foco na Caixa de Entrada, integracao com templates oficiais da Meta, estabilidade de autenticacao, suporte a anexos, atribuicao de conversas, edicao de contato e vinculacao de conversas ao processo juridico.

O principal ganho foi transformar o NIC em uma camada operacional mais madura sobre o Chatwoot, aproximando a experiencia do fluxo real do escritorio: o operador agora consegue consultar templates da Meta, preencher variaveis, enviar anexos, editar dados de contato, atribuir conversas a colaboradores e vincular o atendimento ao processo com registro em historico.

Tambem foram feitos ajustes de infraestrutura e autenticacao para reduzir falhas de deploy, CORS, timeout, 401 em cascata e comportamentos inconsistentes no frontend.

## 3. Contexto do problema

Antes desta etapa, o projeto apresentava gargalos relevantes na operacao:

- templates oficiais da Meta nao apareciam corretamente no NIC
- o Chatwoot nem sempre expunha os templates da forma esperada
- o fluxo de template com variaveis nao existia de forma usavel
- a Caixa de Entrada tinha problemas visuais e de scroll
- o envio de anexos era inexistente ou insuficiente
- havia dificuldades para atribuir conversas a agentes
- nao existia um fluxo completo de vincular a conversa ao processo com rastreabilidade juridica
- o frontend sofria com sessao instavel, token invalido, CORS e falhas de deploy

## 4. Objetivos da etapa

- tornar a Caixa de Entrada operacionalmente viavel para advogados e assistentes
- integrar corretamente templates oficiais da Meta/WhatsApp
- reduzir dependencia da versao do Chatwoot em cenarios criticos
- melhorar UX e estabilidade do fluxo de atendimento
- aumentar rastreabilidade do atendimento dentro do contexto juridico do processo

## 5. Escopo implementado

### 5.1 Integracao de templates oficiais da Meta

Foi ajustado o fluxo de consulta de templates para utilizar a inbox correta do Chatwoot e interpretar o formato real retornado pela Meta. O frontend passou a exibir corretamente o texto-base do template usando `components[].text` e `body_text`.

Resultados:
- templates passaram a aparecer de forma consistente para uso operacional
- o preview deixou de depender de estruturas de canned response
- mensagens de erro ficaram mais objetivas para suporte e homologacao

### 5.2 Fallback direto da Meta

Foi implementado no backend um fallback para a Meta Graph API quando o Chatwoot nao responde adequadamente ao endpoint de templates. O sistema passou a aceitar configuracoes por variaveis de ambiente para token, conta de negocio, numero e mapeamento por inbox.

Resultados:
- menor dependencia do comportamento da instancia atual do Chatwoot
- maior robustez para listar e enviar templates oficiais
- suporte a inboxes com configuracao especifica por numero/ambiente

### 5.3 Fluxo de template com variaveis

Foi criado um modal dedicado para templates do WhatsApp com:

- busca por template
- preview detalhado
- leitura das variaveis `{{1}}`, `{{2}}`, etc.
- campos de preenchimento
- validacao antes do envio

O backend passou a montar `template_params` e `content_attributes` corretamente para suportar tanto Chatwoot quanto Meta.

Resultados:
- o fluxo do NIC ficou aderente ao comportamento esperado pelos operadores
- reducao de erro de uso e de disparo incorreto de template

### 5.4 Persistencia visual de templates enviados

Foi corrigido o problema em que o template aparecia por alguns segundos e depois sumia do historico da conversa. O frontend passou a preservar melhor a mensagem enviada, inclusive em cenarios de fallback da Meta e polling da conversa.

Resultados:
- consistencia visual do historico
- confianca operacional maior para quem envia template

### 5.5 Redesenho da Caixa de Entrada

Foi realizada uma revisao ampla da `InboxPage`, com foco em:

- organizacao visual
- hierarquia de informacao
- clareza na leitura da conversa
- refinamento de cards, listas, botoes e modais
- eliminacao de problemas de layout, faixa cinza quebrada e excesso de elementos redundantes

Resultados:
- experiencia mais profissional e alinhada ao uso continuo
- menor ruido visual
- melhor navegacao entre lista, conversa e painel lateral

### 5.6 Suporte a anexos e midias

Foi implementado suporte a:

- imagens
- documentos
- videos
- audios

O frontend passou a permitir envio e visualizacao desses conteudos, enquanto o backend foi adaptado para repassar anexos ao Chatwoot via `multipart/form-data`.

Resultados:
- o atendimento passou a suportar comprovantes, audios e documentos de negociacao
- ampliacao do uso real do NIC em tratativas juridicas

### 5.7 Status de mensagens e atualizacao automatica

O sistema passou a exibir status de mensagem:

- Enviado
- Entregue
- Lido
- Falhou

Tambem foram adicionados:

- preview da ultima mensagem na lista
- badge de nao lidas
- polling leve para atualizacao sem refresh manual
- preparo do receiver de webhook para evolucao futura de tempo real mais forte

Resultados:
- maior visibilidade sobre o estado do atendimento
- menor necessidade de atualizar manualmente o navegador

### 5.8 Correcao de scroll da conversa

Foi corrigido o comportamento que puxava a conversa para o fim automaticamente enquanto o usuario tentava ler mensagens antigas. O auto-scroll passou a acontecer apenas em situacoes adequadas, como abertura de conversa ou envio de nova mensagem.

Resultados:
- leitura de historico mais estavel
- menos friccao no uso da Caixa de Entrada

### 5.9 Painel lateral de contato com edicao

Foi criado um drawer lateral para:

- visualizar dados do contato
- editar nome
- editar e-mail
- editar telefone

As alteracoes passaram a ser persistidas no Chatwoot via backend.

Resultados:
- melhor manutencao dos dados do cliente durante o atendimento
- eliminacao da necessidade de sair do fluxo principal para corrigir informacoes

### 5.10 Atribuicao de conversas a colaboradores

Foi implementado um fluxo completo de atribuicao de conversas a agentes, refletindo na aba `Minhas`. O fluxo passou a permitir:

- buscar agentes
- listar colaboradores da inbox
- adicionar colaborador na inbox pelo simbolo `+`
- selecionar o agente e salvar a atribuicao

Resultados:
- melhor distribuicao de atendimentos
- aderencia ao modelo operacional do escritorio

### 5.11 Vinculacao da conversa ao processo

Foi adicionada a acao `Vincular processo` diretamente na interface da conversa e no painel lateral. O usuario agora consegue:

- buscar processo por numero
- buscar por autor
- buscar por reu
- buscar por parte adversa
- vincular a conversa ao processo juridico

No backend, o vinculo passou a:

- salvar o `legal_case_id`
- resolver corretamente a conversa pelo identificador vindo do Chatwoot
- registrar a vinculacao no historico do processo
- registrar desvinculacao quando a conversa e movida para outro processo

Resultados:
- rastreabilidade juridica ampliada
- atendimento via WhatsApp incorporado ao contexto formal do processo

### 5.12 Estabilidade de autenticacao e sessao

Foram corrigidos problemas recorrentes de autenticacao:

- invalidacao de todas as sessoes ao realizar novo login
- normalizacao inadequada de token
- validacao fraca da sessao ao abrir o app
- mensagens de erro de login pouco claras

Tambem foi reforcado o login com normalizacao de e-mail e busca case-insensitive do usuario.

Resultados:
- reducao de `401 Unauthorized` em cascata
- menor chance de derrubar sessoes validas da equipe
- mais previsibilidade no fluxo de autenticacao

### 5.13 Correcoes de infraestrutura, CORS e homologacao

Foram feitos ajustes para estabilizar o ambiente de laboratorio e deploy:

- CORS para `lab` e producao
- resposta correta a `OPTIONS`
- reforco de middleware e bootstrap
- compatibilidade com Vite e dominios de deploy
- correcoes pontuais de parse error, timeout e falhas observadas no ciclo de homologacao

Resultados:
- melhoria de estabilidade no ambiente compartilhado
- reducao de bloqueios entre frontend e backend em homologacao

## 6. Principais arquivos impactados

### Frontend

- `concilia-frontend/src/pages/InboxPage.jsx`
- `concilia-frontend/src/components/LinkCaseModal.jsx`
- `concilia-frontend/src/context/AuthContext.jsx`
- `concilia-frontend/src/components/Login.jsx`
- `concilia-frontend/src/App.jsx`
- `concilia-frontend/src/api.js`

### Backend

- `concilia-backend/src/app/Http/Controllers/Api/ChatController.php`
- `concilia-backend/src/app/Http/Controllers/Api/AuthController.php`
- `concilia-backend/src/app/Http/Controllers/Api/WebhookController.php`
- `concilia-backend/src/routes/api.php`
- `concilia-backend/src/config/cors.php`

## 7. Decisoes tecnicas relevantes

- uso de fallback da Meta para contornar limitacoes da rota de templates do Chatwoot
- preservacao de sessoes anteriores no login para nao derrubar operacao de outros ambientes/usuarios
- preferencia por melhorias incrementais na Inbox em vez de reescrita total do fluxo
- integracao da vinculacao ao processo com historico juridico para ganhar rastreabilidade de negocio, nao apenas relacionamento de banco

## 8. Variaveis e configuracoes relevantes

Para o fluxo de templates/fallback Meta, passaram a ser relevantes:

- `META_WHATSAPP_ACCESS_TOKEN`
- `META_WHATSAPP_BUSINESS_ACCOUNT_ID`
- `META_WHATSAPP_PHONE_NUMBER_ID`
- `META_WHATSAPP_API_VERSION`
- mapas por inbox, quando aplicavel

Tambem houve sensibilidade nas configuracoes de:

- `CHATWOOT_URL`
- `CHATWOOT_API_TOKEN`
- `CHATWOOT_ACCOUNT_ID`
- CORS do backend
- URL da API consumida pelo frontend

## 9. Validacoes realizadas

Ao longo do ciclo de homologacao, foram validadas funcionalmente as seguintes frentes:

- listagem de templates da Meta
- envio de templates com variaveis
- exibicao de templates no historico da conversa
- envio de mensagem comum
- envio de arquivos e audios
- preview da ultima mensagem na lista
- atribuicao de conversa para agente
- edicao de dados do contato
- vinculacao da conversa ao processo
- entrada da vinculacao no historico do processo
- reducao de erros de autenticacao e CORS no lab

Observacao:
- parte da validacao foi funcional/homologatoria, com apoio do ambiente `lab`
- nao houve cobertura completa de testes automatizados para todos os fluxos citados nesta etapa

## 10. Limitacoes e observacoes atuais

- o fluxo de tempo real ainda utiliza polling leve; a base para webhook foi preparada, mas ainda pode evoluir para SSE ou websocket
- o comportamento final de templates ainda depende das credenciais/configuracoes corretas do Chatwoot e da Meta
- a consistencia completa entre Chatwoot, fallback Meta e historico local ainda exige cuidado em futuras alteracoes
- existe dependencia operacional de configuracao correta no Coolify para backend e variaveis de ambiente

## 11. Proximos passos recomendados

- evoluir de polling para canal de tempo real mais forte
- ampliar observabilidade de erros no fluxo WhatsApp/Meta
- criar testes automatizados para fluxos criticos da Inbox
- consolidar documentacao funcional para operacao dos advogados
- revisar dependencias e padrao de build do frontend para evitar bloqueios em homologacao

## 12. Conclusao

Esta etapa aumentou significativamente a maturidade tecnica e operacional do NIC. A Caixa de Entrada deixou de ser apenas uma visualizacao basica e passou a oferecer recursos concretos para o trabalho juridico: templates oficiais da Meta, anexos, atribuicao de atendimento, edicao de contato, estabilidade de sessao e vinculacao ao processo com historico.

Do ponto de vista de negocio, o ganho principal foi aproximar o atendimento via WhatsApp da rastreabilidade juridica exigida pela operacao do escritorio. Do ponto de vista tecnico, houve melhora de resiliencia, integracao e qualidade de uso no ambiente compartilhado da equipe.



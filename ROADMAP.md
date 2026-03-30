# Roadmap do Time de Dev - NIC

Este arquivo consolida as issues e entregas implementadas no NIC ao longo da etapa recente de evolucao do produto. Nada do historico anterior foi removido; este documento foi criado para registrar com clareza o que foi desenvolvido, facilitando acompanhamento interno, auditoria tecnica e reconhecimento de performance do time.

## Status Geral

- Situacao: em evolucao continua
- Base: `develop`
- Objetivo desta etapa: amadurecer a Caixa de Entrada, integrar melhor o WhatsApp/Meta via Chatwoot e aumentar a rastreabilidade juridica do atendimento

## Issues Entregues

### Issue 01 - Integracao de templates oficiais da Meta no Inbox

Status: concluida

Entregas:
- ajuste do backend para buscar templates de WhatsApp pela inbox correta no Chatwoot
- leitura correta do formato real dos templates da Meta, incluindo `components[].text` e `body_text`
- adequacao do frontend para exibir preview fiel do template aprovado
- tratamento de erros mais claro quando a inbox nao for compativel ou quando os modelos nao estiverem sincronizados

Impacto:
- os templates oficiais passaram a ser tratados como recurso de negocio real do NIC, e nao mais como simples respostas prontas

### Issue 02 - Fallback direto da Meta para templates

Status: concluida

Entregas:
- implementacao de fallback para consultar templates direto na Meta Graph API quando o Chatwoot nao expuser o endpoint esperado
- suporte a `META_WHATSAPP_ACCESS_TOKEN`, `META_WHATSAPP_BUSINESS_ACCOUNT_ID`, `META_WHATSAPP_PHONE_NUMBER_ID` e mapas por inbox
- envio de template direto pela Meta quando o Chatwoot rejeitar o disparo do template oficial
- normalizacao da resposta para manter a experiencia do frontend consistente

Impacto:
- o NIC deixou de depender exclusivamente do comportamento da versao instalada do Chatwoot para operar templates da Meta

### Issue 03 - Fluxo completo de envio de template com variaveis

Status: concluida

Entregas:
- criacao de modal dedicado para templates do WhatsApp
- busca, selecao e preview do modelo antes do envio
- identificacao e edicao das variaveis `{{1}}`, `{{2}}`, etc.
- bloqueio de envio enquanto houver variaveis obrigatorias pendentes
- construcao de `template_params` e `content_attributes` no formato aceito por Chatwoot e Meta
- correcao para que o template enviado continue visivel no chat e na previa da conversa

Impacto:
- o fluxo do NIC ficou proximo do comportamento esperado pelos operadores que ja usam o Chatwoot

### Issue 04 - Redesenho profissional da Caixa de Entrada

Status: concluida

Entregas:
- reestruturacao visual da `InboxPage`
- remocao de faixa cinza quebrada e ajustes de layout vertical
- refinamento de listas, cards, modais, painel lateral e area de composicao
- organizacao visual mais consistente com o uso profissional do sistema

Impacto:
- a caixa de entrada passou a transmitir mais clareza operacional e menos ruido visual

### Issue 05 - Suporte a anexos e midias no chat

Status: concluida

Entregas:
- envio de anexos via `multipart/form-data`
- suporte a imagem, documento, video e audio
- visualizacao ampliada de imagens
- abertura e download de documentos
- player de audio no chat
- repasse dos anexos ao Chatwoot pelo backend

Impacto:
- o NIC passou a suportar negociacao com evidencias, comprovantes e audios dentro do fluxo real de atendimento

### Issue 06 - Status das mensagens e experiencia em tempo quase real

Status: concluida

Entregas:
- exibicao de status `Enviado`, `Entregue`, `Lido` e `Falhou`
- preview da ultima mensagem na lista de conversas
- badge de nao lidas por atendimento
- polling leve para atualizar lista, conversa aberta e status sem refresh manual
- preparo do receiver de webhook do Chatwoot para evolucao futura do tempo real

Impacto:
- o operador passou a ter leitura melhor do estado da conversa e da fila de trabalho

### Issue 07 - Correcao do comportamento de scroll da conversa

Status: concluida

Entregas:
- correcao para impedir que a conversa volte automaticamente ao fim quando o usuario sobe para ler mensagens antigas
- auto-scroll mantido apenas em situacoes adequadas, como abertura da conversa ou envio de nova mensagem
- separacao entre scroll manual do usuario e atualizacoes automaticas do chat

Impacto:
- leitura de historico ficou viavel sem perda de contexto durante atendimento

### Issue 08 - Painel lateral de contato com edicao de dados

Status: concluida

Entregas:
- drawer lateral para visualizar e editar nome, e-mail e telefone do contato
- persistencia da atualizacao do contato no Chatwoot
- integracao do painel com o atendimento ativo, sem sair do fluxo da conversa

Impacto:
- operadores conseguem corrigir dados de contato sem quebrar o atendimento

### Issue 09 - Atribuicao de conversas a colaboradores

Status: concluida

Entregas:
- fluxo de atribuicao de conversa para agente, refletindo na aba `Minhas`
- consulta de agentes da inbox e dos agentes da conta
- unificacao da experiencia em um unico campo de busca
- uso do simbolo `+` para adicionar colaborador na inbox e, em seguida, selecionar para atribuicao
- salvamento da atribuicao no backend com integracao ao Chatwoot

Impacto:
- distribuicao de atendimentos ficou aderente ao modelo de operacao do escritorio

### Issue 10 - Vinculacao da conversa ao processo juridico

Status: concluida

Entregas:
- adicao da acao `Vincular processo` diretamente na conversa e no painel lateral
- modernizacao do modal de busca de processos
- busca por numero do processo, autor, reu e parte adversa usando a API paginada
- persistencia do `legal_case_id` da conversa no backend
- resolucao da conversa pelo identificador correto vindo do Chatwoot
- criacao automatica de entrada no historico do processo ao vincular
- criacao automatica de registro de desvinculacao no historico anterior quando a conversa for movida para outro processo

Impacto:
- o atendimento via WhatsApp passou a compor o contexto juridico formal do processo

### Issue 11 - Estabilidade de autenticacao e sessao

Status: concluida

Entregas:
- correcao para nao invalidar todas as sessoes do usuario a cada novo login
- normalizacao do token salvo no navegador
- validacao da sessao ao abrir o frontend
- limpeza automatica de credenciais invalidas
- fortalecimento do login com normalizacao de e-mail e busca case-insensitive
- exibicao da mensagem real de erro do backend na tela de login

Impacto:
- reducao de 401 em cascata e menor chance de derrubar sessoes validas da equipe

### Issue 12 - Correcoes de infraestrutura e compatibilidade de ambiente

Status: concluida

Entregas:
- ajustes de CORS para `lab` e producao
- resposta correta a preflight `OPTIONS`
- reforco do bootstrap/middleware para evitar bloqueios por origem
- ajustes de compatibilidade com Vite e dominios de deploy
- correcoes de timeout, parse error e falhas de deploy observadas no ciclo de homologacao

Impacto:
- maior estabilidade para homologacao, deploy e uso simultaneo por varios desenvolvedores

## Resultado Consolidado da Etapa

- o NIC amadureceu como camada personalizada sobre o Chatwoot para operacao juridica via WhatsApp
- o time passou a contar com templates oficiais da Meta, anexos, atribuicao de atendimento, edicao de contato e vinculo ao processo na mesma experiencia
- o historico juridico ganhou rastreabilidade adicional ao registrar a vinculacao entre conversa e processo
- a operacao ficou mais resiliente em autenticacao, scroll, atualizacao da conversa e compatibilidade de ambiente

## Observacao Final

Este roadmap deve continuar sendo atualizado a cada entrega relevante, mantendo rastreabilidade clara do valor gerado pelo time de desenvolvimento no NIC.

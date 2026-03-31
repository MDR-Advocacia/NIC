# NIC - Nucleo Integrado de Conciliacoes

Plataforma interna da MDR Advocacia para gestao de atendimentos, negociacoes, processos juridicos e acompanhamento operacional, com frontend proprio sobre a operacao do Chatwoot e integracao com WhatsApp Business / Meta.

## Visao Geral

O NIC foi estruturado para centralizar a operacao juridica em tres frentes principais:

- atendimento e negociacao via Caixa de Entrada
- gestao juridica de processos e pipeline de acordos
- rastreabilidade operacional por historico, auditoria e dashboards

Na pratica, o sistema combina:

- frontend React/Vite para experiencia dos usuarios
- backend Laravel para API, autenticacao, regras de negocio e integracoes
- Chatwoot como base operacional de conversas
- WhatsApp Business / Meta como canal oficial de templates e mensageria

## Para quem este README serve

Este documento foi atualizado para atender dois perfis ao mesmo tempo:

- time de desenvolvimento, que precisa entender arquitetura, setup, variaveis e pontos de manutencao
- usuarios internos e stakeholders, que precisam entender o que o sistema faz e quais fluxos estao disponiveis

## O que o NIC faz hoje

### Modulo juridico

- cadastro e gestao de processos
- pipeline de acordos
- historico de movimentacoes
- geracao de minutas
- associacao entre atendimento e processo juridico

### Modulo de atendimento

- Caixa de Entrada com conversas do WhatsApp
- envio de mensagens livres
- envio de templates oficiais da Meta com variaveis
- envio de anexos, imagens, documentos e audios
- atribuicao de conversas para agentes
- edicao de contato sem sair da conversa
- vinculacao da conversa ao processo com registro em historico

### Modulo de controle e operacao

- dashboards operacionais
- logs de auditoria
- gestao de usuarios
- suporte a fluxo de trabalho multiusuario

## Arquitetura

O projeto segue uma estrutura de monorepo.

### Backend

Pasta: `concilia-backend/src`

Responsabilidades:

- autenticacao com Laravel Sanctum
- API principal do sistema
- integracao com Chatwoot
- integracao com Meta/WhatsApp
- regras de negocio dos processos e historicos
- persistencia de relacionamentos entre conversa e processo

Tecnologias:

- PHP 8.2+
- Laravel 12
- MySQL / MariaDB
- Nginx
- Docker

### Frontend

Pasta: `concilia-frontend`

Responsabilidades:

- interface do usuario
- caixa de entrada e atendimento
- dashboards e paginas administrativas
- consumo da API do backend

Tecnologias:

- React 19
- Vite
- Axios
- CSS Modules
- Chart.js
- @dnd-kit
- react-icons
- xlsx
- papaparse

## Estrutura do repositorio

```text
NIC/
|-- concilia-backend/
|   |-- docker/
|   |-- src/
|   |   |-- app/
|   |   |-- config/
|   |   |-- database/
|   |   `-- routes/
|   `-- Dockerfile
|-- concilia-frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- context/
|   |   |-- pages/
|   |   `-- styles/
|   `-- Dockerfile
|-- docker-compose.yml
|-- ROADMAP.md
`-- DOCUMENTACAO_TECNICA_ENTREGAS_NIC.md
```

## Documentos complementares

- [`ROADMAP.md`](./ROADMAP.md): consolidado das issues e entregas recentes
- [`DOCUMENTACAO_TECNICA_ENTREGAS_NIC.md`](./DOCUMENTACAO_TECNICA_ENTREGAS_NIC.md): documentacao tecnica detalhada para envio interno e e-mail

## Manual rapido para usuarios

### 1. Login

- acesse a tela de login do NIC
- informe e-mail corporativo e senha
- se a sessao expirar, o sistema deve pedir novo login

### 2. Caixa de Entrada

Na tela de Inbox, o usuario consegue:

- abrir uma conversa
- responder com texto
- enviar templates da Meta
- preencher variaveis do template antes do envio
- enviar arquivos e audios
- editar dados do contato
- atribuir a conversa para um agente
- vincular a conversa a um processo juridico

### 3. Templates do WhatsApp

Fluxo esperado:

- abrir a conversa
- clicar em `Templates`
- selecionar o modelo
- preencher variaveis obrigatorias
- confirmar envio

Observacao:

- o uso de templates depende da configuracao correta da inbox no Chatwoot e/ou do fallback configurado para a Meta

### 4. Atribuicao da conversa

No drawer lateral da conversa:

- pesquise o colaborador
- se ele ja estiver na inbox, selecione e salve
- se ainda nao estiver, use o simbolo `+` para adicionar e depois atribuir

### 5. Vincular processo

Na conversa:

- clique em `Vincular processo`
- busque por numero, autor, reu ou parte adversa
- selecione o processo
- confirme o vinculo

Resultado:

- a conversa fica associada ao processo
- o historico do processo recebe um registro de vinculacao

## Manual tecnico para devs

### Pre-requisitos

- Docker
- Docker Compose
- Git
- Node.js local opcional
- Composer local opcional

### Setup local com Docker

1. Clone o repositorio:

```bash
git clone https://github.com/MDR-Advocacia/NIC.git
cd NIC
```

2. Crie o `.env` do backend:

```bash
cd concilia-backend/src
cp .env.example .env
```

3. Ajuste o `.env` para Docker/MySQL. O `.env.example` atual usa SQLite por padrao, entao para o ambiente Docker troque para algo como:

```env
DB_CONNECTION=mysql
DB_HOST=db
DB_PORT=3306
DB_DATABASE=concilia_db
DB_USERNAME=conciliauser
DB_PASSWORD=root
```

4. Volte para a raiz e suba os servicos:

```bash
cd ../../
docker compose up -d --build
```

### Servicos atuais do docker-compose

- `app`: Laravel / PHP-FPM
- `nginx`: exposicao da API em `8123`
- `db`: MySQL 8
- `frontend`: Vite em `5173`

### Enderecos locais

- frontend: `http://localhost:5173`
- backend API: `http://localhost:8123/api`
- MySQL: `localhost:3306`

### Comandos uteis

Subir ambiente:

```bash
docker compose up -d
```

Parar ambiente:

```bash
docker compose down
```

Instalar dependencias do backend:

```bash
docker compose exec app composer install
```

Gerar chave do Laravel:

```bash
docker compose exec -u root app php artisan key:generate
```

Limpar caches:

```bash
docker compose exec app php artisan optimize:clear
```

Rodar migracoes:

```bash
docker compose exec app php artisan migrate
```

Rodar seeders:

```bash
docker compose exec app php artisan db:seed
```

Instalar dependencias do frontend:

```bash
docker compose exec frontend npm install
```

Build do frontend:

```bash
docker compose exec frontend npm run build
```

Logs do backend:

```bash
docker compose logs -f app
```

### Variaveis importantes do backend

#### Chatwoot

Estas variaveis sao essenciais para a operacao da Inbox:

- `CHATWOOT_URL`
- `CHATWOOT_API_TOKEN`
- `CHATWOOT_ACCOUNT_ID`

#### Meta / WhatsApp

Usadas no fallback e no envio/listagem de templates:

- `META_WHATSAPP_ACCESS_TOKEN`
- `META_WHATSAPP_BUSINESS_ACCOUNT_ID`
- `META_WHATSAPP_PHONE_NUMBER_ID`
- `META_WHATSAPP_BUSINESS_ACCOUNT_ID_MAP`
- `META_WHATSAPP_PHONE_NUMBER_ID_MAP`
- `META_WHATSAPP_API_VERSION`

#### Frontend

Variavel principal:

- `VITE_API_URL`

No `docker-compose.yml` atual ela aponta para:

```env
VITE_API_URL=http://localhost:8123/api
```

## Fluxos tecnicos sensiveis

### Templates da Meta

O sistema pode trabalhar em dois modos:

- via endpoint de templates do Chatwoot
- via fallback direto da Meta

Se os templates nao aparecerem:

- valide a inbox de WhatsApp no Chatwoot
- confira se houve sincronizacao manual dos modelos
- confira variaveis da Meta no backend

### Sessao e autenticacao

O frontend hoje:

- normaliza token salvo no navegador
- valida a sessao ao abrir
- limpa credenciais invalidas automaticamente

O backend foi ajustado para nao derrubar todas as sessoes validas a cada novo login.

### Vinculacao conversa-processo

O fluxo depende de:

- rota de vinculo no backend
- resolucao correta da conversa a partir do ID do Chatwoot
- persistencia do `legal_case_id`
- criacao de item no historico do processo

## Principais arquivos de referencia para manutencao

### Frontend

- `concilia-frontend/src/pages/InboxPage.jsx`
- `concilia-frontend/src/components/LinkCaseModal.jsx`
- `concilia-frontend/src/context/AuthContext.jsx`
- `concilia-frontend/src/components/Login.jsx`
- `concilia-frontend/src/api.js`

### Backend

- `concilia-backend/src/app/Http/Controllers/Api/ChatController.php`
- `concilia-backend/src/app/Http/Controllers/Api/AuthController.php`
- `concilia-backend/src/app/Http/Controllers/Api/WebhookController.php`
- `concilia-backend/src/routes/api.php`
- `concilia-backend/src/config/services.php`
- `concilia-backend/src/config/cors.php`

## Entregas recentes relevantes

Entre as evolucoes recentes, destacam-se:

- integracao de templates oficiais da Meta
- fallback direto da Meta
- modal de template com variaveis
- suporte a anexos e audios
- preview da ultima mensagem e badge de nao lidas
- drawer lateral de contato
- atribuicao de conversas para colaboradores
- vinculacao da conversa ao processo com historico
- correcoes de scroll da Inbox
- estabilidade de autenticacao, CORS e homologacao

Mais detalhes estao em:

- [`ROADMAP.md`](./ROADMAP.md)
- [`DOCUMENTACAO_TECNICA_ENTREGAS_NIC.md`](./DOCUMENTACAO_TECNICA_ENTREGAS_NIC.md)

## Limitacoes e proximos passos

- o fluxo de tempo real ainda usa polling leve; ha espaco para evoluir para SSE ou websocket
- o comportamento de templates depende de configuracao correta do Chatwoot e da Meta
- o ambiente compartilhado de homologacao exige cuidado com deploys concorrentes
- testes automatizados da Inbox ainda podem ser ampliados

## Licenca e uso

Este projeto e proprietario e desenvolvido para uso interno do MDR Advocacia.

## Conteudo legado preservado

O bloco abaixo preserva o conteudo anterior do README, mantido como registro historico.

```text
âš–ï¸ NIC - NÃºcleo Integrado de ConciliaÃ§Ã£o

GestÃ£o Inteligente de Processos JurÃ­dicos e Acordos

O NIC Ã© uma plataforma full-stack desenvolvida para otimizar o fluxo de trabalho de escritÃ³rios de advocacia focados em conciliaÃ§Ã£o. O sistema centraliza a gestÃ£o de processos, facilita a negociaÃ§Ã£o de acordos e oferece mÃ©tricas de desempenho em tempo real atravÃ©s de dashboards interativos.

ðŸš€ Funcionalidades Principais

ðŸ“Š GestÃ£o e Dashboards
* Dashboard Executivo: VisualizaÃ§Ã£o grÃ¡fica de KPIs, evoluÃ§Ã£o mensal de acordos e status dos processos usando Chart.js.
* Pipeline de Acordos (Kanban): GestÃ£o visual do fluxo de negociaÃ§Ã£o (ex: Em AnÃ¡lise, Proposta Enviada, Minuta Aprovada, ConcluÃ­do) com funcionalidade "drag-and-drop".

ðŸ“‚ Controle JurÃ­dico
* GestÃ£o de Casos (Legal Cases): Cadastro completo de processos, partes envolvidas, valores da causa e comarcas.
* HistÃ³rico de TramitaÃ§Ã£o: Acompanhamento cronolÃ³gico de todas as movimentaÃ§Ãµes do processo.
* Gerador de Minutas: CriaÃ§Ã£o automÃ¡tica de documentos (minutas de acordo) com base em templates predefinidos.

ðŸ’¬ ComunicaÃ§Ã£o e Auditoria
* Chat Interno: Sistema de mensagens vinculado aos casos para registro de negociaÃ§Ãµes.
* Logs de Auditoria: Rastreabilidade completa de aÃ§Ãµes crÃ­ticas no sistema (criaÃ§Ã£o, ediÃ§Ã£o e exclusÃ£o de registros).
* GestÃ£o de Advogados Ofensores: Base de dados para controle de advogados da parte contrÃ¡ria.

ðŸ› ï¸ Tecnologias Utilizadas

O projeto adota uma arquitetura de Monorepo, dividida em backend e frontend:

Backend (/concilia-backend)
* Linguagem: PHP 8.2+
* Framework: Laravel 12
* Banco de Dados: MySQL / MariaDB
* AutenticaÃ§Ã£o: Laravel Sanctum
* Infraestrutura: Docker & Nginx

Frontend (/concilia-frontend)
* Linguagem: JavaScript (ES6+)
* Framework: React 19
* Build Tool: Vite
* EstilizaÃ§Ã£o: CSS Modules
* Bibliotecas Chave: react-chartjs-2 (GrÃ¡ficos), @dnd-kit (Kanban), axios (RequisiÃ§Ãµes HTTP).

ðŸ—ï¸ Estrutura do Projeto

    NIC/
    â”œâ”€â”€ concilia-backend/       # API Laravel e configuraÃ§Ãµes Nginx
    â”‚   â”œâ”€â”€ src/                # CÃ³digo fonte Laravel
    â”‚   â”œâ”€â”€ docker/             # ConfiguraÃ§Ãµes de container
    â”‚   â””â”€â”€ Dockerfile
    â”œâ”€â”€ concilia-frontend/      # AplicaÃ§Ã£o React SPA
    â”‚   â”œâ”€â”€ src/                # Componentes, PÃ¡ginas e Contextos
    â”‚   â””â”€â”€ Dockerfile
    â””â”€â”€ docker-compose.yml      # OrquestraÃ§Ã£o dos serviÃ§os (App, Nginx, DB, Frontend)


âš™ï¸ InstalaÃ§Ã£o e ConfiguraÃ§Ã£o (Docker)

Siga este passo a passo para configurar o ambiente do zero.

PrÃ©-requisitos
* Docker e Docker Compose instalados e rodando.
* Git.

1. Clone o repositÃ³rio

    git clone [URL_DO_REPOSITORIO]
    cd NIC

2. Configure as VariÃ¡veis de Ambiente (Backend)
Antes de subir os containers, crie o arquivo .env do Laravel:

    cd concilia-backend/src
    cp .env.example .env

Edite o arquivo .env e garanta que a conexÃ£o com o banco esteja apontando para o container db:

    DB_CONNECTION=mysql
    DB_HOST=db
    DB_PORT=3306
    DB_DATABASE=concilia_db
    DB_USERNAME=conciliauser
    DB_PASSWORD=root

3. Suba os Containers
Volte para a raiz do projeto (onde estÃ¡ o docker-compose.yml) e inicie os serviÃ§os:

    cd ../../
    docker-compose up -d --build

4. ConfiguraÃ§Ã£o do Backend (Laravel)
Execute os comandos abaixo sequencialmente para instalar dependÃªncias e configurar o banco.

    #### 1. Instalar dependÃªncias do PHP (Composer)
        docker-compose exec app composer install

    #### 2. Gerar a chave da aplicaÃ§Ã£o (Como root para evitar erro de permissÃ£o no arquivo .env)
        docker-compose exec -u root app php artisan key:generate

    #### 3. Rodar as migraÃ§Ãµes e popular o banco de dados (Seeds)
        docker-compose exec app php artisan migrate --seed

    #### 4. Ajustar permissÃµes de pastas de cache/storage (Opcional, caso haja erro de permissÃ£o em logs)
        docker-compose exec -u root app chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

5. ConfiguraÃ§Ã£o do Frontend (React)
Instale as dependÃªncias do node dentro do container:

    docker-compose exec frontend npm install

6. Acesso Ã  AplicaÃ§Ã£o

* ðŸ–¥ï¸ Frontend (AplicaÃ§Ã£o): http://localhost:5173
* ðŸ”Œ Backend (API): http://localhost:8123/api
* ðŸ—„ï¸ Banco de Dados: Host: localhost | Porta: 3306 | User: conciliauser | Pass: root

ðŸ”’ LicenÃ§a

Este projeto Ã© proprietÃ¡rio e desenvolvido para uso exclusivo do MDR Advocacia.
Copyright Â© 2025 NIC - NÃºcleo Integrado de ConciliaÃ§Ã£o.
```

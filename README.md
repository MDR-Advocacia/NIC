⚖️ NIC - Núcleo Integrado de Conciliação

Gestão Inteligente de Processos Jurídicos e Acordos

O NIC é uma plataforma full-stack desenvolvida para otimizar o fluxo de trabalho de escritórios de advocacia focados em conciliação. O sistema centraliza a gestão de processos, facilita a negociação de acordos e oferece métricas de desempenho em tempo real através de dashboards interativos.

🚀 Funcionalidades Principais

📊 Gestão e Dashboards
* Dashboard Executivo: Visualização gráfica de KPIs, evolução mensal de acordos e status dos processos usando Chart.js.
* Pipeline de Acordos (Kanban): Gestão visual do fluxo de negociação (ex: Em Análise, Proposta Enviada, Minuta Aprovada, Concluído) com funcionalidade "drag-and-drop".

📂 Controle Jurídico
* Gestão de Casos (Legal Cases): Cadastro completo de processos, partes envolvidas, valores da causa e comarcas.
* Histórico de Tramitação: Acompanhamento cronológico de todas as movimentações do processo.
* Gerador de Minutas: Criação automática de documentos (minutas de acordo) com base em templates predefinidos.

💬 Comunicação e Auditoria
* Chat Interno: Sistema de mensagens vinculado aos casos para registro de negociações.
* Logs de Auditoria: Rastreabilidade completa de ações críticas no sistema (criação, edição e exclusão de registros).
* Gestão de Advogados Ofensores: Base de dados para controle de advogados da parte contrária.

🛠️ Tecnologias Utilizadas

O projeto adota uma arquitetura de Monorepo, dividida em backend e frontend:

Backend (/concilia-backend)
* Linguagem: PHP 8.2+
* Framework: Laravel 12
* Banco de Dados: MySQL / MariaDB
* Autenticação: Laravel Sanctum
* Infraestrutura: Docker & Nginx

Frontend (/concilia-frontend)
* Linguagem: JavaScript (ES6+)
* Framework: React 19
* Build Tool: Vite
* Estilização: CSS Modules
* Bibliotecas Chave: react-chartjs-2 (Gráficos), @dnd-kit (Kanban), axios (Requisições HTTP).

🏗️ Estrutura do Projeto

    NIC/
    ├── concilia-backend/       # API Laravel e configurações Nginx
    │   ├── src/                # Código fonte Laravel
    │   ├── docker/             # Configurações de container
    │   └── Dockerfile
    ├── concilia-frontend/      # Aplicação React SPA
    │   ├── src/                # Componentes, Páginas e Contextos
    │   └── Dockerfile
    └── docker-compose.yml      # Orquestração dos serviços (App, Nginx, DB, Frontend)


⚙️ Instalação e Configuração (Docker)

Siga este passo a passo para configurar o ambiente do zero.

Pré-requisitos
* Docker e Docker Compose instalados e rodando.
* Git.

1. Clone o repositório

    git clone [URL_DO_REPOSITORIO]
    cd NIC

2. Configure as Variáveis de Ambiente (Backend)
Antes de subir os containers, crie o arquivo .env do Laravel:

    cd concilia-backend/src
    cp .env.example .env

Edite o arquivo .env e garanta que a conexão com o banco esteja apontando para o container db:
    
    DB_CONNECTION=mysql
    DB_HOST=db
    DB_PORT=3306
    DB_DATABASE=concilia_db
    DB_USERNAME=conciliauser
    DB_PASSWORD=root

3. Suba os Containers
Volte para a raiz do projeto (onde está o docker-compose.yml) e inicie os serviços:

    cd ../../
    docker-compose up -d --build

4. Configuração do Backend (Laravel)
Execute os comandos abaixo sequencialmente para instalar dependências e configurar o banco.

    #### 1. Instalar dependências do PHP (Composer)
        docker-compose exec app composer install

    #### 2. Gerar a chave da aplicação (Como root para evitar erro de permissão no arquivo .env)
        docker-compose exec -u root app php artisan key:generate

    #### 3. Rodar as migrações e popular o banco de dados (Seeds)
        docker-compose exec app php artisan migrate --seed

    #### 4. Ajustar permissões de pastas de cache/storage (Opcional, caso haja erro de permissão em logs)
        docker-compose exec -u root app chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

5. Configuração do Frontend (React)
Instale as dependências do node dentro do container:

    docker-compose exec frontend npm install

6. Acesso à Aplicação

* 🖥️ Frontend (Aplicação): http://localhost:5173
* 🔌 Backend (API): http://localhost:8123/api
* 🗄️ Banco de Dados: Host: localhost | Porta: 3306 | User: conciliauser | Pass: root

🔒 Licença

Este projeto é proprietário e desenvolvido para uso exclusivo do MDR Advocacia.
Copyright © 2025 NIC - Núcleo Integrado de Conciliação.

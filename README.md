# VERSÃO COOLIFY
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
    ├── concilia-backend/       # API Laravel
    │   ├── src/                # Código fonte Laravel
    │   ├── docker/             # Configurações de container (Nginx, PHP)
    │   └── Dockerfile
    ├── concilia-frontend/      # Aplicação React SPA
    │   ├── src/                # Componentes, Páginas e Contextos
    │   └── vite.config.js
    └── docker-compose.yml      # Orquestração dos serviços


⚙️ Instalação e Configuração

Pré-requisitos

* Docker e Docker Compose instalados.

* Git.

Passo a Passo

Clone o repositório

    git clone [https://github.com/seu-usuario/nic-concilia.git](https://github.com/seu-usuario/nic-concilia.git) -b develop

    git checkout [feature/nomebranch]

    cd NIC


Configure as Variáveis de Ambiente (Backend)
Entre na pasta do código fonte do backend e crie o arquivo .env:

    cd concilia-backend/src
    cp .env.example .env


Edite o arquivo .env para configurar as credenciais do banco de dados conforme o docker-compose.yml.

Suba os Containers (Docker)
Volte para a raiz do projeto e inicie os serviços:

    cd ../../
    docker-compose up -d --build


Instale as Dependências do Backend
Acesse o container do backend para rodar o composer:

    docker-compose exec app bash
    cd src
    composer install
    php artisan key:generate
    php artisan migrate --seed


Instale as Dependências do Frontend
Em um novo terminal, na pasta do frontend:

    cd concilia-frontend
    npm install
    npm run dev


🔒 Licença

Este projeto é proprietário e desenvolvido para uso exclusivo do MDR Advocacia.
Copyright © 2025 NIC - Núcleo Integrado de Conciliação.

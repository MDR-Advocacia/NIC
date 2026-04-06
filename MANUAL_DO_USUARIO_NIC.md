# Manual do Usuario - NIC

Data de referencia: 02/04/2026
Versao do manual: 1.0
Sistema: NIC - Nucleo Integrado de Conciliacoes

## 1. Apresentacao

O NIC e uma plataforma web para gestao de processos juridicos voltados a conciliacao. O sistema centraliza o acompanhamento de casos, negociacoes, importacao de planilhas, atendimento via WhatsApp, auditoria de acoes e indicadores operacionais.

Este manual foi elaborado com base no funcionamento atual do sistema observado no projeto e tem como objetivo orientar usuarios finais sobre:

- acesso ao sistema;
- navegacao pelos modulos;
- operacoes diarias;
- diferencas de permissao por perfil;
- boas praticas de uso.

## 2. Objetivo do sistema

O NIC foi construido para apoiar o fluxo operacional de conciliacao, permitindo:

- registrar e acompanhar processos;
- distribuir casos entre operadores;
- analisar elegibilidade para acordo;
- movimentar o caso pelas etapas do pipeline;
- controlar propostas, alcada e beneficios complementares;
- manter historico, chat e rastreabilidade;
- importar e sanear planilhas de base;
- acompanhar resultados em dashboards.

## 3. Perfis de acesso

O menu e as acoes disponiveis mudam conforme o perfil do usuario.

### 3.1 Administrador

Perfil com acesso total ao sistema. Pode:

- acessar Dashboard;
- acessar Caixa de Entrada;
- acessar Pipeline de Acordos;
- acessar Gestao de Casos;
- importar dados;
- acessar Base Geral;
- criar, editar e excluir casos na Base Geral;
- gerenciar usuarios;
- consultar Auditoria / Logs;
- alterar propria senha em Meu Perfil.

### 3.2 Supervisor

Perfil de gestao operacional. Pode:

- acessar Dashboard;
- acessar Caixa de Entrada;
- acessar Pipeline de Acordos;
- acessar Gestao de Casos;
- importar dados;
- acessar Base Geral para consulta;
- gerenciar usuarios;
- alterar propria senha em Meu Perfil.

Nao possui acesso ao modulo Auditoria / Logs.

### 3.3 Operador

Perfil de execucao operacional. Pode:

- acessar Dashboard em visao operacional;
- acessar Caixa de Entrada;
- acessar Pipeline de Acordos;
- acessar Gestao de Casos;
- importar dados;
- alterar propria senha em Meu Perfil.

Nao possui acesso a:

- Base Geral;
- Gestao de Usuarios;
- Auditoria / Logs.

### 3.4 Indicador

Perfil focado na triagem e indicacao de casos para acordo. Pode:

- acessar Pipeline de Acordos;
- acessar Gestao de Casos;
- indicar casos em Analise Inicial para um operador responsavel;
- alterar propria senha em Meu Perfil.

Nao possui acesso a:

- Dashboard;
- Caixa de Entrada;
- Importacao de Dados;
- Base Geral;
- Gestao de Usuarios;
- Auditoria / Logs.

## 4. Acesso ao sistema

### 4.1 Tela de login

Ao acessar o NIC, o usuario encontra a tela de autenticacao com:

- campo de e-mail corporativo;
- campo de senha;
- link "Esqueci minha senha";
- botao "Acessar Sistema".

Em caso de credenciais invalidas, o sistema exibe mensagem de erro na propria tela.

### 4.2 Recuperacao de senha

Pelo link "Esqueci minha senha", o usuario informa seu e-mail corporativo para receber o link de redefinicao.

Fluxo:

1. acessar "Esqueci minha senha";
2. informar o e-mail;
3. receber o link de redefinicao;
4. cadastrar a nova senha;
5. retornar ao login.

### 4.3 Troca obrigatoria de senha

Em algumas situacoes, o sistema pode exigir troca imediata de senha no primeiro acesso ou apos definicao administrativa. Nesses casos, o usuario so prossegue apos informar:

- senha atual;
- nova senha;
- confirmacao da nova senha.

### 4.4 Meu Perfil

Em "Meu Perfil", qualquer usuario pode:

- visualizar nome;
- visualizar e-mail;
- alterar a propria senha.

Regra atual:

- a nova senha deve ter no minimo 8 caracteres;
- a confirmacao deve ser igual a nova senha.

## 5. Visao geral da interface

Depois do login, o sistema e exibido com menu lateral.

### 5.1 Menu lateral

Os itens visiveis dependem do perfil, mas a estrutura geral pode incluir:

- Dashboard;
- Caixa de Entrada;
- Pipeline de Acordos;
- Configuracoes;
- Meu Perfil;
- Sair.

Dentro de "Configuracoes", podem aparecer:

- Gestao de Casos;
- Importar Dados;
- Base Geral;
- Gestao de Usuarios;
- Auditoria / Logs.

### 5.2 Informacoes do rodape lateral

No rodape do menu lateral o sistema exibe:

- nome do usuario logado;
- perfil do usuario;
- botao para alternancia de tema;
- botao de sair.

## 6. Modulos do sistema

## 6.1 Dashboard

Disponivel para:

- administrador;
- supervisor;
- operador.

Nao disponivel para:

- indicador.

### Finalidade

Apresentar a visao gerencial e operacional dos resultados de conciliacao.

### Recursos principais

- indicadores de desempenho;
- evolucao mensal;
- distribuicao de status;
- distribuicao por etapa do processo;
- lista de casos recentes;
- painel de performance da equipe.

### Filtros do Dashboard

Para perfis gerenciais, o Dashboard permite filtrar por:

- data inicial;
- data final;
- cliente;
- responsavel;
- status.

### Observacoes

- gestores visualizam KPIs, filtros e performance da equipe;
- operadores acessam uma visao operacional simplificada, sem o conjunto completo de filtros gerenciais.

## 6.2 Caixa de Entrada

Disponivel para:

- administrador;
- supervisor;
- operador.

### Finalidade

Centralizar atendimentos e conversas vinculadas ao canal de WhatsApp.

### Visao geral

O modulo possui tres areas principais:

- coluna lateral com alternancia entre Mensagens e Contatos;
- painel com lista de conversas ou contatos;
- area principal com o chat da conversa selecionada.

### Recursos principais

- visualizar conversas;
- filtrar por inbox/canal;
- alternar entre "Minhas", "Nao atribuidas" e "Todas";
- enviar mensagens;
- enviar arquivos;
- enviar audio;
- enviar templates;
- cadastrar novo contato;
- editar dados do contato;
- vincular conversa a um processo;
- atribuir a conversa a um agente/colaborador.

### Uso recomendado

1. selecionar a inbox desejada;
2. abrir a conversa;
3. revisar o historico;
4. responder por texto, template ou anexo;
5. vincular a conversa ao processo, quando necessario;
6. atribuir ao agente responsavel pela continuidade.

## 6.3 Pipeline de Acordos

Disponivel para:

- administrador;
- supervisor;
- operador;
- indicador.

### Finalidade

Controlar visualmente a carteira de casos por etapa do fluxo de conciliacao.

### Etapas do pipeline

- Analise Inicial;
- Contra Indicado;
- Proposta Enviada;
- Em Negociacao;
- Aguardando Minuta;
- Acordo Fechado;
- Acordo Frustrado.

### Filtros disponiveis

- busca por processo ou parte;
- cliente;
- responsavel do caso;
- prioridade;
- etiqueta;
- casos atrasados ha mais de 5 dias.

### Recursos principais

- visualizacao em colunas;
- drag and drop entre etapas;
- abertura de modal de edicao;
- criacao de novo caso, quando o perfil permite;
- filtro de atrasados;
- exibicao de etiquetas e prioridades.

### Regras importantes

- ao mover um caso para "Contra Indicado", o sistema solicita confirmacao;
- indicadores visualizam somente a etapa "Analise Inicial";
- indicadores nao arrastam cards entre colunas;
- indicadores usam checklist proprio para indicar o caso a um operador.

## 6.4 Gestao de Casos

Disponivel para:

- administrador;
- supervisor;
- operador;
- indicador.

### Finalidade

Exibir os processos em formato tabular, com filtros, paginação e acoes operacionais.

### Recursos principais

- filtros por busca, status, prioridade e responsavel;
- ordenacao por colunas;
- paginacao;
- visualizacao de KPIs da tela;
- abertura do detalhe do processo;
- edicao do caso em modal;
- acoes em lote;
- indicacao de caso, quando o perfil for indicador.

### KPIs exibidos na tela

- total de casos;
- quantidade selecionada;
- total de acordos na pagina;
- economia na pagina.

### Acoes em lote

Para perfis que nao sao indicador, o modulo permite:

- alterar status;
- alterar prioridade;
- transferir responsavel;
- excluir em lote, quando houver permissao.

### Comportamento do perfil Indicador

Na Gestao de Casos, o indicador visualiza a fila de casos em Analise Inicial disponiveis para indicacao de acordo.

## 6.5 Cadastro de novo caso

Disponivel para:

- administrador;
- supervisor;
- operador.

### Finalidade

Registrar um novo processo na base do NIC.

### Principais secoes do formulario

- Informacoes do Processo;
- Partes Envolvidas;
- Localizacao;
- Financeiro;
- Checklist Acordo;
- Etiquetas.

### Informacoes normalmente preenchidas

- numero do processo;
- numero interno;
- objeto da acao;
- data de distribuicao;
- autor;
- reu;
- cliente;
- advogado responsavel;
- advogado adverso;
- contato do advogado adverso;
- comarca;
- estado;
- cidade;
- valor da causa;
- valor de alcada;
- proposta inicial;
- beneficio complementar;
- prioridade;
- observacoes;
- etiquetas.

### Beneficios complementares

O sistema permite configurar:

- Ourocap;
- Livelo.

Regras atuais:

- Ourocap minimo: R$ 500,00;
- Livelo minimo: 5.000 pontos;
- o caso nao pode ter Ourocap e Livelo ao mesmo tempo.

### Cadastro auxiliar no proprio formulario

Durante o cadastro, o usuario pode criar ou pesquisar:

- advogado adverso;
- objeto da acao;
- autor;
- reu.

## 6.6 Edicao e detalhe do caso

### Detalhe do caso

Ao abrir um caso em modo de visualizacao, o sistema apresenta:

- dados gerais do processo;
- valores financeiros;
- responsavel pelo caso;
- indicador do caso;
- localizacao;
- observacoes;
- checklist;
- chat vinculado;
- botao para gerar minuta.

### Geracao de minuta

O sistema so gera a minuta quando existir pelo menos uma condicao de acordo cadastrada:

- proposta em dinheiro;
- Ourocap;
- Livelo.

### Alerta de litigante abusivo

Se o advogado adverso estiver marcado como litigante abusivo/habitual, o detalhe do caso exibe alerta visual para redobrar a atencao na negociacao.

### Edicao do caso

A edicao pode ocorrer:

- na tela dedicada de edicao;
- em modal, nos modulos que oferecem esse recurso.

No editor do caso, o usuario pode alterar, entre outros:

- partes;
- objeto da acao;
- cliente;
- responsavel;
- cidade e comarca;
- valor da causa;
- valor de alcada;
- proposta de acordo;
- beneficio complementar;
- prioridade;
- checklist;
- etiquetas.

## 6.7 Historico do caso

O sistema registra historico interno de movimentacoes e alteracoes.

No historico do caso, podem aparecer:

- anotacoes manuais;
- alteracoes de campos;
- mudancas de status;
- informacoes sobre quem realizou a acao;
- data e hora do registro.

## 6.8 Importacao de Dados

Disponivel para:

- administrador;
- supervisor;
- operador.

### Finalidade

Importar planilhas de processos e atualizar a base do NIC.

### Formatos aceitos

- CSV;
- XLSX;
- XLS.

### Recursos principais

- download de modelo de planilha;
- leitura automatica de layouts reconhecidos por cabecalho;
- criacao de novos processos;
- atualizacao de processos existentes pelo numero do processo;
- processamento em lotes;
- resumo da importacao;
- tabela de saneamento;
- exportacao Legal One.

### Fluxo recomendado

1. baixar o modelo, quando necessario;
2. selecionar o arquivo;
3. enviar para processamento;
4. revisar o resumo do upload;
5. corrigir inconsistencias na tabela de saneamento;
6. reenviar as linhas saneadas;
7. exportar quando necessario.

### Tabela de saneamento

Quando a API retorna inconsistencias, o usuario pode:

- filtrar por codigo de erro;
- editar campos diretamente na linha;
- salvar ajustes locais;
- descartar linhas;
- aplicar preenchimento padrao em selecionadas;
- reenviar o lote saneado.

## 6.9 Base Geral

Disponivel para:

- administrador;
- supervisor.

### Finalidade

Consultar a base consolidada de processos com e sem alcada.

### Escopos disponiveis

- Sem alcada;
- Com alcada;
- Todos.

### Filtros disponiveis

- busca por processo ou parte;
- filtro por alcada/escopo;
- status;
- advogado.

### Informacoes exibidas na listagem

- ID do caso;
- numero do processo;
- autor e reu;
- objeto da acao;
- comarca;
- valor da causa;
- valor de alcada;
- status;
- advogado.

### Permissoes por perfil

Supervisor:

- pode consultar e filtrar a base.

Administrador:

- pode consultar e filtrar a base;
- pode criar novo caso;
- pode abrir a edicao em modal;
- pode excluir casos.

### Comportamento atual do administrador

Na Base Geral, o administrador pode:

- clicar no numero do caso para abrir a edicao em modal;
- usar o icone de lapis para editar;
- usar o icone de olho para visualizar o detalhe;
- usar o icone de lixeira para excluir.

## 6.10 Gestao de Usuarios

Disponivel para:

- administrador;
- supervisor.

### Finalidade

Controlar acessos, papeis, departamentos e situacao dos usuarios.

### Recursos principais

- listar usuarios;
- filtrar por busca;
- filtrar por status;
- filtrar por funcao;
- filtrar por departamento;
- filtrar por area;
- criar usuario;
- editar usuario;
- excluir usuario;
- criar departamento;
- realizar acoes em lote.

### Funcoes cadastradas no sistema

- Administrador;
- Supervisor;
- Operador;
- Indicador.

### Areas cadastradas atualmente

- Recuperacao de Credito;
- Contencioso Passivo;
- Atendente.

### Acoes em lote

Na selecao multipla, o modulo permite:

- ativar usuarios;
- desativar usuarios;
- alterar cargo;
- excluir usuarios.

## 6.11 Auditoria / Logs

Disponivel para:

- administrador.

### Finalidade

Registrar e consultar a rastreabilidade de acoes relevantes realizadas no sistema.

### Informacoes consultadas

- data e hora;
- usuario;
- acao realizada;
- detalhes tecnicos;
- IP de origem.

### Exemplos de eventos rastreados

- criacao de caso;
- edicao de caso;
- movimentacao de caso;
- exclusao de caso;
- login;
- demais operacoes auditadas.

## 7. Fluxos operacionais recomendados

## 7.1 Fluxo de triagem e acordo

1. cadastrar ou importar o caso;
2. revisar dados basicos, partes e valores;
3. realizar analise inicial;
4. se o perfil for indicador, preencher o checklist de indicacao;
5. atribuir o caso a um operador;
6. mover o caso pelo pipeline conforme a negociacao avanca;
7. registrar conversas, propostas e observacoes;
8. gerar minuta quando houver termos definidos;
9. concluir como acordo fechado, frustrado ou contra indicado.

## 7.2 Fluxo de importacao

1. preparar a planilha;
2. importar o arquivo;
3. revisar o resumo;
4. corrigir erros na tabela de saneamento;
5. reenviar;
6. consultar os processos na Gestao de Casos ou Base Geral.

## 7.3 Fluxo de atendimento

1. abrir a Caixa de Entrada;
2. selecionar a inbox;
3. localizar a conversa;
4. responder por texto, template ou anexo;
5. vincular o atendimento a um processo;
6. atribuir a conversa ao colaborador responsavel;
7. acompanhar o caso no pipeline ou no detalhe do processo.

## 8. Regras e observacoes importantes

- a exibicao do menu muda conforme o perfil do usuario;
- o indicador atua apenas sobre casos em Analise Inicial;
- a movimentacao para "Contra Indicado" pede confirmacao;
- a geracao de minuta depende de proposta ou beneficio complementar definido;
- o sistema aceita Ourocap ou Livelo, mas nao ambos ao mesmo tempo;
- a Base Geral permite CRUD somente para administrador;
- logs de auditoria ficam restritos ao administrador;
- a troca de senha exige confirmacao correta;
- usuarios sem permissao sao redirecionados para a rota padrao do proprio perfil.

## 9. Glossario rapido

### Alcada

Valor limite aprovado ou referencia de negociacao do caso.

### Base Geral

Modulo de consulta consolidada de processos com e sem alcada.

### Checklist de Indicacao

Formulario utilizado para validar se um caso em Analise Inicial pode ser encaminhado para acordo.

### Pipeline

Visao em colunas do andamento do caso dentro do fluxo de conciliacao.

### PCOND

Campo financeiro utilizado no sistema como referencia de analise processual/financeira.

### Etiquetas

Marcadores visuais aplicados ao caso para classificacao e filtros.

## 10. Boas praticas de uso

- manter dados do caso sempre atualizados;
- registrar observacoes relevantes no historico;
- vincular conversas a processos sempre que houver atendimento relacionado;
- revisar alcada e proposta antes de gerar minuta;
- usar etiquetas para organizar carteiras e filtros;
- revisar o resumo e o saneamento apos toda importacao;
- evitar exclusoes sem validacao previa, especialmente em ambiente produtivo.

## 11. Encerramento

Este manual cobre o funcionamento atual do NIC conforme a estrutura observada no projeto em 02/04/2026. Sempre que novos modulos, perfis ou regras forem adicionados, recomenda-se atualizar este documento para manter o alinhamento entre o sistema e a operacao.

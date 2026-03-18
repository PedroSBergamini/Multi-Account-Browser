# Objetivos e Prompt Inicial

## Prompt Inicial (Reconstruído)

> "Crie um navegador multi-contas utilizando Electron e React que permita o isolamento completo de sessões (cookies, cache, storage) entre abas. O sistema deve ser protegido por uma senha mestre, e todas as credenciais e dados de sessão devem ser armazenados de forma criptografada no disco local. A interface deve ser moderna, utilizando Tailwind CSS e Lucide-React para ícones."

## Objetivos do Projeto

O **Multi-Account Browser** foi desenvolvido para atender aos seguintes objetivos principais:

1.  **Isolamento de Sessão**: Permitir que o usuário esteja logado em múltiplas contas do mesmo serviço (ex: Gmail, Facebook, GitHub) simultaneamente em abas diferentes, sem que as sessões se misturem.
2.  **Segurança de Dados**: Proteger o acesso ao navegador com uma senha mestre robusta, garantindo que ninguém sem a senha possa ver as contas salvas ou as sessões ativas.
3.  **Criptografia de Ponta a Ponta**: Armazenar dados sensíveis no disco local utilizando algoritmos de criptografia de nível industrial (AES-256-GCM).
4.  **Experiência de Usuário Fluida**: Oferecer uma interface de navegação intuitiva, com gerenciamento de abas, barra de endereços e uma barra lateral para acesso rápido a contas salvas.
5.  **Privacidade**: Garantir que cada aba opere em um "container" isolado, dificultando o rastreamento entre sites.

Prompt

Você é um engenheiro de software sênior especialista em aplicações desktop seguras.

Crie um aplicativo desktop completo chamado "Multi Account Browser" utilizando Electron.

========================
🎯 OBJETIVO DO PROJETO
========================

Desenvolver um navegador desktop leve que permita:

- Abrir múltiplas abas
- Cada aba utilizar uma sessão isolada
- Permitir login simultâneo em múltiplas contas Google
- Gerenciar contas de forma segura
- Permitir salvar senhas localmente de forma criptografada (opcional)

O sistema deve ser seguro, modular e pronto para evoluir.

========================
🏗️ ARQUITETURA GERAL
========================

Utilizar:

- Electron (processo main + renderer)
- Context Isolation = true
- Comunicação via IPC segura
- Webviews com partitions isolados

Separar claramente:

- Main process (controle de janelas e segurança)
- Renderer (UI)
- Preload (bridge segura)
- Services (lógica de negócio)
- Security layer (criptografia e armazenamento)

Estrutura:

/src
  /main
  /renderer
  /preload
  /services
  /security
  /storage
  /ui

========================
🔐 SISTEMA DE ISOLAMENTO
========================

Cada aba deve:

- Utilizar partition persistente única:
  persist:tab_{id}

Garantir:

- Cookies isolados
- Sessões independentes
- Nenhum compartilhamento entre abas

Permitir:

- Nomear abas
- Associar abas a contas

========================
🔑 SISTEMA DE SEGURANÇA
========================

Implementar armazenamento seguro de credenciais:

- Criptografia com AES-256
- Derivação de chave com PBKDF2
- Salt único por arquivo
- IV aleatório por criptografia

NÃO usar hash para senhas armazenadas.

Criar:

SecurityService com:

- encrypt(data, masterPassword)
- decrypt(data, masterPassword)
- deriveKey(password, salt)

Arquivo:

/data/credentials.enc

Conteúdo criptografado:

{
  salt,
  iv,
  data
}

========================
👤 SISTEMA DE PERMISSÕES
========================

Implementar controle de usuário:

- Toggle global:
  "Salvar senhas automaticamente"

- Permitir:
  - salvar senha
  - não salvar senha
  - remover contas

- Exigir senha mestre ao iniciar app

- Bloquear acesso aos dados sem senha correta

========================
🔄 FLUXOS PRINCIPAIS
========================

1. Inicialização:
- Usuário abre app
- Solicitar senha mestre
- Descriptografar dados
- Carregar contas salvas

2. Criar aba:
- Gerar ID único
- Criar partition isolada
- Abrir webview

3. Login:
- Usuário faz login no Google
- Detectar tentativa de login
- Se auto-save ON:
    salvar credenciais criptografadas

4. Auto-login:
- Se conta tiver autoLogin:
    preencher automaticamente login

5. Gerenciamento:
- Listar contas
- Remover contas
- Abrir conta em nova aba

========================
🖥️ TELAS (UI)
========================

Criar interface com:

1. Tela inicial:
- Input senha mestre
- Botão desbloquear

2. Tela principal:
- Barra de abas (tipo navegador)
- Botão nova aba
- Campo URL
- Botão navegar

3. Painel lateral:
- Lista de contas
- Botão abrir conta
- Botão remover conta

4. Configurações:
- Toggle:
  salvar senhas automaticamente

========================
📦 SISTEMA DE IMPORTAÇÃO
========================

Permitir:

- Importar contas de arquivo JSON
- Exportar contas (criptografadas)

Validar formato antes de importar.

========================
🔌 COMUNICAÇÃO (IPC)
========================

Criar canais seguros:

- create-tab
- save-credentials
- load-credentials
- delete-account

NUNCA expor Node diretamente no renderer.

Usar preload.js com contextBridge.

========================
📐 PADRÕES DE PROJETO
========================

Aplicar:

- Service Pattern (services isolados)
- Singleton (SecurityService)
- Factory (criação de abas)
- Repository (armazenamento de credenciais)

Separar responsabilidades claramente.

========================
⚙️ TECNOLOGIAS
========================

- Electron
- Node.js
- crypto (nativo)
- HTML/CSS/JS

Opcional:
- Keytar (para futura melhoria)

========================
🛡️ BOAS PRÁTICAS DE SEGURANÇA
========================

- contextIsolation: true
- nodeIntegration: false
- validar todos inputs
- nunca expor senha em logs
- limpar memória sensível quando possível
- usar HTTPS apenas

========================
🚀 RESULTADO ESPERADO
========================

Gerar código completo incluindo:

- estrutura de pastas
- arquivos principais
- implementação funcional
- comentários explicando decisões
- código pronto para rodar

========================
🎯 FOCO
========================

- Código limpo e modular
- Segurança primeiro
- Pronto para MVP real
- Fácil evolução futura

Não simplifique segurança.

Gere o projeto completo.
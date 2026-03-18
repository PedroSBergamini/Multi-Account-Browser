# Sistemas de Fluxos e Telas

## Fluxos de Navegação e Autenticação

### 1. Fluxo de Primeiro Acesso (First Run)
- O usuário abre o aplicativo pela primeira vez.
- O sistema detecta que não existe o arquivo `credentials.enc`.
- O usuário é solicitado a criar uma **Senha Mestre**.
- O sistema gera um `salt` aleatório, deriva a chave e salva o arquivo criptografado inicial.

### 2. Fluxo de Login (Unlock)
- O usuário abre o aplicativo.
- A tela de bloqueio solicita a senha.
- O sistema descriptografa o arquivo de credenciais.
- Se a senha estiver correta, o estado `isUnlocked` no React muda para `true`.
- O navegador carrega a última sessão ou uma nova aba.

### 3. Fluxo de Criação de Aba (New Tab)
- O usuário clica no botão `+`.
- O React gera um ID único para a nova aba.
- O React solicita ao Electron (via IPC) uma partição isolada para esse ID.
- O Electron cria a sessão isolada no disco.
- O React renderiza o componente de aba com a URL padrão.

### 4. Fluxo de Navegação (Navigation)
- O usuário digita uma URL na barra de endereços.
- O React valida a URL (adiciona `https://` se necessário).
- O estado da aba ativa é atualizado com a nova URL.
- O componente de visualização (iframe/webview) recarrega com o novo endereço.

### 5. Fluxo de Importação/Exportação (Backup)
- **Exportação**: O usuário clica em "Exportar Backup". O Electron abre um diálogo de salvamento, lê o arquivo de credenciais criptografado e o salva no local escolhido.
- **Importação**: O usuário clica em "Importar JSON". O Electron abre um diálogo de seleção de arquivo, valida o formato do JSON e sobrescreve o arquivo de credenciais local. O React recarrega a lista de contas.

## Detalhamento das Telas

### Tela de Desbloqueio (Unlock Screen)
- **Componentes**: Logo, Campo de Senha, Botão de Desbloqueio, Mensagem de Erro.
- **Interações**: Foco automático no campo de senha, suporte à tecla `Enter`.

### Interface Principal (Main Interface)
- **Barra de Abas (Tab Bar)**:
    - Lista horizontal de abas abertas.
    - Indicador visual da aba ativa (linha verde na base).
    - Botão de fechar aba (visível ao passar o mouse).
    - Botão de nova aba.
- **Barra de Ferramentas (Toolbar)**:
    - Botões de navegação (Voltar, Avançar, Recarregar).
    - Barra de endereços com ícone de segurança (Shield).
    - Botões de alternância da barra lateral e configurações.
- **Barra Lateral (Sidebar)**:
    - Lista de contas salvas com avatares (iniciais do nome).
    - Botão para adicionar nova conta.
    - Indicador de sessões isoladas ativas.

### Modal de Configurações (Settings Modal)
- **Seções**: Segurança, Privacidade, Backup de Dados.
- **Interações**: Interruptores (toggles) para opções, botões de ação para importação/exportação.

## Sistema de Permissões e Segurança

- **Isolamento de Cookies**: Cada aba tem seu próprio "pote" de cookies.
- **Proteção de Memória**: A senha mestre não é armazenada em texto simples na memória após a derivação da chave.
- **Preload Scripts**: O Electron utiliza scripts de preload para expor apenas as funções necessárias ao React, evitando o acesso direto ao Node.js pelo frontend.

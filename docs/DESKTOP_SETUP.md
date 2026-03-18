# Guia de Execução Desktop

## Pré-requisitos

Para rodar o **Multi-Account Browser** no seu computador, você precisará de:
- **Node.js**: Versão 18 ou superior.
- **npm**: Versão 9 ou superior.
- **Git**: Para clonar o repositório.

## Passo a Passo para Rodar no Desktop

### 1. Clonar o Repositório
```bash
git clone <url-do-repositorio>
cd multi-account-browser
```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Executar em Modo de Desenvolvimento
O comando abaixo iniciará o Vite para o frontend e o Electron para o processo principal:
```bash
npm run dev
```

### 4. Gerar o Executável (Build)
Para criar um instalador para o seu sistema operacional (Windows, macOS ou Linux):
```bash
npm run build
```
O instalador será gerado na pasta `dist-electron` ou `release`.

## Estrutura de Execução

Ao rodar `npm run dev`, o sistema executa os seguintes processos:
1.  **Vite Server**: Inicia o servidor de desenvolvimento na porta 3000 para o React.
2.  **Electron Main**: O processo principal do Electron é iniciado, carregando o arquivo `electron/main.ts`.
3.  **Electron Renderer**: O Electron abre uma janela que carrega a URL do Vite (http://localhost:3000).
4.  **IPC Bridge**: O arquivo `electron/preload.ts` cria uma ponte segura entre o React e o Node.js, permitindo que o frontend chame funções de sistema (como salvar arquivos e gerenciar partições).

## Solução de Problemas Comuns

- **Erro de Porta 3000**: Certifique-se de que nenhum outro processo está usando a porta 3000.
- **Módulos Nativos**: Se encontrar erros relacionados ao `node:crypto` ou `node:fs`, verifique se a versão do Node.js é compatível.
- **Electron não abre**: Tente limpar a pasta `node_modules` e reinstalar as dependências.

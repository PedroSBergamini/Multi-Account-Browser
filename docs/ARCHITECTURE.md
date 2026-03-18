# Arquitetura de Segurança e Isolamento

## Sistema de Segurança

A segurança do **Multi-Account Browser** é baseada em uma senha mestre que o usuário define no primeiro acesso.

### Criptografia de Dados
- **Algoritmo**: `aes-256-gcm` (Advanced Encryption Standard com Galois/Counter Mode).
- **Derivação de Chave**: `PBKDF2` (Password-Based Key Derivation Function 2) com 100.000 iterações de `sha256`.
- **Salt e IV**: Cada operação de criptografia gera um `salt` de 16 bytes e um `IV` (Initialization Vector) de 12 bytes aleatórios, garantindo que o mesmo dado criptografado duas vezes tenha resultados diferentes.
- **Integridade**: O `authTag` do GCM é utilizado para verificar se os dados foram alterados ou corrompidos antes da descriptografia.

### Fluxo de Desbloqueio
1. O usuário insere a senha mestre.
2. O sistema tenta descriptografar o arquivo `credentials.enc` no disco local.
3. Se a descriptografia for bem-sucedida (o `authTag` bater), o navegador é desbloqueado e as contas são carregadas.

## Sistema de Isolamento de Sessão

O isolamento é o coração do navegador e utiliza o sistema de **Partitions** do Electron.

### Como Funciona:
- Cada aba criada recebe um ID único (ex: `tab_a1b2c3`).
- Este ID é passado para o Electron, que cria uma partição de sessão isolada: `persist:tab_a1b2c3`.
- **Isolamento Completo**: Cookies, localStorage, sessionStorage, IndexedDB e cache de rede são salvos em pastas separadas no disco para cada partição.
- **Sem Vazamento**: Um site aberto na Aba A não tem acesso aos cookies da Aba B, mesmo que seja o mesmo domínio.

## Padrões de Projeto (Design Patterns)

1.  **Singleton**: O `SecurityService` é implementado como um Singleton para garantir que as operações criptográficas sejam centralizadas e consistentes em toda a aplicação.
2.  **Service Pattern**: A lógica de negócio (Segurança e Armazenamento) é separada da interface (React) em serviços dedicados (`SecurityService`, `StorageService`).
3.  **IPC (Inter-Process Communication)**: Utiliza o padrão de comunicação do Electron para enviar mensagens seguras entre o processo de renderização (React) e o processo principal (Node.js/Electron).
4.  **Observer (onSnapshot)**: (Planejado para Firestore se integrado) Utilizado para reagir a mudanças de dados em tempo real.

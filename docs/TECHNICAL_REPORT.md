# Relatório Técnico e Padrões

## Tecnologias Utilizadas

| Tecnologia | Função | Versão |
|---|---|---|
| **Electron** | Framework Desktop (Node.js + Chromium) | ^33.0.0 |
| **React** | Biblioteca de Interface (UI) | ^18.3.1 |
| **TypeScript** | Linguagem de Programação (Tipagem Estática) | ^5.6.2 |
| **Tailwind CSS** | Estilização (Utility-First) | ^4.0.0 |
| **Vite** | Build Tool e Dev Server | ^6.0.1 |
| **Lucide-React** | Conjunto de Ícones SVG | ^0.468.0 |
| **Motion (Framer)** | Animações e Transições | ^11.13.1 |
| **Vitest** | Framework de Testes Unitários | ^3.0.7 |
| **Testing Library** | Testes de Componentes React | ^16.1.0 |

## Sistema de Importações e Estrutura

O projeto segue uma estrutura modular e organizada:

-   `/electron/`: Contém o processo principal (`main.ts`) e o `preload.ts` para segurança.
-   `/src/security/`: Lógica de criptografia (`SecurityService.ts`).
-   `/src/storage/`: Lógica de persistência de dados (`StorageService.ts`).
-   `/src/components/`: Componentes React reutilizáveis.
-   `/src/test/`: Configurações e mocks para testes.

### Padrão de Importação:
Utilizamos **Aliases** do Vite para simplificar as importações:
```typescript
import { SecurityService } from '@/security/SecurityService';
```

## Telas do Aplicativo

1.  **Tela de Desbloqueio (Unlock Screen)**:
    -   Exibida ao iniciar o app.
    -   Solicita a Senha Mestre.
    -   Exibe mensagens de erro em caso de falha.
    -   Animações de entrada suaves com `motion`.

2.  **Navegador Principal (Main Browser)**:
    -   **Barra de Abas**: Gerenciamento dinâmico de abas isoladas.
    -   **Barra de Navegação**: Controles de URL (Voltar, Avançar, Recarregar).
    -   **Área de Visualização**: Renderização do conteúdo web (simulado com `iframe` em ambiente web, `webview` em desktop).
    -   **Barra Lateral (Sidebar)**: Lista de contas salvas e atalhos rápidos.

3.  **Configurações (Settings Modal)**:
    -   Opções de privacidade (Salvar senhas, Isolamento).
    -   Ferramentas de dados (Importar/Exportar Backup).
    -   Ajustes de interface.

## Sistema de Permissões

O navegador solicita e gerencia as seguintes permissões de hardware e sistema:
-   **Câmera e Microfone**: Para chamadas de vídeo e áudio em sites.
-   **Geolocalização**: Para sites que dependem da localização do usuário.
-   **Notificações**: Para alertas de sites em segundo plano.
-   **Acesso ao Disco**: Restrito à pasta `userData` do Electron para salvar credenciais criptografadas.

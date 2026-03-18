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

# Minha Agenda — planner pessoal e acadêmico

Minha Agenda é um planner digital completo, feito para reunir agenda, tarefas, hábitos, lembretes, planejamento acadêmico, notas, foco e metas em um só lugar — com um visual delicado e acolhedor, pensado para facilitar (e não sobrecarregar) o dia a dia.

Este documento explica, passo a passo e sem pressupor experiência com programação, como abrir o projeto, rodar no seu computador, configurar o Firebase (login e sincronização) e publicar o app para uso real.

> **Aviso importante e honesto:** o código completo da Minha Agenda foi escrito neste ambiente, mas este ambiente **não tem acesso à internet para instalar pacotes** (não é possível rodar `npm install` aqui). Por isso, a instalação de dependências, o build de produção e os testes precisam ser feitos no **seu computador**, seguindo os passos abaixo — isso é normal para qualquer projeto React, mas é importante você saber que essa etapa ainda não foi executada.

---

## Sumário

1. [O que você precisa ter instalado](#1-o-que-você-precisa-ter-instalado)
2. [Como abrir e rodar o projeto no seu computador](#2-como-abrir-e-rodar-o-projeto-no-seu-computador)
3. [Modo local de demonstração (sem Firebase)](#3-modo-local-de-demonstração-sem-firebase)
4. [Como configurar o Firebase (login e sincronização)](#4-como-configurar-o-firebase-login-e-sincronização)
5. [Como ativar o login com Google](#5-como-ativar-o-login-com-google)
6. [Como aplicar as regras de segurança do Firestore](#6-como-aplicar-as-regras-de-segurança-do-firestore)
7. [Como gerar a versão de produção (build)](#7-como-gerar-a-versão-de-produção-build)
8. [Como publicar a Minha Agenda (Firebase Hosting)](#8-como-publicar-a-minha-agenda-firebase-hosting)
9. [Como atualizar o app depois de publicado](#9-como-atualizar-o-app-depois-de-publicado)
10. [Trocar o nome do app](#10-trocar-o-nome-do-app)
11. [Instalar a Minha Agenda como aplicativo (PWA)](#11-instalar-a-minha-agenda-como-aplicativo-pwa)
12. [Estrutura do projeto](#12-estrutura-do-projeto)
13. [Funcionalidades implementadas](#13-funcionalidades-implementadas)
14. [O que depende de configuração externa](#14-o-que-depende-de-configuração-externa)
15. [Solução de problemas comuns](#15-solução-de-problemas-comuns)

---

## 1. O que você precisa ter instalado

Antes de começar, instale no seu computador (uma vez só):

1. **Node.js** (versão 18 ou mais recente) — baixe em [nodejs.org](https://nodejs.org). Durante a instalação, pode deixar todas as opções no padrão e clicar em "Next" até o fim.
2. Um editor de código, como o **[Visual Studio Code](https://code.visualstudio.com)** (gratuito) — não é obrigatório, mas facilita bastante.

Para saber se o Node.js foi instalado corretamente, abra o **Terminal** (Mac/Linux) ou o **Prompt de Comando/PowerShell** (Windows) e digite:

```
node -v
```

Se aparecer um número de versão (ex.: `v20.11.0`), está tudo certo.

---

## 2. Como abrir e rodar o projeto no seu computador

1. Extraia o arquivo `.zip` da Minha Agenda em uma pasta do seu computador (ex.: `Documentos/minha-agenda-app`).
2. Abra o Terminal (ou o terminal integrado do VS Code: menu **Terminal → New Terminal**).
3. Navegue até a pasta do projeto. Exemplo:
   ```
   cd Documentos/minha-agenda-app
   ```
4. Instale as dependências do projeto (isso baixa todas as bibliotecas usadas pela Minha Agenda):
   ```
   npm install
   ```
   Esse comando pode demorar de 1 a 3 minutos na primeira vez. Você vai ver uma pasta nova chamada `node_modules` aparecer — é normal, ela não precisa ser aberta nem editada.
5. Inicie o app em modo de desenvolvimento:
   ```
   npm run dev
   ```
6. O terminal vai mostrar um endereço parecido com `http://localhost:5173`. Copie esse endereço e cole no seu navegador (Chrome, Edge ou Firefox).

**Como saber se deu certo:** a tela de login da Minha Agenda deve aparecer, com o nome "Minha Agenda" e a opção "Explorar sem criar conta".

Para parar o servidor de desenvolvimento, volte ao terminal e pressione `Ctrl + C`.

---

## 3. Modo local de demonstração (sem Firebase)

Você **não precisa configurar o Firebase para testar o app**. Na tela de login, clique em **"Explorar sem criar conta"** — a Minha Agenda vai:

- Criar um perfil local chamado "Miih" (você pode trocar depois em Configurações);
- Salvar todos os dados **apenas no seu navegador** (localStorage), com alguns exemplos prontos (uma aula, uma leitura, um hábito de beber água, etc.);
- Funcionar 100% offline, sem enviar nada para a internet.

Isso é chamado de **modo local de demonstração** e fica indicado com uma faixa lilás no topo do app. Os dados de exemplo podem ser removidos a qualquer momento em **Configurações → Conta → "Remover dados de exemplo"**.

Se você fechar o navegador e abrir de novo, seus dados continuam lá — eles ficam salvos naquele navegador, naquele computador. Para sincronizar entre celular e computador, ou fazer login com e-mail/Google, você precisa configurar o Firebase (próximo passo).

---

## 4. Como configurar o Firebase (login e sincronização)

O Firebase é o serviço (gratuito, do Google) que dá à Minha Agenda: login, banco de dados na nuvem e sincronização em tempo real entre dispositivos. Sem essa configuração, o app continua funcionando normalmente no modo local (passo 3).

### 4.1. Criar o projeto no Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com) e faça login com sua conta Google.
2. Clique em **"Adicionar projeto"** (ou "Criar projeto").
3. Dê um nome ao projeto, por exemplo `minha-agenda`, e clique em **Continuar**.
4. Você pode desativar o Google Analytics (não é necessário para a Minha Agenda) e clicar em **Criar projeto**.
5. Aguarde a criação (leva menos de um minuto) e clique em **Continuar**.

### 4.2. Criar o app Web dentro do projeto

1. Na página inicial do projeto, clique no ícone **`</>`** ("Web") para adicionar um app da Web.
2. Dê um apelido ao app, por exemplo `Minha Agenda Web`, e clique em **Registrar app**.
   - Não é necessário marcar "Configurar também o Firebase Hosting" agora — faremos isso no passo 8.
3. O Firebase vai mostrar um bloco de código com `firebaseConfig`, parecido com isto:
   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "minha-agenda.firebaseapp.com",
     projectId: "minha-agenda",
     storageBucket: "minha-agenda.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```
4. **Copie esses valores** — você vai usá-los no próximo passo. Depois, clique em **"Continuar no console"**.

### 4.3. Preencher o arquivo `.env`

1. Na pasta do projeto (no seu computador), encontre o arquivo **`.env.example`**.
2. Faça uma cópia desse arquivo e renomeie a cópia para **`.env`** (sem `.example` no final).
   - No VS Code: clique com o botão direito em `.env.example` → "Copy" → cole na mesma pasta → renomeie para `.env`.
3. Abra o arquivo `.env` e cole os valores do `firebaseConfig` do passo anterior, um em cada linha, assim:
   ```
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=minha-agenda.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=minha-agenda
   VITE_FIREBASE_STORAGE_BUCKET=minha-agenda.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
   ```
4. Salve o arquivo.
5. Se o app estiver rodando (`npm run dev`), pare com `Ctrl + C` e rode `npm run dev` de novo, para carregar as novas variáveis.

**Como saber se deu certo:** a faixa "Firebase ainda não foi configurado" some da tela de login, e as opções "Criar conta" e "Continuar com Google" passam a funcionar de verdade.

> Essas chaves do Firebase são **públicas** (usadas no navegador de qualquer pessoa que abrir o app) — elas não são senhas. A segurança real dos dados vem das **regras do Firestore** (passo 6), não do sigilo dessas chaves. Ainda assim, não coloque o arquivo `.env` no Git (ele já está configurado para ser ignorado, veja `.gitignore`).

### 4.4. Ativar a autenticação por e-mail e senha

1. No menu lateral do [console do Firebase](https://console.firebase.google.com), clique em **Build → Authentication**.
2. Clique em **"Vamos começar"** (Get started).
3. Na aba **Sign-in method**, clique em **"E-mail/senha"**.
4. Ative a opção **"E-mail/senha"** e clique em **Salvar**.

### 4.5. Criar o banco de dados (Firestore)

1. No menu lateral, clique em **Build → Firestore Database**.
2. Clique em **"Criar banco de dados"**.
3. Escolha o modo **produção** (production mode) — as regras de segurança do passo 6 vão proteger os dados.
4. Escolha uma localização (ex.: `southamerica-east1` para o Brasil) e clique em **Ativar**.

---

## 5. Como ativar o login com Google

1. No console do Firebase, vá em **Build → Authentication → Sign-in method**.
2. Clique em **"Google"** na lista de provedores.
3. Ative a opção e escolha um **e-mail de suporte do projeto** (pode ser o seu e-mail).
4. Clique em **Salvar**.
5. Ainda na mesma tela, role até **"Domínios autorizados"** e confirme que `localhost` já está na lista (normalmente já vem por padrão) — isso é necessário para testar o login com Google enquanto você roda o app no seu computador.
6. Quando publicar o app (passo 8), o domínio do Firebase Hosting é adicionado automaticamente a essa lista.

**Como saber se deu certo:** na tela de login da Minha Agenda, clique em "Continuar com Google" — deve abrir uma janela de login do Google e, ao concluir, você cai direto na tela inicial do app.

---

## 6. Como aplicar as regras de segurança do Firestore

As regras de segurança da Minha Agenda garantem que **cada conta só acessa os próprios dados** — nada fica aberto para leitura ou escrita pública. Elas já estão prontas no arquivo `firebase/firestore.rules`.

### Opção A — pela interface do Firebase (mais simples)

1. No console do Firebase, vá em **Build → Firestore Database → Regras** (aba "Rules").
2. Apague o conteúdo que estiver lá.
3. Abra o arquivo `firebase/firestore.rules` do projeto (no seu computador), copie todo o conteúdo e cole no lugar.
4. Clique em **Publicar**.

### Opção B — pela linha de comando (Firebase CLI)

1. Instale a ferramenta de linha de comando do Firebase (uma vez só):
   ```
   npm install -g firebase-tools
   ```
2. Faça login:
   ```
   firebase login
   ```
3. Na pasta do projeto, abra o arquivo `.firebaserc` e troque `SEU-PROJECT-ID-AQUI` pelo ID do seu projeto (você encontra em **Configurações do projeto**, no console do Firebase — é o mesmo valor de `projectId` do passo 4.2).
4. Publique as regras e os índices:
   ```
   firebase deploy --only firestore:rules,firestore:indexes
   ```

**Como saber se deu certo:** na aba "Rules" do Firestore, o conteúdo deve ser igual ao do arquivo `firebase/firestore.rules` do projeto, e a data de "última publicação" deve ser recente.

> O arquivo `firebase/firestore.indexes.json` está vazio de propósito: as consultas que a Minha Agenda faz hoje não precisam de índices compostos (cada usuária só consulta a própria subcoleção). Se você adicionar filtros mais complexos no futuro, o próprio Firebase avisa (com um link direto) quando um índice precisar ser criado.

---

## 7. Como gerar a versão de produção (build)

Quando quiser publicar o app (ou apenas testar a versão final, otimizada), rode na pasta do projeto:

```
npm run build
```

Esse comando verifica os tipos do TypeScript e gera os arquivos finais dentro da pasta **`dist/`**. Se aparecer algum erro no terminal, ele vai indicar o arquivo e a linha — nesse caso, revise a mensagem antes de publicar.

Para conferir como a versão de produção se comporta antes de publicar, rode:

```
npm run preview
```

e abra o endereço mostrado no terminal.

**Como saber se deu certo:** a pasta `dist/` aparece na raiz do projeto, contendo um arquivo `index.html` e uma pasta `assets/`.

---

## 8. Como publicar a Minha Agenda (Firebase Hosting)

A Minha Agenda usa login, banco de dados e várias rotas internas (`/agenda`, `/tarefas`, etc.) — por isso, um serviço simples de arquivos estáticos como o GitHub Pages **não é adequado sozinho** (ele não redireciona automaticamente as rotas internas para o `index.html`, e não integra com a autenticação do Firebase da mesma forma). Por isso, a forma recomendada de publicar é o **Firebase Hosting**, que já está configurado no projeto (`firebase.json`) — e é gratuito para um app pessoal como este.

O repositório continua compatível com o GitHub normalmente (você pode guardar o código-fonte lá); a publicação em si é feita pelo Firebase Hosting.

1. Instale a ferramenta de linha de comando (se ainda não tiver feito):
   ```
   npm install -g firebase-tools
   ```
2. Faça login:
   ```
   firebase login
   ```
3. Confirme que o arquivo `.firebaserc` tem o `projectId` correto (veja passo 6.B.3).
4. Gere a versão de produção:
   ```
   npm run build
   ```
5. Publique:
   ```
   firebase deploy --only hosting
   ```
6. Ao final, o terminal mostra um endereço parecido com `https://minha-agenda.web.app` — esse é o link do seu app publicado, acessível de qualquer dispositivo.

**Como saber se deu certo:** abra o link mostrado no terminal em uma aba anônima do navegador — a tela de login da Minha Agenda deve aparecer normalmente, e o login com e-mail/Google deve funcionar.

---

## 9. Como atualizar o app depois de publicado

Sempre que você (ou quem estiver ajudando você) alterar o código:

1. Rode `npm run build` novamente.
2. Rode `firebase deploy --only hosting` novamente.

Isso substitui a versão publicada pela nova. Quem já tem o app aberto ou instalado recebe um aviso discreto de **"Uma nova versão da Minha Agenda está disponível"**, com um botão para atualizar — não é preciso reinstalar nada.

---

## 10. Trocar o nome do app

O nome "Minha Agenda" pode ser trocado facilmente, sem mexer no restante do código:

1. Abra o arquivo `src/config/app.config.ts` e troque os valores de `name`, `fullName` e `tagline`.
2. Para trocar o nome que aparece quando o app é instalado no celular/computador (PWA), abra `vite.config.ts` e troque os campos `name` e `short_name` dentro de `manifest`.
3. Se quiser, gere um novo ícone rodando (na pasta do projeto):
   ```
   python3 scripts/gen_icons.py
   ```
   (isso requer Python 3 com a biblioteca Pillow instalada — `pip install pillow` — mas é totalmente opcional; os ícones enviados já funcionam).

---

## 11. Instalar a Minha Agenda como aplicativo (PWA)

Depois de publicado (passo 8), ou mesmo rodando localmente com `npm run build && npm run preview`:

- **No celular (Android/Chrome):** abra o link do app, toque no menu (⋮) e escolha **"Adicionar à tela inicial"** ou **"Instalar app"**.
- **No iPhone (Safari):** abra o link, toque no ícone de compartilhar e escolha **"Adicionar à Tela de Início"**.
- **No computador (Chrome/Edge):** um ícone de instalação aparece à direita da barra de endereço — clique nele e depois em **"Instalar"**.

O app instalado abre em janela própria, funciona offline (com os dados já carregados) e sincroniza automaticamente quando a internet volta.

---

## 12. Estrutura do projeto

```
minha-agenda-app/
├─ src/
│  ├─ components/       componentes de interface, organizados por área
│  │  ├─ ui/             botões, campos, modais, etc. (base do design system)
│  │  ├─ layout/          barra lateral, navegação inferior, menu de adicionar
│  │  ├─ home, agenda, tasks, habits, reminders, academic, notes, goals, links, progress, settings, shared
│  ├─ pages/             uma página por rota (Início, Agenda, Tarefas...)
│  ├─ contexts/          estado global: autenticação, dados, preferências, notificações
│  ├─ hooks/              lógica reutilizável (hoje, pomodoro, busca global, lembretes)
│  ├─ lib/                Firebase, motor de dados local e motor de dados do Firestore
│  ├─ utils/              datas, cores, ícones, recorrência, hábitos, filtros
│  ├─ types/              modelo de dados (todas as interfaces TypeScript)
│  ├─ config/             nome do app, frases, itens de navegação
│  └─ styles/             estilos globais (Tailwind)
├─ public/                manifesto do PWA, ícones, página offline
├─ firebase/              regras e índices do Firestore
├─ scripts/               script opcional para gerar os ícones
├─ .env.example           modelo do arquivo de configuração do Firebase
├─ firebase.json          configuração do Firebase Hosting
└─ README.md              este arquivo
```

### Modelo de dados

Todos os modelos estão documentados com comentários em `src/types/index.ts`. Resumo das entidades principais, todas vinculadas à conta (`id`, `userId`, `createdAt`, `updatedAt`):

- **Usuário** (`AppUser`) e **Preferências** (`UserPreferences`, incluindo configuração do Pomodoro e notificações)
- **Tarefa** (`Task`) com **Subtarefa** (`Subtask`) embutida
- **Evento** (`CalendarEvent`), com suporte a recorrência (`RecurrenceRule`)
- **Hábito** (`Habit`) e **Registro de hábito** (`HabitLog`, um por dia)
- **Lembrete** (`Reminder`)
- **Matéria** (`Subject`) e **Compromisso acadêmico** (`AcademicItem`)
- **Nota** (`Note`, com checklist opcional)
- **Meta** (`Goal`, com etapas)
- **Sessão de foco** (`FocusSession`)
- **Link rápido** (`QuickLink`)
- **Categoria** (`Category`, personalizável)

No modo sincronizado, cada uma dessas coleções vive em `/users/{uid}/{coleção}/{id}` no Firestore — veja `firebase/firestore.rules`.

---

## 13. Funcionalidades implementadas

- Autenticação: e-mail/senha, login com Google, recuperação de senha, logout, modo local de demonstração.
- Sincronização em tempo real com o Firestore, com persistência offline e indicador de status (sincronizando / sincronizado / offline / erro / local).
- Tela inicial com saudação dinâmica, frase do dia, resumo do dia, "Minhas 3 prioridades", tarefas de hoje (com arrastar para reordenar), agenda do dia em linha do tempo, hábitos, lembretes, links rápidos e captura rápida de notas.
- Agenda completa: visualizações de dia, semana, mês e lista; criação/edição/exclusão de eventos; recorrência (diária, dias úteis, semanal, mensal, anual, personalizada, até uma data ou número de repetições); edição de uma ocorrência ou da série inteira.
- Tarefas: prioridade, categoria, matéria, subtarefas (com "dividir tarefa" colando várias linhas de uma vez), tags, estimativa de duração, recorrência, lembrete, status (caixa de entrada, a fazer, em andamento, concluída, adiada, arquivada); visões por hoje, próximos 7 dias, todas, atrasadas, caixa de entrada, concluídas; quadro Kanban opcional; seleção múltipla com concluir/duplicar/arquivar/excluir em lote; busca e filtros.
- Hábitos: tipos sim/não, quantidade, duração e contagem; frequências variadas; sequência atual, melhor sequência, taxa de conclusão e calendário de consistência; pausar/retomar.
- Lembretes: importância, ícone, cor, recorrência, adiar por 10 min/30 min/1 h/amanhã, notificações internas e (quando autorizado) notificações do navegador.
- Módulo acadêmico: matérias com professor, horários (gerando eventos automaticamente na agenda), links e faltas; prazos (provas, trabalhos, leituras, seminários, atividades) com prioridade, status e nota — também aparecem automaticamente na agenda e na tela inicial.
- Notas com checklist, cor, fixar, arquivar, tags e relação com tarefa/matéria.
- Foco/Pomodoro configurável, com cálculo por horário real (continua correto ao trocar de aba), histórico de sessões e modo de tela cheia.
- Metas com etapas, progresso automático ou manual e prazo.
- Progresso: números da semana, gráfico simples, comparação com a semana anterior — sem rankings nem culpa.
- Links rápidos personalizáveis (criar, editar, reordenar, categorizar, excluir).
- Busca global (ignora acentos e maiúsculas/minúsculas), com filtro por tipo.
- Configurações completas: perfil, tema claro/escuro/automático, cor de destaque, densidade, primeiro dia da semana, formato de hora, página inicial preferida, Pomodoro, notificações, categorias personalizadas, backup (exportar/importar JSON com resumo de validação), remoção de dados de exemplo, exclusão de todos os dados (com confirmação forte) e explicação de privacidade.
- Acessibilidade e foco em TDAH: "Minhas 3 prioridades", "Dividir tarefa", "Começar agora" (leva direto ao Pomodoro), modo de foco em tela cheia, desfazer exclusões, feedback imediato, estados vazios sempre explicativos, navegação por teclado, foco visível, densidade ajustável e respeito à preferência de redução de movimento.
- PWA instalável, com atualização automática e aviso de nova versão, funcionamento offline e página de "sem conexão".

## 14. O que eventualmente depende de configuração externa

Sendo honesta sobre os limites deste projeto:

- **Login e sincronização em nuvem** só funcionam depois que você configurar o Firebase (passo 4) — sem isso, o app funciona perfeitamente no modo local, mas apenas em um dispositivo por vez.
- **Notificações do navegador** dependem da usuária conceder a permissão (o app pede de forma educada, uma vez, e explica por quê) e do navegador/sistema operacional oferecerem suporte a isso — em qualquer caso, os lembretes continuam aparecendo dentro do app.
- **Instalação como PWA** depende do navegador usado (funciona bem em Chrome, Edge e navegadores baseados em Chromium; no iPhone, o Safari exige o passo manual "Adicionar à Tela de Início" descrito acima).
- Este projeto **não foi compilado nem testado neste ambiente** (sem acesso à internet para instalar pacotes) — os passos 2 e 7 acima (`npm install`, `npm run build`) precisam ser executados no seu computador antes do primeiro uso real. O código foi escrito com cuidado e revisado manualmente, mas apenas a execução real confirma que tudo compila sem erros.

## 15. Solução de problemas comuns

- **`npm install` trava ou dá erro de permissão:** feche o terminal, abra novamente e tente rodar como administrador (Windows) ou com `sudo` apenas se necessário (Mac/Linux, raramente preciso).
- **A tela fica em branco depois de `npm run dev`:** confira o terminal — geralmente aparece uma mensagem em vermelho indicando o arquivo com problema. Copie a mensagem e peça ajuda a quem desenvolveu o projeto com você.
- **O login com Google não abre:** confira se o provedor "Google" está ativado em Authentication → Sign-in method (passo 5) e se `localhost` está nos domínios autorizados.
- **Os dados não sincronizam entre dispositivos:** confirme que o `.env` está preenchido corretamente e que você está logada com a mesma conta (e-mail ou Google) nos dois dispositivos — o modo local de demonstração nunca sincroniza, pois é local por definição.
- **Depois de publicar, a página fica em branco ao acessar uma rota como `/agenda` diretamente:** confirme que o deploy foi feito com `firebase deploy --only hosting` (o `firebase.json` já inclui a regra de redirecionamento necessária para o React Router funcionar).

---

Feito com carinho para organizar a rotina sem tirar a leveza dela.

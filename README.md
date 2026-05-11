# Zephyr

> SaaS starter kit generator — TypeScript + React + PostgreSQL + multi-tenant

CLI que gera projetos SaaS completos com **servidor**, **painel admin**, **site publico** e **app mobile** pre-configurados e prontos para uso.

## O que voce recebe

- **Autenticacao multi-tenant** — JWT via cookie, Apple Sign-In, Google OAuth
- **Admin API + Site API** — Express + TypeScript
- **Painel admin** — React + Vite + shadcn/ui
- **PostgreSQL** — Knex.js migrations + seed
- **Upload S3** — Signed URLs via multer-s3
- **Site publico** — EJS + Tailwind + i18n (pt-BR / en)
- **App mobile** — Expo + React Native + offline-first + IAP + push nativo
- **Gerador de icones** — Cria icon, splash, favicon e assets de loja automaticamente
- **Sistema de update** — Atualiza projetos existentes sem perder customizacoes
- **Build system** — Versionamento + deploy para producao

## Instalação

### 🐳 Via Docker (recomendado — sem instalar nada)

Precisa apenas de [Docker](https://docker.com) instalado. **Um comando** e pronto:

```bash
# Clonar o repositório
git clone https://github.com/DaviCarvalhoo/zephyr.git
cd zephyr

# Criar um projeto (interativo)
docker compose run --rm zephyr
```

O projeto gerado aparece na pasta `output/`.

**Outros comandos via Docker:**

```bash
docker compose run --rm zephyr create        # criar projeto
docker compose run --rm zephyr --help        # ver ajuda
docker compose run --rm zephyr icons         # gerar ícones
docker compose run --rm zephyr --version     # ver versão
```

> 💡 **Sem Docker Compose?** Use direto:
> ```bash
> docker build -t zephyr .
> docker run -it --rm -v "$(pwd)/output:/output" zephyr
> ```

---

### Via npm (requer Node.js 20+)

```bash
npm install -g davicarvalhoo/zephyr
```

## Quick Start

```bash
# Via Docker (recomendado)
docker compose run --rm zephyr

# Via npm (se instalou globalmente)
zephyr

# Ou explicitamente
zephyr create
```

O CLI vai perguntar:

1. **Preset** — o que gerar (tudo, so web, mobile + server, so mobile)
2. **Nome do projeto** — ex: "Minha Empresa"
3. **Dominio** — ex: "minhaempresa.com.br"
4. **Banco de dados** — nome do PostgreSQL
5. **Portas** — API, admin, site
6. **Cor primaria** — hex para gerar o tema completo
7. **Configuracoes mobile** — bundle ID, package, scheme

Depois de confirmar, o projeto e gerado com tudo configurado.

### 🐳 Gerenciando o projeto (Docker-first)

Depois de criar o projeto, entre na pasta e use os novos comandos simplificados:

```bash
cd meu-projeto

# Constrói as imagens (primeira vez)
zephyr build

# Sobe o sistema completo com banner de URLs
zephyr run
```

O comando `zephyr run` agora mostra um banner limpo com os endereços de acesso (incluindo seu IP local para testes no celular) e encerra tudo automaticamente ao apertar `Ctrl+C`.

---

| Comando | Descricao |
|---|---|
| `zephyr` | Cria um novo projeto (interativo) |
| `zephyr create` | Cria um novo projeto (interativo) |
| `zephyr run` | Inicia o sistema via Docker no diretório atual (mostra banner e IP) |
| `zephyr build` | Constrói as imagens Docker do projeto (ou build de produção se passar caminhos) |
| `zephyr icons [--from logo.png]` | Gera icones do app mobile |
| `zephyr update <path> [--yes]` | Atualiza projeto existente com novas mudancas do template |
| `zephyr --help` | Mostra ajuda |
| `zephyr --version` | Mostra versao |

## Presets

| Preset | Inclui |
|---|---|
| **Everything** | Server + Admin UI + Site + Mobile |
| **Web only** | Server + Admin UI + Site (sem mobile) |
| **Mobile + server** | Server + Mobile (sem admin UI, sem site) |
| **Just mobile** | Apenas mobile (assume API externa) |

## Estrutura do Projeto Gerado

```
meu-projeto/
├── server/                 Admin API + Site API + console + DB
│   ├── apps/api/          Admin API (Express)
│   ├── apps/site-api/     Site API (Express)
│   ├── apps/shared/       Middlewares compartilhados
│   ├── core/              Models, context, db, s3, email
│   ├── console/           Task runner (seed-admin, etc.)
│   └── migrations/        SQL (Knex)
├── ui/admin/              React SPA (Vite + shadcn/ui)
├── ui/site/               Site publico (Express + EJS + Tailwind)
├── mobile/<slug>/         Expo + React Native + TypeScript
│   ├── src/contexts/      AuthContext, ThemeContext
│   ├── src/services/      db, backup, content, iap, health
│   ├── src/pages/         auth/, main/
│   └── assets/            Icones gerados automaticamente
├── scripts/               Helpers (mobile, deploy, version, icons)
├── doc/                   Documentacao HTML
├── misc/                  systemd units, nginx configs
├── .zephyr/               Manifest para updates
├── dev.sh                 Inicia todos os servicos
├── install.sh             Instala dependencias
└── seed.sh                Cria banco + migrations + seed
```

## Gerador de Icones

Gera automaticamente todos os assets necessarios para o app mobile:

```bash
# Gerar do zero (usa cor primaria + inicial do projeto)
zephyr icons --primary "#2563eb" --letter "M"

# Gerar a partir de um PNG existente
zephyr icons --from logo.png --primary "#2563eb"
```

**Assets gerados:**

| Arquivo | Tamanho | Uso |
|---|---|---|
| `icon.png` | 1024x1024 | Icone do app (iOS) |
| `adaptive-icon.png` | 1024x1024 | Android adaptive foreground |
| `splash-icon.png` | 1200x1200 | Splash screen |
| `favicon.png` | 48x48 | Web build |
| `appstore.png` | 1024x1024 | App Store listing |
| `playstore.png` | 512x512 | Google Play listing |

## Sistema de Update

Atualiza projetos existentes quando o template evolui, sem perder suas customizacoes:

```bash
# Interativo — pergunta arquivo por arquivo
zephyr update .

# Auto-aceitar todas as atualizacoes seguras
zephyr update . --yes
```

**Como funciona:**

- Arquivos **nao modificados** — atualiza automaticamente
- Arquivos **editados por voce** — mostra diff e pergunta antes de sobrescrever
- Arquivos **novos no template** — adiciona
- Arquivos **removidos do template** — pergunta se quer deletar

O manifest em `.zephyr/manifest.json` rastreia o hash de cada arquivo para saber o que foi modificado.

## Build e Deploy

```bash
# Build de producao (compila TypeScript + Vite)
zephyr build ../app ../builds

# Instalar dependencias no servidor de producao
zephyr build-deps ../builds
```

## Tecnologias

- **Runtime:** Node.js (ESM)
- **CLI:** [Inquirer.js](https://github.com/SBoudrias/Inquirer.js) (prompts interativos)
- **Styling:** [Chalk](https://github.com/chalk/chalk) (output colorido)
- **Banner:** [Figlet](https://github.com/patorjk/figlet.js) (ASCII art)
- **Imagens:** [Sharp](https://github.com/lovell/sharp) (geracao de icones)

---

Feito por **DaviCarvalhoo**

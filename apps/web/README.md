# Nuvita — Frontend Web

Painel clínico/hospitalar do Nuvita. **React + Vite + TypeScript + Ant Design**,
com tema de alta densidade inspirado em ERPs hospitalares (sidebar escura +
área de trabalho clara).

## Stack
- React 18 + React Router 6
- Ant Design 5 (locale pt-BR) + tema customizado (`src/theme.ts`)
- TanStack Query 5 (cache/estado de servidor)
- Axios com interceptor de refresh transparente (`src/api/client.ts`)

## Módulos
- **Login** com suporte a 2FA (TOTP)
- **Visão geral** (dashboard com indicadores e agenda do dia)
- **Pacientes** (lista, busca, cadastro com consentimento LGPD, detalhe com abas)
- **Agenda** (agendamentos por dia, criação, mudança de status)
- **Prontuários** (registro SOAP, autocomplete CID-10, assinatura)
- **Documentos** (download via presigned URL, exclusão)
- **Notificações** (painel da fila)
- **Clínica** (onboarding multi-tenant — apenas ADMIN)

## Desenvolvimento
```bash
npm install            # na raiz do monorepo
npm run dev -w @nuvita/web
```
O dev server sobe em http://localhost:5173 e encaminha as rotas da API
(`/auth`, `/pacientes`, ...) para `http://localhost:3000` preservando o path
(necessário para o cookie de refresh httpOnly em `/auth`).

Para apontar a um host de API diferente no proxy de dev:
```bash
VITE_PROXY_TARGET=http://localhost:3001 npm run dev -w @nuvita/web
```

## Build
```bash
npm run build -w @nuvita/web   # gera apps/web/dist
```

## Docker
O `docker-compose.yml` da raiz sobe `mongo`, `redis`, `api` e `web`.
O `web` é servido por nginx na porta **8080**, encaminhando as rotas da API
para o serviço `api`. Veja a raiz do repo para detalhes.

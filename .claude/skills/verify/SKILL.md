# Verify — Nuvita

Como subir e dirigir o app localmente para verificar mudanças.

## Subir a stack

1. Docker Desktop precisa estar rodando (`docker info`); senão: `Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"` e aguardar ~60s.
2. `docker compose up -d mongodb redis`.
3. **ATENÇÃO — mongod nativo grudado em 27017:** existe um `mongod.exe` nativo do Windows (serviço esquecido, dados antigos) que fica ligado especificamente em `127.0.0.1:27017`, enquanto o container Docker publica em `0.0.0.0:27017`. No Windows, o bind mais específico (127.0.0.1) vence o wildcard — então `mongodb://127.0.0.1:27017` do host **cai no mongod nativo, não no container**, mesmo com `docker compose ps` mostrando o mapeamento "certo". Sintoma: dados antigos/inesperados, ou uma migração/seed que "não fez nada" porque rodou no banco errado. Confirmar com `docker exec nuvita-mongodb-1 mongosh nuvita --eval "db.<collection>.findOne()"` (esse comando *sempre* fala com o container) e comparar com uma conexão do host — se os `_id`/campos forem diferentes, é o conflito.
   Fix reprodutível sem mexer no serviço nativo: crie `docker-compose.override.yml` (não commitar) remapeando a porta —
   ```yaml
   services:
     mongodb:
       ports:
         - "27018:27017"
   ```
   depois `docker compose up -d mongodb` (recria o container) e use `MONGODB_URI=mongodb://127.0.0.1:27018/nuvita`. Ao terminar, apague o override e rode `docker compose up -d mongodb` de novo para voltar à porta 27017 padrão.
4. **ATENÇÃO:** `apps/api/.env` aponta `MONGODB_URI` para o **Atlas (produção)**. Para verificar local, sobrescreva antes de subir:
   `$env:MONGODB_URI='mongodb://127.0.0.1:27018/nuvita'; npm run api:dev` (env var vence o .env; use a porta do passo 3). Nunca dirigir testes contra o Atlas.
5. Web: `cd apps/web; npm run dev` → :5173. O proxy do Vite já encaminha as rotas da API (inclui `/telemedicina`); navegação (Accept: text/html) fica no SPA.
6. Health: `GET http://127.0.0.1:3000/health`.

## Login programático

- Admin local: `admin@nuvita.demo` / `SenhaForte123` + TOTP do segredo `JBSWY3DPEHPK3PXP` (gerar com HMAC-SHA1 padrão; ver scripts em sessões anteriores ou memória dev-users-credentials).
- No browser (Playwright): não dá para só setar o token — o `AuthContext` exige `localStorage['nuvita.accessToken']` **e** `localStorage['nuvita.user']` (JSON do `user` retornado pelo login).

## Browser E2E (Playwright)

- `npx playwright` funciona; use `channel: 'chrome'` (Chrome instalado — evita download do Chromium).
- WebRTC/câmera fake: args `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream --autoplay-policy=no-user-gesture-required` + `context.grantPermissions(['camera','microphone'])`.
- Telemedicina: dois contexts no mesmo browser simulam profissional (`/tele/<tokenMedico>`) e paciente (`/tele/<tokenPaciente>`). Conectado = texto exato "Conectado" na barra + os dois `<video>` com `videoWidth>0`.

## Gotchas

- `ts-node` quebra no Node 24 — scripts em `.mjs`/`.cjs` puros.
- ValidationPipe global: `whitelist + forbidNonWhitelisted` — payloads com campo extra dão 400.
- PowerShell 5.1: sem `&&`; native stderr vira NativeCommandError (inofensivo).

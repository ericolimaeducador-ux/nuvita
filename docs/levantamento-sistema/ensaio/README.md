# Scripts do ensaio

Tudo roda **somente contra o ambiente local** (web 127.0.0.1:5173, API 3000, Mongo local). `lib.mjs` bloqueia
qualquer requisição do navegador para fora de `127.0.0.1`/`localhost`; os scripts com banco recusam qualquer
`MONGODB_URI` que não seja `127.0.0.1`/`localhost` (sem flag de bypass).

O arquivo de contas (`contas.json`, com as chaves 2FA das contas fictícias) fica **fora do repositório**:
`CONTAS=<caminho> node tour.mjs <perfil>`.

| Script | Para quê |
|---|---|
| `contas-locais.mjs` | cria super-admin e paciente no Mongo local (sem caminho de interface) |
| `01-onboarding-psicologo.mjs` | primeiro acesso do psicólogo (login, 2FA, termo, senha) |
| `tour.mjs <perfil>` | visita as 20 rotas com um perfil; screenshot e erros de API |
| `api-probe.mjs <perfil>` | status dos GETs da API com a sessão de um perfil |
| `03`–`06` | super-admin, admin e criação de usuários pela interface |
| `07`, `07b` | segurança do token `/tele/:token` |
| `08-db-checks.mjs` | conferências no banco local (auditoria, IA, pacientes) |
| `09-ia-sem-chave.mjs` | IA sem chave real |
| `10`–`14` | módulos do psicólogo (pacientes, agenda, atendimento, documentos, financeiro, tickets) |
| `15`, `17` | super-admin/admin/secretária; secretária emitindo atestado |
| `16-telemedicina-video-loopback.mjs` | chamada de vídeo local com mídia falsa |
| `montar-levantamento.py` | gera `LEVANTAMENTO.md` a partir dos capítulos |
| `resultados/*.json` | saída bruta de cada execução (só rótulos e contagens; sem token nem senha) |

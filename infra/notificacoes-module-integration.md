# Notificacoes module integration

Register `NotificacoesModule` in the API root module.

Dependencies:

```bash
npm install bullmq ioredis
```

Optional channel dependencies are not required because the providers use HTTP `fetch`.

Required environment:

```env
REDIS_URL=redis://localhost:6379

# email
EMAIL_PROVIDER=resend # resend | sendgrid
EMAIL_FROM=no-reply@clinica.com
RESEND_API_KEY=...
SENDGRID_API_KEY=...

# WhatsApp
WHATSAPP_PROVIDER=evolution # evolution | zapi
EVOLUTION_API_URL=https://evolution.example.com
EVOLUTION_INSTANCE=clinica
EVOLUTION_API_KEY=...
ZAPI_INSTANCE_ID=...
ZAPI_TOKEN=...
ZAPI_CLIENT_TOKEN=...

# SMS
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM=+15555555555
```

Behavior:

- Jobs use BullMQ with 3 attempts and exponential backoff.
- Notifications are not scheduled inside the patient's local quiet window from 22:00 to 08:00.
- Opt-out is stored in `notificacao_preferencias`.
- Secretaria dashboard is `GET /notificacoes/dashboard`.

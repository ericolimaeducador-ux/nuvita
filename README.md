# Nuvita

SaaS em nuvem para gestao clinica, pacientes, prontuario eletronico, documentos, notificacoes, telemedicina, financeiro e analytics.

## Estrutura

```text
apps/api          API NestJS
packages/shared   Contratos e enums compartilhados
infra             Notas de integracao e configuracao
```

## Modulos scaffoldados

- Multi-tenancy base
- Auth
- Pacientes
- Prontuario eletronico
- Documentos
- Notificacoes

## Observacao

Este repositorio ainda esta em fase de scaffold arquitetural. Configure `apps/api/package.json`, `tsconfig.json`, variaveis de ambiente e dependencias antes de compilar/executar.

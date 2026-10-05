# Pendências de lançamento

## Empresa vendedora — Dealer Empresas LTDA (CNPJ 10.917.735/0001-38)

- **CNAE de software:** inclusão de CNAE de software no CNPJ 10.917.735/0001-38 em trâmite
  (informado pelo usuário em 2026-10-04). Bloqueia a primeira venda com nota fiscal, não o código.
- **Contrato e LGPD:** contrato Dealer × fornecedor do software e papéis LGPD
  (controlador/operador) a definir com advogado.
- Dados da empresa no código: fonte única em `apps/web/src/lib/empresa.ts`.

## Textos legais

Marcadores [A CONFIRMAR] dos Termos e da Privacidade resolvidos em 2026-10-05 com texto aprovado
pelo advogado do usuário (reajuste, multa de fidelidade, canal de cancelamento/estorno, cláusula 9,
provedores de nuvem, processador de pagamento = Mercado Pago, inadimplência e guarda de prontuários, CFP).

**Pendentes:**

- **Prazo de guarda de 5 anos:** advogado deve confirmar na norma vigente do CFP (o texto original citava o CFM).
- **Inadimplência:** não existe rotina de cobrança, notificação ou suspensão por inadimplência
  (verificado nos repos nuvita e nuvita-psi em 2026-10-05). Notificação por 5 dias e suspensão após
  o 7º dia são obrigação OPERACIONAL manual do usuário até existir automação.
- **Backup/restore:** a guarda em backup prometida nos Termos depende de evidência verificada no
  Atlas (lacuna NGS1 nº 6, nuvita-psi).
- **Termos usam USUÁRIO/LICENCIANTE e contratante/Nuvita:** advogado deve harmonizar (ou aprovar
  cláusula de definições, ainda não incluída).

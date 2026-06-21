# RELATÓRIO TÉCNICO DE PROPRIEDADE INTELECTUAL
## Nuvita — Plataforma SaaS de Gestão Clínica Integrada

---

**Documento:** Descrição Técnica para Registro de Programa de Computador  
**Fundamento legal:** Lei nº 9.609/1998 (Lei de Software) · Lei nº 9.279/1996 (Propriedade Industrial)  
**Órgão:** Instituto Nacional da Propriedade Industrial — INPI  
**Data de elaboração:** 19 de junho de 2026  
**Versão do software:** 0.1.0 (branch: integracao, commit: 05da295)  
**Repositório:** github.com/ericolimaeducador-ux/nuvita  

---

## 1. IDENTIFICAÇÃO DO PROGRAMA

| Campo | Valor |
|---|---|
| **Nome do programa** | Nuvita |
| **Natureza** | Software as a Service (SaaS) — Plataforma Web |
| **Domínio de aplicação** | Gestão Clínica, Saúde Digital, Telemedicina |
| **Linguagem principal (backend)** | TypeScript 5.5 / Node.js 20 |
| **Linguagem principal (frontend)** | TypeScript 5.6 / React 18 |
| **Banco de dados** | MongoDB 7 (documentos), Redis 7 (cache e filas) |
| **Arquitetura** | Monorepo (npm workspaces), multi-tenant, cloud-native |
| **Implantação** | Docker / Google Cloud Platform |
| **Ano de criação** | 2025–2026 |

---

## 2. DESCRIÇÃO GERAL E FINALIDADE

**Nuvita** é uma plataforma de software como serviço (SaaS) para gestão clínica multiprofissional. Ela centraliza, em uma única solução integrada e segura, todos os processos operacionais de uma clínica de saúde: desde o agendamento de consultas e o registro eletrônico de prontuários até a realização de teleconsultas, o controle financeiro, o envio de notificações multicanal e a geração de relatórios analíticos.

### 2.1 Problema Resolvido

Clínicas de saúde — especialmente as de pequeno e médio porte — enfrentam fragmentação tecnológica grave: usam planilhas para agenda, sistemas desconectados para prontuário, ferramentas avulsas para cobrança e comunicação manual com pacientes. Essa fragmentação gera retrabalho, risco de erro clínico, dificuldade de conformidade com a LGPD e incapacidade de gerar inteligência sobre os dados da clínica.

### 2.2 Solução Original

Nuvita resolve esses problemas por meio de uma arquitetura multi-tenant nativa na nuvem que une em um único produto:

1. **Agendamento multiprofissional**: Médicos, enfermeiros e advogados compartilham uma agenda unificada com suporte a consultas, retornos, exames, procedimentos, teleconsultas e atendimentos especializados.
2. **Prontuário Eletrônico do Paciente (PEP)** com modelo SOAP estruturado, codificação CID-10, assinatura digital com hash criptográfico e histórico imutável de aditamentos.
3. **Telemedicina integrada**: Criação de salas virtuais com tokens de acesso individualizados diretamente vinculadas ao agendamento.
4. **Gestão documental** com upload seguro via URLs pré-assinadas (AWS S3 / Cloudflare R2), geração automática de miniaturas e controle de acesso por papel.
5. **Notificações automáticas** em três canais (e-mail, WhatsApp, SMS) com sistema de fila, reenvio automático e preferências de opt-out por paciente.
6. **Controle financeiro**: Lançamentos de receitas e despesas, rastreamento de formas de pagamento e dashboard consolidado.
7. **Analytics em tempo real**: Indicadores de pacientes, agendamentos, notificações e financeiro via pipelines de agregação MongoDB.
8. **Conformidade LGPD integrada** na estrutura de dados desde a concepção, com rastreamento explícito de consentimento e log de auditoria imutável com 51 tipos de eventos.

---

## 3. ARQUITETURA DO SISTEMA

### 3.1 Visão Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUÁRIO FINAL                            │
│  Médico · Enfermeiro · Advogado · Secretaria · Admin · Paciente  │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                        │
│  Tailwind CSS v4 · Radix UI · Framer Motion · React Query        │
│  11 páginas · Roteamento protegido por papel · Design dark mode  │
└─────────────────────┬───────────────────────────────────────────┘
                      │ REST API (JWT)
┌─────────────────────▼───────────────────────────────────────────┐
│                  BACKEND (NestJS 10 / Node.js 20)                │
│                                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │   auth   │ │pacientes │ │prontuár. │ │  agendamentos    │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │documentos│ │notificaç.│ │telemedi. │ │   financeiro     │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                         │
│  │  clinicas│ │analytics │ │  health  │                         │
│  └──────────┘ └──────────┘ └──────────┘                         │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │            INFRAESTRUTURA TRANSVERSAL                      │  │
│  │  TenancyModule · SecurityModule · JwtAuthGuard             │  │
│  │  RolesGuard · AuditLogService · TokenRevocationService     │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────┬───────────────┬───────────────────────────────────┘
              │               │
   ┌──────────▼───┐  ┌────────▼──────────┐
   │  MongoDB 7   │  │     Redis 7        │
   │  (dados      │  │  (cache, sessões,  │
   │  persistentes│  │   filas BullMQ)    │
   └──────────────┘  └───────────────────┘
              │
   ┌──────────▼───────────────────────────────────┐
   │         INTEGRAÇÕES EXTERNAS                  │
   │  GCP Secret Manager · GCP KMS · S3/R2         │
   │  Resend/SendGrid · Evolution/Z-API · Twilio   │
   └──────────────────────────────────────────────┘
```

### 3.2 Padrão Arquitetural

O backend segue **Arquitetura Hexagonal (Ports & Adapters)** com separação em quatro camadas por módulo:

- **Domain** (`domain/`): Entidades puras, enums, interfaces — sem dependências externas.
- **Application** (`application/`): Casos de uso (serviços), interfaces de repositório (ports).
- **Infrastructure** (`infrastructure/`): Implementações concretas de repositórios (MongoDB), storage (S3), filas (BullMQ), criptografia.
- **Presentation** (`presentation/`): Controllers NestJS, DTOs, guards, decoradores de rota.

Essa separação garante que a lógica de negócio seja completamente independente de frameworks e bancos de dados — a mesma lógica pode ser testada sem infraestrutura e migrada entre provedores sem reescrita.

### 3.3 Multi-Tenancy

Cada clínica é um tenant isolado. O isolamento é garantido em três camadas simultâneas:

1. **Middleware** (`TenantMiddleware`): Extrai o `clinicaId` do token JWT em cada requisição.
2. **Guard** (`TenantRequiredGuard`): Bloqueia requisições sem contexto de tenant válido.
3. **Repositório**: Todas as consultas MongoDB incluem `clinicaId` como filtro obrigatório; não existe operação que possa vazar dados entre clínicas.

---

## 4. MÓDULOS FUNCIONAIS DETALHADOS

### 4.1 Módulo de Autenticação (`auth`)

**Funcionalidades:**
- Registro de usuário com senha hasheada via **bcrypt** (12 rounds)
- Autenticação com par de tokens **JWT**: access token (TTL: 15 min) + refresh token (TTL: 7 dias)
- **Autenticação de Dois Fatores (2FA)**: TOTP via biblioteca *speakeasy* — obrigatório para papéis clínicos (MEDICO, ENFERMEIRO, ADVOGADO, ADMIN, SUPER_ADMIN)
- **Revogação de tokens**: Lista negra em Redis com TTL automaticamente expirado
- **Rate limiting de login**: Bloqueio progressivo via Redis para prevenir ataques de força bruta
- Log de auditoria em cada evento de autenticação (sucesso, falha, logout, renovação)

**Entidades:** `User` (id, email, passwordHash, papel, clinicaId, twoFactorSecret, ativo)  
**Eventos de auditoria:** USER_REGISTERED, LOGIN_SUCCESS, LOGIN_FAILURE, LOGOUT, TOKEN_REFRESH, TWO_FACTOR_ENABLED, TWO_FACTOR_VERIFIED, PASSWORD_CHANGED

### 4.2 Módulo de Pacientes (`pacientes`)

**Funcionalidades:**
- Cadastro completo de paciente com dados demográficos, endereço e convênio
- Rastreamento explícito de **consentimento LGPD** (`ConsentimentoLGPD`: aceito, dataAceite, versão)
- Criptografia de campos sensíveis com **AES-256-GCM** autenticado (`PacienteCryptoService`)
- Hash determinístico de CPF para busca sem exposição do dado bruto
- Busca por CPF, nome ou data de nascimento via índices MongoDB
- Desativação lógica de pacientes (soft delete via campo `ativo`)

**Entidade `Paciente`:** id, clinicaId, nome, cpf (criptografado), dataNascimento, sexo (FEMININO/MASCULINO/OUTRO/NAO_INFORMADO), telefone, email, endereco (logradouro, número, complemento, bairro, cidade, estado, CEP), convenio (nome, numeroCarteira, validade), consentimentoLGPD, ativo, criadoEm, atualizadoEm

**Inovação:** A criptografia dos campos do paciente usa derivação de chave por AES-256-GCM com GCP KMS para envelope encryption, garantindo que a chave de criptografia nunca esteja armazenada no mesmo local que os dados.

### 4.3 Módulo de Prontuários Eletrônicos (`prontuarios`)

**Funcionalidades:**
- Criação de prontuário no formato **SOAP estruturado** com campos tipados:
  - **Subjetivo**: Queixa principal, histórico da doença atual (HDA)
  - **Objetivo**: Exame físico, sinais vitais (pressão arterial, frequência cardíaca, temperatura, saturação O₂, peso, altura)
  - **Avaliação**: Hipóteses diagnósticas, codificação CID-10 com autocompletar
  - **Plano**: Conduta clínica, prescrição, exames solicitados
- **Assinatura digital imutável**: Hash HMAC-SHA256 dos dados clínicos com segredo configurável. Uma vez assinado, o prontuário não pode ser editado — apenas adicionado um aditamento.
- **Aditamentos** (`ProntuarioAddendum`): Permitem registros adicionais sem alterar o documento original assinado.
- **Arquivos anexos**: Documentos vinculados ao prontuário com referência ao storage S3.
- **Seed CID-10**: O sistema inclui mecanismo de importação e busca da Classificação Internacional de Doenças (CID-10).

**Entidade `Prontuario`:** id, clinicaId, pacienteId, medicoId, agendamentoId, dataAtendimento, tipo (CONSULTA/RETORNO/URGENCIA/TELECONSULTA), subjetivo, objetivo, avaliacao, plano, arquivos[], assinado (medicoId, dataAssinatura, hash), criadoEm, atualizadoEm

**Eventos de auditoria:** MEDICAL_RECORD_CREATED, MEDICAL_RECORD_VIEWED, MEDICAL_RECORD_SIGNED, MEDICAL_RECORD_ADDENDUM_CREATED

### 4.4 Módulo de Agendamentos (`agendamentos`)

**Funcionalidades:**
- Agendamento multiprofissional: médicos, enfermeiros e advogados compartilham a mesma interface
- **Modalidades de atendimento** (`ModalidadeAtendimento`): médico, enfermagem, jurídico
- **Tipos de agendamento** (`TipoAgendamento`): consulta, retorno, exame, procedimento, teleconsulta, atendimento_enfermagem, atendimento_juridico e outros tipos especializados
- **Status de ciclo de vida** (`StatusAgendamento`): agendado → confirmado → concluído | cancelado | falta
- **Bloqueios de agenda** (`BloqueioAgenda`): Intervalos de indisponibilidade por profissional (férias, horários reservados)
- Verificação de conflito de horários na criação

**Entidade `Agendamento`:** id, clinicaId, pacienteId, medicoId, modalidade, dataHoraInicio, dataHoraFim, tipo, status, observacoes, motivoCancelamento, criadoPor, criadoEm, atualizadoEm

### 4.5 Módulo de Documentos (`documentos`)

**Funcionalidades:**
- **Upload seguro via URL pré-assinada**: O frontend recebe uma URL temporária do S3/R2 e faz o upload diretamente, sem trafegar o arquivo pelo backend — reduz latência e carga do servidor.
- **Validação de tipo MIME**: Aceita apenas PDF, JPEG, PNG, DICOM (padrão de imagem médica).
- **Hash SHA-256** de cada arquivo para verificação de integridade.
- **Geração automática de miniaturas** (320px de largura, JPEG 82%) para imagens via *Sharp*.
- **Soft delete** com rastreamento de quem excluiu e quando.

**Entidade `Documento`:** id, clinicaId, pacienteId, prontuarioId, nome, tipo (exame/receita/laudo/termo/outro), mimeType, tamanho, url, hash, uploadPor, thumbnailUrl, criadoEm, excluidoEm, excluidoPor

### 4.6 Módulo de Notificações (`notificacoes`)

**Funcionalidades:**
- **Três canais** de entrega: E-mail (Resend ou SendGrid), WhatsApp (Evolution API ou Z-API), SMS (Twilio)
- **Sistema de fila BullMQ** (Redis-backed) com agendamento por delay e reprocessamento automático em até 3 tentativas com backoff exponencial (base: 60 s)
- **5 tipos de notificação**: Lembrete 24h antes, lembrete 1h antes, confirmação de agendamento, link de teleconsulta, resultado disponível
- **Preferências de opt-out**: Cada paciente pode desativar canais específicos individualmente
- **Rastreamento de falhas**: Histórico de erros por notificação com detalhes de cada tentativa
- Templates com interpolação de variáveis dinâmicas (nome do paciente, horário, link da sala, etc.)

**Entidade `Notificacao`:** id, clinicaId, destinatarioId, tipo, canal (email/whatsapp/sms), status (pendente/enviado/falhou), conteudo (assunto, mensagem, destino, variáveis), tentativas, erros[], criadoEm, enviadoEm

### 4.7 Módulo de Telemedicina (`telemedicina`)

**Funcionalidades originais:**
- Criação de **sala virtual** diretamente vinculada ao agendamento
- Geração de **tokens UUID individualizados** para médico e paciente — cada participante acessa apenas com seu token, sem login adicional
- Suporte a três modalidades de atendimento virtual: médico, enfermagem, jurídico
- **TTL configurável** de 4 horas: sala expira automaticamente se não for utilizada
- Ciclo de vida auditado: aguardando → em_andamento → encerrada | expirada
- Integração direta com o módulo de notificações para envio automático do link de acesso ao paciente

**Entidade `SalaTelemedicina`:** id, clinicaId, agendamentoId, medicoId, pacienteId, modalidade, status, tokenMedico, tokenPaciente, expiresAt, iniciadaEm, encerradaEm, criadoEm

### 4.8 Módulo Financeiro (`financeiro`)

**Funcionalidades:**
- Registro de lançamentos de **receitas** e **despesas** vinculados a pacientes e agendamentos
- **8 formas de pagamento**: Dinheiro, cartão de crédito, cartão de débito, PIX, transferência, convênio, boleto
- Ciclo de vida: pendente → recebido | cancelado
- **Dashboard consolidado** com: total de receitas, total de despesas, total pendente, saldo resultante, breakdown por forma de pagamento

**Entidade `Lancamento`:** id, clinicaId, pacienteId, agendamentoId, tipo, descricao, valor, formaPagamento, status, vencimento, recebidoEm, observacoes, criadoPor, criadoEm, atualizadoEm

### 4.9 Módulo de Analytics (`analytics`)

**Funcionalidades:**
- **Analytics de pacientes**: Total de ativos, novos pacientes por mês (série temporal), distribuição por sexo
- **Analytics de agendamentos**: Contagem por status, por tipo, top 10 profissionais por volume, agendamentos por mês
- **Analytics financeiro**: Receitas por mês, despesas por mês, breakdown por forma de pagamento (total e quantidade)
- **Analytics de notificações**: Contagem por status, por canal com taxa de entrega, por tipo, taxa geral de entrega (%)
- Filtro por período customizável (padrão: últimos 3 meses)
- Implementado via **pipelines de agregação MongoDB** ($match, $group, $sort, $limit, $sum, $cond)

### 4.10 Módulo de Clínicas (`clinicas`)

**Funcionalidades:**
- Cadastro e configuração da clínica (nome, CNPJ, endereço, logo, cor primária, WhatsApp, e-mail remetente, fuso horário, duração padrão de consulta)
- **3 planos com limites distintos**:
  - **Básico**: 500 pacientes, 5 usuários — funcionalidades: agenda, pacientes, notificações por e-mail
  - **Profissional**: 5.000 pacientes, 30 usuários — adiciona prontuário, documentos, todas as notificações, financeiro
  - **Enterprise**: 100.000 pacientes, 500 usuários — adiciona telemedicina e analytics
- Convite de novos usuários com definição de papel

---

## 5. CONTROLE DE ACESSO BASEADO EM PAPEL (RBAC)

O sistema implementa controle de acesso granular por papel (`Papel`) em cada endpoint da API e em cada rota do frontend.

| Papel | Descrição | 2FA obrigatório |
|---|---|---|
| `SUPER_ADMIN` | Administrador da plataforma (não vinculado a clínica) | ✓ |
| `ADMIN` | Administrador da clínica | ✓ |
| `MEDICO` | Médico — cria e assina prontuários | ✓ |
| `ENFERMEIRO` | Enfermeiro — cria notas de enfermagem | ✓ |
| `ADVOGADO` | Advogado — atendimento jurídico integrado | ✓ |
| `SECRETARIA` | Equipe administrativa — agenda, financeiro | ✗ |
| `PACIENTE` | Paciente — autoatendimento | ✗ |

**Papéis profissionais** (MEDICO, ENFERMEIRO, ADVOGADO): Podem oferecer atendimentos na agenda e telemedicina.

---

## 6. SEGURANÇA E CONFORMIDADE

### 6.1 LGPD — Lei Geral de Proteção de Dados (Lei 13.709/2018)

A conformidade LGPD está integrada na arquitetura, não adicionada posteriormente:

- **Consentimento rastreado**: Campo `ConsentimentoLGPD` na entidade `Paciente` registra aceito (boolean), dataAceite (timestamp ISO) e versão do termo.
- **Criptografia de dados sensíveis**: CPF, data de nascimento e campos identificadores dos pacientes são armazenados criptografados.
- **Direito ao esquecimento**: Soft delete de documentos com rastreamento de responsável e data.
- **Minimização de dados**: Campos opcionais claramente segregados dos obrigatórios na modelagem de entidades.
- **Log de auditoria imutável**: Todos os acessos e modificações de dados de pacientes são registrados em `AuditLog` com impossibilidade de alteração após gravação (Mongoose pre-hooks bloqueiam update/delete).

### 6.2 Criptografia

- **AES-256-GCM** (Authenticated Encryption with Associated Data): Criptografia de campos sensíveis de pacientes, garantindo confidencialidade e integridade simultâneas.
- **GCP Cloud KMS — Envelope Encryption**: A chave de dados (DEK) é criptografada por uma chave mestra (KEK) gerenciada pelo GCP KMS. O backend nunca armazena a chave mestra — ela é obtida dinamicamente do GCP a cada inicialização em produção.
- **Rotação de chaves**: Suporte a rotação trimestral, semestral ou anual de secrets (conforme LGPD/HIPAA).
- **HMAC-SHA256**: Assinatura digital de prontuários para garantir imutabilidade pós-assinatura.
- **bcrypt** (12 rounds): Hash de senhas de usuários.

### 6.3 Gestão de Segredos

- **Desenvolvimento**: Variáveis de ambiente via arquivo `.env` (nunca comitado ao repositório).
- **Produção**: Todos os segredos (URIs de banco, chaves JWT, chaves de criptografia, API keys de terceiros) são armazenados no **GCP Secret Manager** e obtidos em tempo de execução via `AppConfigService`.
- **Cache de segredos**: TTL de 5 minutos para evitar latência excessiva em cada leitura, com invalidação por rotação.

### 6.4 Autenticação e Sessão

- **JWT com par de tokens**: Access token de vida curta (15 min) + refresh token (7 dias).
- **Token `jti`**: Identificador único por token, suportando revogação individual via Redis.
- **TOTP 2FA**: Via speakeasy — compatível com Google Authenticator, Authy e similares.
- **Rate limiting**: Redis controla tentativas de login por IP/usuário para prevenção de brute force.

### 6.5 Log de Auditoria

O sistema registra **51 tipos de evento** de auditoria em coleção MongoDB imutável:

| Categoria | Eventos |
|---|---|
| Autenticação | USER_REGISTERED, LOGIN_SUCCESS, LOGIN_FAILURE, LOGOUT, TOKEN_REFRESH, PASSWORD_CHANGED, TWO_FACTOR_ENABLED/VERIFIED |
| Pacientes | PATIENT_CREATED, PATIENT_VIEWED, PATIENT_SEARCHED, PATIENT_UPDATED, PATIENT_DEACTIVATED, PATIENT_EXPORTED |
| Prontuários | MEDICAL_RECORD_CREATED, MEDICAL_RECORD_VIEWED, MEDICAL_RECORD_SIGNED, MEDICAL_RECORD_ADDENDUM_CREATED |
| Documentos | DOCUMENT_UPLOAD_URL_CREATED, DOCUMENT_UPLOAD_CONFIRMED, DOCUMENT_VIEW_URL_CREATED, DOCUMENT_SOFT_DELETED |
| Agendamentos | APPOINTMENT_CREATED, APPOINTMENT_UPDATED, APPOINTMENT_CANCELLED, APPOINTMENT_CONCLUDED |
| Telemedicina | TELEMEDICINE_ROOM_CREATED, TELEMEDICINE_ROOM_JOINED, TELEMEDICINE_ROOM_ENDED |
| Financeiro | FINANCIAL_ENTRY_CREATED, FINANCIAL_ENTRY_RECEIVED, FINANCIAL_ENTRY_CANCELLED |
| Notificações | NOTIFICATION_CREATED, NOTIFICATION_QUEUED, NOTIFICATION_SENT, NOTIFICATION_FAILED |
| Clínica | CLINIC_CREATED, TENANT_CONTEXT_RESOLVED, NOTIFICATION_OPT_OUT_UPDATED |

Cada evento registra: evento, userId, clinicaId, email, IP, userAgent, timestamp indexado, metadados livres.

---

## 7. INTERFACE DO USUÁRIO

### 7.1 Design System

O frontend utiliza um sistema de design proprietário construído sobre:
- **Tailwind CSS v4** com tokens CSS customizados em modo escuro absoluto
- **Radix UI**: Componentes acessíveis (Dialogs, Dropdowns, Tabs, Select, Tooltip, Avatar, etc.)
- **Framer Motion**: Animações fluidas na barra lateral, transições de tela, feedback de interação
- **Lucide React**: Biblioteca de ícones vetoriais
- **Design dark mode exclusivo**: Paleta navy (`#050e1a`), azul primário (hsl 217 91% 60%), verde esmeralda como accent (hsl 160 84% 39%)
- **Glassmorphism**: Cartões com `backdrop-blur` e bordas translúcidas
- **Tipografia**: Pesos variáveis para hierarquia clara em ambiente escuro

### 7.2 Páginas e Funcionalidades

| Página | Rota | Papéis Permitidos | Funcionalidade Principal |
|---|---|---|---|
| Login | `/login` | Público | Autenticação com suporte a 2FA |
| Dashboard | `/dashboard` | Todos | Indicadores em tempo real |
| Pacientes | `/pacientes` | Todos | Listagem, busca, cadastro |
| Detalhe do Paciente | `/pacientes/:id` | Todos | Perfil completo, histórico |
| Prontuários | `/prontuarios` | MEDICO, ENFERMEIRO, ADVOGADO, ADMIN | Criação, visualização, assinatura |
| Agenda | `/agenda` | Todos | Calendário de agendamentos |
| Documentos | `/documentos` | Todos | Upload, visualização, download |
| Notificações | `/notificacoes` | Todos | Histórico de envios, preferências |
| Financeiro | `/financeiro` | SECRETARIA, ADMIN | Dashboard financeiro, lançamentos |
| Telemedicina | `/telemedicina` | MEDICO, ENFERMEIRO, ADVOGADO, ADMIN | Criação e gerenciamento de salas |
| Clínica | `/clinica` | ADMIN | Configurações da clínica |

### 7.3 Roteamento e Proteção de Rotas

Todas as rotas autenticadas são protegidas por `ProtectedRoute` que valida:
1. Presença de token JWT válido
2. Papel do usuário autorizado para a rota específica

Rotas sem papel adequado redirecionam para o dashboard sem expor a página.

---

## 8. INTEGRAÇÕES EXTERNAS

### 8.1 Armazenamento de Objetos

- **AWS S3** e **Cloudflare R2** (protocolo S3-compatible) via `@aws-sdk/client-s3` e `@aws-sdk/s3-request-presigner`
- Upload direto do browser via URLs pré-assinadas (TTL: 1 hora)
- Objetos privados — nunca expostos publicamente

### 8.2 Comunicações

| Serviço | Provedor | Alternativa | Propósito |
|---|---|---|---|
| E-mail | Resend | SendGrid | Notificações, lembretes, confirmações |
| WhatsApp | Evolution API | Z-API | Mensagens ricas, links de teleconsulta |
| SMS | Twilio | — | Notificações fallback, 2FA |

### 8.3 Google Cloud Platform

| Serviço GCP | Uso |
|---|---|
| Secret Manager | Armazenamento seguro de todos os segredos de produção |
| Cloud KMS | Envelope encryption de chaves de dados de pacientes |
| Cloud Logging + Winston | Logs estruturados em produção |

### 8.4 Processamento de Imagens

- **Sharp v0.33.4**: Geração de miniaturas (thumbnails) 320×H px, JPEG 82% de qualidade, para preview de documentos de imagem.

---

## 9. INFRAESTRUTURA E IMPLANTAÇÃO

### 9.1 Containerização

O sistema é completamente containerizado com Docker:

```
docker-compose.yml
├── mongodb        (mongo:7) — porta 27017, volume persistente
├── redis          (redis:7-alpine) — porta 6379, persistência RDB
├── nuvita-api     (build local) — porta 3000, multi-stage Dockerfile
└── nuvita-web     (build local) — porta 8080, nginx
```

### 9.2 Dockerfile Multi-estágio (API)

**Stage 1 (builder)**: node:20-bookworm-slim com toolchain nativo (Python, make, g++) para compilar módulos nativos (bcrypt, sharp). Instala dependências via npm workspaces, compila TypeScript.

**Stage 2 (runtime)**: node:20-bookworm-slim mínimo. Executa como usuário não-privilegiado `nuvita` (segurança). Copia apenas artefatos necessários.

### 9.3 Estrutura do Monorepo

```
nuvita/
├── apps/
│   ├── api/                     Backend NestJS
│   │   └── src/
│   │       ├── common/          Infraestrutura transversal
│   │       │   ├── security/    GCP KMS, AppConfigService
│   │       │   └── tenancy/     Middleware multi-tenant
│   │       └── modules/         Módulos de domínio (11)
│   └── web/                     Frontend React + Vite
│       └── src/
│           ├── pages/           11 páginas
│           ├── layout/          AppLayout com sidebar animado
│           ├── auth/            Guards de rota
│           └── api/             Clientes HTTP (axios)
├── packages/
│   └── shared/                  Contratos TypeScript compartilhados
│       └── src/
│           ├── auth/            Papel enum, AuthTokenPayload
│           └── atendimento/     ModalidadeAtendimento enum
└── docker-compose.yml
```

---

## 10. DIFERENCIAIS INOVATIVOS

### 10.1 Integração Multiprofissional Nativa

A maioria dos sistemas de gestão clínica é construída exclusivamente para o médico. Nuvita é a primeira solução que integra, em uma única plataforma coerente, os fluxos de trabalho de **três categorias profissionais** distintas (Saúde médica, Enfermagem e Assessoria jurídica) com agendas, prontuários e telemedicina compartilhados, respeitando as especificidades de cada profissão.

### 10.2 Telemedicina com Token de Acesso por Participante

Em vez de depender de plataformas externas de videoconferência, o Nuvita gerencia nativamente a infraestrutura de sessões com tokens de acesso únicos por participante, TTL configurável e rastreamento completo de auditoria — conectando diretamente agendamentos, notificações automáticas com link e prontuário eletrônico do atendimento.

### 10.3 Envelope Encryption para Dados de Pacientes

A implementação de criptografia envelope (DEK + KEK via GCP KMS) para campos sensíveis de pacientes vai além dos requisitos mínimos da LGPD e implementa um padrão de segurança equivalente ao HIPAA americano, com suporte a rotação automática de chaves por cronograma (trimestral, semestral, anual).

### 10.4 Log de Auditoria Imutável por Design

O log de auditoria não é uma funcionalidade adicional — é uma invariante arquitetural. Os 51 tipos de evento cobrem todos os pontos de acesso e modificação de dados sensíveis, e o schema MongoDB tem hooks de pré-salvamento que tornam a coleção fisicamente imutável após a gravação.

### 10.5 Multi-Tenancy em Três Camadas

A implementação de isolamento de dados entre clínicas em middleware + guard + repositório simultâneos garante que uma falha em qualquer camada individual não seja suficiente para vazar dados entre tenants — defesa em profundidade por design.

### 10.6 Sistema de Notificações com Fallback Multi-Provedor

O sistema de notificações suporta configuração de provedores primário e alternativo por canal (Resend OU SendGrid, Evolution API OU Z-API), com fila persistente em Redis e reprocessamento automático — eliminando pontos únicos de falha em comunicações críticas com pacientes.

---

## 11. STACK TECNOLÓGICA COMPLETA

### Backend

| Biblioteca | Versão | Propósito |
|---|---|---|
| NestJS | 10.4.x | Framework principal (DI, controllers, guards, middleware) |
| TypeScript | 5.5 | Linguagem de programação |
| Node.js | 20 / 24 | Runtime |
| Mongoose | 8.5 | ODM para MongoDB |
| BullMQ | 5.12 | Sistema de filas Redis |
| ioredis | 5.3 | Cliente Redis |
| @nestjs/jwt | 10.2 | Tokens JWT |
| passport-jwt | 4.0 | Estratégia de autenticação |
| bcrypt | 5.1 | Hash de senhas |
| speakeasy | 2.0 | TOTP/2FA |
| @google-cloud/secret-manager | 5.4 | GCP Secret Manager |
| @google-cloud/kms | 4.3 | Criptografia envelope |
| @aws-sdk/client-s3 | 3.600 | Armazenamento de objetos |
| @aws-sdk/s3-request-presigner | 3.600 | URLs pré-assinadas |
| sharp | 0.33 | Processamento de imagens |
| helmet | 7.1 | Headers de segurança HTTP |
| uuid | 9.0 | Geração de identificadores únicos |
| class-validator | 0.14 | Validação de DTOs |
| Winston | 3.14 | Logging estruturado |
| @nestjs/swagger | 7.4 | Documentação OpenAPI |
| @nestjs/terminus | 10.2 | Health checks |
| nest-commander | 3.15 | CLI (bootstrap admin, seed CID-10) |

### Frontend

| Biblioteca | Versão | Propósito |
|---|---|---|
| React | 18.3 | Framework UI |
| TypeScript | 5.6 | Linguagem de programação |
| Vite | 5.4 | Build tool e dev server |
| React Router DOM | 6.26 | Roteamento client-side |
| Tailwind CSS | 4.3 | Sistema de estilos utilitários |
| Radix UI | 1.x–2.x | Componentes de UI acessíveis |
| Framer Motion | 12.40 | Animações |
| Lucide React | 1.21 | Ícones |
| React Query | 5.59 | Gerenciamento de estado assíncrono |
| React Hook Form | 7.79 | Gerenciamento de formulários |
| Zod | 4.4 | Validação de schemas |
| Axios | 1.7 | Cliente HTTP |
| Day.js | 1.11 | Manipulação de datas |
| clsx + tailwind-merge | 2.1 / 3.6 | Composição de classes CSS |

### Infraestrutura

| Tecnologia | Versão | Uso |
|---|---|---|
| MongoDB | 7 | Banco de dados principal |
| Redis | 7 | Cache, sessões, fila BullMQ |
| Docker | Latest | Containerização |
| Docker Compose | Latest | Orquestração local |
| GitHub Actions | — | CI/CD |
| Google Cloud Platform | — | Segredos, KMS, logging (produção) |
| AWS S3 / Cloudflare R2 | — | Armazenamento de documentos |

---

## 12. DECLARAÇÃO DE ORIGINALIDADE

O programa de computador **Nuvita** é obra original criada de forma independente, sem cópia ou reprodução de outros programas existentes. A combinação arquitetural de:

1. Plataforma multi-tenant SaaS para saúde multiprofissional (Medicina + Enfermagem + Direito)
2. Prontuário eletrônico SOAP com assinatura digital imutável baseada em HMAC
3. Telemedicina com tokens individualizados por participante e TTL nativo
4. Envelope encryption GCP KMS para dados de pacientes com rotação de chaves
5. Log de auditoria imutável por design de schema com 51 eventos tipados
6. Sistema de notificações multicanal com fila persistente e fallback multi-provedor
7. Multi-tenancy em três camadas simultâneas (middleware + guard + repositório)

— constitui uma contribuição técnica e funcional original ao domínio de software de saúde digital.

---

## 13. DECLARAÇÃO DO AUTOR

Declaro que sou o autor do programa de computador **Nuvita**, descrito neste relatório técnico, e que o mesmo foi criado de forma original e independente.

| | |
|---|---|
| **Nome do autor** | ericolimaeducador-ux |
| **E-mail** | andreia.administcomercial@gmail.com |
| **Data** | 19 de junho de 2026 |
| **Assinatura** | ________________________________ |

---

*Este relatório foi gerado a partir do código-fonte atual do repositório (commit 05da295, branch integracao) e descreve fielmente as funcionalidades implementadas até a data indicada.*

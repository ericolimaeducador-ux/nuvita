# Graph Report - .  (2026-10-22)

## Corpus Check
- Large corpus: 517 files · ~208.789 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 2409 nodes · 3930 edges · 312 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: contains: 1259 · imports: 865 · method: 643 · imports_from: 624 · calls: 492 · implements: 38 · inherits: 9


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 517 · Candidates: 562
- Excluded: 0 untracked · 56415 ignored · 14 sensitive · 0 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `fdfeb98`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `Button` - 30 edges
2. `PacienteMongoRepository` - 27 edges
3. `Toast` - 24 edges
4. `TelemedicinaService` - 23 edges
5. `cn()` - 23 edges
6. `PacientesService` - 22 edges
7. `apiErrorMessage()` - 22 edges
8. `useAuth()` - 21 edges
9. `Label` - 21 edges
10. `AgendamentosService` - 20 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (86): analyticsApi, AnalyticsPeriodParams, ClinicaAdmin, CobrancaResumo, CobrancasPsicologia, CobrarCicloPayload, CreateAdminUserPayload, CreateAgendamentoPayload (+78 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (34): PacienteSort, PageHeader(), PageHeaderProps, DashboardData, PacienteForm, pacienteSchema, PacientesPage(), SORT_OPTIONS (+26 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (40): agendaApi, CreateSalaPayload, telemedicinaApi, AgendaCalendario(), CORES_MODALIDADE, DnDCalendar, localizer, podeMover() (+32 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (31): apiErrorMessage(), avisar403(), doRefresh(), getClinicaAtiva(), getToken(), setClinicaAtiva(), setToken(), authApi (+23 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (13): ClinicaLogoService, LogoRequestContext, ClinicAdminContext, ClinicasService, MinhaClinica, OnboardingContext, OnboardingOptions, DocumentStorage (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (15): CursorPaginationInput, CursorPaginationResult, COLLATION_PT, DecodedCursor, PacienteMongoRepository, PacienteRepository, CorrigirIdentidadeInput, CreatePacienteInput (+7 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (10): CurrentClinicaId, CurrentUser, baseUser, CreateAdminUserDto, CreateClinicaUsuarioDto, ListUsersQueryDto, UpdateUserDto, extractClientIp() (+2 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (27): Logo(), LogoIcon(), LogoIconProps, LogoProps, ESTADO_CONEXAO_LABEL, EstadoConexao, Fase, navItems (+19 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (26): pacientesApi, prontuariosApi, DocumentoAssinatura(), useEmissor(), DocumentoClinicoLayout(), GateCrpEmissao(), queryClient, montarRascunho() (+18 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (10): NotificacaoDispatcherService, NotificacaoSender, SendNotificacaoInput, EmailSender, NotificacaoSender, Remetente, NotificacaoSender, SmsSender (+2 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (26): clinicasApi, MinhaClinica, DocumentoRodape(), DocumentoTimbre(), FalhaArmazenamento, LogoClinicaCard(), Props, brand (+18 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (19): documentosApi, observacoesPacienteApi, TestePsicologico, testesPsicologicosApi, NovoDocumentoDialog(), CAMPOS_LINHA_TODAS, EXAME_SEGMENTAR_CAMPOS, ProntuarioDetailDialog() (+11 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (15): RequestAuditContext, DocumentoRequestContext, EXTENSAO_POR_MIME, RequestAuditContext, IaClinicaRequestContext, LINHA_LABEL, PromptIA, NotificacaoRequestContext (+7 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (21): AuthProvider(), gateAtivo(), GateChain(), ROTAS_DE_GATE, cartoes, params, queryClient, queryClient (+13 more)

### Community 14 - "Community 14"
Cohesion: 0.10
Nodes (13): AuthResponse, AuthTokens, RequestContext, GateAvaliavel, gatePendente(), AuthenticatedUser, AuthGatesGuard, CanActivate (+5 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (12): iaClinicaApi, CAMPOS_POR_LINHA, SUGESTOES_CUIDADOS_POR_LINHA, RegistroSessao(), STATUS_BADGE, ultimoValor(), CHECKLIST_FIXO, PrescricaoCuidadosPage() (+4 more)

### Community 16 - "Community 16"
Cohesion: 0.21
Nodes (3): diaISO(), PacientesService, soDigitos()

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (10): AppConfig, AppConfigService, ConfigSource, resolveAllowPublicRegistration(), resolveConfigSource(), PLACEHOLDERS, ResultadoValidacao, SEGREDOS_COM_TAMANHO_MINIMO (+2 more)

### Community 18 - "Community 18"
Cohesion: 0.17
Nodes (1): TelemedicinaService

### Community 19 - "Community 19"
Cohesion: 0.11
Nodes (18): ProtectedRoute(), SalaVideo(), AppLayout(), AceitarTermosPage(), AgendaPage(), AtendimentoPsicologicoPage(), AtendimentoTelemedicinaPage(), DashboardPage() (+10 more)

### Community 20 - "Community 20"
Cohesion: 0.13
Nodes (16): api, CorrecaoIdentidadePayload, corrigirIdentidadePaciente(), Ticket, TICKET_STATUS_LABEL, ticketsApi, TicketStatus, AtenderTicketDialog() (+8 more)

### Community 21 - "Community 21"
Cohesion: 0.24
Nodes (1): AgendamentosService

### Community 22 - "Community 22"
Cohesion: 0.21
Nodes (1): DocumentosService

### Community 23 - "Community 23"
Cohesion: 0.11
Nodes (13): psicoFinanceiroApi, CICLO_BADGE, FinanceiroPsicologiaPage(), FORMA_PAGAMENTO_LABEL, FormaPagamento, PacientePsicologia, PainelPsicologia, rotuloProximaSessao() (+5 more)

### Community 24 - "Community 24"
Cohesion: 0.25
Nodes (2): ProntuarioRequestContext, ProntuariosService

### Community 25 - "Community 25"
Cohesion: 0.11
Nodes (4): NotificacaoMongoRepository, NotificacaoPreferenciaMongoRepository, NotificacaoPreferenciaRepository, NotificacaoRepository

### Community 26 - "Community 26"
Cohesion: 0.15
Nodes (4): Cid10MongoRepository, Cid10Repository, ProntuarioMongoRepository, ProntuarioRepository

### Community 27 - "Community 27"
Cohesion: 0.15
Nodes (3): gerarSenhaTemporaria(), CriarClinicaContext, SuperAdminService

### Community 28 - "Community 28"
Cohesion: 0.12
Nodes (3): BootstrapAdminCommand, BootstrapAdminOptions, CommandRunner

### Community 29 - "Community 29"
Cohesion: 0.22
Nodes (1): AuthService

### Community 30 - "Community 30"
Cohesion: 0.19
Nodes (2): AgendamentoMongoRepository, AgendamentoRepository

### Community 31 - "Community 31"
Cohesion: 0.14
Nodes (13): ArquivoProntuario, AssinaturaProntuario, Avaliacao, Cid10, ExameSegmentar, Objetivo, Plano, Prontuario (+5 more)

### Community 32 - "Community 32"
Cohesion: 0.22
Nodes (2): UserMongoRepository, UserRepository

### Community 33 - "Community 33"
Cohesion: 0.15
Nodes (1): AnalyticsService

### Community 34 - "Community 34"
Cohesion: 0.15
Nodes (4): ctx, dto, UpdateClinicaDto, Estado

### Community 35 - "Community 35"
Cohesion: 0.24
Nodes (2): ClinicaMongoRepository, ClinicaRepository

### Community 36 - "Community 36"
Cohesion: 0.19
Nodes (2): DocumentoMongoRepository, DocumentoRepository

### Community 37 - "Community 37"
Cohesion: 0.15
Nodes (10): AssinaturaMongo, Cid10Document, Cid10Mongo, Cid10Schema, ProntuarioAddendumDocument, ProntuarioAddendumMongo, ProntuarioAddendumSchema, ProntuarioDocument (+2 more)

### Community 38 - "Community 38"
Cohesion: 0.30
Nodes (1): IaClinicaService

### Community 39 - "Community 39"
Cohesion: 0.24
Nodes (6): HorizonteLembrete, HORIZONTES, calcularJanelaLembrete(), deveReceberLembrete(), JanelaLembrete, REFERENCIA

### Community 40 - "Community 40"
Cohesion: 0.26
Nodes (1): PacienteCryptoService

### Community 41 - "Community 41"
Cohesion: 0.23
Nodes (10): abrirEdicao(), abrirPaciente(), abrirTeste(), ADMIN, apiVazia(), Envio, PACIENTE, PSICOLOGO (+2 more)

### Community 42 - "Community 42"
Cohesion: 0.30
Nodes (1): AgendamentosController

### Community 43 - "Community 43"
Cohesion: 0.23
Nodes (1): AnalyticsController

### Community 44 - "Community 44"
Cohesion: 0.29
Nodes (1): PacientesController

### Community 45 - "Community 45"
Cohesion: 0.17
Nodes (9): FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext, FormItemContextValue, FormLabel (+1 more)

### Community 46 - "Community 46"
Cohesion: 0.20
Nodes (6): ehCpfDuplicado(), RequestAuditContext, ResumoContatoPaciente, calcularIdadeAnos(), ClassificacaoIdade, isMenorDeIdade()

### Community 47 - "Community 47"
Cohesion: 0.38
Nodes (1): PsicologiaFinanceiroService

### Community 48 - "Community 48"
Cohesion: 0.27
Nodes (2): SalaTelemedicinaMongoRepository, SalaTelemedicinaRepository

### Community 49 - "Community 49"
Cohesion: 0.25
Nodes (2): TicketMongoRepository, TicketRepository

### Community 50 - "Community 50"
Cohesion: 0.35
Nodes (1): AuthController

### Community 51 - "Community 51"
Cohesion: 0.33
Nodes (1): ProntuariosController

### Community 52 - "Community 52"
Cohesion: 0.18
Nodes (8): { AppConfigService }, arquivo, distConfig, googleSecretsStub, { Logger }, raiz, require, { vars, linhasInvalidas }

### Community 53 - "Community 53"
Cohesion: 0.18
Nodes (1): SuperAdminController

### Community 54 - "Community 54"
Cohesion: 0.22
Nodes (6): assinar, config(), ctx, HASH, montarServico(), Recebido

### Community 55 - "Community 55"
Cohesion: 0.44
Nodes (1): FinanceiroService

### Community 56 - "Community 56"
Cohesion: 0.40
Nodes (1): NotificacoesService

### Community 57 - "Community 57"
Cohesion: 0.38
Nodes (1): TicketsService

### Community 58 - "Community 58"
Cohesion: 0.36
Nodes (9): cnpjValido(), cpfValido(), digitoModulo11(), documentoFiscalValido(), formatarDocumentoFiscal(), normalizarDocumentoFiscal(), PESOS_CNPJ_1, PESOS_CNPJ_2 (+1 more)

### Community 59 - "Community 59"
Cohesion: 0.20
Nodes (9): AutorizacaoResponsavel, ConsentimentoLGPD, Convenio, Endereco, LinhaTerapeutica, Paciente, ProjetoPaciente, ResponsavelLegal (+1 more)

### Community 60 - "Community 60"
Cohesion: 0.20
Nodes (9): ArquivoProntuarioDto, ArquivosProntuarioDto, AvaliacaoDto, ExameSegmentarDto, ObjetivoDto, PlanoDto, RegistroPsicologicoDto, SinaisVitaisDto (+1 more)

### Community 61 - "Community 61"
Cohesion: 0.27
Nodes (2): LancamentoMongoRepository, LancamentoRepository

### Community 62 - "Community 62"
Cohesion: 0.20
Nodes (9): AutorizacaoResponsavelMongo, AutorizacaoResponsavelSchema, ConsentimentoLGPDMongo, ConsentimentoLGPDSchema, PacienteDocument, PacienteMongo, PacienteSchema, VersaoIdentidadeMongo (+1 more)

### Community 63 - "Community 63"
Cohesion: 0.36
Nodes (1): TelemedicinaController

### Community 64 - "Community 64"
Cohesion: 0.22
Nodes (5): agendamentoCriado, ctx, dto, SalaTelemedicina, StatusSala

### Community 65 - "Community 65"
Cohesion: 0.28
Nodes (7): admin(), clinicaBase(), CTX, HASH, psicologo(), setup(), superAdmin

### Community 66 - "Community 66"
Cohesion: 0.39
Nodes (1): LembretesAgendamentoProcessorService

### Community 67 - "Community 67"
Cohesion: 0.31
Nodes (6): apiDe(), montar(), pacientesPadrao(), PAPEIS_ABREM, repoPadrao(), ticketAberto

### Community 68 - "Community 68"
Cohesion: 0.25
Nodes (5): ADMIN, CLINICA, escolherTipo(), SUPER, tipo()

### Community 69 - "Community 69"
Cohesion: 0.28
Nodes (2): InscricaoTesteMongoRepository, InscricaoTesteRepository

### Community 70 - "Community 70"
Cohesion: 0.39
Nodes (1): FinanceiroController

### Community 71 - "Community 71"
Cohesion: 0.22
Nodes (4): NotificacaoWorker, OnModuleDestroy, OnModuleInit, SendJobData

### Community 72 - "Community 72"
Cohesion: 0.28
Nodes (8): bcrypt, EMAIL, fail(), hostDaUri(), main(), require, ROUNDS, speakeasy

### Community 73 - "Community 73"
Cohesion: 0.25
Nodes (4): AGORA, baseDoc, ctx, uploadDto

### Community 74 - "Community 74"
Cohesion: 0.25
Nodes (3): InscricaoRequestMeta, InscricaoTesteListada, InscricoesTesteService

### Community 75 - "Community 75"
Cohesion: 0.25
Nodes (4): Component, Props, SectionErrorBoundary, State

### Community 76 - "Community 76"
Cohesion: 0.25
Nodes (7): CanalNotificacao, ConteudoNotificacao, ErroNotificacao, Notificacao, PreferenciaNotificacao, StatusNotificacao, TipoNotificacao

### Community 77 - "Community 77"
Cohesion: 0.32
Nodes (4): EnqueueNotificacaoInput, NotificacaoQueue, BullMqNotificacaoQueueService, NotificacaoQueue

### Community 78 - "Community 78"
Cohesion: 0.29
Nodes (1): ClinicasController

### Community 79 - "Community 79"
Cohesion: 0.43
Nodes (1): DocumentosController

### Community 80 - "Community 80"
Cohesion: 0.43
Nodes (1): PsicologiaFinanceiroController

### Community 81 - "Community 81"
Cohesion: 0.43
Nodes (1): TicketsController

### Community 82 - "Community 82"
Cohesion: 0.25
Nodes (6): DEST, here, repoRoot, SHARED_TERMOS, SRC, TEXTOS

### Community 83 - "Community 83"
Cohesion: 0.25
Nodes (1): ator

### Community 84 - "Community 84"
Cohesion: 0.36
Nodes (4): NotificacaoTemplateService, primeiroNome(), TEMPLATES, TEMPLATES_RESPONSAVEL

### Community 85 - "Community 85"
Cohesion: 0.29
Nodes (4): assinar, config, CRIADO_EM, ctx

### Community 86 - "Community 86"
Cohesion: 0.33
Nodes (4): corrigirVia(), montar(), pacienteAtual, PAPEIS_NAO_SUPER

### Community 87 - "Community 87"
Cohesion: 0.29
Nodes (4): Modulo, MODULO_LABEL, PERMISSOES_PADRAO_POR_PAPEL, TODOS_MODULOS

### Community 88 - "Community 88"
Cohesion: 0.29
Nodes (6): Clinica, ConfiguracoesClinica, EnderecoClinica, LIMITES_POR_PLANO, PlanoClinica, PlanoLimites

### Community 89 - "Community 89"
Cohesion: 0.29
Nodes (6): DashboardFinanceiro, FormaPagamento, Lancamento, OrigemLancamento, StatusLancamento, TipoLancamento

### Community 90 - "Community 90"
Cohesion: 0.29
Nodes (5): CobrancaCiclo, ConfigPsicologo, PacientePsicologia, PainelPsicologia, StatusCiclo

### Community 91 - "Community 91"
Cohesion: 0.29
Nodes (4): ADMIN, CLINICA, Evento, PNG_1x1

### Community 92 - "Community 92"
Cohesion: 0.33
Nodes (5): controllerFiles(), controllerPrefixes(), MODULES_DIR, NOT_BROWSER_FACING, VITE_CONFIG

### Community 93 - "Community 93"
Cohesion: 0.33
Nodes (3): get(), RotasDeTeste, statusEmSequencia()

### Community 94 - "Community 94"
Cohesion: 0.29
Nodes (6): AgendamentoDocument, AgendamentoMongo, AgendamentoSchema, BloqueioAgendaDocument, BloqueioAgendaMongo, BloqueioAgendaSchema

### Community 95 - "Community 95"
Cohesion: 0.38
Nodes (2): ConfigPsicologoMongoRepository, ConfigPsicologoRepository

### Community 96 - "Community 96"
Cohesion: 0.33
Nodes (2): DecisaoUsoIaMongoRepository, DecisaoUsoIaRepository

### Community 97 - "Community 97"
Cohesion: 0.29
Nodes (6): NotificacaoDocument, NotificacaoMongo, NotificacaoPreferenciaDocument, NotificacaoPreferenciaMongo, NotificacaoPreferenciaSchema, NotificacaoSchema

### Community 98 - "Community 98"
Cohesion: 0.33
Nodes (2): ObservacaoPacienteMongoRepository, ObservacaoPacienteRepository

### Community 99 - "Community 99"
Cohesion: 0.38
Nodes (2): RegistroUsoIaMongoRepository, RegistroUsoIaRepository

### Community 100 - "Community 100"
Cohesion: 0.33
Nodes (2): SalaEventoMongoRepository, SalaEventoRepository

### Community 101 - "Community 101"
Cohesion: 0.33
Nodes (2): SinalSalaMongoRepository, SinalSalaRepository

### Community 102 - "Community 102"
Cohesion: 0.33
Nodes (2): TestePsicologicoMongoRepository, TestePsicologicoRepository

### Community 103 - "Community 103"
Cohesion: 0.29
Nodes (6): Cid10Repository, CreateProntuarioInput, ProntuarioRepository, ResumoSessoesPaciente, SignProntuarioInput, UpdateProntuarioInput

### Community 104 - "Community 104"
Cohesion: 0.29
Nodes (1): TelemedicinaAcessoController

### Community 105 - "Community 105"
Cohesion: 0.43
Nodes (1): LoginRateLimiterService

### Community 106 - "Community 106"
Cohesion: 0.33
Nodes (5): ator, body, clinicaAtual(), makeService(), pipe

### Community 107 - "Community 107"
Cohesion: 0.29
Nodes (1): TenantContextService

### Community 108 - "Community 108"
Cohesion: 0.38
Nodes (2): NestMiddleware, TenantMiddleware

### Community 109 - "Community 109"
Cohesion: 0.47
Nodes (1): InscricoesTesteMailer

### Community 110 - "Community 110"
Cohesion: 0.33
Nodes (3): PAPEIS_COM_2FA_OBRIGATORIO, PAPEIS_PROFISSIONAIS, Papel

### Community 111 - "Community 111"
Cohesion: 0.40
Nodes (1): IaUsoCryptoService

### Community 112 - "Community 112"
Cohesion: 0.33
Nodes (4): ConfiguracoesClinicaDto, CreateClinicaDto, EnderecoClinicaDto, PrimeiroAdminDto

### Community 113 - "Community 113"
Cohesion: 0.40
Nodes (5): abrirPaciente(), abrirSolicitar(), ADMIN, PACIENTE, PSICOLOGO

### Community 114 - "Community 114"
Cohesion: 0.33
Nodes (3): CanActivate, ISSUERS_VALIDOS, OidcSchedulerGuard

### Community 115 - "Community 115"
Cohesion: 0.33
Nodes (3): AGORA, { backfill, EXCLUIDO_POR }, CRIADO

### Community 116 - "Community 116"
Cohesion: 0.33
Nodes (5): TermosAceitosMongo, TermosAceitosSchema, UserDocument, UserMongo, UserSchema

### Community 117 - "Community 117"
Cohesion: 0.33
Nodes (5): AgendamentoRepository, CreateAgendamentoInput, CreateBloqueioInput, ListAgendamentosInput, UpdateAgendamentoInput

### Community 118 - "Community 118"
Cohesion: 0.33
Nodes (5): CreateNotificacaoInput, NotificacaoDashboardFilter, NotificacaoDashboardResult, NotificacaoPreferenciaRepository, NotificacaoRepository

### Community 119 - "Community 119"
Cohesion: 0.53
Nodes (1): IaClinicaController

### Community 120 - "Community 120"
Cohesion: 0.53
Nodes (1): NotificacoesController

### Community 121 - "Community 121"
Cohesion: 0.60
Nodes (5): gerarCpf(), iso(), main(), maisMin(), req()

### Community 122 - "Community 122"
Cohesion: 0.33
Nodes (3): Comando, config, PNG_1X1

### Community 123 - "Community 123"
Cohesion: 0.33
Nodes (2): ctx, dto

### Community 124 - "Community 124"
Cohesion: 0.33
Nodes (2): CanActivate, TenantRequiredGuard

### Community 125 - "Community 125"
Cohesion: 0.40
Nodes (2): context, TERMOS

### Community 126 - "Community 126"
Cohesion: 0.40
Nodes (1): meta

### Community 127 - "Community 127"
Cohesion: 0.50
Nodes (3): AGORA, makePacientesMap(), makeService()

### Community 128 - "Community 128"
Cohesion: 0.40
Nodes (1): AGORA

### Community 129 - "Community 129"
Cohesion: 0.60
Nodes (1): NotificacaoWindowService

### Community 130 - "Community 130"
Cohesion: 0.40
Nodes (3): ctx, dto, salaCriada

### Community 131 - "Community 131"
Cohesion: 0.40
Nodes (2): AuthModule, OnApplicationShutdown

### Community 132 - "Community 132"
Cohesion: 0.40
Nodes (3): CID10_DATA, CID10_SCHEMA, Cid10Model

### Community 133 - "Community 133"
Cohesion: 0.40
Nodes (4): Agendamento, BloqueioAgenda, StatusAgendamento, TipoAgendamento

### Community 134 - "Community 134"
Cohesion: 0.40
Nodes (4): ALLOWED_DOCUMENT_MIME_TYPES, AllowedDocumentMimeType, Documento, TipoDocumento

### Community 135 - "Community 135"
Cohesion: 0.40
Nodes (3): PublicUser, TermosAceitos, User

### Community 136 - "Community 136"
Cohesion: 0.40
Nodes (3): ClinicaInputDto, CriarClinicaDto, PrimeiroAdminInputDto

### Community 137 - "Community 137"
Cohesion: 0.40
Nodes (2): DocumentoFiscalConstraint, ValidatorConstraintInterface

### Community 138 - "Community 138"
Cohesion: 0.40
Nodes (3): CLINICA, PSICOLOGO, SECRETARIA

### Community 139 - "Community 139"
Cohesion: 0.40
Nodes (2): CanActivate, OidcSchedulerGuardAdapter

### Community 140 - "Community 140"
Cohesion: 0.40
Nodes (2): CanActivate, RolesGuard

### Community 141 - "Community 141"
Cohesion: 0.40
Nodes (2): HealthIndicator, RedisHealthIndicator

### Community 142 - "Community 142"
Cohesion: 0.40
Nodes (2): AuditLogMongoRepository, AuditLogRepository

### Community 143 - "Community 143"
Cohesion: 0.40
Nodes (3): AuditLogDocument, AuditLogMongo, AuditLogSchema

### Community 144 - "Community 144"
Cohesion: 0.40
Nodes (3): DecisaoUsoIaDocument, DecisaoUsoIaMongo, DecisaoUsoIaSchema

### Community 145 - "Community 145"
Cohesion: 0.40
Nodes (3): ObservacaoPacienteDocument, ObservacaoPacienteMongo, ObservacaoPacienteSchema

### Community 146 - "Community 146"
Cohesion: 0.40
Nodes (3): RegistroUsoIaDocument, RegistroUsoIaMongo, RegistroUsoIaSchema

### Community 147 - "Community 147"
Cohesion: 0.40
Nodes (3): TestePsicologicoDocument, TestePsicologicoMongo, TestePsicologicoSchema

### Community 148 - "Community 148"
Cohesion: 0.40
Nodes (4): CreateLancamentoInput, DashboardInput, LancamentoRepository, ListLancamentosInput

### Community 149 - "Community 149"
Cohesion: 0.40
Nodes (4): CriarTicketInput, ListarTicketsInput, ResolverTicketInput, TicketRepository

### Community 150 - "Community 150"
Cohesion: 0.40
Nodes (4): CreateUserInput, UpdateUserInput, UserFilters, UserRepository

### Community 151 - "Community 151"
Cohesion: 0.40
Nodes (2): requisicao, userBase

### Community 152 - "Community 152"
Cohesion: 0.50
Nodes (2): clinica(), makeService()

### Community 153 - "Community 153"
Cohesion: 0.40
Nodes (1): InscricoesTesteController

### Community 154 - "Community 154"
Cohesion: 0.40
Nodes (1): ObservacoesPacienteController

### Community 155 - "Community 155"
Cohesion: 0.40
Nodes (1): TestesPsicologicosController

### Community 156 - "Community 156"
Cohesion: 0.50
Nodes (3): LimiterPorConta, makeLimiter(), makeRedis()

### Community 157 - "Community 157"
Cohesion: 0.50
Nodes (2): context, user

### Community 158 - "Community 158"
Cohesion: 0.50
Nodes (1): ctx

### Community 159 - "Community 159"
Cohesion: 0.50
Nodes (1): ctx

### Community 160 - "Community 160"
Cohesion: 0.50
Nodes (2): ctx, documentoExistente

### Community 161 - "Community 161"
Cohesion: 0.50
Nodes (2): ctx, imagem

### Community 162 - "Community 162"
Cohesion: 0.50
Nodes (2): dto, notificacaoCriada

### Community 163 - "Community 163"
Cohesion: 0.50
Nodes (2): basePaciente, context

### Community 164 - "Community 164"
Cohesion: 0.50
Nodes (1): TestesPsicologicosService

### Community 165 - "Community 165"
Cohesion: 0.50
Nodes (3): ModalidadeAtendimento, MODALIDADES_ATENDIMENTO, ROTULO_MODALIDADE

### Community 166 - "Community 166"
Cohesion: 0.50
Nodes (3): AUDIT_LOG_REPOSITORY, REDIS_CLIENT, USER_REPOSITORY

### Community 167 - "Community 167"
Cohesion: 0.50
Nodes (3): PapelSala, SalaEvento, TipoEventoSala

### Community 168 - "Community 168"
Cohesion: 0.50
Nodes (3): Ticket, TicketStatus, TicketTipo

### Community 169 - "Community 169"
Cohesion: 0.50
Nodes (3): AnalyticsQueryDto, HorariosVagosQueryDto, RelatorioPsicologiaQueryDto

### Community 170 - "Community 170"
Cohesion: 0.50
Nodes (2): pipe, valido

### Community 171 - "Community 171"
Cohesion: 0.50
Nodes (2): CriarInscricaoTesteDto, MODOS_ATENDIMENTO

### Community 172 - "Community 172"
Cohesion: 0.50
Nodes (2): CLINICA_CNPJ, PSICOLOGO

### Community 174 - "Community 174"
Cohesion: 0.50
Nodes (2): CanActivate, SuperAdminGuard

### Community 175 - "Community 175"
Cohesion: 0.50
Nodes (1): HealthController

### Community 176 - "Community 176"
Cohesion: 0.50
Nodes (2): BaseExceptionFilter, InvalidObjectIdFilter

### Community 177 - "Community 177"
Cohesion: 0.50
Nodes (1): AnthropicClient

### Community 178 - "Community 178"
Cohesion: 0.50
Nodes (3): ClinicaDocument, ClinicaMongo, ClinicaSchema

### Community 179 - "Community 179"
Cohesion: 0.50
Nodes (3): ConfigPsicologoDocument, ConfigPsicologoMongo, ConfigPsicologoSchema

### Community 180 - "Community 180"
Cohesion: 0.50
Nodes (3): DocumentoDocument, DocumentoMongo, DocumentoSchema

### Community 181 - "Community 181"
Cohesion: 0.50
Nodes (3): InscricaoTesteDocument, InscricaoTesteMongo, InscricaoTesteSchema

### Community 182 - "Community 182"
Cohesion: 0.50
Nodes (3): LancamentoDocument, LancamentoMongo, LancamentoSchema

### Community 183 - "Community 183"
Cohesion: 0.50
Nodes (3): SalaEventoDocument, SalaEventoMongo, SalaEventoSchema

### Community 184 - "Community 184"
Cohesion: 0.50
Nodes (3): SalaTelemedicinaDocument, SalaTelemedicinaMongo, SalaTelemedicinaSchema

### Community 185 - "Community 185"
Cohesion: 0.50
Nodes (3): SinalSalaDocument, SinalSalaMongo, SinalSalaSchema

### Community 186 - "Community 186"
Cohesion: 0.50
Nodes (3): TicketDocument, TicketMongo, TicketSchema

### Community 187 - "Community 187"
Cohesion: 0.50
Nodes (3): NOTIFICACAO_PREFERENCIA_REPOSITORY, NOTIFICACAO_QUEUE, NOTIFICACAO_REPOSITORY

### Community 188 - "Community 188"
Cohesion: 0.50
Nodes (3): ClinicaRepository, CreateClinicaInput, UpdateClinicaInput

### Community 189 - "Community 189"
Cohesion: 0.50
Nodes (3): CreateDocumentoInput, DocumentoRepository, ListDocumentoInput

### Community 190 - "Community 190"
Cohesion: 0.50
Nodes (3): CreateSalaInput, FindAllSalasFiltro, SalaTelemedicinaRepository

### Community 191 - "Community 191"
Cohesion: 0.50
Nodes (2): proto, ROTAS

### Community 192 - "Community 192"
Cohesion: 0.50
Nodes (1): LembretesAgendamentoController

### Community 193 - "Community 193"
Cohesion: 0.50
Nodes (2): bcrypt, require

### Community 194 - "Community 194"
Cohesion: 0.83
Nodes (3): main(), pickItems(), req()

### Community 196 - "Community 196"
Cohesion: 0.50
Nodes (2): clinicaInput, pipe

### Community 197 - "Community 197"
Cohesion: 0.50
Nodes (3): SALA_EVENTO_REPOSITORY, SALA_TELEMEDICINA_REPOSITORY, SINAL_SALA_REPOSITORY

### Community 198 - "Community 198"
Cohesion: 0.50
Nodes (2): NestModule, TenancyModule

### Community 199 - "Community 199"
Cohesion: 0.67
Nodes (1): context

### Community 200 - "Community 200"
Cohesion: 0.67
Nodes (1): inscricao

### Community 201 - "Community 201"
Cohesion: 0.67
Nodes (1): agendamentosServiceStub

### Community 202 - "Community 202"
Cohesion: 0.67
Nodes (1): BootstrapAdminModule

### Community 203 - "Community 203"
Cohesion: 0.67
Nodes (2): CLINICA_REPOSITORY, LOGO_MIME_EXTENSAO

### Community 204 - "Community 204"
Cohesion: 0.67
Nodes (2): InscricaoTeste, InscricaoTesteStatus

### Community 205 - "Community 205"
Cohesion: 0.67
Nodes (2): DecisaoUsoIA, TipoUsoIA

### Community 206 - "Community 206"
Cohesion: 0.67
Nodes (2): SinalSala, TipoSinal

### Community 207 - "Community 207"
Cohesion: 0.67
Nodes (1): CreateProntuarioDto

### Community 208 - "Community 208"
Cohesion: 0.67
Nodes (1): pipe

### Community 209 - "Community 209"
Cohesion: 0.67
Nodes (2): ConfirmarLogoDto, SolicitarUploadLogoDto

### Community 210 - "Community 210"
Cohesion: 0.67
Nodes (2): EVENTOS_REPORTAVEIS, RegistrarEventoDto

### Community 211 - "Community 211"
Cohesion: 0.67
Nodes (2): AutorizacaoResponsavelDto, ResponsavelLegalDto

### Community 212 - "Community 212"
Cohesion: 0.67
Nodes (2): CONFIG_PSICOLOGO_REPOSITORY, LANCAMENTO_REPOSITORY

### Community 214 - "Community 214"
Cohesion: 0.67
Nodes (2): GlobalThrottlerGuard, ThrottlerGuard

### Community 215 - "Community 215"
Cohesion: 0.67
Nodes (2): CAMPOS_IMUTAVEIS, OPS_BLOQUEADAS

### Community 216 - "Community 216"
Cohesion: 0.67
Nodes (2): CAMPOS_IMUTAVEIS, OPS_BLOQUEADAS

### Community 217 - "Community 217"
Cohesion: 0.67
Nodes (1): nova

### Community 218 - "Community 218"
Cohesion: 0.67
Nodes (2): CAMPOS_IMUTAVEIS, OPS_BLOQUEADAS

### Community 220 - "Community 220"
Cohesion: 0.67
Nodes (2): AuditLogRepository, CreateAuditLogInput

### Community 221 - "Community 221"
Cohesion: 0.67
Nodes (2): InscricaoTesteRepository, NovaInscricaoTeste

### Community 222 - "Community 222"
Cohesion: 0.67
Nodes (2): CreateSalaEventoInput, SalaEventoRepository

### Community 223 - "Community 223"
Cohesion: 0.67
Nodes (2): CreateSinalInput, SinalSalaRepository

### Community 224 - "Community 224"
Cohesion: 0.67
Nodes (1): base

### Community 226 - "Community 226"
Cohesion: 0.67
Nodes (2): CID10_REPOSITORY, PRONTUARIO_REPOSITORY

### Community 227 - "Community 227"
Cohesion: 0.67
Nodes (1): dryRun

### Community 228 - "Community 228"
Cohesion: 0.67
Nodes (1): totpCode

### Community 229 - "Community 229"
Cohesion: 0.67
Nodes (2): config, CreateReadUrlComFilename

### Community 230 - "Community 230"
Cohesion: 1.00
Nodes (1): AGENDAMENTO_REPOSITORY

### Community 231 - "Community 231"
Cohesion: 1.00
Nodes (1): AgendamentosModule

### Community 232 - "Community 232"
Cohesion: 1.00
Nodes (1): AnalyticsModule

### Community 233 - "Community 233"
Cohesion: 1.00
Nodes (1): ClinicasModule

### Community 236 - "Community 236"
Cohesion: 1.00
Nodes (1): DOCUMENTO_REPOSITORY

### Community 237 - "Community 237"
Cohesion: 1.00
Nodes (1): DocumentosModule

### Community 239 - "Community 239"
Cohesion: 1.00
Nodes (1): AuditEvent

### Community 240 - "Community 240"
Cohesion: 1.00
Nodes (1): DecisaoUsoIa

### Community 241 - "Community 241"
Cohesion: 1.00
Nodes (1): ObservacaoPaciente

### Community 242 - "Community 242"
Cohesion: 1.00
Nodes (1): RegistroUsoIa

### Community 243 - "Community 243"
Cohesion: 1.00
Nodes (1): TestePsicologico

### Community 244 - "Community 244"
Cohesion: 1.00
Nodes (1): AceitarTermosDto

### Community 245 - "Community 245"
Cohesion: 1.00
Nodes (1): AtenderTicketDto

### Community 246 - "Community 246"
Cohesion: 1.00
Nodes (1): AtualizarPerfilDto

### Community 247 - "Community 247"
Cohesion: 1.00
Nodes (1): AtualizarStatusInscricaoDto

### Community 248 - "Community 248"
Cohesion: 1.00
Nodes (1): CancelAgendamentoDto

### Community 249 - "Community 249"
Cohesion: 1.00
Nodes (1): Cid10QueryDto

### Community 250 - "Community 250"
Cohesion: 1.00
Nodes (1): CobrarCicloDto

### Community 251 - "Community 251"
Cohesion: 1.00
Nodes (1): ConsentimentoLGpdDto

### Community 252 - "Community 252"
Cohesion: 1.00
Nodes (1): ConvenioDto

### Community 253 - "Community 253"
Cohesion: 1.00
Nodes (1): CorrigirIdentidadePacienteDto

### Community 254 - "Community 254"
Cohesion: 1.00
Nodes (1): CreateAddendumDto

### Community 255 - "Community 255"
Cohesion: 1.00
Nodes (1): CreateAgendamentoDto

### Community 256 - "Community 256"
Cohesion: 1.00
Nodes (1): CreateBloqueioDto

### Community 257 - "Community 257"
Cohesion: 1.00
Nodes (1): CreateLancamentoDto

### Community 258 - "Community 258"
Cohesion: 1.00
Nodes (1): CreateNotificacaoDto

### Community 259 - "Community 259"
Cohesion: 1.00
Nodes (1): CreateObservacaoPacienteDto

### Community 260 - "Community 260"
Cohesion: 1.00
Nodes (1): CreatePacienteDto

### Community 261 - "Community 261"
Cohesion: 1.00
Nodes (1): CreateSalaDto

### Community 262 - "Community 262"
Cohesion: 1.00
Nodes (1): CreateTestePsicologicoDto

### Community 263 - "Community 263"
Cohesion: 1.00
Nodes (1): CreateUploadUrlDto

### Community 264 - "Community 264"
Cohesion: 1.00
Nodes (1): CriarTicketDto

### Community 265 - "Community 265"
Cohesion: 1.00
Nodes (1): DashboardNotificacoesQueryDto

### Community 266 - "Community 266"
Cohesion: 1.00
Nodes (1): EnderecoDto

### Community 267 - "Community 267"
Cohesion: 1.00
Nodes (1): EnviarSinalDto

### Community 268 - "Community 268"
Cohesion: 1.00
Nodes (1): FinancialDashboardQueryDto

### Community 269 - "Community 269"
Cohesion: 1.00
Nodes (1): GerarPrescricaoDto

### Community 270 - "Community 270"
Cohesion: 1.00
Nodes (1): ListAgendamentosQueryDto

### Community 271 - "Community 271"
Cohesion: 1.00
Nodes (1): ListBloqueiosQueryDto

### Community 272 - "Community 272"
Cohesion: 1.00
Nodes (1): ListDocumentosQueryDto

### Community 273 - "Community 273"
Cohesion: 1.00
Nodes (1): ListLancamentosQueryDto

### Community 274 - "Community 274"
Cohesion: 1.00
Nodes (1): ListPacientesQueryDto

### Community 275 - "Community 275"
Cohesion: 1.00
Nodes (1): ListProntuariosQueryDto

### Community 276 - "Community 276"
Cohesion: 1.00
Nodes (1): ListSalasQueryDto

### Community 277 - "Community 277"
Cohesion: 1.00
Nodes (1): ListarTicketsQueryDto

### Community 278 - "Community 278"
Cohesion: 1.00
Nodes (1): LoginDto

### Community 279 - "Community 279"
Cohesion: 1.00
Nodes (1): ProcessarLembretesResponseDto

### Community 280 - "Community 280"
Cohesion: 1.00
Nodes (1): ReceiveLancamentoDto

### Community 281 - "Community 281"
Cohesion: 1.00
Nodes (1): RecusarTicketDto

### Community 282 - "Community 282"
Cohesion: 1.00
Nodes (1): RegisterUserDto

### Community 283 - "Community 283"
Cohesion: 1.00
Nodes (1): RegistrarDecisaoDto

### Community 284 - "Community 284"
Cohesion: 1.00
Nodes (1): SalvarConfigPsicologoDto

### Community 285 - "Community 285"
Cohesion: 1.00
Nodes (1): SugerirAbordagemDto

### Community 286 - "Community 286"
Cohesion: 1.00
Nodes (1): TrocarSenhaObrigatoriaDto

### Community 287 - "Community 287"
Cohesion: 1.00
Nodes (1): UpdateAgendamentoDto

### Community 288 - "Community 288"
Cohesion: 1.00
Nodes (1): UpdateObservacoesPacienteDto

### Community 289 - "Community 289"
Cohesion: 1.00
Nodes (1): UpdateOptOutDto

### Community 290 - "Community 290"
Cohesion: 1.00
Nodes (1): UpdatePacienteDto

### Community 291 - "Community 291"
Cohesion: 1.00
Nodes (1): UpdateProntuarioDto

### Community 293 - "Community 293"
Cohesion: 1.00
Nodes (1): FinanceiroModule

### Community 294 - "Community 294"
Cohesion: 1.00
Nodes (1): JwtAuthGuard

### Community 295 - "Community 295"
Cohesion: 1.00
Nodes (1): HealthModule

### Community 297 - "Community 297"
Cohesion: 1.00
Nodes (1): IaClinicaModule

### Community 298 - "Community 298"
Cohesion: 1.00
Nodes (1): InscricoesTesteModule

### Community 299 - "Community 299"
Cohesion: 1.00
Nodes (1): LembretesAgendamentoModule

### Community 300 - "Community 300"
Cohesion: 1.00
Nodes (1): NotificacoesModule

### Community 301 - "Community 301"
Cohesion: 1.00
Nodes (1): ObservacoesPacienteModule

### Community 302 - "Community 302"
Cohesion: 1.00
Nodes (1): PACIENTE_REPOSITORY

### Community 303 - "Community 303"
Cohesion: 1.00
Nodes (1): PacientesModule

### Community 304 - "Community 304"
Cohesion: 1.00
Nodes (1): ConfigPsicologoRepository

### Community 305 - "Community 305"
Cohesion: 1.00
Nodes (1): DecisaoUsoIaRepository

### Community 306 - "Community 306"
Cohesion: 1.00
Nodes (1): ObservacaoPacienteRepository

### Community 307 - "Community 307"
Cohesion: 1.00
Nodes (1): RegistroUsoIaRepository

### Community 308 - "Community 308"
Cohesion: 1.00
Nodes (1): TestePsicologicoRepository

### Community 310 - "Community 310"
Cohesion: 1.00
Nodes (1): ProntuariosModule

### Community 311 - "Community 311"
Cohesion: 1.00
Nodes (1): notificacaoQueueProvider

### Community 313 - "Community 313"
Cohesion: 1.00
Nodes (1): redisProvider

### Community 315 - "Community 315"
Cohesion: 1.00
Nodes (1): code

### Community 316 - "Community 316"
Cohesion: 1.00
Nodes (1): SecurityModule

### Community 317 - "Community 317"
Cohesion: 1.00
Nodes (1): AppModule

### Community 318 - "Community 318"
Cohesion: 1.00
Nodes (1): SuperAdminModule

### Community 319 - "Community 319"
Cohesion: 1.00
Nodes (1): TelemedicinaModule

### Community 320 - "Community 320"
Cohesion: 1.00
Nodes (1): TestesPsicologicosModule

### Community 321 - "Community 321"
Cohesion: 1.00
Nodes (1): TICKET_REPOSITORY

### Community 322 - "Community 322"
Cohesion: 1.00
Nodes (1): TicketsModule

### Community 323 - "Community 323"
Cohesion: 1.00
Nodes (1): apiProxy

### Community 333 - "Community 333"
Cohesion: 1.00
Nodes (1): ThrottlerGuard

## Knowledge Gaps
- **675 isolated node(s):** `AppModule`, `BootstrapAdminOptions`, `BootstrapAdminModule`, `CID10_SCHEMA`, `Cid10Model` (+670 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 18`** (1 nodes): `TelemedicinaService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (1 nodes): `AgendamentosService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (1 nodes): `DocumentosService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (2 nodes): `ProntuarioRequestContext`, `ProntuariosService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `AuthService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (2 nodes): `AgendamentoMongoRepository`, `AgendamentoRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (2 nodes): `UserMongoRepository`, `UserRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `AnalyticsService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (2 nodes): `ClinicaMongoRepository`, `ClinicaRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (2 nodes): `DocumentoMongoRepository`, `DocumentoRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `IaClinicaService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `PacienteCryptoService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `AgendamentosController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `AnalyticsController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `PacientesController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `PsicologiaFinanceiroService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (2 nodes): `SalaTelemedicinaMongoRepository`, `SalaTelemedicinaRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (2 nodes): `TicketMongoRepository`, `TicketRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `AuthController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `ProntuariosController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (1 nodes): `SuperAdminController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (1 nodes): `FinanceiroService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (1 nodes): `NotificacoesService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (1 nodes): `TicketsService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (2 nodes): `LancamentoMongoRepository`, `LancamentoRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (1 nodes): `TelemedicinaController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (1 nodes): `LembretesAgendamentoProcessorService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (2 nodes): `InscricaoTesteMongoRepository`, `InscricaoTesteRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (1 nodes): `FinanceiroController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78`** (1 nodes): `ClinicasController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (1 nodes): `DocumentosController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (1 nodes): `PsicologiaFinanceiroController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (1 nodes): `TicketsController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 83`** (1 nodes): `ator`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 95`** (2 nodes): `ConfigPsicologoMongoRepository`, `ConfigPsicologoRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 96`** (2 nodes): `DecisaoUsoIaMongoRepository`, `DecisaoUsoIaRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 98`** (2 nodes): `ObservacaoPacienteMongoRepository`, `ObservacaoPacienteRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 99`** (2 nodes): `RegistroUsoIaMongoRepository`, `RegistroUsoIaRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 100`** (2 nodes): `SalaEventoMongoRepository`, `SalaEventoRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 101`** (2 nodes): `SinalSalaMongoRepository`, `SinalSalaRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 102`** (2 nodes): `TestePsicologicoMongoRepository`, `TestePsicologicoRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 104`** (1 nodes): `TelemedicinaAcessoController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 105`** (1 nodes): `LoginRateLimiterService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 107`** (1 nodes): `TenantContextService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 108`** (2 nodes): `NestMiddleware`, `TenantMiddleware`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 109`** (1 nodes): `InscricoesTesteMailer`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 111`** (1 nodes): `IaUsoCryptoService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 119`** (1 nodes): `IaClinicaController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 120`** (1 nodes): `NotificacoesController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 123`** (2 nodes): `ctx`, `dto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 124`** (2 nodes): `CanActivate`, `TenantRequiredGuard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 125`** (2 nodes): `context`, `TERMOS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 126`** (1 nodes): `meta`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 128`** (1 nodes): `AGORA`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 129`** (1 nodes): `NotificacaoWindowService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 131`** (2 nodes): `AuthModule`, `OnApplicationShutdown`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 137`** (2 nodes): `DocumentoFiscalConstraint`, `ValidatorConstraintInterface`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 139`** (2 nodes): `CanActivate`, `OidcSchedulerGuardAdapter`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 140`** (2 nodes): `CanActivate`, `RolesGuard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 141`** (2 nodes): `HealthIndicator`, `RedisHealthIndicator`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 142`** (2 nodes): `AuditLogMongoRepository`, `AuditLogRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 151`** (2 nodes): `requisicao`, `userBase`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 152`** (2 nodes): `clinica()`, `makeService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 153`** (1 nodes): `InscricoesTesteController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 154`** (1 nodes): `ObservacoesPacienteController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 155`** (1 nodes): `TestesPsicologicosController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 157`** (2 nodes): `context`, `user`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 158`** (1 nodes): `ctx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 159`** (1 nodes): `ctx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 160`** (2 nodes): `ctx`, `documentoExistente`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 161`** (2 nodes): `ctx`, `imagem`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 162`** (2 nodes): `dto`, `notificacaoCriada`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 163`** (2 nodes): `basePaciente`, `context`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 164`** (1 nodes): `TestesPsicologicosService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 170`** (2 nodes): `pipe`, `valido`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 171`** (2 nodes): `CriarInscricaoTesteDto`, `MODOS_ATENDIMENTO`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 172`** (2 nodes): `CLINICA_CNPJ`, `PSICOLOGO`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 174`** (2 nodes): `CanActivate`, `SuperAdminGuard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 175`** (1 nodes): `HealthController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 176`** (2 nodes): `BaseExceptionFilter`, `InvalidObjectIdFilter`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 177`** (1 nodes): `AnthropicClient`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 191`** (2 nodes): `proto`, `ROTAS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 192`** (1 nodes): `LembretesAgendamentoController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 193`** (2 nodes): `bcrypt`, `require`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 196`** (2 nodes): `clinicaInput`, `pipe`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 198`** (2 nodes): `NestModule`, `TenancyModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 199`** (1 nodes): `context`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 200`** (1 nodes): `inscricao`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 201`** (1 nodes): `agendamentosServiceStub`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 202`** (1 nodes): `BootstrapAdminModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 203`** (2 nodes): `CLINICA_REPOSITORY`, `LOGO_MIME_EXTENSAO`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 204`** (2 nodes): `InscricaoTeste`, `InscricaoTesteStatus`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 205`** (2 nodes): `DecisaoUsoIA`, `TipoUsoIA`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 206`** (2 nodes): `SinalSala`, `TipoSinal`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 207`** (1 nodes): `CreateProntuarioDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 208`** (1 nodes): `pipe`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 209`** (2 nodes): `ConfirmarLogoDto`, `SolicitarUploadLogoDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 210`** (2 nodes): `EVENTOS_REPORTAVEIS`, `RegistrarEventoDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 211`** (2 nodes): `AutorizacaoResponsavelDto`, `ResponsavelLegalDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 212`** (2 nodes): `CONFIG_PSICOLOGO_REPOSITORY`, `LANCAMENTO_REPOSITORY`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 214`** (2 nodes): `GlobalThrottlerGuard`, `ThrottlerGuard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 215`** (2 nodes): `CAMPOS_IMUTAVEIS`, `OPS_BLOQUEADAS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 216`** (2 nodes): `CAMPOS_IMUTAVEIS`, `OPS_BLOQUEADAS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 217`** (1 nodes): `nova`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 218`** (2 nodes): `CAMPOS_IMUTAVEIS`, `OPS_BLOQUEADAS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 220`** (2 nodes): `AuditLogRepository`, `CreateAuditLogInput`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 221`** (2 nodes): `InscricaoTesteRepository`, `NovaInscricaoTeste`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 222`** (2 nodes): `CreateSalaEventoInput`, `SalaEventoRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 223`** (2 nodes): `CreateSinalInput`, `SinalSalaRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 224`** (1 nodes): `base`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 226`** (2 nodes): `CID10_REPOSITORY`, `PRONTUARIO_REPOSITORY`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 227`** (1 nodes): `dryRun`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 228`** (1 nodes): `totpCode`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 229`** (2 nodes): `config`, `CreateReadUrlComFilename`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 230`** (1 nodes): `AGENDAMENTO_REPOSITORY`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 231`** (1 nodes): `AgendamentosModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 232`** (1 nodes): `AnalyticsModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 233`** (1 nodes): `ClinicasModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 236`** (1 nodes): `DOCUMENTO_REPOSITORY`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 237`** (1 nodes): `DocumentosModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 239`** (1 nodes): `AuditEvent`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 240`** (1 nodes): `DecisaoUsoIa`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 241`** (1 nodes): `ObservacaoPaciente`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 242`** (1 nodes): `RegistroUsoIa`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 243`** (1 nodes): `TestePsicologico`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 244`** (1 nodes): `AceitarTermosDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 245`** (1 nodes): `AtenderTicketDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 246`** (1 nodes): `AtualizarPerfilDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 247`** (1 nodes): `AtualizarStatusInscricaoDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 248`** (1 nodes): `CancelAgendamentoDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 249`** (1 nodes): `Cid10QueryDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 250`** (1 nodes): `CobrarCicloDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 251`** (1 nodes): `ConsentimentoLGpdDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 252`** (1 nodes): `ConvenioDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 253`** (1 nodes): `CorrigirIdentidadePacienteDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 254`** (1 nodes): `CreateAddendumDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 255`** (1 nodes): `CreateAgendamentoDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 256`** (1 nodes): `CreateBloqueioDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 257`** (1 nodes): `CreateLancamentoDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 258`** (1 nodes): `CreateNotificacaoDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 259`** (1 nodes): `CreateObservacaoPacienteDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 260`** (1 nodes): `CreatePacienteDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 261`** (1 nodes): `CreateSalaDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 262`** (1 nodes): `CreateTestePsicologicoDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 263`** (1 nodes): `CreateUploadUrlDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 264`** (1 nodes): `CriarTicketDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 265`** (1 nodes): `DashboardNotificacoesQueryDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 266`** (1 nodes): `EnderecoDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 267`** (1 nodes): `EnviarSinalDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 268`** (1 nodes): `FinancialDashboardQueryDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 269`** (1 nodes): `GerarPrescricaoDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 270`** (1 nodes): `ListAgendamentosQueryDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 271`** (1 nodes): `ListBloqueiosQueryDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 272`** (1 nodes): `ListDocumentosQueryDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 273`** (1 nodes): `ListLancamentosQueryDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 274`** (1 nodes): `ListPacientesQueryDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 275`** (1 nodes): `ListProntuariosQueryDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 276`** (1 nodes): `ListSalasQueryDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 277`** (1 nodes): `ListarTicketsQueryDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 278`** (1 nodes): `LoginDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 279`** (1 nodes): `ProcessarLembretesResponseDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 280`** (1 nodes): `ReceiveLancamentoDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 281`** (1 nodes): `RecusarTicketDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 282`** (1 nodes): `RegisterUserDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 283`** (1 nodes): `RegistrarDecisaoDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 284`** (1 nodes): `SalvarConfigPsicologoDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 285`** (1 nodes): `SugerirAbordagemDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 286`** (1 nodes): `TrocarSenhaObrigatoriaDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 287`** (1 nodes): `UpdateAgendamentoDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 288`** (1 nodes): `UpdateObservacoesPacienteDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 289`** (1 nodes): `UpdateOptOutDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 290`** (1 nodes): `UpdatePacienteDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 291`** (1 nodes): `UpdateProntuarioDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 293`** (1 nodes): `FinanceiroModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 294`** (1 nodes): `JwtAuthGuard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 295`** (1 nodes): `HealthModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 297`** (1 nodes): `IaClinicaModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 298`** (1 nodes): `InscricoesTesteModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 299`** (1 nodes): `LembretesAgendamentoModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 300`** (1 nodes): `NotificacoesModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 301`** (1 nodes): `ObservacoesPacienteModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 302`** (1 nodes): `PACIENTE_REPOSITORY`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 303`** (1 nodes): `PacientesModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 304`** (1 nodes): `ConfigPsicologoRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 305`** (1 nodes): `DecisaoUsoIaRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 306`** (1 nodes): `ObservacaoPacienteRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 307`** (1 nodes): `RegistroUsoIaRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 308`** (1 nodes): `TestePsicologicoRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 310`** (1 nodes): `ProntuariosModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 311`** (1 nodes): `notificacaoQueueProvider`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 313`** (1 nodes): `redisProvider`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 315`** (1 nodes): `code`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 316`** (1 nodes): `SecurityModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 317`** (1 nodes): `AppModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 318`** (1 nodes): `SuperAdminModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 319`** (1 nodes): `TelemedicinaModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 320`** (1 nodes): `TestesPsicologicosModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 321`** (1 nodes): `TICKET_REPOSITORY`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 322`** (1 nodes): `TicketsModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 323`** (1 nodes): `apiProxy`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 333`** (1 nodes): `ThrottlerGuard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TelemedicinaService` connect `Community 18` to `Community 12`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `PacientesService` connect `Community 16` to `Community 46`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `DocumentosService` connect `Community 22` to `Community 12`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `AppModule`, `BootstrapAdminOptions`, `BootstrapAdminModule` to the rest of the system?**
  _675 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.02857142857142857 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.12653061224489795 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07358156028368794 - nodes in this community are weakly interconnected._
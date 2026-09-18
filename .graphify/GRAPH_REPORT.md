# Graph Report - .  (2026-09-18)

## Corpus Check
- 390 files · ~149.933 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1843 nodes · 3095 edges · 237 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: contains: 911 · imports: 741 · method: 540 · imports_from: 482 · calls: 380 · implements: 33 · inherits: 8


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 390 · Candidates: 434
- Excluded: 115 untracked · 58239 ignored · 14 sensitive · 0 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `b50e44c`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `PacienteMongoRepository` - 26 edges
2. `Button` - 25 edges
3. `TelemedicinaService` - 23 edges
4. `cn()` - 23 edges
5. `Toast` - 22 edges
6. `AgendamentosService` - 20 edges
7. `apiErrorMessage()` - 20 edges
8. `useAuth()` - 19 edges
9. `Label` - 18 edges
10. `ProntuariosService` - 17 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (90): api, AnalyticsPeriodParams, ClinicaAdmin, CobrancaResumo, CobrancasPsicologia, CobrarCicloPayload, CreateAdminUserPayload, CreateAgendamentoPayload (+82 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (45): agendaApi, analyticsApi, psicoFinanceiroApi, AgendaCalendario(), CORES_MODALIDADE, DnDCalendar, localizer, podeMover() (+37 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (38): clinicasApi, Logo(), LogoIcon(), LogoIconProps, LogoProps, ESTADO_CONEXAO_LABEL, EstadoConexao, Fase (+30 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (30): pacientesApi, prontuariosApi, DocumentoClinicoLayout(), DocumentoRodape(), DocumentoTimbre(), CAMPOS_LINHA_TODAS, EXAME_SEGMENTAR_CAMPOS, ProntuarioDetailDialog() (+22 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (12): RequestAuditContext, SalaAcessoView, CurrentClinicaId, CurrentUser, baseUser, CreateAdminUserDto, CreateClinicaUsuarioDto, ListUsersQueryDto (+4 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (14): CursorPaginationInput, CursorPaginationResult, COLLATION_PT, DecodedCursor, PacienteMongoRepository, PacienteRepository, CreatePacienteInput, CursorPaginationInput (+6 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (26): CreateSalaPayload, telemedicinaApi, CICLO_BADGE, FinanceiroPsicologiaPage(), duracaoAtendimento(), SalaCard(), salaVariant(), TelemedicinaPage() (+18 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (9): NotificacaoDispatcherService, NotificacaoSender, SendNotificacaoInput, EmailSender, NotificacaoSender, NotificacaoSender, SmsSender, NotificacaoSender (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (21): apiErrorMessage(), avisar403(), doRefresh(), getClinicaAtiva(), getToken(), setClinicaAtiva(), setToken(), authApi (+13 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (15): iaClinicaApi, CAMPOS_POR_LINHA, SUGESTOES_CUIDADOS_POR_LINHA, RegistroSessao(), STATUS_BADGE, ultimoValor(), CHECKLIST_FIXO, PrescricaoCuidadosPage() (+7 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (12): RequestAuditContext, DocumentoRequestContext, EXTENSAO_POR_MIME, RequestAuditContext, IaClinicaRequestContext, LINHA_LABEL, PromptIA, NotificacaoRequestContext (+4 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (20): documentosApi, observacoesPacienteApi, PacienteSort, TestePsicologico, testesPsicologicosApi, NovoDocumentoDialog(), EditPacienteForm, editPacienteSchema (+12 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (11): AuthResponse, AuthTokens, RequestContext, GateAvaliavel, gatePendente(), AuthenticatedUser, AuthGatesGuard, CanActivate (+3 more)

### Community 13 - "Community 13"
Cohesion: 0.12
Nodes (10): AppConfig, AppConfigService, ConfigSource, resolveAllowPublicRegistration(), resolveConfigSource(), PLACEHOLDERS, ResultadoValidacao, SEGREDOS_COM_TAMANHO_MINIMO (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.17
Nodes (1): TelemedicinaService

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (18): ProtectedRoute(), SalaVideo(), AppLayout(), AceitarTermosPage(), AgendaPage(), AtendimentoPsicologicoPage(), AtendimentoTelemedicinaPage(), DefinirSenhaObrigatoriaPage() (+10 more)

### Community 16 - "Community 16"
Cohesion: 0.24
Nodes (1): AgendamentosService

### Community 17 - "Community 17"
Cohesion: 0.10
Nodes (12): agendamentoCriado, ctx, dto, ctx, dto, salaCriada, Agendamento, BloqueioAgenda (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.25
Nodes (2): ProntuarioRequestContext, ProntuariosService

### Community 19 - "Community 19"
Cohesion: 0.11
Nodes (4): NotificacaoMongoRepository, NotificacaoPreferenciaMongoRepository, NotificacaoPreferenciaRepository, NotificacaoRepository

### Community 20 - "Community 20"
Cohesion: 0.15
Nodes (4): Cid10MongoRepository, Cid10Repository, ProntuarioMongoRepository, ProntuarioRepository

### Community 21 - "Community 21"
Cohesion: 0.13
Nodes (3): BootstrapAdminCommand, BootstrapAdminOptions, CommandRunner

### Community 22 - "Community 22"
Cohesion: 0.15
Nodes (3): gerarSenhaTemporaria(), CriarClinicaContext, SuperAdminService

### Community 23 - "Community 23"
Cohesion: 0.24
Nodes (1): AuthService

### Community 24 - "Community 24"
Cohesion: 0.27
Nodes (1): DocumentosService

### Community 25 - "Community 25"
Cohesion: 0.32
Nodes (1): PacientesService

### Community 26 - "Community 26"
Cohesion: 0.17
Nodes (2): AgendamentoMongoRepository, AgendamentoRepository

### Community 27 - "Community 27"
Cohesion: 0.22
Nodes (5): DocumentStorage, PresignedUploadInput, PresignedUploadOutput, DocumentStorage, S3DocumentStorageService

### Community 28 - "Community 28"
Cohesion: 0.14
Nodes (13): ArquivoProntuario, AssinaturaProntuario, Avaliacao, Cid10, ExameSegmentar, Objetivo, Plano, Prontuario (+5 more)

### Community 29 - "Community 29"
Cohesion: 0.15
Nodes (1): AnalyticsService

### Community 30 - "Community 30"
Cohesion: 0.15
Nodes (10): AssinaturaMongo, Cid10Document, Cid10Mongo, Cid10Schema, ProntuarioAddendumDocument, ProntuarioAddendumMongo, ProntuarioAddendumSchema, ProntuarioDocument (+2 more)

### Community 31 - "Community 31"
Cohesion: 0.24
Nodes (2): UserMongoRepository, UserRepository

### Community 32 - "Community 32"
Cohesion: 0.27
Nodes (4): ClinicAdminContext, ClinicasService, OnboardingContext, OnboardingOptions

### Community 33 - "Community 33"
Cohesion: 0.30
Nodes (1): IaClinicaService

### Community 34 - "Community 34"
Cohesion: 0.26
Nodes (1): PacienteCryptoService

### Community 35 - "Community 35"
Cohesion: 0.26
Nodes (2): ClinicaMongoRepository, ClinicaRepository

### Community 36 - "Community 36"
Cohesion: 0.30
Nodes (1): AgendamentosController

### Community 37 - "Community 37"
Cohesion: 0.23
Nodes (1): AnalyticsController

### Community 38 - "Community 38"
Cohesion: 0.17
Nodes (9): FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext, FormItemContextValue, FormLabel (+1 more)

### Community 39 - "Community 39"
Cohesion: 0.38
Nodes (1): PsicologiaFinanceiroService

### Community 40 - "Community 40"
Cohesion: 0.24
Nodes (2): DocumentoMongoRepository, DocumentoRepository

### Community 41 - "Community 41"
Cohesion: 0.27
Nodes (2): SalaTelemedicinaMongoRepository, SalaTelemedicinaRepository

### Community 42 - "Community 42"
Cohesion: 0.31
Nodes (1): PacientesController

### Community 43 - "Community 43"
Cohesion: 0.33
Nodes (1): ProntuariosController

### Community 44 - "Community 44"
Cohesion: 0.18
Nodes (8): { AppConfigService }, arquivo, distConfig, googleSecretsStub, { Logger }, raiz, require, { vars, linhasInvalidas }

### Community 45 - "Community 45"
Cohesion: 0.18
Nodes (1): SuperAdminController

### Community 46 - "Community 46"
Cohesion: 0.44
Nodes (1): FinanceiroService

### Community 47 - "Community 47"
Cohesion: 0.20
Nodes (9): ArquivoProntuarioDto, ArquivosProntuarioDto, AvaliacaoDto, ExameSegmentarDto, ObjetivoDto, PlanoDto, RegistroPsicologicoDto, SinaisVitaisDto (+1 more)

### Community 48 - "Community 48"
Cohesion: 0.27
Nodes (2): LancamentoMongoRepository, LancamentoRepository

### Community 49 - "Community 49"
Cohesion: 0.38
Nodes (1): AuthController

### Community 50 - "Community 50"
Cohesion: 0.36
Nodes (1): TelemedicinaController

### Community 51 - "Community 51"
Cohesion: 0.44
Nodes (1): NotificacoesService

### Community 52 - "Community 52"
Cohesion: 0.39
Nodes (1): FinanceiroController

### Community 53 - "Community 53"
Cohesion: 0.22
Nodes (4): NotificacaoWorker, OnModuleDestroy, OnModuleInit, SendJobData

### Community 54 - "Community 54"
Cohesion: 0.28
Nodes (8): bcrypt, EMAIL, fail(), hostDaUri(), main(), require, ROUNDS, speakeasy

### Community 55 - "Community 55"
Cohesion: 0.25
Nodes (7): CanalNotificacao, ConteudoNotificacao, ErroNotificacao, Notificacao, PreferenciaNotificacao, StatusNotificacao, TipoNotificacao

### Community 56 - "Community 56"
Cohesion: 0.25
Nodes (7): ConsentimentoLGPD, Convenio, Endereco, LinhaTerapeutica, Paciente, ProjetoPaciente, Sexo

### Community 57 - "Community 57"
Cohesion: 0.32
Nodes (4): EnqueueNotificacaoInput, NotificacaoQueue, BullMqNotificacaoQueueService, NotificacaoQueue

### Community 58 - "Community 58"
Cohesion: 0.43
Nodes (1): DocumentosController

### Community 59 - "Community 59"
Cohesion: 0.43
Nodes (1): PsicologiaFinanceiroController

### Community 60 - "Community 60"
Cohesion: 0.29
Nodes (4): Modulo, MODULO_LABEL, PERMISSOES_PADRAO_POR_PAPEL, TODOS_MODULOS

### Community 61 - "Community 61"
Cohesion: 0.29
Nodes (6): Clinica, ConfiguracoesClinica, EnderecoClinica, LIMITES_POR_PLANO, PlanoClinica, PlanoLimites

### Community 62 - "Community 62"
Cohesion: 0.29
Nodes (6): DashboardFinanceiro, FormaPagamento, Lancamento, OrigemLancamento, StatusLancamento, TipoLancamento

### Community 63 - "Community 63"
Cohesion: 0.29
Nodes (5): CobrancaCiclo, ConfigPsicologo, PacientePsicologia, PainelPsicologia, StatusCiclo

### Community 64 - "Community 64"
Cohesion: 0.33
Nodes (3): get(), RotasDeTeste, statusEmSequencia()

### Community 65 - "Community 65"
Cohesion: 0.29
Nodes (6): AgendamentoDocument, AgendamentoMongo, AgendamentoSchema, BloqueioAgendaDocument, BloqueioAgendaMongo, BloqueioAgendaSchema

### Community 66 - "Community 66"
Cohesion: 0.38
Nodes (2): ConfigPsicologoMongoRepository, ConfigPsicologoRepository

### Community 67 - "Community 67"
Cohesion: 0.33
Nodes (2): DecisaoUsoIaMongoRepository, DecisaoUsoIaRepository

### Community 68 - "Community 68"
Cohesion: 0.29
Nodes (6): NotificacaoDocument, NotificacaoMongo, NotificacaoPreferenciaDocument, NotificacaoPreferenciaMongo, NotificacaoPreferenciaSchema, NotificacaoSchema

### Community 69 - "Community 69"
Cohesion: 0.33
Nodes (2): ObservacaoPacienteMongoRepository, ObservacaoPacienteRepository

### Community 70 - "Community 70"
Cohesion: 0.38
Nodes (2): RegistroUsoIaMongoRepository, RegistroUsoIaRepository

### Community 71 - "Community 71"
Cohesion: 0.33
Nodes (2): SalaEventoMongoRepository, SalaEventoRepository

### Community 72 - "Community 72"
Cohesion: 0.33
Nodes (2): SinalSalaMongoRepository, SinalSalaRepository

### Community 73 - "Community 73"
Cohesion: 0.33
Nodes (2): TestePsicologicoMongoRepository, TestePsicologicoRepository

### Community 74 - "Community 74"
Cohesion: 0.29
Nodes (6): Cid10Repository, CreateProntuarioInput, ProntuarioRepository, ResumoSessoesPaciente, SignProntuarioInput, UpdateProntuarioInput

### Community 75 - "Community 75"
Cohesion: 0.29
Nodes (1): TelemedicinaAcessoController

### Community 76 - "Community 76"
Cohesion: 0.43
Nodes (1): LoginRateLimiterService

### Community 77 - "Community 77"
Cohesion: 0.29
Nodes (5): DEST, here, repoRoot, SHARED_TERMOS, SRC

### Community 78 - "Community 78"
Cohesion: 0.29
Nodes (1): TenantContextService

### Community 79 - "Community 79"
Cohesion: 0.38
Nodes (2): NestMiddleware, TenantMiddleware

### Community 80 - "Community 80"
Cohesion: 0.33
Nodes (4): AuthProvider(), queryClient, AppRoutes(), Toaster()

### Community 81 - "Community 81"
Cohesion: 0.33
Nodes (3): PAPEIS_COM_2FA_OBRIGATORIO, PAPEIS_PROFISSIONAIS, Papel

### Community 82 - "Community 82"
Cohesion: 0.40
Nodes (1): IaUsoCryptoService

### Community 83 - "Community 83"
Cohesion: 0.33
Nodes (5): ConsentimentoLGPDMongo, ConsentimentoLGPDSchema, PacienteDocument, PacienteMongo, PacienteSchema

### Community 84 - "Community 84"
Cohesion: 0.33
Nodes (5): TermosAceitosMongo, TermosAceitosSchema, UserDocument, UserMongo, UserSchema

### Community 85 - "Community 85"
Cohesion: 0.33
Nodes (5): AgendamentoRepository, CreateAgendamentoInput, CreateBloqueioInput, ListAgendamentosInput, UpdateAgendamentoInput

### Community 86 - "Community 86"
Cohesion: 0.33
Nodes (5): CreateNotificacaoInput, NotificacaoDashboardFilter, NotificacaoDashboardResult, NotificacaoPreferenciaRepository, NotificacaoRepository

### Community 87 - "Community 87"
Cohesion: 0.53
Nodes (1): IaClinicaController

### Community 88 - "Community 88"
Cohesion: 0.53
Nodes (1): NotificacoesController

### Community 89 - "Community 89"
Cohesion: 0.60
Nodes (5): gerarCpf(), iso(), main(), maisMin(), req()

### Community 90 - "Community 90"
Cohesion: 0.33
Nodes (2): CanActivate, TenantRequiredGuard

### Community 91 - "Community 91"
Cohesion: 0.40
Nodes (2): context, TERMOS

### Community 92 - "Community 92"
Cohesion: 0.40
Nodes (2): ctx, dto

### Community 93 - "Community 93"
Cohesion: 0.60
Nodes (1): NotificacaoWindowService

### Community 94 - "Community 94"
Cohesion: 0.40
Nodes (2): AuthModule, OnApplicationShutdown

### Community 95 - "Community 95"
Cohesion: 0.40
Nodes (3): CID10_DATA, CID10_SCHEMA, Cid10Model

### Community 96 - "Community 96"
Cohesion: 0.40
Nodes (4): ALLOWED_DOCUMENT_MIME_TYPES, AllowedDocumentMimeType, Documento, TipoDocumento

### Community 97 - "Community 97"
Cohesion: 0.40
Nodes (3): PublicUser, TermosAceitos, User

### Community 98 - "Community 98"
Cohesion: 0.40
Nodes (4): ConfiguracoesClinicaDto, CreateClinicaDto, EnderecoClinicaDto, PrimeiroAdminDto

### Community 99 - "Community 99"
Cohesion: 0.40
Nodes (2): CanActivate, RolesGuard

### Community 100 - "Community 100"
Cohesion: 0.40
Nodes (2): HealthIndicator, RedisHealthIndicator

### Community 101 - "Community 101"
Cohesion: 0.40
Nodes (2): AuditLogMongoRepository, AuditLogRepository

### Community 102 - "Community 102"
Cohesion: 0.40
Nodes (3): AuditLogDocument, AuditLogMongo, AuditLogSchema

### Community 103 - "Community 103"
Cohesion: 0.40
Nodes (3): DecisaoUsoIaDocument, DecisaoUsoIaMongo, DecisaoUsoIaSchema

### Community 104 - "Community 104"
Cohesion: 0.40
Nodes (3): ObservacaoPacienteDocument, ObservacaoPacienteMongo, ObservacaoPacienteSchema

### Community 105 - "Community 105"
Cohesion: 0.40
Nodes (3): RegistroUsoIaDocument, RegistroUsoIaMongo, RegistroUsoIaSchema

### Community 106 - "Community 106"
Cohesion: 0.40
Nodes (3): TestePsicologicoDocument, TestePsicologicoMongo, TestePsicologicoSchema

### Community 107 - "Community 107"
Cohesion: 0.40
Nodes (4): CreateLancamentoInput, DashboardInput, LancamentoRepository, ListLancamentosInput

### Community 108 - "Community 108"
Cohesion: 0.40
Nodes (4): CreateUserInput, UpdateUserInput, UserFilters, UserRepository

### Community 109 - "Community 109"
Cohesion: 0.40
Nodes (1): ObservacoesPacienteController

### Community 110 - "Community 110"
Cohesion: 0.40
Nodes (1): TestesPsicologicosController

### Community 111 - "Community 111"
Cohesion: 0.40
Nodes (2): ctx, dto

### Community 112 - "Community 112"
Cohesion: 0.50
Nodes (2): NotificacaoTemplateService, TEMPLATES

### Community 113 - "Community 113"
Cohesion: 0.50
Nodes (2): ctx, documentoExistente

### Community 114 - "Community 114"
Cohesion: 0.50
Nodes (2): basePaciente, context

### Community 115 - "Community 115"
Cohesion: 0.50
Nodes (3): ModalidadeAtendimento, MODALIDADES_ATENDIMENTO, ROTULO_MODALIDADE

### Community 116 - "Community 116"
Cohesion: 0.50
Nodes (3): AUDIT_LOG_REPOSITORY, REDIS_CLIENT, USER_REPOSITORY

### Community 117 - "Community 117"
Cohesion: 0.50
Nodes (3): PapelSala, SalaEvento, TipoEventoSala

### Community 118 - "Community 118"
Cohesion: 0.50
Nodes (3): AnalyticsQueryDto, HorariosVagosQueryDto, RelatorioPsicologiaQueryDto

### Community 119 - "Community 119"
Cohesion: 0.50
Nodes (3): ClinicaInputDto, CriarClinicaDto, PrimeiroAdminInputDto

### Community 120 - "Community 120"
Cohesion: 0.50
Nodes (2): CanActivate, SuperAdminGuard

### Community 121 - "Community 121"
Cohesion: 0.50
Nodes (1): HealthController

### Community 122 - "Community 122"
Cohesion: 0.50
Nodes (2): BaseExceptionFilter, InvalidObjectIdFilter

### Community 123 - "Community 123"
Cohesion: 0.50
Nodes (1): AnthropicClient

### Community 124 - "Community 124"
Cohesion: 0.50
Nodes (3): ClinicaDocument, ClinicaMongo, ClinicaSchema

### Community 125 - "Community 125"
Cohesion: 0.50
Nodes (3): ConfigPsicologoDocument, ConfigPsicologoMongo, ConfigPsicologoSchema

### Community 126 - "Community 126"
Cohesion: 0.50
Nodes (3): DocumentoDocument, DocumentoMongo, DocumentoSchema

### Community 127 - "Community 127"
Cohesion: 0.50
Nodes (3): LancamentoDocument, LancamentoMongo, LancamentoSchema

### Community 128 - "Community 128"
Cohesion: 0.50
Nodes (3): SalaEventoDocument, SalaEventoMongo, SalaEventoSchema

### Community 129 - "Community 129"
Cohesion: 0.50
Nodes (3): SalaTelemedicinaDocument, SalaTelemedicinaMongo, SalaTelemedicinaSchema

### Community 130 - "Community 130"
Cohesion: 0.50
Nodes (3): SinalSalaDocument, SinalSalaMongo, SinalSalaSchema

### Community 131 - "Community 131"
Cohesion: 0.50
Nodes (3): NOTIFICACAO_PREFERENCIA_REPOSITORY, NOTIFICACAO_QUEUE, NOTIFICACAO_REPOSITORY

### Community 132 - "Community 132"
Cohesion: 0.50
Nodes (3): ClinicaRepository, CreateClinicaInput, UpdateClinicaInput

### Community 133 - "Community 133"
Cohesion: 0.50
Nodes (3): CreateDocumentoInput, DocumentoRepository, ListDocumentoInput

### Community 134 - "Community 134"
Cohesion: 0.50
Nodes (3): CreateSalaInput, FindAllSalasFiltro, SalaTelemedicinaRepository

### Community 135 - "Community 135"
Cohesion: 0.67
Nodes (1): ClinicasController

### Community 136 - "Community 136"
Cohesion: 0.50
Nodes (2): bcrypt, require

### Community 137 - "Community 137"
Cohesion: 0.83
Nodes (3): main(), pickItems(), req()

### Community 138 - "Community 138"
Cohesion: 0.50
Nodes (3): SALA_EVENTO_REPOSITORY, SALA_TELEMEDICINA_REPOSITORY, SINAL_SALA_REPOSITORY

### Community 139 - "Community 139"
Cohesion: 0.50
Nodes (2): NestModule, TenancyModule

### Community 140 - "Community 140"
Cohesion: 0.67
Nodes (1): context

### Community 141 - "Community 141"
Cohesion: 0.67
Nodes (1): agendamentosServiceStub

### Community 142 - "Community 142"
Cohesion: 0.67
Nodes (1): BootstrapAdminModule

### Community 143 - "Community 143"
Cohesion: 0.67
Nodes (2): DecisaoUsoIA, TipoUsoIA

### Community 144 - "Community 144"
Cohesion: 0.67
Nodes (2): SinalSala, TipoSinal

### Community 145 - "Community 145"
Cohesion: 0.67
Nodes (1): CreateProntuarioDto

### Community 146 - "Community 146"
Cohesion: 0.67
Nodes (2): EVENTOS_REPORTAVEIS, RegistrarEventoDto

### Community 147 - "Community 147"
Cohesion: 0.67
Nodes (2): CONFIG_PSICOLOGO_REPOSITORY, LANCAMENTO_REPOSITORY

### Community 148 - "Community 148"
Cohesion: 0.67
Nodes (2): GlobalThrottlerGuard, ThrottlerGuard

### Community 149 - "Community 149"
Cohesion: 0.67
Nodes (2): versaoMatch, vigenciaMatch

### Community 150 - "Community 150"
Cohesion: 0.67
Nodes (2): CAMPOS_IMUTAVEIS, OPS_BLOQUEADAS

### Community 151 - "Community 151"
Cohesion: 0.67
Nodes (2): CAMPOS_IMUTAVEIS, OPS_BLOQUEADAS

### Community 152 - "Community 152"
Cohesion: 0.67
Nodes (2): CAMPOS_IMUTAVEIS, OPS_BLOQUEADAS

### Community 154 - "Community 154"
Cohesion: 0.67
Nodes (2): AuditLogRepository, CreateAuditLogInput

### Community 155 - "Community 155"
Cohesion: 0.67
Nodes (2): CreateSalaEventoInput, SalaEventoRepository

### Community 156 - "Community 156"
Cohesion: 0.67
Nodes (2): CreateSinalInput, SinalSalaRepository

### Community 157 - "Community 157"
Cohesion: 0.67
Nodes (1): base

### Community 158 - "Community 158"
Cohesion: 0.67
Nodes (2): CID10_REPOSITORY, PRONTUARIO_REPOSITORY

### Community 159 - "Community 159"
Cohesion: 0.67
Nodes (1): dryRun

### Community 160 - "Community 160"
Cohesion: 0.67
Nodes (1): totpCode

### Community 161 - "Community 161"
Cohesion: 1.00
Nodes (1): AGENDAMENTO_REPOSITORY

### Community 162 - "Community 162"
Cohesion: 1.00
Nodes (1): AgendamentosModule

### Community 163 - "Community 163"
Cohesion: 1.00
Nodes (1): AnalyticsModule

### Community 164 - "Community 164"
Cohesion: 1.00
Nodes (1): CLINICA_REPOSITORY

### Community 165 - "Community 165"
Cohesion: 1.00
Nodes (1): ClinicasModule

### Community 168 - "Community 168"
Cohesion: 1.00
Nodes (1): DOCUMENTO_REPOSITORY

### Community 169 - "Community 169"
Cohesion: 1.00
Nodes (1): DocumentosModule

### Community 171 - "Community 171"
Cohesion: 1.00
Nodes (1): AuditEvent

### Community 172 - "Community 172"
Cohesion: 1.00
Nodes (1): DecisaoUsoIa

### Community 173 - "Community 173"
Cohesion: 1.00
Nodes (1): ObservacaoPaciente

### Community 174 - "Community 174"
Cohesion: 1.00
Nodes (1): RegistroUsoIa

### Community 175 - "Community 175"
Cohesion: 1.00
Nodes (1): TestePsicologico

### Community 176 - "Community 176"
Cohesion: 1.00
Nodes (1): AceitarTermosDto

### Community 177 - "Community 177"
Cohesion: 1.00
Nodes (1): CancelAgendamentoDto

### Community 178 - "Community 178"
Cohesion: 1.00
Nodes (1): Cid10QueryDto

### Community 179 - "Community 179"
Cohesion: 1.00
Nodes (1): CobrarCicloDto

### Community 180 - "Community 180"
Cohesion: 1.00
Nodes (1): ConsentimentoLGpdDto

### Community 181 - "Community 181"
Cohesion: 1.00
Nodes (1): ConvenioDto

### Community 182 - "Community 182"
Cohesion: 1.00
Nodes (1): CreateAddendumDto

### Community 183 - "Community 183"
Cohesion: 1.00
Nodes (1): CreateAgendamentoDto

### Community 184 - "Community 184"
Cohesion: 1.00
Nodes (1): CreateBloqueioDto

### Community 185 - "Community 185"
Cohesion: 1.00
Nodes (1): CreateLancamentoDto

### Community 186 - "Community 186"
Cohesion: 1.00
Nodes (1): CreateNotificacaoDto

### Community 187 - "Community 187"
Cohesion: 1.00
Nodes (1): CreateObservacaoPacienteDto

### Community 188 - "Community 188"
Cohesion: 1.00
Nodes (1): CreatePacienteDto

### Community 189 - "Community 189"
Cohesion: 1.00
Nodes (1): CreateSalaDto

### Community 190 - "Community 190"
Cohesion: 1.00
Nodes (1): CreateTestePsicologicoDto

### Community 191 - "Community 191"
Cohesion: 1.00
Nodes (1): CreateUploadUrlDto

### Community 192 - "Community 192"
Cohesion: 1.00
Nodes (1): DashboardNotificacoesQueryDto

### Community 193 - "Community 193"
Cohesion: 1.00
Nodes (1): EnderecoDto

### Community 194 - "Community 194"
Cohesion: 1.00
Nodes (1): EnviarSinalDto

### Community 195 - "Community 195"
Cohesion: 1.00
Nodes (1): FinancialDashboardQueryDto

### Community 196 - "Community 196"
Cohesion: 1.00
Nodes (1): GerarPrescricaoDto

### Community 197 - "Community 197"
Cohesion: 1.00
Nodes (1): ListAgendamentosQueryDto

### Community 198 - "Community 198"
Cohesion: 1.00
Nodes (1): ListBloqueiosQueryDto

### Community 199 - "Community 199"
Cohesion: 1.00
Nodes (1): ListDocumentosQueryDto

### Community 200 - "Community 200"
Cohesion: 1.00
Nodes (1): ListLancamentosQueryDto

### Community 201 - "Community 201"
Cohesion: 1.00
Nodes (1): ListPacientesQueryDto

### Community 202 - "Community 202"
Cohesion: 1.00
Nodes (1): ListProntuariosQueryDto

### Community 203 - "Community 203"
Cohesion: 1.00
Nodes (1): ListSalasQueryDto

### Community 204 - "Community 204"
Cohesion: 1.00
Nodes (1): LoginDto

### Community 205 - "Community 205"
Cohesion: 1.00
Nodes (1): ReceiveLancamentoDto

### Community 206 - "Community 206"
Cohesion: 1.00
Nodes (1): RegisterUserDto

### Community 207 - "Community 207"
Cohesion: 1.00
Nodes (1): RegistrarDecisaoDto

### Community 208 - "Community 208"
Cohesion: 1.00
Nodes (1): SalvarConfigPsicologoDto

### Community 209 - "Community 209"
Cohesion: 1.00
Nodes (1): SugerirAbordagemDto

### Community 210 - "Community 210"
Cohesion: 1.00
Nodes (1): TrocarSenhaObrigatoriaDto

### Community 211 - "Community 211"
Cohesion: 1.00
Nodes (1): UpdateAgendamentoDto

### Community 212 - "Community 212"
Cohesion: 1.00
Nodes (1): UpdateClinicaDto

### Community 213 - "Community 213"
Cohesion: 1.00
Nodes (1): UpdateObservacoesPacienteDto

### Community 214 - "Community 214"
Cohesion: 1.00
Nodes (1): UpdateOptOutDto

### Community 215 - "Community 215"
Cohesion: 1.00
Nodes (1): UpdatePacienteDto

### Community 216 - "Community 216"
Cohesion: 1.00
Nodes (1): UpdateProntuarioDto

### Community 217 - "Community 217"
Cohesion: 1.00
Nodes (1): FinanceiroModule

### Community 218 - "Community 218"
Cohesion: 1.00
Nodes (1): JwtAuthGuard

### Community 219 - "Community 219"
Cohesion: 1.00
Nodes (1): HealthModule

### Community 221 - "Community 221"
Cohesion: 1.00
Nodes (1): IaClinicaModule

### Community 222 - "Community 222"
Cohesion: 1.00
Nodes (1): NotificacoesModule

### Community 223 - "Community 223"
Cohesion: 1.00
Nodes (1): ObservacoesPacienteModule

### Community 224 - "Community 224"
Cohesion: 1.00
Nodes (1): PACIENTE_REPOSITORY

### Community 225 - "Community 225"
Cohesion: 1.00
Nodes (1): PacientesModule

### Community 226 - "Community 226"
Cohesion: 1.00
Nodes (1): ConfigPsicologoRepository

### Community 227 - "Community 227"
Cohesion: 1.00
Nodes (1): DecisaoUsoIaRepository

### Community 228 - "Community 228"
Cohesion: 1.00
Nodes (1): ObservacaoPacienteRepository

### Community 229 - "Community 229"
Cohesion: 1.00
Nodes (1): RegistroUsoIaRepository

### Community 230 - "Community 230"
Cohesion: 1.00
Nodes (1): TestePsicologicoRepository

### Community 231 - "Community 231"
Cohesion: 1.00
Nodes (1): ProntuariosModule

### Community 232 - "Community 232"
Cohesion: 1.00
Nodes (1): notificacaoQueueProvider

### Community 233 - "Community 233"
Cohesion: 1.00
Nodes (1): redisProvider

### Community 235 - "Community 235"
Cohesion: 1.00
Nodes (1): code

### Community 236 - "Community 236"
Cohesion: 1.00
Nodes (1): SecurityModule

### Community 237 - "Community 237"
Cohesion: 1.00
Nodes (1): AppModule

### Community 238 - "Community 238"
Cohesion: 1.00
Nodes (1): SuperAdminModule

### Community 239 - "Community 239"
Cohesion: 1.00
Nodes (1): TelemedicinaModule

### Community 240 - "Community 240"
Cohesion: 1.00
Nodes (1): TestesPsicologicosModule

### Community 241 - "Community 241"
Cohesion: 1.00
Nodes (1): apiProxy

### Community 252 - "Community 252"
Cohesion: 1.00
Nodes (1): ThrottlerGuard

## Knowledge Gaps
- **509 isolated node(s):** `AppModule`, `BootstrapAdminOptions`, `BootstrapAdminModule`, `CID10_SCHEMA`, `Cid10Model` (+504 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 14`** (1 nodes): `TelemedicinaService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (1 nodes): `AgendamentosService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (2 nodes): `ProntuarioRequestContext`, `ProntuariosService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (1 nodes): `AuthService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (1 nodes): `DocumentosService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (1 nodes): `PacientesService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (2 nodes): `AgendamentoMongoRepository`, `AgendamentoRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `AnalyticsService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (2 nodes): `UserMongoRepository`, `UserRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `IaClinicaService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `PacienteCryptoService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (2 nodes): `ClinicaMongoRepository`, `ClinicaRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `AgendamentosController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `AnalyticsController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `PsicologiaFinanceiroService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (2 nodes): `DocumentoMongoRepository`, `DocumentoRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (2 nodes): `SalaTelemedicinaMongoRepository`, `SalaTelemedicinaRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `PacientesController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `ProntuariosController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `SuperAdminController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `FinanceiroService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (2 nodes): `LancamentoMongoRepository`, `LancamentoRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `AuthController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `TelemedicinaController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `NotificacoesService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `FinanceiroController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (1 nodes): `DocumentosController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (1 nodes): `PsicologiaFinanceiroController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (2 nodes): `ConfigPsicologoMongoRepository`, `ConfigPsicologoRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (2 nodes): `DecisaoUsoIaMongoRepository`, `DecisaoUsoIaRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (2 nodes): `ObservacaoPacienteMongoRepository`, `ObservacaoPacienteRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (2 nodes): `RegistroUsoIaMongoRepository`, `RegistroUsoIaRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (2 nodes): `SalaEventoMongoRepository`, `SalaEventoRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (2 nodes): `SinalSalaMongoRepository`, `SinalSalaRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (2 nodes): `TestePsicologicoMongoRepository`, `TestePsicologicoRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (1 nodes): `TelemedicinaAcessoController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (1 nodes): `LoginRateLimiterService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78`** (1 nodes): `TenantContextService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (2 nodes): `NestMiddleware`, `TenantMiddleware`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (1 nodes): `IaUsoCryptoService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 87`** (1 nodes): `IaClinicaController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 88`** (1 nodes): `NotificacoesController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (2 nodes): `CanActivate`, `TenantRequiredGuard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 91`** (2 nodes): `context`, `TERMOS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 92`** (2 nodes): `ctx`, `dto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 93`** (1 nodes): `NotificacaoWindowService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 94`** (2 nodes): `AuthModule`, `OnApplicationShutdown`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 99`** (2 nodes): `CanActivate`, `RolesGuard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 100`** (2 nodes): `HealthIndicator`, `RedisHealthIndicator`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 101`** (2 nodes): `AuditLogMongoRepository`, `AuditLogRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 109`** (1 nodes): `ObservacoesPacienteController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 110`** (1 nodes): `TestesPsicologicosController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 111`** (2 nodes): `ctx`, `dto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 112`** (2 nodes): `NotificacaoTemplateService`, `TEMPLATES`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 113`** (2 nodes): `ctx`, `documentoExistente`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 114`** (2 nodes): `basePaciente`, `context`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 120`** (2 nodes): `CanActivate`, `SuperAdminGuard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 121`** (1 nodes): `HealthController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 122`** (2 nodes): `BaseExceptionFilter`, `InvalidObjectIdFilter`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 123`** (1 nodes): `AnthropicClient`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 135`** (1 nodes): `ClinicasController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 136`** (2 nodes): `bcrypt`, `require`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 139`** (2 nodes): `NestModule`, `TenancyModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 140`** (1 nodes): `context`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 141`** (1 nodes): `agendamentosServiceStub`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 142`** (1 nodes): `BootstrapAdminModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 143`** (2 nodes): `DecisaoUsoIA`, `TipoUsoIA`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 144`** (2 nodes): `SinalSala`, `TipoSinal`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 145`** (1 nodes): `CreateProntuarioDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 146`** (2 nodes): `EVENTOS_REPORTAVEIS`, `RegistrarEventoDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 147`** (2 nodes): `CONFIG_PSICOLOGO_REPOSITORY`, `LANCAMENTO_REPOSITORY`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 148`** (2 nodes): `GlobalThrottlerGuard`, `ThrottlerGuard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 149`** (2 nodes): `versaoMatch`, `vigenciaMatch`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 150`** (2 nodes): `CAMPOS_IMUTAVEIS`, `OPS_BLOQUEADAS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 151`** (2 nodes): `CAMPOS_IMUTAVEIS`, `OPS_BLOQUEADAS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 152`** (2 nodes): `CAMPOS_IMUTAVEIS`, `OPS_BLOQUEADAS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 154`** (2 nodes): `AuditLogRepository`, `CreateAuditLogInput`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 155`** (2 nodes): `CreateSalaEventoInput`, `SalaEventoRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 156`** (2 nodes): `CreateSinalInput`, `SinalSalaRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 157`** (1 nodes): `base`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 158`** (2 nodes): `CID10_REPOSITORY`, `PRONTUARIO_REPOSITORY`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 159`** (1 nodes): `dryRun`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 160`** (1 nodes): `totpCode`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 161`** (1 nodes): `AGENDAMENTO_REPOSITORY`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 162`** (1 nodes): `AgendamentosModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 163`** (1 nodes): `AnalyticsModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 164`** (1 nodes): `CLINICA_REPOSITORY`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 165`** (1 nodes): `ClinicasModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 168`** (1 nodes): `DOCUMENTO_REPOSITORY`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 169`** (1 nodes): `DocumentosModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 171`** (1 nodes): `AuditEvent`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 172`** (1 nodes): `DecisaoUsoIa`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 173`** (1 nodes): `ObservacaoPaciente`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 174`** (1 nodes): `RegistroUsoIa`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 175`** (1 nodes): `TestePsicologico`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 176`** (1 nodes): `AceitarTermosDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 177`** (1 nodes): `CancelAgendamentoDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 178`** (1 nodes): `Cid10QueryDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 179`** (1 nodes): `CobrarCicloDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 180`** (1 nodes): `ConsentimentoLGpdDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 181`** (1 nodes): `ConvenioDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 182`** (1 nodes): `CreateAddendumDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 183`** (1 nodes): `CreateAgendamentoDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 184`** (1 nodes): `CreateBloqueioDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 185`** (1 nodes): `CreateLancamentoDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 186`** (1 nodes): `CreateNotificacaoDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 187`** (1 nodes): `CreateObservacaoPacienteDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 188`** (1 nodes): `CreatePacienteDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 189`** (1 nodes): `CreateSalaDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 190`** (1 nodes): `CreateTestePsicologicoDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 191`** (1 nodes): `CreateUploadUrlDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 192`** (1 nodes): `DashboardNotificacoesQueryDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 193`** (1 nodes): `EnderecoDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 194`** (1 nodes): `EnviarSinalDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 195`** (1 nodes): `FinancialDashboardQueryDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 196`** (1 nodes): `GerarPrescricaoDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 197`** (1 nodes): `ListAgendamentosQueryDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 198`** (1 nodes): `ListBloqueiosQueryDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 199`** (1 nodes): `ListDocumentosQueryDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 200`** (1 nodes): `ListLancamentosQueryDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 201`** (1 nodes): `ListPacientesQueryDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 202`** (1 nodes): `ListProntuariosQueryDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 203`** (1 nodes): `ListSalasQueryDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 204`** (1 nodes): `LoginDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 205`** (1 nodes): `ReceiveLancamentoDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 206`** (1 nodes): `RegisterUserDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 207`** (1 nodes): `RegistrarDecisaoDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 208`** (1 nodes): `SalvarConfigPsicologoDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 209`** (1 nodes): `SugerirAbordagemDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 210`** (1 nodes): `TrocarSenhaObrigatoriaDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 211`** (1 nodes): `UpdateAgendamentoDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 212`** (1 nodes): `UpdateClinicaDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 213`** (1 nodes): `UpdateObservacoesPacienteDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 214`** (1 nodes): `UpdateOptOutDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 215`** (1 nodes): `UpdatePacienteDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 216`** (1 nodes): `UpdateProntuarioDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 217`** (1 nodes): `FinanceiroModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 218`** (1 nodes): `JwtAuthGuard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 219`** (1 nodes): `HealthModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 221`** (1 nodes): `IaClinicaModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 222`** (1 nodes): `NotificacoesModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 223`** (1 nodes): `ObservacoesPacienteModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 224`** (1 nodes): `PACIENTE_REPOSITORY`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 225`** (1 nodes): `PacientesModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 226`** (1 nodes): `ConfigPsicologoRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 227`** (1 nodes): `DecisaoUsoIaRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 228`** (1 nodes): `ObservacaoPacienteRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 229`** (1 nodes): `RegistroUsoIaRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 230`** (1 nodes): `TestePsicologicoRepository`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 231`** (1 nodes): `ProntuariosModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 232`** (1 nodes): `notificacaoQueueProvider`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 233`** (1 nodes): `redisProvider`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 235`** (1 nodes): `code`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 236`** (1 nodes): `SecurityModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 237`** (1 nodes): `AppModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 238`** (1 nodes): `SuperAdminModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 239`** (1 nodes): `TelemedicinaModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 240`** (1 nodes): `TestesPsicologicosModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 241`** (1 nodes): `apiProxy`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 252`** (1 nodes): `ThrottlerGuard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TelemedicinaService` connect `Community 14` to `Community 4`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `AgendamentosService` connect `Community 16` to `Community 10`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `AppModule`, `BootstrapAdminOptions`, `BootstrapAdminModule` to the rest of the system?**
  _509 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.028070175438596492 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.0771478667445938 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06289308176100629 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.1091581868640148 - nodes in this community are weakly interconnected._
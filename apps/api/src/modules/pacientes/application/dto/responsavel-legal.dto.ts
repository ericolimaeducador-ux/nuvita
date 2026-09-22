import { IsBoolean, IsEmail, IsOptional, IsString, Matches } from 'class-validator';

/**
 * Todos os campos ficam opcionais aqui (o objeto inteiro `responsavelLegal`
 * também é opcional no DTO de paciente) — a obrigatoriedade de nome/cpf/
 * telefone quando o paciente é menor é regra de negócio condicional,
 * validada em PacientesService (não dá para expressar "obrigatório só se
 * outro campo tiver determinado valor" com class-validator sem um validador
 * customizado, e uma checagem explícita no serviço é mais fácil de ajustar
 * depois de revisão profissional do enquadramento legal).
 */
export class ResponsavelLegalDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @Matches(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/)
  cpf?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  vinculo?: string;
}

/**
 * O cliente só envia `confirmado` — `registradaPor`/`registradaEm` nunca vêm do
 * corpo da requisição (o serviço os preenche com o usuário autenticado e a data
 * atual); como não estão declarados aqui, `forbidNonWhitelisted` do ValidationPipe
 * rejeita qualquer tentativa de o cliente enviá-los.
 */
export class AutorizacaoResponsavelDto {
  @IsBoolean()
  confirmado!: boolean;
}

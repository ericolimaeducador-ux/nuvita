import { Transform } from 'class-transformer';
import { Equals, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export const MODOS_ATENDIMENTO = ['Online', 'Presencial', 'Online e presencial', 'Ainda não atendo'] as const;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/**
 * Inscrição pública no teste beta. Rota SEM autenticação: tudo que não está
 * aqui é rejeitado (forbidNonWhitelisted). Status, datas e IP são sempre do servidor.
 * NUNCA coletar dado de paciente neste formulário.
 */
export class CriarInscricaoTesteDto {
  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(120)
  nome!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(160)
  email!: string;

  @Transform(trim)
  @Matches(/^[\d\s()+-]{10,20}$/, { message: 'whatsapp inválido' })
  whatsapp!: string;

  @Transform(trim)
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  crpNumero!: string;

  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  cidadeEstado!: string;

  @IsIn(MODOS_ATENDIMENTO)
  modoAtendimento!: (typeof MODOS_ATENDIMENTO)[number];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  ferramentaAtual?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  maiorDor?: string;

  /** Versão do termo que a pessoa viu e aceitou. Conferida contra TERMO_TESTE_VERSAO_ATUAL. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  termoVersao!: string;

  @Equals(true, { message: 'É preciso aceitar o termo de teste' })
  aceiteTermo!: boolean;

  @Equals(true, { message: 'É preciso concordar com o uso dos dados de inscrição' })
  aceitePrivacidade!: boolean;

  /** Campo-armadilha (honeypot): humano nunca preenche. Preenchido → descarta em silêncio. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}

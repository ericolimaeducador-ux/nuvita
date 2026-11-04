import { IsNotEmpty, IsString } from 'class-validator';

export class AceitarTermosDto {
  /** Versão dos Termos de Uso que o usuário está aceitando; deve ser a vigente. */
  @IsString()
  @IsNotEmpty()
  versao!: string;
}

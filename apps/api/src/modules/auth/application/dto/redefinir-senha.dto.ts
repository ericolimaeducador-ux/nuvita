import { IsString, MaxLength, MinLength } from 'class-validator';

export class RedefinirSenhaDto {
  @IsString()
  @MaxLength(200)
  token!: string;

  /** Mesma política do resto do sistema: mín. 10. */
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  novaSenha!: string;
}

import { IsString, MinLength } from 'class-validator';

export class TrocarSenhaObrigatoriaDto {
  /** Nova senha definitiva do usuário. Mesma política do resto do sistema: mín. 10. */
  @IsString()
  @MinLength(10)
  novaSenha!: string;
}

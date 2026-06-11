import { IsBoolean, IsISO8601, IsString } from 'class-validator';

export class ConsentimentoLGpdDto {
  @IsBoolean()
  aceito!: boolean;

  @IsISO8601()
  dataAceite!: string;

  @IsString()
  versao!: string;
}

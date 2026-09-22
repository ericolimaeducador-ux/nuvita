import { IsString, Length } from 'class-validator';

export class VerifyForgotLoginDto {
  @IsString()
  telefone!: string;

  @IsString()
  @Length(6, 6)
  codigo!: string;
}

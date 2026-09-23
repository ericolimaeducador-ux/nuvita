import { IsString } from 'class-validator';

export class ForgotLoginDto {
  @IsString()
  telefone!: string;
}

import { IsOptional, IsString } from 'class-validator';

export class ConvenioDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  numeroCarteirinha?: string;

  @IsOptional()
  @IsString()
  validade?: string;
}

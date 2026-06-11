import { IsString, MinLength } from 'class-validator';

export class CreateAddendumDto {
  @IsString()
  @MinLength(3)
  texto!: string;
}

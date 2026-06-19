import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { OrigemEntrega } from '../../domain/entrega.entity';

export class ItemEntregaDto {
  @IsNumber() codigo!: number;
  @IsString() descricao!: string;
  @IsNumber() quantidade!: number;
  @IsNumber() valorUnitarioCentavos!: number;
  @IsNumber() valorTotalCentavos!: number;
}

export class CreateEntregaDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsString() pacienteId!: string;
  @IsOptional() @IsString() processoJuridicoId?: string;
  @IsOptional() @IsString() avaliacaoIuId?: string;
  @IsDateString() dataEntrega!: string;
  @IsEnum(OrigemEntrega) origem!: OrigemEntrega;
  @IsArray() itens!: ItemEntregaDto[];
  @IsNumber() valorTotalCentavos!: number;
  @IsOptional() @IsString() notaFiscal?: string;
  @IsOptional() @IsString() observacoes?: string;
}

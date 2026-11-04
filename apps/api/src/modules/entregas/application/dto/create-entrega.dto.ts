import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrigemEntrega } from '../../domain/entrega.entity';

export class ItemEntregaDto {
  @IsInt() @Min(1) codigo!: number;
  @IsString() descricao!: string;
  @IsInt() @Min(1) quantidade!: number;
  @IsInt() @Min(0) valorUnitarioCentavos!: number;
  @IsInt() @Min(0) valorTotalCentavos!: number;
}

export class CreateEntregaDto {
  @IsOptional() @IsMongoId() clinicaId?: string;
  @IsMongoId() pacienteId!: string;
  // Referência à avaliação de IU (módulo ainda não portado). Sem validação de existência por enquanto.
  @IsOptional() @IsString() avaliacaoIuId?: string;
  @IsDateString() dataEntrega!: string;
  @IsEnum(OrigemEntrega) origem!: OrigemEntrega;
  @IsArray()
  @ArrayNotEmpty({ message: 'Informe ao menos um item na entrega.' })
  @ValidateNested({ each: true })
  @Type(() => ItemEntregaDto)
  itens!: ItemEntregaDto[];
  @IsInt() @Min(0) valorTotalCentavos!: number;
  @IsOptional() @IsString() notaFiscal?: string;
  @IsOptional() @IsString() observacoes?: string;
}

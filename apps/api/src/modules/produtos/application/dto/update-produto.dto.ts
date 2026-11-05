import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateProdutoDto } from './create-produto.dto';

// O código identifica o produto e não muda; para "trocar" o código, cadastre outro e desative este.
export class UpdateProdutoDto extends PartialType(OmitType(CreateProdutoDto, ['codigo'] as const)) {}

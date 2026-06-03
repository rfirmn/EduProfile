import { IsEnum } from 'class-validator';
import { VakDimension } from '@prisma/client';

export class StartPerformanceDto {
  @IsEnum(VakDimension, { message: 'vak_dimension harus V, A, atau K.' })
  vak_dimension: VakDimension;
}

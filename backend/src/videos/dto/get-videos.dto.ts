import { IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetVideosDto {
  @ApiPropertyOptional({
    description: 'Sort results by hype score or publication date',
    enum: ['hype', 'date'],
    default: 'hype',
  })
  @IsOptional()
  @IsIn(['hype', 'date'])
  sort?: 'hype' | 'date' = 'hype';

  @ApiPropertyOptional({
    description: 'Maximum number of videos to return (1-50)',
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Language for relative dates and messages',
    enum: ['es', 'en'],
    default: 'es',
  })
  @IsOptional()
  @IsIn(['es', 'en'])
  lang?: 'es' | 'en' = 'es';
}

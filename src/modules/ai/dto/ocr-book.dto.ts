import { IsOptional, IsString } from 'class-validator';

export class OcrBookDto {
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  rawText?: string;
}


import { IsString, IsOptional, IsEnum, MaxLength, IsDateString, IsUrl } from 'class-validator';
import { OccupationType, GenderType } from '@prisma/client';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  full_name?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Format tanggal lahir tidak valid (YYYY-MM-DD).' })
  date_of_birth?: string;

  @IsOptional()
  @IsEnum(GenderType, { message: 'Gender tidak valid.' })
  gender?: GenderType;

  @IsOptional()
  @IsEnum(OccupationType, {
    message: 'Pekerjaan harus salah satu dari: pelajar, mahasiswa, guru, non_akademisi, lainnya.',
  })
  occupation?: OccupationType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  education_level?: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;
}

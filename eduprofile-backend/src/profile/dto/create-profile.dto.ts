import { IsString, IsOptional, IsEnum, MaxLength, IsDateString } from 'class-validator';
import { OccupationType, GenderType } from '@prisma/client';

export class CreateProfileDto {
  @IsString({ message: 'Nama lengkap wajib diisi.' })
  @MaxLength(255)
  full_name: string;

  @IsOptional()
  @IsDateString({}, { message: 'Format tanggal lahir tidak valid (YYYY-MM-DD).' })
  date_of_birth?: string;

  @IsOptional()
  @IsEnum(GenderType, { message: 'Gender tidak valid.' })
  gender?: GenderType;

  @IsEnum(OccupationType, {
    message: 'Pekerjaan harus salah satu dari: pelajar, mahasiswa, guru, non_akademisi, lainnya.',
  })
  occupation: OccupationType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  education_level?: string;
}

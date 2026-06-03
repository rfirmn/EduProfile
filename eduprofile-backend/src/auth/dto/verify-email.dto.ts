import { IsString } from 'class-validator';

export class VerifyEmailDto {
  @IsString({ message: 'Token verifikasi wajib diisi.' })
  token: string;
}

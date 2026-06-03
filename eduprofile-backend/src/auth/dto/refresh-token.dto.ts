import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString({ message: 'Refresh token wajib diisi.' })
  refresh_token: string;
}

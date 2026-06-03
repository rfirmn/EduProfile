import { IsString } from 'class-validator';

export class ConvertGuestDto {
  @IsString({ message: 'Guest token wajib diisi.' })
  guest_token: string;
}

import { SetMetadata } from '@nestjs/common';

export const IS_GUEST_OR_AUTH_KEY = 'isGuestOrAuth';
export const GuestOrAuth = () => SetMetadata(IS_GUEST_OR_AUTH_KEY, true);

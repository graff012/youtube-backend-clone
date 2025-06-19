import { SetMetadata } from '@nestjs/common';

export const FreeResponse = () => SetMetadata('isFreeResponse', true);

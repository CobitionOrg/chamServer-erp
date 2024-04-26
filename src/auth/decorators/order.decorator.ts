import { SetMetadata } from '@nestjs/common';

export const IS_ORDERUPD_KEY = 'isOrderUpd';
export const OrderUpd = () => SetMetadata(IS_ORDERUPD_KEY, true);
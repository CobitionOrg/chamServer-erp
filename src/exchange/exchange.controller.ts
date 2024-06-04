import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@Controller('exchange')
@ApiTags('About exchange, refund, omission')
export class ExchangeController {}

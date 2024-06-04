import { Injectable, Logger } from '@nestjs/common';
import { ExchangeRepository } from './exchange.repository';

@Injectable()
export class ExchangeService {
    constructor(
        private readonly exchangeRepository : ExchangeRepository
    ){}

    private readonly logger = new Logger(ExchangeService.name);
}

import { HttpException, HttpStatus, Injectable, Logger, UseFilters } from '@nestjs/common';
import { ExchangeRepository } from './exchange.repository';
import { CreateExchangeDto } from './Dto/createExchange';
import { HttpExceptionFilter } from 'src/filter/httpExceptionFilter';

@Injectable()
export class ExchangeService {
    constructor(
        private readonly exchangeRepository : ExchangeRepository
    ){}

    private readonly logger = new Logger(ExchangeService.name);

    async createExchange(createExchangeDto : CreateExchangeDto){
        const check = await this.exchangeRepository.checkExOrder(createExchangeDto.id);

        if(!check){
            return {success:false,status:HttpStatus.NO_CONTENT,msg:'해당 데이터가 존재하지 않습니다'};
        }

        const res = await this.exchangeRepository.createExchange(createExchangeDto.id);
    }
}
 
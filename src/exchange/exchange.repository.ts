import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";

@Injectable()
export class ExchangeRepository{
    constructor(
        private prisma: PrismaService
    ){}

    private readonly logger = new Logger(ExchangeRepository.name);
}
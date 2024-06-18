import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";

@Injectable()
export class TalkRepositoy{
    constructor(
        private prisma: PrismaService
    ){}

    private readonly logger = new Logger(TalkRepositoy.name);
}
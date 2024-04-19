import { Injectable, Logger } from '@nestjs/common';
import {  JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class ErpService {
    constructor(
        private prisma : PrismaService,
        private jwtService : JwtService,
    ){}

    private readonly logger = new Logger(ErpService.name);
}

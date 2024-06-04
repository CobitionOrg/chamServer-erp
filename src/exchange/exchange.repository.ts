import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";

@Injectable()
export class ExchangeRepository {
    constructor(
        private prisma: PrismaService
    ) { }

    private readonly logger = new Logger(ExchangeRepository.name);

    async checkExOrder(id: number) {
        try {
            const res = await this.prisma.order.findUnique({
                where: { id: id }
            });

            if (res) return true;
            else return false;
        } catch (err) {
            this.logger.error(err);
            throw new HttpException({
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    async createExchange(id: number) {
        try {
            await this.prisma.$transaction(async (tx) => {
                const exOrder = await tx.order.findUnique({
                    where: { id: id },
                    select: {
                        route: true,
                        message: true,
                        cachReceipt: true,
                        typeCheck: true,
                        consultingTime: true,
                        payType: true,
                        essentialCheck: true,
                        outage: true,
                        consultingType: true,
                        phoneConsulting: true,
                        isComplete: true,
                        patientId: true,
                        price: true,
                        cash: true,
                        card: true,
                        remark: true,
                        isPickup: true,
                        orderItems: true,
                        orderBodyType: true,
                    }
                });

                console.log(exOrder);
            });

        } catch (err) {
            this.logger.error(err);
            return {
                success: false,
                status: HttpStatus.INTERNAL_SERVER_ERROR
            };
        }
    }
}
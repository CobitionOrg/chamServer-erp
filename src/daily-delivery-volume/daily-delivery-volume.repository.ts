import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class DailyDeliveryVolumeRepository {
  constructor(private prisma: PrismaService) {}

  private readonly logger = new Logger(DailyDeliveryVolumeRepository.name);

  async getAllDeliveryVolume() {
    try {
      const res = await this.prisma.dailyDeliveryVolume.findMany({
        where: {
          is_del: false,
        },
        orderBy: { id: 'asc' },
      });

      return { success: true, status: HttpStatus.OK, data: res };
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          success: false,
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async patchChangedDeliveryVolume(updatedData) {
    try {
      await this.prisma.$transaction(async (tx) => {
        for (let i = 0; i < updatedData.length; i++) {
          await tx.dailyDeliveryVolume.update({
            where: { id: updatedData[i].id },
            data: {
              volume: updatedData[i].volume,
              updated_at: updatedData[i].updated_at,
            },
          });
        }
      });

      const res = await this.getAllDeliveryVolume();

      return { success: true, status: HttpStatus.OK, data: res };
    } catch (err) {
      this.logger.error(err);
      throw new HttpException(
        {
          success: false,
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

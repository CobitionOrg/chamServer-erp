import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { DailyDeliveryVolumeRepository } from './daily-delivery-volume.repository';
import { PatchDeliveryVolumeDto } from './Dto/patchDeliveryVolume.dto';
import { getCurrentDateAndTime } from 'src/util/kstDate.util';

@Injectable()
export class DailyDeliveryVolumeService {
  constructor(
    private prisma: PrismaService,
    private readonly dailyDeliveryVolumeRepository: DailyDeliveryVolumeRepository,
  ) {}

  private readonly logger = new Logger(DailyDeliveryVolumeService.name);

  /**
   * 요일별 발송량 전체 조회
   */
  async getAllDeliveryVolume() {
    return await this.dailyDeliveryVolumeRepository.getAllDeliveryVolume();
  }

  /**
   * 요일별 발송량 전체 수정
   */
  async patchChangedDeliveryVolume(
    patchDeliveryVolumeDto: PatchDeliveryVolumeDto,
  ) {
    const res = await this.dailyDeliveryVolumeRepository.getAllDeliveryVolume();

    if (res.success) {
      const existingData = res.data;

      const volumeArray = [
        patchDeliveryVolumeDto.monday,
        patchDeliveryVolumeDto.tuesday,
        patchDeliveryVolumeDto.wednesday,
        patchDeliveryVolumeDto.thursday,
        patchDeliveryVolumeDto.friday,
        patchDeliveryVolumeDto.saturday,
        patchDeliveryVolumeDto.sunday,
      ];

      const updatedDate = getCurrentDateAndTime();

      const updatedData = existingData
        .map((data, i) => {
          if (data.volume !== volumeArray[i]) {
            return { ...data, updated_at: updatedDate, volume: volumeArray[i] };
          }
          return null;
        })
        .filter((data) => data !== null);

      return await this.dailyDeliveryVolumeRepository.patchChangedDeliveryVolume(
        updatedData,
      );
    }
  }
}

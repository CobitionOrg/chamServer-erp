import { Test, TestingModule } from '@nestjs/testing';
import { DailyDeliveryVolumeController } from './daily-delivery-volume.controller';
import { DailyDeliveryVolumeService } from './daily-delivery-volume.service';

describe('DailyDeliveryVolumeController', () => {
  let controller: DailyDeliveryVolumeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DailyDeliveryVolumeController],
      providers: [DailyDeliveryVolumeService],
    }).compile();

    controller = module.get<DailyDeliveryVolumeController>(DailyDeliveryVolumeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

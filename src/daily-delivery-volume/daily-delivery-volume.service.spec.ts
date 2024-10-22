import { Test, TestingModule } from '@nestjs/testing';
import { DailyDeliveryVolumeService } from './daily-delivery-volume.service';

describe('DailyDeliveryVolumeService', () => {
  let service: DailyDeliveryVolumeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DailyDeliveryVolumeService],
    }).compile();

    service = module.get<DailyDeliveryVolumeService>(DailyDeliveryVolumeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

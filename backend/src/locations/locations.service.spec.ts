import { BadRequestException } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { Location, LocationType } from './entities/location.entity';

describe('LocationsService', () => {
  it('requires a complete physical address', async () => {
    const repository = { create: jest.fn(), save: jest.fn() };
    const service = new LocationsService(repository as never);

    await expect(
      service.create({ name: 'Studio', type: LocationType.PHYSICAL }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('archives a location without deleting its record', async () => {
    const location = {
      id: 'location-id',
      name: 'Studio',
      type: LocationType.PHYSICAL,
      active: true,
    } as Location;
    const repository = {
      findOne: jest.fn(() => location),
      save: jest.fn((value: Location) => value),
    };
    const service = new LocationsService(repository as never);

    const result = await service.archive(location.id);

    expect(result.active).toBe(false);
    expect(repository.save).toHaveBeenCalledWith(location);
  });
});

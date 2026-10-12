import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateLocationDto } from './create-location.dto';
import { LocationType } from '../entities/location.entity';

describe('CreateLocationDto coordinates', () => {
  const baseLocation = {
    name: 'Studio',
    type: LocationType.PHYSICAL,
    city: 'Tunis',
    country: 'Tunisie',
    address: 'Rue de Test',
  };

  it('accepts numeric coordinate strings with full GPS precision', async () => {
    const dto = plainToInstance(CreateLocationDto, {
      ...baseLocation,
      latitude: '36.88181755885214',
      longitude: '10.1815',
    });

    expect(dto.latitude).toBe(36.88181755885214);
    expect(dto.longitude).toBe(10.1815);
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects coordinates outside the valid latitude and longitude ranges', async () => {
    const dto = plainToInstance(CreateLocationDto, {
      ...baseLocation,
      latitude: '91',
      longitude: '181',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['latitude', 'longitude']),
    );
  });

  it('normalizes blank coordinates to null', async () => {
    const dto = plainToInstance(CreateLocationDto, {
      ...baseLocation,
      latitude: '',
      longitude: '',
    });

    expect(dto.latitude).toBeNull();
    expect(dto.longitude).toBeNull();
    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});

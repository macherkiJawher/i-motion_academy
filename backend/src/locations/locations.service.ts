import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Location, LocationType } from './entities/location.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locations: Repository<Location>,
  ) {}

  findAll(): Promise<Location[]> {
    return this.locations.find({
      where: { active: true },
      order: { city: 'ASC', name: 'ASC' },
    });
  }

  findAllForAdmin(): Promise<Location[]> {
    return this.locations.find({ order: { city: 'ASC', name: 'ASC' } });
  }

  async findOne(id: string): Promise<Location> {
    const location = await this.locations.findOne({ where: { id } });
    if (!location) throw new NotFoundException('Location not found');
    return location;
  }

  async findPublicOne(id: string): Promise<Location> {
    const location = await this.locations.findOne({
      where: { id, active: true },
    });
    if (!location) throw new NotFoundException('Location not found');
    return location;
  }

  async create(dto: CreateLocationDto): Promise<Location> {
    this.validateLocation(dto);
    return this.locations.save(
      this.locations.create({
        ...dto,
        city: dto.city ?? '',
        country: dto.country ?? '',
        address: dto.address ?? '',
        contactName: dto.contactName ?? null,
        contactPhone: dto.contactPhone ?? null,
        contactEmail: dto.contactEmail?.toLowerCase() ?? null,
        instructions: dto.instructions ?? '',
        active: dto.active ?? true,
      }),
    );
  }

  async update(id: string, dto: UpdateLocationDto): Promise<Location> {
    const location = await this.findOne(id);
    const next = { ...location, ...dto };
    this.validateLocation(next);
    Object.assign(location, dto, {
      contactEmail:
        dto.contactEmail === undefined
          ? location.contactEmail
          : (dto.contactEmail?.toLowerCase() ?? null),
    });
    return this.locations.save(location);
  }

  async archive(id: string): Promise<Location> {
    const location = await this.findOne(id);
    location.active = false;
    return this.locations.save(location);
  }

  async restore(id: string): Promise<Location> {
    const location = await this.findOne(id);
    location.active = true;
    return this.locations.save(location);
  }

  private validateLocation(location: Partial<Location>): void {
    const hasLatitude =
      location.latitude !== undefined && location.latitude !== null;
    const hasLongitude =
      location.longitude !== undefined && location.longitude !== null;
    if (hasLatitude !== hasLongitude) {
      throw new BadRequestException(
        'Latitude and longitude must be provided together',
      );
    }
    if (
      location.type === LocationType.PHYSICAL &&
      (!location.city?.trim() ||
        !location.country?.trim() ||
        !location.address?.trim())
    ) {
      throw new BadRequestException(
        'Physical locations require a city, country and address',
      );
    }
  }
}

import { ConflictException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Repository } from 'typeorm';
import { CreateTrainingDto } from './dto/create-training.dto';
import {
  ApprovalStatus,
  AxisCode,
  RecognitionType,
  Training,
  TrainingDurationUnit,
  TrainingLifecycleStatus,
  TrainingLevel,
} from './entities/training.entity';
import { TrainingsService } from './trainings.service';

describe('TrainingsService description validation', () => {
  const repository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((value: Partial<Training>) => value),
    save: jest.fn((value) => Promise.resolve(value)),
  };
  const service = new TrainingsService(
    repository as unknown as Repository<Training>,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findOne.mockResolvedValue(null);
  });

  const createInput = (description?: string): CreateTrainingDto => ({
    title: 'Introductory AI course',
    axisCode: AxisCode.AI,
    recognitionType: RecognitionType.NONE,
    approvalStatus: ApprovalStatus.NOT_APPLICABLE,
    lifecycleStatus: TrainingLifecycleStatus.DRAFT,
    level: TrainingLevel.FOUNDATION,
    durationHours: 16,
    price: 400,
    ...(description === undefined ? {} : { description }),
  });

  it('rejects a non-empty description shorter than 100 characters', async () => {
    await expect(
      service.create(createInput('Short description.')),
    ).rejects.toThrow(
      new ConflictException('Description must contain at least 100 characters'),
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('accepts a description of at least 100 characters', async () => {
    const description = 'A'.repeat(100);
    await expect(
      service.create(createInput(description)),
    ).resolves.toMatchObject({ description });
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('allows a draft without a description but not a published record', async () => {
    await expect(service.create(createInput())).resolves.toMatchObject({
      description: '',
    });
    await expect(
      service.create({
        ...createInput(),
        lifecycleStatus: TrainingLifecycleStatus.PUBLISHED,
      }),
    ).rejects.toThrow(/at least 100 characters/);
  });

  it('rejects short descriptions at the DTO boundary after trimming', async () => {
    const dto = plainToInstance(CreateTrainingDto, {
      description: '  A short description.  ',
    });
    const errors = await validate(dto);

    expect(
      errors.find((error) => error.property === 'description')?.constraints
        ?.isLength,
    ).toBeDefined();
  });

  it('accepts exactly 100 description characters at the DTO boundary', async () => {
    const dto = plainToInstance(CreateTrainingDto, {
      description: 'A'.repeat(100),
    });
    const errors = await validate(dto);

    expect(
      errors.find((error) => error.property === 'description'),
    ).toBeUndefined();
  });

  it('accepts a draft when teaching hours are not yet defined', async () => {
    await expect(
      service.create({
        ...createInput(),
        durationHours: undefined,
        durationValue: 16,
      }),
    ).resolves.toMatchObject({ durationHours: null });
  });

  it('accepts modules without hours when creating a draft', async () => {
    await expect(
      service.create({
        ...createInput(),
        durationHours: undefined,
        durationValue: 2,
        durationUnit: TrainingDurationUnit.YEARS,
        program: [
          {
            title: 'Introduction',
            detail: 'Découverte du secteur commercial.',
          },
        ],
      }),
    ).resolves.toMatchObject({
      durationHours: null,
      program: [
        { title: 'Introduction', detail: 'Découverte du secteur commercial.' },
      ],
    });
  });

  it('allows publishing when the teaching-hour total is unknown', async () => {
    await expect(
      service.create({
        ...createInput('A'.repeat(100)),
        durationHours: undefined,
        durationValue: 2,
        durationUnit: TrainingDurationUnit.YEARS,
        lifecycleStatus: TrainingLifecycleStatus.PUBLISHED,
      }),
    ).resolves.toMatchObject({
      durationHours: null,
      lifecycleStatus: TrainingLifecycleStatus.PUBLISHED,
      active: true,
    });
  });

  it('converts an empty hours field to null at the DTO boundary', async () => {
    const dto = plainToInstance(CreateTrainingDto, { durationHours: '' });
    const errors = await validate(dto);

    expect(dto.durationHours).toBeNull();
    expect(
      errors.find((error) => error.property === 'durationHours'),
    ).toBeUndefined();
  });

  it('includes pending BTP diplomas in the public catalogue as non-enrollable listings', async () => {
    repository.find.mockResolvedValue([
      {
        ...createInput(),
        id: 'btp-pending',
        slug: 'btp-pending',
        title: 'BTP Commerce',
        axisCode: AxisCode.BTP,
        recognitionType: RecognitionType.BTP_DIPLOMA,
        approvalStatus: ApprovalStatus.PENDING,
        lifecycleStatus: TrainingLifecycleStatus.IN_REVIEW,
        active: false,
        durationValue: 2,
      },
    ]);

    await expect(service.findAll()).resolves.toMatchObject([
      { id: 'btp-pending', lifecycleStatus: TrainingLifecycleStatus.IN_REVIEW },
    ]);
  });
});

import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { ContactRequestsService } from './contact-requests.service';
import { ContactRequestStatus } from './entities/contact-request.entity';
import type { ContactRequest } from './entities/contact-request.entity';

describe('ContactRequestsService', () => {
  const repository = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };
  let service: ContactRequestsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ContactRequestsService(
      repository as unknown as Repository<ContactRequest>,
    );
  });

  it('returns contact requests from newest to oldest', async () => {
    repository.find.mockResolvedValue([]);

    await service.findAll();

    expect(repository.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
    });
  });

  it('creates a new request with normalized email and initial status', async () => {
    const input = {
      firstName: 'Amira',
      lastName: 'Ben Salem',
      email: 'AMIRA@example.com',
      phone: '  ',
      subject: 'Question',
      message: 'Bonjour',
    };
    const created = {
      ...input,
      email: 'amira@example.com',
      phone: null,
      status: ContactRequestStatus.NEW,
    };
    repository.create.mockReturnValue(created);
    repository.save.mockResolvedValue(created);

    await expect(service.create(input)).resolves.toBe(created);
    expect(repository.create).toHaveBeenCalledWith(created);
    expect(repository.save).toHaveBeenCalledWith(created);
  });

  it('updates a request status and reports missing requests', async () => {
    const request = {
      id: 'request-1',
      status: ContactRequestStatus.NEW,
    };
    repository.findOne.mockResolvedValue(request);
    repository.save.mockResolvedValue({
      ...request,
      status: ContactRequestStatus.IN_PROGRESS,
    });

    await expect(
      service.updateStatus('request-1', {
        status: ContactRequestStatus.IN_PROGRESS,
      }),
    ).resolves.toMatchObject({ status: ContactRequestStatus.IN_PROGRESS });
    expect(repository.save).toHaveBeenCalledWith({
      ...request,
      status: ContactRequestStatus.IN_PROGRESS,
    });

    repository.findOne.mockResolvedValue(null);
    await expect(
      service.updateStatus('missing', {
        status: ContactRequestStatus.RESOLVED,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});

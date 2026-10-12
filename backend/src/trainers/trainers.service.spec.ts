import { TrainersService } from './trainers.service';

describe('TrainersService', () => {
  it('archives a trainer without deleting linked history', async () => {
    const trainer = {
      id: 'trainer-id',
      slug: 'trainer',
      active: true,
      trainings: [],
    };
    const repository = {
      findOne: jest.fn(() => trainer),
      save: jest.fn((value: typeof trainer) => value),
    };
    const service = new TrainersService(
      repository as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const result = await service.archive(trainer.id);

    expect(result.active).toBe(false);
    expect(repository.save).toHaveBeenCalledWith(trainer);
  });

  it('does not expose online meeting links through the public trainer sessions route', async () => {
    const trainer = { id: 'trainer-id', slug: 'trainer', trainings: [] };
    const session = {
      id: 'session-id',
      meetingUrl: 'https://meet.example.test',
    };
    const service = new TrainersService(
      { findOne: jest.fn(() => trainer) } as never,
      {} as never,
      {} as never,
      { find: jest.fn(() => [session]) } as never,
    );

    const sessions = await service.findSessions(trainer.id);

    expect(sessions[0].meetingUrl).toBeNull();
  });
});

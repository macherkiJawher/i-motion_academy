import { BadRequestException } from '@nestjs/common';
import { AdminAssistantService } from './admin-assistant.service';

describe('AdminAssistantService', () => {
  const generatedResponse = {
    answer: 'La plateforme compte 2 formations.',
    language: 'fr',
    dataSources: ['admin_snapshot'],
    period: {
      type: 'current_snapshot',
      startDate: null,
      endDate: null,
    },
    missingData: ['Les remboursements ne sont pas disponibles.'],
    recommendations: [],
  };

  it('passes validated language and bounded sanitized follow-up context', async () => {
    const adapter = { generate: jest.fn().mockResolvedValue(generatedResponse) };
    const service = new AdminAssistantService(adapter as any);

    const response = await service.chat({
      message: 'Résumé pour admin@example.com',
      language: 'ar-TN',
      history: [
        { role: 'user', content: 'Combien de formations ?' },
        { role: 'assistant', content: 'Les données sont disponibles.' },
      ],
    });

    expect(adapter.generate).toHaveBeenCalledWith({
      message: 'Résumé pour [redacted]',
      language: 'ar-TN',
      history: [
        { role: 'user', content: 'Combien de formations ?' },
        { role: 'assistant', content: 'Les données sont disponibles.' },
      ],
    });
    expect(response).toEqual(generatedResponse);
  });

  it('redacts phone, IP and UUID values from current messages and history', async () => {
    const adapter = { generate: jest.fn().mockResolvedValue(generatedResponse) };
    const service = new AdminAssistantService(adapter as any);

    await service.chat({
      message: 'Client 12345678 depuis 192.168.1.2',
      history: [
        { role: 'user', content: 'UUID 550e8400-e29b-41d4-a716-446655440000' },
        { role: 'assistant', content: 'Bien reçu.' },
      ],
    });

    expect(adapter.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Client [redacted] depuis [redacted]',
        history: [
          { role: 'user', content: 'UUID [redacted]' },
          { role: 'assistant', content: 'Bien reçu.' },
        ],
      }),
    );
  });

  it('rejects oversized, incomplete or malformed follow-up history', async () => {
    const adapter = { generate: jest.fn().mockResolvedValue(generatedResponse) };
    const service = new AdminAssistantService(adapter as any);

    await expect(
      service.chat({
        message: 'Question',
        history: [
          { role: 'user', content: 'Question précédente' },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.chat({
        message: 'Question',
        history: Array.from({ length: 10 }, (_, index) => ({
          role: index % 2 === 0 ? 'user' : 'assistant',
          content: 'Contexte',
        })) as any,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(adapter.generate).not.toHaveBeenCalled();
  });
});

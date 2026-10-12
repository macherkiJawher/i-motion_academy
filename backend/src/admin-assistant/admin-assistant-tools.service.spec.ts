import { AdminAssistantToolsService } from './admin-assistant-tools.service';

describe('AdminAssistantToolsService', () => {
  const context = {
    payments: {
      byMethod: [
        { method: 'TRANSFER', transactions: 7, percentage: 77.8 },
        { method: 'CARD', transactions: 2, percentage: 22.2 },
      ],
      totalMethodTransactions: 9,
      mostUsedMethods: ['TRANSFER'],
      methodUsageRule:
        'Toutes dates; uniquement les paiements PAID ou PARTIAL.',
      omittedCurrencies: 1,
      omittedOutstandingCurrencies: 0,
    },
    ratings: { omittedTrainingBreakdowns: 2 },
    coaches: { omittedAggregates: 0 },
    locations: { omittedAggregates: 1 },
  };
  const complaints = {
    total: 3,
    byStatus: [
      { status: 'NEW', count: 2 },
      { status: 'RESOLVED', count: 1 },
    ],
    byCategory: [{ category: 'PAYMENT', count: 3 }],
  };
  const audit = {
    windowStart: '2026-09-11T00:00:00.000Z',
    windowEnd: '2026-10-11T00:00:00.000Z',
    totalActions: 4,
    byActionAndStatus: [
      { action: 'USER_LOGIN', status: 'SUCCESS', count: 3 },
      { action: 'USER_LOGIN', status: 'FAILED', count: 1 },
    ],
  };

  const analytics = {
    sessionOccupancy: [
      {
        session: 'Formation A',
        startDate: '2026-01-15',
        seatsTaken: 8,
        capacity: 10,
        occupancy: 80,
      },
    ],
    trainingRatings: [
      {
        trainingId: 'private-id',
        training: 'Formation A',
        averageRating: 4,
        reviewCount: 3,
        distribution: [{ rating: 4, count: 3 }],
      },
    ],
    referralSources: [
      { source: 'Réseaux sociaux', registrations: 2, percentage: 50 },
      { source: 'Internet', registrations: 1, percentage: 25 },
      { source: 'participant@example.com', registrations: 1, percentage: 25 },
    ],
    referralSourceDetails: {
      eligibleRegistrations: 4,
      socialNetworkRegistrations: 2,
      unspecifiedSocialNetwork: 1,
      networks: [
        {
          network: 'Instagram',
          registrations: 1,
          percentageOfSocialRegistrations: 50,
          percentageOfEligibleRegistrations: 25,
        },
      ],
    },
    feedbackByType: [
      { type: 'TRAINING', averageRating: 4, count: 3 },
      { type: 'TRAINER', averageRating: 4.5, count: 2 },
    ],
    registrationCountsBySession: [
      {
        training: 'Formation A',
        startDate: '2026-01-15',
        capacity: 10,
        seatsTaken: 8,
        occupancy: 80,
        registrations: 8,
        byStatus: [{ status: 'CONFIRMED', count: 8 }],
      },
    ],
    coachAnalytics: {
      coaches: [
        {
          id: 'coach-private-id',
          name: 'Personal Name',
          sessions: 2,
          participants: 4,
          capacity: 10,
          seatsTaken: 8,
          occupancyRate: 80,
        },
      ],
    },
    locationAnalytics: {
      locations: [
        {
          id: 'location-private-id',
          name: 'Private address',
          sessions: 2,
          participants: 4,
        },
      ],
    },
  };

  it('returns current context omissions and payment limitations', async () => {
    const contextService = { getContext: jest.fn().mockResolvedValue(context) };
    const analyticsService = { getAdminAnalytics: jest.fn() };
    const complaintsService = {
      getAdminAssistantAggregates: jest.fn().mockResolvedValue(complaints),
    };
    const auditService = {
      getAdminAssistantAggregates: jest.fn().mockResolvedValue(audit),
    };
    const service = new AdminAssistantToolsService(
      contextService as any,
      analyticsService as any,
      complaintsService as any,
      auditService as any,
    );

    const result = await service.execute('get_current_admin_snapshot', {});

    expect(result?.sources).toEqual(['admin_snapshot', 'complaints', 'audit']);
    expect(result?.data).toMatchObject({ complaints, audit });
    expect(result?.data).toMatchObject({
      payments: {
        byMethod: [
          { method: 'TRANSFER', transactions: 7 },
          { method: 'CARD', transactions: 2, percentage: 22.2 },
        ],
        totalMethodTransactions: 9,
        mostUsedMethods: ['TRANSFER'],
      },
    });
    expect(result?.period.type).toBe('current_snapshot');
    expect(result?.missingData).toEqual(
      expect.arrayContaining([
        expect.stringContaining('remboursements'),
        expect.stringContaining('confirmation indépendante'),
        expect.stringContaining('1 devises'),
        expect.stringContaining('2 ventilations'),
        expect.stringContaining('1 groupes de lieux'),
        expect.stringContaining('30 derniers jours'),
      ]),
    );
    expect(analyticsService.getAdminAnalytics).not.toHaveBeenCalled();
    expect(complaintsService.getAdminAssistantAggregates).toHaveBeenCalledTimes(
      1,
    );
    expect(auditService.getAdminAssistantAggregates).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result?.data)).not.toMatch(
      /message|actorId|ipAddress|userAgent|email|phone/i,
    );
  });

  it('validates bounded dates, returns coach names, and anonymizes locations and free-text sources', async () => {
    const contextService = { getContext: jest.fn() };
    const analyticsService = {
      getAdminAnalytics: jest.fn().mockResolvedValue(analytics),
    };
    const service = new AdminAssistantToolsService(
      contextService as any,
      analyticsService as any,
      { getAdminAssistantAggregates: jest.fn() } as any,
      { getAdminAssistantAggregates: jest.fn() } as any,
    );

    expect(
      await service.execute('get_period_operational_breakdowns', {
        startDate: '2025-01-01',
        endDate: '2026-01-02',
      }),
    ).toBeNull();
    expect(
      await service.execute('get_period_operational_breakdowns', {
        startDate: '2026-02-30',
        endDate: '2026-03-01',
      }),
    ).toBeNull();

    const result = await service.execute('get_period_operational_breakdowns', {
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    });

    expect(analyticsService.getAdminAnalytics).toHaveBeenCalledWith({
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    });
    expect(result?.period).toEqual({
      type: 'date_range',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    });
    expect(JSON.stringify(result?.data)).not.toContain('private-id');
    expect(JSON.stringify(result?.data)).toContain('Personal Name');
    expect(JSON.stringify(result?.data)).not.toContain(
      'participant@example.com',
    );
    expect(result?.data).toMatchObject({
      referralSources: {
        categories: [
          { source: 'Réseaux sociaux', registrations: 2 },
          { source: 'Autres/non catégorisés', registrations: 1 },
          { source: 'Internet', registrations: 1 },
        ],
        eligibleRegistrations: 4,
        socialNetworkRegistrations: 2,
        unspecifiedSocialNetwork: 1,
      },
      coaches: {
        coaches: [
          {
            name: 'Personal Name',
            sessions: 2,
            participants: 4,
            capacity: 10,
            seatsTaken: 8,
            occupancyRate: 80,
          },
        ],
      },
      locations: [{ label: 'Groupe 1', sessions: 2, participants: 4 }],
    });
  });

  it('fetches only the requested participant analytics area', async () => {
    const demographics = {
      population: 7,
      withBirthDate: 6,
      missingBirthDate: 1,
      averageAgeYears: 31.5,
      byAgeRange: [],
    };
    const contextService = {
      getContext: jest.fn(),
      getParticipantDemographics: jest.fn().mockResolvedValue(demographics),
    };
    const analyticsService = { getAdminAnalytics: jest.fn() };
    const service = new AdminAssistantToolsService(
      contextService as any,
      analyticsService as any,
      { getAdminAssistantAggregates: jest.fn() } as any,
      { getAdminAssistantAggregates: jest.fn() } as any,
    );

    const result = await service.execute('get_admin_analytics', {
      area: 'participants',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    });

    expect(result).toMatchObject({
      data: demographics,
      sources: ['participant_demographics'],
      period: {
        type: 'date_range',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      },
    });
    expect(contextService.getParticipantDemographics).toHaveBeenCalledWith({
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    });
    expect(contextService.getContext).not.toHaveBeenCalled();
    expect(analyticsService.getAdminAnalytics).not.toHaveBeenCalled();
  });

  it('fetches a bounded training catalog only when that area is requested', async () => {
    const catalog = { returned: 1, omitted: 0, trainings: [{ title: 'IA' }] };
    const contextService = {
      getContext: jest.fn(),
      getTrainingCatalog: jest.fn().mockResolvedValue(catalog),
    };
    const service = new AdminAssistantToolsService(
      contextService as any,
      { getAdminAnalytics: jest.fn() } as any,
      { getAdminAssistantAggregates: jest.fn() } as any,
      { getAdminAssistantAggregates: jest.fn() } as any,
    );

    const result = await service.execute('get_admin_analytics', {
      area: 'training_catalog',
      search: 'IA',
    });

    expect(result?.data).toEqual(catalog);
    expect(contextService.getTrainingCatalog).toHaveBeenCalledWith('IA');
    expect(contextService.getContext).not.toHaveBeenCalled();
  });

  it('routes bounded session-analysis filters to the existing analytics service', async () => {
    const contextService = { getContext: jest.fn() };
    const analyticsService = {
      getAdminAnalytics: jest.fn().mockResolvedValue(analytics),
    };
    const service = new AdminAssistantToolsService(
      contextService as any,
      analyticsService as any,
      { getAdminAssistantAggregates: jest.fn() } as any,
      { getAdminAssistantAggregates: jest.fn() } as any,
    );

    const result = await service.execute('get_admin_analytics', {
      area: 'sessions',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    });

    expect(analyticsService.getAdminAnalytics).toHaveBeenCalledWith({
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    });
    expect(result?.data).toEqual(analytics.registrationCountsBySession);
    expect(result?.period.type).toBe('date_range');
    expect(contextService.getContext).not.toHaveBeenCalled();
  });

  it('ranks coaches by a validated requested metric and rejects unrelated sort options', async () => {
    const contextService = { getContext: jest.fn() };
    const analyticsService = {
      getAdminAnalytics: jest.fn().mockResolvedValue({
        ...analytics,
        coachAnalytics: {
          coaches: [
            {
              id: 'coach-a',
              name: 'A coach',
              sessions: 4,
              participants: 8,
              capacity: 20,
              seatsTaken: 10,
              occupancyRate: 50,
            },
            {
              id: 'coach-b',
              name: 'B coach',
              sessions: 2,
              participants: 12,
              capacity: 15,
              seatsTaken: 12,
              occupancyRate: 80,
            },
          ],
        },
      }),
    };
    const service = new AdminAssistantToolsService(
      contextService as any,
      analyticsService as any,
      { getAdminAssistantAggregates: jest.fn() } as any,
      { getAdminAssistantAggregates: jest.fn() } as any,
    );

    const result = await service.execute('get_admin_analytics', {
      area: 'coaches',
      coachSortBy: 'participants',
    });

    expect((result?.data as { coaches: { name: string }[] }).coaches).toEqual([
      expect.objectContaining({ name: 'B coach' }),
      expect.objectContaining({ name: 'A coach' }),
    ]);
    await expect(
      service.execute('get_admin_analytics', {
        area: 'sessions',
        coachSortBy: 'occupancy',
      }),
    ).resolves.toBeNull();
  });

  it('returns only recognized social network values with explicit denominators', async () => {
    const analyticsService = {
      getAdminAnalytics: jest.fn().mockResolvedValue(analytics),
    };
    const service = new AdminAssistantToolsService(
      { getContext: jest.fn() } as any,
      analyticsService as any,
      { getAdminAssistantAggregates: jest.fn() } as any,
      { getAdminAssistantAggregates: jest.fn() } as any,
    );

    const result = await service.execute('get_admin_analytics', {
      area: 'referral_sources',
    });
    const serialized = JSON.stringify(result?.data);

    expect(result?.data).toMatchObject({
      eligibleRegistrations: 4,
      socialNetworkRegistrations: 2,
      unspecifiedSocialNetwork: 1,
      networks: [
        expect.objectContaining({
          network: 'Instagram',
          registrations: 1,
          percentageOfSocialRegistrations: 50,
          percentageOfEligibleRegistrations: 25,
        }),
      ],
    });
    expect(result?.missingData).toEqual(
      expect.arrayContaining([expect.stringContaining('plateforme précise')]),
    );
    expect(serialized).not.toContain('participant@example.com');
  });

  it('rejects unknown tool names and unexpected arguments', async () => {
    const service = new AdminAssistantToolsService(
      { getContext: jest.fn() } as any,
      { getAdminAnalytics: jest.fn() } as any,
      { getAdminAssistantAggregates: jest.fn() } as any,
      { getAdminAssistantAggregates: jest.fn() } as any,
    );

    await expect(service.execute('arbitrary_sql', {})).resolves.toBeNull();
    await expect(
      service.execute('get_current_admin_snapshot', { sql: 'select *' }),
    ).resolves.toBeNull();
    await expect(
      service.execute('get_admin_analytics', {
        area: 'participants',
        sql: 'select *',
      }),
    ).resolves.toBeNull();
    await expect(
      service.execute('get_admin_analytics', {
        area: 'payments',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      }),
    ).resolves.toBeNull();
    await expect(
      service.execute('get_admin_analytics', {
        area: 'sessions',
        startDate: '2026-02-30',
        endDate: '2026-03-01',
      }),
    ).resolves.toBeNull();
  });
});

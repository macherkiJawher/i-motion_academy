import {
  ApprovalStatus,
  AxisCode,
  RecognitionType,
  Training,
  TrainingLifecycleStatus,
} from './entities/training.entity';
import { trainingAvailabilityError } from './training-availability';

describe('trainingAvailabilityError', () => {
  const publishedSportTraining: Partial<Training> = {
    slug: 'sport-training',
    title: 'Sport training',
    description: 'A complete training description',
    lifecycleStatus: TrainingLifecycleStatus.PUBLISHED,
    active: true,
    axisCode: AxisCode.SPORT_COACHING,
    recognitionType: RecognitionType.I_MOTION_CERTIFICATE,
    approvalStatus: ApprovalStatus.NOT_APPLICABLE,
    certification: 'i-Motion Certificate',
    durationHours: 12,
    durationValue: 12,
    price: 350,
    currency: 'TND',
  };

  it('allows a published non-diploma training with no regulatory approval', () => {
    expect(
      trainingAvailabilityError(publishedSportTraining, '2026-10-02'),
    ).toBeNull();
  });

  it('allows a published training when the teaching-hour total is unknown', () => {
    expect(
      trainingAvailabilityError(
        {
          ...publishedSportTraining,
          durationHours: null,
          durationValue: 2,
        },
        '2026-10-02',
      ),
    ).toBeNull();
  });

  it('keeps a diploma under review out of public availability', () => {
    expect(
      trainingAvailabilityError(
        {
          ...publishedSportTraining,
          lifecycleStatus: TrainingLifecycleStatus.IN_REVIEW,
          axisCode: AxisCode.BTP,
          recognitionType: RecognitionType.BTP_DIPLOMA,
          approvalStatus: ApprovalStatus.PENDING,
        },
        '2026-10-02',
      ),
    ).toBe('Training is not published');
  });

  it('rejects an expired BTP approval even when its lifecycle says published', () => {
    expect(
      trainingAvailabilityError(
        {
          ...publishedSportTraining,
          axisCode: AxisCode.BTP,
          recognitionType: RecognitionType.BTP_DIPLOMA,
          approvalStatus: ApprovalStatus.APPROVED,
          approvalReference: 'REF-123',
          approvalAuthority: 'Authority',
          approvalValidUntil: '2026-01-01',
          credentialTitle: 'BTP Diploma',
        },
        '2026-10-02',
      ),
    ).toContain('validity date');
  });
});

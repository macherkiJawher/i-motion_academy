import { ConflictException } from '@nestjs/common';
import {
  ApprovalStatus,
  AxisCode,
  RecognitionType,
  Training,
  TrainingLifecycleStatus,
} from './entities/training.entity';

export function trainingAvailabilityError(
  training: Partial<Training>,
  today = new Date().toISOString().slice(0, 10),
): string | null {
  if (
    training.lifecycleStatus !== TrainingLifecycleStatus.PUBLISHED ||
    training.active === false
  ) {
    return 'Training is not published';
  }
  if (!training.title?.trim()) return 'A training title is required';
  if (!training.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(training.slug)) {
    return 'A valid training slug is required';
  }
  if (!training.description?.trim())
    return 'A training description is required';
  if (
    !Number.isFinite(training.durationValue) ||
    (training.durationValue ?? 0) <= 0
  ) {
    return 'A valid program duration is required';
  }
  if (!Number.isFinite(training.price) || (training.price ?? -1) < 0) {
    return 'A valid catalog price is required';
  }
  if (training.currency !== 'TND') return 'Training prices must use TND';

  const expectedDiploma =
    training.axisCode === AxisCode.BTP
      ? RecognitionType.BTP_DIPLOMA
      : training.axisCode === AxisCode.BTS
        ? RecognitionType.BTS_DIPLOMA
        : null;

  if (expectedDiploma) {
    if (training.recognitionType !== expectedDiploma) {
      return 'BTP and BTS training must use the matching diploma recognition';
    }
    if (training.approvalStatus !== ApprovalStatus.APPROVED) {
      return 'The diploma homologation must be approved before publication';
    }
    if (
      !training.approvalReference?.trim() ||
      !training.approvalAuthority?.trim() ||
      !training.approvalValidUntil ||
      training.approvalValidUntil < today
    ) {
      return 'The approved diploma requires a valid reference, authority and validity date';
    }
    if (!(training.credentialTitle ?? training.certification)?.trim()) {
      return 'A diploma credential title is required';
    }
  } else {
    if (
      training.recognitionType === RecognitionType.BTP_DIPLOMA ||
      training.recognitionType === RecognitionType.BTS_DIPLOMA
    ) {
      return 'The diploma recognition does not match the training domain';
    }
    if (training.approvalStatus !== ApprovalStatus.NOT_APPLICABLE) {
      return 'Only BTP or BTS diplomas can have an approval status';
    }
    if (
      training.recognitionType === RecognitionType.I_MOTION_CERTIFICATE &&
      !(training.credentialTitle ?? training.certification)?.trim()
    ) {
      return 'A certificate title is required';
    }
  }

  return null;
}

export function assertTrainingAvailable(training: Partial<Training>): void {
  const error = trainingAvailabilityError(training);
  if (error) throw new ConflictException(error);
}

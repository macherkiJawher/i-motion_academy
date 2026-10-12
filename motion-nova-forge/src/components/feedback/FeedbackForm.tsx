import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

interface FeedbackFormProps {
  registrationId: string;
  onSubmitSuccess?: () => void;
  onCancel?: () => void;
}

interface FeedbackAvailability {
  available: boolean;
  reason?: string;
  feedbackDeadline?: string;
}

interface BadWordsCheck {
  warning: string | null;
}

export function FeedbackForm({ registrationId, onSubmitSuccess, onCancel }: FeedbackFormProps) {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [feedbackType, setFeedbackType] = useState<'TRAINING' | 'TRAINER' | 'LOGISTICS' | 'CONTENT'>('TRAINING');
  const [badWordsWarning, setBadWordsWarning] = useState<string | null>(null);

  // Check if feedback is available
  const { data: availabilityData, isLoading: checkingAvailability } = useQuery({
    queryKey: ['feedback-available', registrationId],
    queryFn: async () => {
      return api.get<FeedbackAvailability>(`/feedback/${registrationId}/available`);
    },
  });

  // Submit feedback mutation
  const submitFeedback = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/feedback', data);
    },
    onSuccess: () => {
      setRating(5);
      setComment('');
      setBadWordsWarning(null);
      onSubmitSuccess?.();
    },
  });

  // Real-time bad words check
  const checkBadWords = useMutation({
    mutationFn: async (text: string) => {
      return api.post<BadWordsCheck>('/feedback/check-bad-words', { text });
    },
    onSuccess: (data) => {
      setBadWordsWarning(data.warning);
    },
  });

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setComment(text);
    
    // Check for bad words if comment is long enough
    if (text.length > 10) {
      checkBadWords.mutate(text);
    } else {
      setBadWordsWarning(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!availabilityData?.available) {
      alert('Feedback is not available for this registration');
      return;
    }

    submitFeedback.mutate({
      registrationId,
      rating,
      comment: comment || null,
      feedbackType,
    });
  };

  if (checkingAvailability) {
    return <div className="p-4">Vérification de la disponibilité...</div>;
  }

  if (!availabilityData?.available) {
    return (
      <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800 border border-yellow-200">
        <p className="font-semibold">Feedback non disponible</p>
        <p className="mt-2">{availabilityData?.reason}</p>
        {availabilityData?.feedbackDeadline && (
          <p className="mt-1 text-xs">
            Deadline: {new Date(availabilityData.feedbackDeadline).toLocaleDateString()}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/50 bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">Donnez votre avis</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Rating */}
        <div>
          <label className="mb-2 block text-sm font-medium">Note</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-3xl transition-colors ${
                  star <= rating ? 'text-yellow-400' : 'text-gray-300'
                }`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* Feedback Type */}
        <div>
          <label className="mb-2 block text-sm font-medium">Type de feedback</label>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {['TRAINING', 'TRAINER', 'LOGISTICS', 'CONTENT'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFeedbackType(type as any)}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  feedbackType === type
                    ? 'bg-electric text-white'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {type === 'TRAINING' && 'Formation'}
                {type === 'TRAINER' && 'Formateur'}
                {type === 'LOGISTICS' && 'Logistique'}
                {type === 'CONTENT' && 'Contenu'}
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="mb-2 block text-sm font-medium">Commentaire (optionnel)</label>
          <textarea
            value={comment}
            onChange={handleCommentChange}
            placeholder="Partagez votre expérience..."
            rows={4}
            maxLength={500}
            className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm resize-none focus:border-electric focus:outline-none focus:ring-1 focus:ring-electric"
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>{comment.length}/500</span>
          </div>
        </div>

        {/* Bad Words Warning */}
        {badWordsWarning && (
          <div className="rounded-md bg-orange-50 p-3 text-sm text-orange-800 border border-orange-200">
            {badWordsWarning}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={submitFeedback.isPending}
            className="flex-1 rounded-md bg-electric px-4 py-2 font-medium text-white hover:bg-electric/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitFeedback.isPending ? 'Envoi en cours...' : 'Envoyer le feedback'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-border/50 px-4 py-2 font-medium hover:bg-secondary transition-colors"
            >
              Annuler
            </button>
          )}
        </div>

        {submitFeedback.isError && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
            Erreur lors de l'envoi du feedback. Veuillez réessayer.
          </div>
        )}

        {submitFeedback.isSuccess && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 border border-green-200">
            ✓ Feedback envoyé avec succès !
          </div>
        )}
      </form>
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { TiltCard } from '@/components/fx/Magnetic';
import { Reveal } from '@/components/fx/Reveal';
import { api } from '@/api/client';

interface Testimonial {
  id: string;
  rating: number;
  comment: string;
  userName: string;
  trainingName: string;
}

export function DynamicTestimonials() {
  const { data: testimonials = [], isLoading } = useQuery<Testimonial[]>({
    queryKey: ['testimonials'],
    queryFn: async () => {
      return api.get<Testimonial[]>('/feedback/public/testimonials');
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  if (isLoading) {
    return (
      <section className="relative overflow-hidden py-24">
        <Reveal className="mx-auto max-w-6xl px-6">
          <span className="text-xs uppercase tracking-[0.3em] text-electric">
            Signals from the field
          </span>
        </Reveal>
        <div className="mx-auto mt-10 grid max-w-6xl gap-5 px-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-3xl bg-secondary/50 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  // Fallback to defaults if no testimonials
  const displayTestimonials = testimonials.length > 0 ? testimonials : [
    {
      id: '1',
      rating: 5,
      comment: 'Excellent formation avec des contenus très pertinents et un formateur engagé.',
      userName: 'Jean Dupont',
      trainingName: 'Python Advanced',
    },
    {
      id: '2',
      rating: 5,
      comment: 'La meilleure formation que j\'ai suivi. Vraiment professionnel et complet.',
      userName: 'Marie Laurent',
      trainingName: 'Web Development',
    },
    {
      id: '3',
      rating: 5,
      comment: 'Contenu de qualité et ambiance très bonne. Fortement recommandé!',
      userName: 'Marc Leblanc',
      trainingName: 'DevOps Essentials',
    },
  ];

  return (
    <section className="relative overflow-hidden py-24">
      <Reveal className="mx-auto max-w-6xl px-6">
        <span className="text-xs uppercase tracking-[0.3em] text-electric">
          Signals from the field
        </span>
      </Reveal>
      <div className="mx-auto mt-10 grid max-w-6xl gap-5 px-6 md:grid-cols-3">
        {displayTestimonials.map((testimonial, i) => (
          <Reveal key={testimonial.id} delay={i * 0.1}>
            <TiltCard max={7} className="h-full">
              <figure className="glass hover-lift flex h-full flex-col rounded-3xl p-7">
                <blockquote className="flex-1 text-sm leading-relaxed text-foreground/85">
                  "{testimonial.comment}"
                </blockquote>
                
                {/* Rating Stars */}
                <div className="mt-2 flex gap-1">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <span key={j} className="text-sm">★</span>
                  ))}
                </div>
                
                <figcaption className="mt-6 flex items-center gap-3 border-t border-border/70 pt-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[image:var(--gradient-electric)] font-display text-xs font-semibold text-primary-foreground">
                    {testimonial.userName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{testimonial.userName}</span>
                    <span className="block text-xs text-muted-foreground">{testimonial.trainingName}</span>
                  </span>
                </figcaption>
              </figure>
            </TiltCard>
          </Reveal>
        ))}
      </div>
      
      {/* Refresh note */}
      {testimonials.length > 0 && (
        <div className="mt-8 text-center text-xs text-muted-foreground">
          ✓ Testimonials mis à jour en temps réel
        </div>
      )}
    </section>
  );
}

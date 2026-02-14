/**
 * Onboarding Page Component
 * Quick 5-second tutorial on how to use the app
 */

import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Home, Compass, MapPin, User, ChevronRight, ChevronLeft, Sparkles, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const slides = [
  {
    icon: KeyRound,
    title: 'Welcome to Koda',
    description: 'Your key to discovering local gems in your neighborhood. Find the best cafes, restaurants, and hidden treasures nearby.',
    color: 'text-primary',
  },
  {
    icon: Home,
    title: 'Explore Home',
    description: 'Browse all local businesses, search by name, filter by category, and sort by ratings. Find exactly what you\'re looking for.',
    color: 'text-chart-1',
  },
  {
    icon: Compass,
    title: 'Swipe to Discover',
    description: 'Like Tinder, but for places! Swipe right to save your favorites, swipe left to skip. It\'s that simple.',
    color: 'text-chart-2',
  },
  {
    icon: MapPin,
    title: 'See the Map',
    description: 'View all businesses on an interactive map. Find what\'s closest to you and get directions instantly.',
    color: 'text-chart-3',
  },
  {
    icon: LogIn,
    title: 'Create an Account',
    description: 'Sign up or sign in to unlock the full experience — save favorites, leave reviews, track your discoveries, and get personalized recommendations.',
    color: 'text-primary',
    cta: true,
  },
  {
    icon: User,
    title: 'Your Profile',
    description: 'Save your favorites, leave reviews, and keep track of all the amazing places you\'ve discovered.',
    color: 'text-chart-4',
  },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    const SWIPE_THRESHOLD = 50;
    if (diff > SWIPE_THRESHOLD) {
      handleNext();
    } else if (diff < -SWIPE_THRESHOLD) {
      handlePrev();
    }
    touchStartX.current = null;
  }, [currentSlide]);

  const handleNext = () => {
    if (currentSlide === slides.length - 1) {
      localStorage.setItem('koda_onboarded', 'true');
      navigate('/');
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentSlide((prev) => Math.max(0, prev - 1));
  };

  const handleSkip = () => {
    localStorage.setItem('koda_onboarded', 'true');
    navigate('/');
  };

  const slide = slides[currentSlide] as (typeof slides)[number] & { cta?: boolean };
  const Icon = slide.icon;
  const isLast = currentSlide === slides.length - 1;

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-background p-6">
      {/* Skip button */}
      <div className="flex w-full justify-end">
        <Button variant="ghost" size="sm" onClick={handleSkip}>
          Skip
        </Button>
      </div>

      {/* Content with side arrows */}
      <div className="relative flex w-full flex-1 items-center justify-center" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {/* Left arrow */}
        {currentSlide > 0 && (
          <button
            onClick={handlePrev}
            className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        <div className="flex flex-col items-center text-center px-12">
          <div className={cn(
            'mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/10 transition-all duration-500',
            slide.color
          )}>
            <Icon className="h-12 w-12" />
          </div>

          <h1 className="text-2xl font-bold text-foreground">{slide.title}</h1>
          <p className="mt-4 max-w-sm text-muted-foreground">{slide.description}</p>
          {slide.cta && (
            <Button
              className="mt-6"
              size="lg"
              onClick={() => {
                localStorage.setItem('koda_onboarded', 'true');
                navigate('/auth');
              }}
            >
              <LogIn className="mr-2 h-4 w-4" />
              Sign In / Sign Up
            </Button>
          )}
        </div>

        {/* Right arrow */}
        <button
          onClick={handleNext}
          className="absolute right-0 flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={isLast ? 'Get started' : 'Next slide'}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Dots */}
      <div className="w-full space-y-4">
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                i === currentSlide ? 'w-6 bg-primary' : 'w-2 bg-muted'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

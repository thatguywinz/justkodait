/**
 * Install Page - PWA installation prompt
 * Guides users on how to install Koda on their device
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Share, MoreVertical, Plus, ArrowLeft, Check } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPage() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    // Listen for the install prompt (Android/Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <PageContainer className="space-y-6">
      <div className="flex items-center gap-3 pt-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Install Koda</h1>
      </div>

      {isInstalled ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Koda is installed!</h2>
            <p className="text-sm text-muted-foreground">
              You can find Koda on your home screen. Open it anytime for a native app experience.
            </p>
            <Button onClick={() => navigate('/')}>Go to Home</Button>
          </CardContent>
        </Card>
      ) : deferredPrompt ? (
        /* Android / Chrome install prompt */
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Download className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Install Koda</h2>
            <p className="text-sm text-muted-foreground">
              Add Koda to your home screen for quick access and a native app experience.
            </p>
            <Button onClick={handleInstall} size="lg" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Install App
            </Button>
          </CardContent>
        </Card>
      ) : isIOS ? (
        /* iOS instructions */
        <Card>
          <CardContent className="space-y-6 p-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-foreground">Install on iPhone / iPad</h2>
              <p className="mt-1 text-sm text-muted-foreground">Follow these steps in Safari:</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">1</div>
                <div>
                  <p className="font-medium text-foreground">Tap the Share button</p>
                  <p className="text-sm text-muted-foreground">
                    Look for the <Share className="inline h-4 w-4" /> icon at the bottom of Safari
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">2</div>
                <div>
                  <p className="font-medium text-foreground">Scroll down and tap "Add to Home Screen"</p>
                  <p className="text-sm text-muted-foreground">
                    Look for the <Plus className="inline h-4 w-4" /> Add to Home Screen option
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">3</div>
                <div>
                  <p className="font-medium text-foreground">Tap "Add"</p>
                  <p className="text-sm text-muted-foreground">Koda will appear on your home screen like a native app</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Generic Android/desktop instructions */
        <Card>
          <CardContent className="space-y-6 p-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-foreground">Install Koda</h2>
              <p className="mt-1 text-sm text-muted-foreground">Follow these steps in your browser:</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">1</div>
                <div>
                  <p className="font-medium text-foreground">Open the browser menu</p>
                  <p className="text-sm text-muted-foreground">
                    Tap the <MoreVertical className="inline h-4 w-4" /> three-dot menu in the top right
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">2</div>
                <div>
                  <p className="font-medium text-foreground">Tap "Install app" or "Add to Home Screen"</p>
                  <p className="text-sm text-muted-foreground">The option may vary by browser</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">3</div>
                <div>
                  <p className="font-medium text-foreground">Confirm installation</p>
                  <p className="text-sm text-muted-foreground">Koda will be added to your home screen</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}

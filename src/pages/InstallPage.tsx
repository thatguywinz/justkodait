import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Share, Plus, CheckCircle, Smartphone } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPage = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

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

  if (isInstalled) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
          <CheckCircle className="h-16 w-16 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Already Installed!</h1>
          <p className="text-muted-foreground">Koda is already installed on your device.</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex flex-col items-center gap-6 px-4 py-8 max-w-md mx-auto">
        <Smartphone className="h-16 w-16 text-primary" />
        <h1 className="text-2xl font-bold text-foreground text-center">Install Koda</h1>
        <p className="text-muted-foreground text-center">
          Add Koda to your home screen for the best experience — quick access, offline support, and a native app feel.
        </p>

        {deferredPrompt && (
          <Button size="lg" className="w-full gap-2" onClick={handleInstall}>
            <Download className="h-5 w-5" />
            Install Koda
          </Button>
        )}

        {isIOS && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-lg">Install on iPhone / iPad</CardTitle>
              <CardDescription>Follow these steps in Safari:</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2"><Share className="h-4 w-4 text-primary" /></div>
                <div>
                  <p className="font-medium text-foreground">1. Tap the Share button</p>
                  <p className="text-sm text-muted-foreground">At the bottom of Safari</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2"><Plus className="h-4 w-4 text-primary" /></div>
                <div>
                  <p className="font-medium text-foreground">2. Tap "Add to Home Screen"</p>
                  <p className="text-sm text-muted-foreground">Scroll down in the share menu</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2"><Download className="h-4 w-4 text-primary" /></div>
                <div>
                  <p className="font-medium text-foreground">3. Tap "Add"</p>
                  <p className="text-sm text-muted-foreground">Confirm to install</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!deferredPrompt && !isIOS && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-lg">Install on Android</CardTitle>
              <CardDescription>Open this page in Chrome, then tap the browser menu and select "Install app" or "Add to Home Screen".</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </PageContainer>
  );
};

export default InstallPage;

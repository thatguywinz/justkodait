/**
 * Profile Page Component
 * User settings, favorites, and review history
 */

import { useState, useEffect } from 'react';
import { User, Heart, Star, Settings, LogOut, ChevronRight, MapPin, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { BusinessCard } from '@/components/business/BusinessCard';
import { BusinessDetail } from '@/components/business/BusinessDetail';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { useReviews } from '@/hooks/useReviews';
import { useBusinesses } from '@/hooks/useBusinesses';
import { Business, Review, CATEGORY_ICONS } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, signOut, updateProfile, loading: authLoading } = useAuth();
  const { favoriteBusinesses, loading: favLoading, isFavorite, toggleFavorite } = useFavorites();
  const { userReviews, fetchUserReviews, loading: reviewsLoading } = useReviews();
  const { deals, allBusinesses } = useBusinesses();
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [editName, setEditName] = useState('');
  const [editPostal, setEditPostal] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserReviews();
    }
  }, [user, fetchUserReviews]);

  useEffect(() => {
    if (profile) {
      setEditName(profile.display_name || '');
      setEditPostal(profile.postal_code || '');
    }
  }, [profile]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleSaveProfile = async () => {
    const { error } = await updateProfile({
      display_name: editName,
      postal_code: editPostal,
    });
    
    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated!');
      setIsEditing(false);
    }
  };

  // If not logged in, show login prompt
  if (!authLoading && !user) {
    return (
      <PageContainer className="flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <User className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Welcome to Koda</h2>
          <p className="mt-2 text-muted-foreground">
            Sign in to save favorites, leave reviews, and personalize your experience.
          </p>
          <Button className="mt-6" onClick={() => navigate('/auth')}>
            Sign In
          </Button>
        </div>
      </PageContainer>
    );
  }

  const getBusinessById = (id: string) => allBusinesses.find(b => b.id === id);

  return (
    <PageContainer className="space-y-4">
      {/* Profile Header */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-xl text-primary">
                {profile?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h2 className="text-lg font-semibold">
                {profile?.display_name || 'Koda Explorer'}
              </h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              {profile?.postal_code && (
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {profile.postal_code}
                </div>
              )}
            </div>

            <Dialog open={isEditing} onOpenChange={setIsEditing}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Edit2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Display Name</Label>
                    <Input
                      id="name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="postal">Postal Code</Label>
                    <Input
                      id="postal"
                      value={editPostal}
                      onChange={(e) => setEditPostal(e.target.value)}
                      placeholder="For local recommendations"
                    />
                  </div>
                  <Button className="w-full" onClick={handleSaveProfile}>
                    Save Changes
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <Heart className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{favoriteBusinesses.length}</p>
              <p className="text-xs text-muted-foreground">Favorites</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Star className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{userReviews.length}</p>
              <p className="text-xs text-muted-foreground">Reviews</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="favorites" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="favorites">
            <Heart className="mr-2 h-4 w-4" />
            Favorites
          </TabsTrigger>
          <TabsTrigger value="reviews">
            <Star className="mr-2 h-4 w-4" />
            My Reviews
          </TabsTrigger>
        </TabsList>

        <TabsContent value="favorites" className="mt-4">
          {favLoading ? (
            <p className="py-8 text-center text-muted-foreground">Loading...</p>
          ) : favoriteBusinesses.length === 0 ? (
            <div className="py-8 text-center">
              <Heart className="mx-auto mb-2 h-12 w-12 text-muted" />
              <p className="text-muted-foreground">No favorites yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Save businesses to find them here
              </p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/discover')}>
                Discover Places
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {favoriteBusinesses.map((business) => (
                <BusinessCard
                  key={business.id}
                  business={business}
                  deals={deals[business.id]}
                  isFavorite={true}
                  onFavoriteToggle={() => toggleFavorite(business.id)}
                  onClick={() => setSelectedBusiness(business)}
                  compact
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="mt-4">
          {reviewsLoading ? (
            <p className="py-8 text-center text-muted-foreground">Loading...</p>
          ) : userReviews.length === 0 ? (
            <div className="py-8 text-center">
              <Star className="mx-auto mb-2 h-12 w-12 text-muted" />
              <p className="text-muted-foreground">No reviews yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Share your experiences at local businesses
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {userReviews.map((review) => {
                const business = getBusinessById(review.business_id);
                if (!business) return null;

                return (
                  <Card
                    key={review.id}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => setSelectedBusiness(business)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-lg">
                            {CATEGORY_ICONS[business.category]}
                          </div>
                          <div>
                            <h4 className="font-medium">{business.name}</h4>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-3 w-3 ${
                                    star <= review.rating
                                      ? 'fill-primary text-primary'
                                      : 'text-muted'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                      {review.comment && (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {review.comment}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Separator />

      {/* Sign Out */}
      <Button
        variant="outline"
        className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={handleSignOut}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sign Out
      </Button>

      {/* Business Detail */}
      <BusinessDetail
        business={selectedBusiness}
        deals={selectedBusiness ? deals[selectedBusiness.id] : []}
        isOpen={!!selectedBusiness}
        onClose={() => setSelectedBusiness(null)}
        isFavorite={selectedBusiness ? isFavorite(selectedBusiness.id) : false}
        onFavoriteToggle={() => selectedBusiness && toggleFavorite(selectedBusiness.id)}
      />
    </PageContainer>
  );
}

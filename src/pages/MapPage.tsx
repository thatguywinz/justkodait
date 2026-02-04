/**
 * Map Page Component
 * Interactive map showing all local businesses
 */

import { useState, useEffect } from 'react';
import { MapPin, Navigation, Layers } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { PageContainer } from '@/components/layout/PageContainer';
import { BusinessDetail } from '@/components/business/BusinessDetail';
import { useBusinesses } from '@/hooks/useBusinesses';
import { useFavorites } from '@/hooks/useFavorites';
import { Business, CATEGORY_ICONS, CATEGORY_LABELS } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icon
const createCustomIcon = (color: string = '#8B5CF6') => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

const userIcon = L.divIcon({
  className: 'user-marker',
  html: `
    <div style="
      background-color: #3B82F6;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.3);
    "></div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function LocationButton({ onLocate }: { onLocate: (lat: number, lng: number) => void }) {
  const map = useMap();
  
  const handleClick = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          map.flyTo([latitude, longitude], 15);
          onLocate(latitude, longitude);
        },
        (err) => {
          console.error('Geolocation error:', err);
        }
      );
    }
  };

  return (
    <Button
      size="icon"
      variant="secondary"
      className="absolute bottom-24 right-4 z-[1000] h-12 w-12 rounded-full shadow-lg"
      onClick={handleClick}
    >
      <Navigation className="h-5 w-5" />
    </Button>
  );
}

export default function MapPage() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([43.6532, -79.3832]); // Toronto default

  const { businesses, deals, loading } = useBusinesses({});
  const { isFavorite, toggleFavorite } = useFavorites();

  // Try to get user location on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setMapCenter([latitude, longitude]);
        },
        () => {
          // Use default Toronto location if geolocation fails
        }
      );
    }
  }, []);

  const handleLocate = (lat: number, lng: number) => {
    setUserLocation({ lat, lng });
  };

  return (
    <PageContainer noPadding className="relative h-screen">
      {/* Header Overlay */}
      <div className="absolute left-4 right-4 top-4 z-[1000]">
        <div className="flex items-center justify-between rounded-xl bg-card/95 p-3 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Nearby</h1>
          </div>
          <Badge variant="secondary" className="font-normal">
            {businesses.length} places
          </Badge>
        </div>
      </div>

      {/* Map */}
      <MapContainer
        center={mapCenter}
        zoom={14}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User Location Marker */}
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={userIcon}
          >
            <Popup>
              <div className="text-center">
                <strong>You are here</strong>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Business Markers */}
        {businesses.map((business) => {
          if (!business.latitude || !business.longitude) return null;

          return (
            <Marker
              key={business.id}
              position={[business.latitude, business.longitude]}
              icon={createCustomIcon()}
              eventHandlers={{
                click: () => setSelectedBusiness(business),
              }}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <div className="mb-2 text-xs text-muted-foreground">
                    {CATEGORY_ICONS[business.category]} {CATEGORY_LABELS[business.category]}
                  </div>
                  <h3 className="font-semibold">{business.name}</h3>
                  <div className="mt-1 flex items-center gap-1 text-sm">
                    <span className="text-primary">★ {business.average_rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({business.review_count})</span>
                  </div>
                  <Button
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => setSelectedBusiness(business)}
                  >
                    View Details
                  </Button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        <LocationButton onLocate={handleLocate} />
      </MapContainer>

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

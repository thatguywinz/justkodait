# Koda - The Key to Your Neighborhood

**Slogan:** "The key to your neighborhood"

Koda is a modern mobile-first web application that helps users discover and support small local businesses in their communities. Find hidden gems, explore new places, and support local entrepreneurs.

---

## 🌟 Features

### 🏠 Home Tab
- **Business Listings**: Browse all local businesses in a beautiful card layout
- **Search**: Find businesses by name, description, or address
- **Category Filters**: Filter by restaurant, café, bakery, bar, retail, beauty, fitness, and more
- **Sort Options**: Sort by rating, number of reviews, name, or distance

### 🧭 Discover Tab (Tinder-Style)
- **Swipe Right**: Save businesses to your favorites
- **Swipe Left**: Skip to the next business
- **Category Selection**: Choose which type of business you want to explore
- **Gesture Support**: Touch and mouse drag for smooth swiping

### 🗺️ Map Tab
- **Interactive Map**: View all businesses on an OpenStreetMap-powered map
- **Location Services**: See your current location and nearby businesses
- **Quick Details**: Tap markers to see business info and navigate to details

### 👤 Profile Tab
- **Favorites**: View and manage all saved businesses
- **Review History**: See all reviews you've written
- **Profile Settings**: Update your display name and postal code
- **Account Management**: Sign in, sign up, and sign out

### ✨ Additional Features
- **Onboarding Tutorial**: Quick 5-second walkthrough for new users
- **Deals & Coupons**: Special offers displayed on business cards
- **Reviews & Ratings**: Leave and view ratings for businesses
- **Bot Verification**: Math captcha during signup to prevent bots
- **Verified Badges**: Trusted businesses display verification badges

---

## 🛠️ Technology Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui components |
| State Management | TanStack Query (React Query) |
| Animations | React Spring |
| Maps | React Leaflet + OpenStreetMap |
| Backend | Lovable Cloud (Supabase) |
| Authentication | Email/password with verification |
| Database | PostgreSQL with Row-Level Security |

---

## 📱 Mobile-First Design

Koda is designed primarily for mobile devices with:
- Bottom navigation bar
- Touch-friendly interactions
- Safe area support for modern devices
- Responsive layouts that adapt to all screen sizes

---

## 🗃️ Database Structure

### Tables
| Table | Description |
|-------|-------------|
| `businesses` | Store business information (name, category, location, ratings) |
| `reviews` | User reviews with ratings and comments |
| `favorites` | User's saved businesses |
| `deals` | Special offers and coupons |
| `profiles` | User profile information |
| `swipe_history` | Track swipe actions for the Discover feature |

### Security
- Row-Level Security (RLS) enabled on all tables
- Users can only access their own favorites, reviews, and swipe history
- Businesses and deals are publicly readable

---

## 🚀 Getting Started

1. The app will start with a quick onboarding tutorial
2. Browse businesses on the Home tab or swipe through them on Discover
3. Sign up to save favorites and leave reviews
4. Check the Map tab to see what's nearby

---

## 📁 Project Structure

```
src/
├── components/
│   ├── business/         # Business-related components
│   │   ├── BusinessCard.tsx
│   │   ├── BusinessDetail.tsx
│   │   ├── CategoryFilter.tsx
│   │   ├── ReviewForm.tsx
│   │   ├── ReviewList.tsx
│   │   └── SearchBar.tsx
│   ├── discover/         # Discover/swipe components
│   │   └── SwipeCard.tsx
│   ├── layout/           # Layout components
│   │   ├── BottomNav.tsx
│   │   └── PageContainer.tsx
│   └── ui/               # shadcn/ui components
├── hooks/                # Custom React hooks
│   ├── useAuth.tsx       # Authentication hook
│   ├── useBusinesses.tsx # Business data hook
│   ├── useFavorites.tsx  # Favorites management
│   └── useReviews.tsx    # Reviews management
├── pages/                # Page components
│   ├── AuthPage.tsx      # Login/signup
│   ├── DiscoverPage.tsx  # Tinder-style discovery
│   ├── HomePage.tsx      # Main business feed
│   ├── MapPage.tsx       # Interactive map
│   ├── OnboardingPage.tsx# Tutorial
│   └── ProfilePage.tsx   # User profile
├── types/                # TypeScript types
│   └── database.ts       # Database interfaces
└── App.tsx               # Main app component
```

---

## 📝 Libraries & Templates Used

- **React** - UI library
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Component library
- **React Router DOM** - Client-side routing
- **TanStack Query** - Data fetching and caching
- **React Spring** - Animation library
- **React Leaflet** - Map components
- **Leaflet** - Map library
- **Lucide React** - Icon library
- **Sonner** - Toast notifications
- **Zod** - Schema validation

---

## 📄 License

This project uses various open-source libraries and frameworks. See individual package licenses for details.

---

Built with ❤️ for local communities

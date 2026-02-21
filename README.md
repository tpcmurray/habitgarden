# Habit Garden 🌱

A cozy, emoji-powered habit tracker that turns personal consistency into a living visual world. Track up to 3 habits, each represented by an emoji buddy that lives in a shared garden. The garden thrives when you stay consistent and wilts when you don't.

![Habit Garden Preview](docs\habit-garden-preview.png)

## Features

- **🐛 Emoji Buddies** — Each habit gets an emoji companion that lives in your garden
- **🌳 Living Garden** — Your garden evolves based on your consistency over 14 days
- **😊 Mood System** — Buddies react to your habits with different moods (ecstatic to dormant)
- **🏆 Milestones** — Earn permanent cosmetics at 7, 30, and 100 day streaks
- **💬 Contextual Advice** — Research-backed habit science messages at the right moments
- **📱 PWA-Ready** — Install to your home screen for a native app experience
- **🔔 Smart Notifications** — Gentle reminders, streak celebrations, and re-engagement nudges
- **📊 Analytics** — Calendar heatmaps, completion rates, and streak tracking

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Auth | NextAuth.js (Google & Apple OAuth) |
| Push | OneSignal |
| Hosting | AWS Lightsail |

## Getting Started

### Prerequisites

- Node.js 20 LTS
- PostgreSQL 16
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/habit-garden.git
   cd habit-garden
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   ```

   Required variables:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/habitgarden
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

4. Set up the database:
   ```bash
   # Create PostgreSQL database
   createdb habitgarden
   
   # Run migrations
   npx drizzle-kit push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
habit-garden/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── garden/            # Garden view (main screen)
│   ├── habits/            # Habit management pages
│   ├── onboarding/        # Onboarding flow
│   └── analytics/         # Analytics dashboard
├── components/            # React components
│   ├── garden/            # Garden rendering components
│   ├── habits/            # Habit-related components
│   ├── analytics/         # Analytics components
│   ├── content/           # Message display components
│   └── ui/                # Reusable UI components
├── lib/                   # Core logic
│   ├── db/                # Database schema and connection
│   ├── garden/            # Garden state calculation
│   ├── streaks/           # Streak calculation
│   ├── milestones/        # Milestone detection
│   ├── content/           # Message libraries
│   └── notifications/     # OneSignal integration
├── docs/                  # Documentation
│   ├── habit-garden-tdd.md    # Technical design doc
│   ├── habit-garden-wireframes.html  # Visual wireframes
│   └── phases.md              # Build phases & tasks
├── public/                # Static assets
│   ├── manifest.json      # PWA manifest
│   └── icons/             # PWA icons
└── cron/                  # Background job workers
```

## Development Phases

This project is built in 7 phases. See [`docs/phases.md`](docs/phases.md) for detailed implementation tasks.

1. **Foundation** — Project setup, database, authentication
2. **Core Habit Loop** — CRUD, check-ins, streaks
3. **The Garden** — Garden visualization, buddy moods
4. **Milestones & Rewards** — Achievement system
5. **Content System** — Habit science & encouragement
6. **Notifications** — Push notifications, PWA
7. **Analytics & Polish** — Analytics, onboarding, deployment

## Habit Science

Habit Garden includes contextual advice based on habit formation research:

- **First Steps (Days 1-3)** — Identity building, habit stacking, tiny habits
- **Building Momentum (Days 4-14)** — Neural pathway development, routine formation
- **Streak Broken** — Recovery psychology, avoiding abstinence violation
- **Hitting the Wall (Days 14-30)** — The messy middle, boredom as progress
- **Long-Term (30+ days)** — Automaticity, identity-based habits
- **Breaking Bad Habits** — Urge management, replacement strategies

## Data Model

- **Users** — Account info, OAuth provider, notification preferences
- **Habits** — Up to 3 active habits per user (binary or measured)
- **CheckIns** — Daily completion records
- **Milestones** — Earned cosmetic rewards

See [`docs/habit-garden-tdd.md`](docs/habit-garden-tdd.md) for complete schema.

## PWA Installation

### iOS
1. Open in Safari
2. Tap Share button
3. Tap "Add to Home Screen"

### Android
1. Tap menu (three dots)
2. Tap "Add to Home Screen"

Notifications require PWA installation on iOS.

## Deployment

See [Deployment section in TDD](docs/habit-garden-tdd.md#9-deployment-aws-lightsail) for production setup:

1. Launch AWS Lightsail instance (Ubuntu 22.04)
2. Install Node.js, PostgreSQL, nginx
3. Configure SSL with Let's Encrypt
4. Set environment variables
5. Build and start with PM2

## Contributing

This is a personal project / process demonstration. Suggestions welcome via issues.

## License

MIT

---

Built with 💚 and a lot of ☕

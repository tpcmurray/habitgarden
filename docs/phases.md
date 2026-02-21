# Habit Garden — Build Phases & Tasks

This document breaks down the implementation into 7 phases with specific, actionable tasks. Each task includes file paths, dependencies, and clear success criteria for LLM execution.

---

## Phase 1: Foundation

Set up the core infrastructure: Next.js project, database, authentication, and basic layout.

### 1.1 Initialize Next.js Project with Tailwind CSS

**Task:** Create Next.js 14 project with App Router and Tailwind CSS

- Run: `npx create-next-app@latest habit-garden --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
- Configure Tailwind in `tailwind.config.ts` with custom colors/animations as needed
- Verify: `npm run dev` starts successfully on port 3000

### 1.2 Set Up PostgreSQL Database

**Task:** Install PostgreSQL locally and create database

- Install PostgreSQL 16 on development machine (or use Docker)
- Create database: `CREATE DATABASE habitgarden;`
- Create user: `CREATE USER habitgarden_user WITH PASSWORD 'your_password';`
- Grant privileges: `GRANT ALL PRIVILEGES ON DATABASE habitgarden TO habitgarden_user;`

### 1.3 Configure Drizzle ORM

**Task:** Install Drizzle ORM and configure database connection

- Install: `npm install drizzle-orm postgres && npm install -D drizzle-kit`
- Create `src/lib/db/index.ts`:
  ```typescript
  import { drizzle } from 'drizzle-orm/postgres-js';
  import postgres from 'postgres';
  
  const connectionString = process.env.DATABASE_URL!;
  const client = postgres(connectionString);
  export const db = drizzle(client);
  ```
- Create `drizzle.config.ts` in project root
- Add `DATABASE_URL` to `.env.local`

### 1.4 Define Database Schema

**Task:** Create Drizzle schema in `src/lib/db/schema.ts`

Create the following tables with exact schema from TDD section 3.1:

- **User table:** id, email, name, avatar_url, oauth_provider, oauth_id, onboarding_completed, notification_preferences (jsonb), onesignal_player_id, timezone, created_at, updated_at
- **Habit table:** id, user_id (FK), name, emoji_buddy, direction (build/break), type (binary/measured), target_value, target_unit, frequency (daily/weekdays/weekends/custom), custom_days, reminder_time, active, sort_order, created_at, updated_at
- **CheckIn table:** id, habit_id (FK), user_id (FK), date, completed, value, created_at, updated_at — UNIQUE constraint on (habit_id, date)
- **Milestone table:** id, habit_id (FK), user_id (FK), type (streak_7/streak_30/streak_100), cosmetic, earned_at, streak_snapshot

Run migration: `npx drizzle-kit push`

### 1.5 Set Up NextAuth with Google OAuth

**Task:** Configure NextAuth.js with Google provider

- Install: `npm install next-auth@beta`
- Create `src/lib/auth/config.ts` with NextAuth configuration
- Create `src/app/api/auth/[...nextauth]/route.ts` as Auth.js handler
- Configure Google OAuth in Google Cloud Console
- Add environment variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- Test: Navigate to `/api/auth/signin` — Google sign-in button should appear

### 1.6 Create Basic Layout

**Task:** Build mobile-first responsive shell

- Update `src/app/layout.tsx` with:
  - AuthProvider wrapper (SessionProvider from next-auth/react)
  - Root layout with mobile viewport meta tag
  - Basic navigation header (logo + settings icon)
- Create `src/components/ui/Button.tsx` — reusable button component
- Create `src/components/ui/Card.tsx` — reusable card component
- Create `src/components/ui/Modal.tsx` — modal component for forms
- Create `src/components/ui/Toast.tsx` — toast notification component
- Add basic styling in `src/app/globals.css` with Tailwind

### 1.7 Create Landing Page

**Task:** Build unauthenticated landing page

- Update `src/app/page.tsx` with:
  - App name and tagline: "Your habits grow a living garden 🌱"
  - Brief explanation of the app
  - "Sign in with Google" button
  - Use Google provider sign-in page

---

## Phase 2: Core Habit Loop

Implement habit CRUD operations, check-in system, streak calculation, and basic habit detail view.

### 2.1 Implement Habit CRUD API Routes

**Task:** Create API endpoints for habit management

- `GET /api/habits` — List all habits for authenticated user (active and archived)
  - Response: Array of habit objects with all fields
- `POST /api/habits` — Create new habit
  - Body: name, emoji_buddy, direction, type, target_value?, target_unit?, frequency, custom_days?, reminder_time?
  - Enforce 3-active-habit limit server-side
  - Return: Created habit object
- `PATCH /api/habits/:id` — Update habit details
  - Body: name?, reminder_time?, frequency?, custom_days?
  - Prevent changing: emoji_buddy, direction, type
- `DELETE /api/habits/:id` — Hard delete habit + check-ins + milestones
- `POST /api/habits/:id/archive` — Soft delete (set active=false)

### 2.2 Create Habit Form Component

**Task:** Build reusable habit creation/editing form

- Create `src/components/habits/HabitForm.tsx`:
  - Direction selector: "Building a new habit" / "Breaking an old one"
  - Name input: max 50 characters
  - Type selector: "Yes/No each day" / "Track a number"
  - Target input (if measured): number field + unit text field
  - Frequency selector: Daily / Weekdays / Weekends / Custom
  - Custom days picker (if custom): 7 toggle buttons for each day
  - Reminder time picker (optional): time input
- Use existing UI components (Modal, Button, Card)

### 2.3 Implement Check-In System

**Task:** Create check-in API and UI components

**API Routes:**
- `POST /api/checkins` — Create or update check-in for today
  - Body: `{ habit_id, completed, value? }`
  - Rules: One check-in per habit per day, today only, editable until midnight
- `GET /api/checkins?habit_id=X&from=DATE&to=DATE` — Get check-ins for date range
- `DELETE /api/checkins/:id` — Delete check-in (today only)

**Components:**
- Create `src/components/habits/CheckInButton.tsx`:
  - Binary check-in: Single tap toggles completion
  - Visual feedback: Buddy reaction animation on tap
- Create `src/components/habits/MeasuredInput.tsx`:
  - Number input overlay with target display
  - Show goal: "Goal: 20 minutes"
  - Calculate partial completion: 50%+ = partial, <50% = minimal
  - Buddy reacts proportionally to completion

### 2.4 Build Streak Calculation Engine

**Task:** Implement streak logic in `src/lib/streaks/calculator.ts`

- Function `calculateStreak(habitId: string, checkIns: CheckIn[]): number`
- Logic: Count consecutive days where:
  - Binary: completed = true
  - Measured: value >= 50% of target_value
- Only count scheduled days (respect frequency settings)
- Return current streak length

### 2.5 Create Habit Detail View

**Task:** Build habit detail page at `src/app/habits/[id]/page.tsx`

- Display: Habit name, buddy emoji, current streak, completion rate
- Show check-in button (binary or measured input)
- Display today's check-in status
- Show basic stats: 7-day completion rate
- Link to analytics view

---

## Phase 3: The Garden

Implement the garden visualization system with buddy moods and environment elements.

### 3.1 Create Garden Container Component

**Task:** Build main garden layout at `src/components/garden/Garden.tsx`

- Container: max-width 420px, centered, aspect ratio ~3:4
- Three zones: left, center, right — one per possible habit
- Empty zones show: 🌫️ with "Plant a habit" prompt
- Mobile: Single column, zones stacked vertically
- Desktop (>420px): Fixed 420px container, zones side by side
- Import and render GardenZone components

### 3.2 Implement Buddy Mood Engine

**Task:** Create mood calculation logic in `src/lib/garden/moods.ts`

- Function `getBuddyMood(checkIns: CheckIn[]): MoodResult`
- Input: Check-in data for trailing 7 days
- Output: Mood enum (ecstatic/happy/content/neutral/sad/very_sad/dormant) + display emoji
- Logic:
  - 100% → Ecstatic 🤩 + bounce
  - 85-99% → Happy 😄
  - 70-84% → Content 😊
  - 50-69% → Neutral 😐
  - 25-49% → Sad 😟
  - 1-24% → Very sad 😢
  - 0% → Dormant 😴
- Grace period: First 3 days always show 😊 regardless of check-ins

### 3.3 Create Buddy Display Component

**Task:** Build `src/components/garden/BuddyDisplay.tsx`

- Props: emoji (string), mood (string), showAnimation (boolean)
- Render: Large buddy emoji (2-3rem) + smaller mood badge (1-1.5rem) positioned bottom-right
- CSS animations:
  - Bounce animation for ecstatic mood (0.3s)
  - Subtle pulse for other happy moods
- Add aria-labels for accessibility

### 3.4 Implement Zone Environment Elements

**Task:** Create environment rendering in `src/components/garden/EnvironmentElements.tsx`

- Function to determine zone state based on 14-day consistency:
  - 90-100%: Thriving → 🌳🌻🦋✨
  - 70-89%: Healthy → 🌿🌸🌼
  - 50-69%: Okay → 🌱🌾
  - 25-49%: Struggling → 🍂🥀
  - 0-24%: Neglected → 🍂💨🕸️
- Render elements at predefined positions within zone using percentage coordinates
- Apply CSS transitions (0.3-0.5s) for state changes

### 3.5 Build Sky Atmosphere System

**Task:** Create `src/components/garden/SkyAtmosphere.tsx`

- Calculate aggregate health across all habits
- Determine sky/atmosphere based on TDD section 4.5 table:
  - All thriving: ☀️🌈
  - Mostly good: 🌤️
  - Mixed: ⛅
  - Mostly struggling: 🌥️
  - All neglected: 🌧️
- Render ground elements: 💚/🌿/mixed/🍂/grey
- Render ambient elements: 🦋🐝🐦/🐦/—/—/🕸️
- CSS transitions for atmosphere changes

### 3.6 Create Garden API Endpoint

**Task:** Build `GET /api/garden` endpoint

- Query all active habits for authenticated user
- Calculate each buddy's mood using mood engine
- Calculate each zone's environment state
- Calculate shared atmosphere
- Return complete garden state object

### 3.7 Update Garden Page

**Task:** Create `src/app/garden/page.tsx`

- Fetch garden state on load
- Render Garden component
- Show "+" button if user has <3 active habits
- Link to habit detail on buddy tap

---

## Phase 4: Milestones & Rewards

Implement milestone detection, cosmetic awards, and celebration overlays.

### 4.1 Create Milestone Checker

**Task:** Build `src/lib/milestones/checker.ts`

- Function `checkMilestones(habitId: string, currentStreak: number): Milestone[]`
- Check thresholds:
  - 7 days → Bronze tier: Accessory (🎩 🕶️ 👑 🎀 🧢 🎪)
  - 30 days → Silver tier: Companion (🐕 🐈 🐦 🐿️ 🦊 🐸)
  - 100 days → Gold tier: Landmark (🏰 🌈 ⛲ 🎪 🗿 🎠)
- Ensure no duplicate cosmetics per user per tier
- Return earned milestone objects

### 4.2 Create Milestone API Endpoint

**Task:** Update check-in logic to detect milestones

- Modify `POST /api/checkins`:
  - After creating/updating check-in, recalculate streak
  - Call milestone checker
  - If new milestones earned:
    - Create milestone records
    - Return milestone data in response

### 4.3 Create Celebration Overlay Component

**Task:** Build `src/components/milestones/CelebrationOverlay.tsx`

- Props: milestone (type, cosmetic)
- Display: Awarded emoji (large, centered) + congratulatory message
- Message templates:
  - 7-day: "🔥 7 days straight! {buddy} earned a {cosmetic}!"
  - 30-day: "⭐ 30 days! {buddy} made a new friend: {cosmetic}!"
  - 100-day: "🏆 100 DAYS! {buddy} built something amazing: {cosmetic}!"
- Animation: Scale up + fade in + confetti effect (CSS)
- Auto-dismiss after 3 seconds or on tap

### 4.4 Display Milestone Cosmetics in Garden

**Task:** Update garden zone to show earned cosmetics

- Modify `src/components/garden/GardenZone.tsx`:
  - Query milestones for this habit
  - Render accessories on/near buddy (7-day)
  - Render companions beside buddy (30-day)
  - Render landmarks in background (100-day)
- Cosmetics persist forever regardless of future streaks

### 4.5 Create Milestone API for Garden

**Task:** Update `GET /api/garden` to include milestone data

- Join milestone table when calculating garden state
- Include earned cosmetics in zone data

---

## Phase 5: Content System

Implement habit science messages and encouragement templates with context-based selection.

### 5.1 Create Habit Science Message Library

**Task:** Create `src/lib/content/habit-science.json`

Create JSON file with message arrays for each category from TDD section 4.9:

**Categories:**
- first_steps (Days 1-3): 8 messages
- building_momentum (Days 4-14): 8 messages
- streak_broken: 8 messages
- hitting_wall (Days 14-30): 8 messages
- long_term (30+ days): 8 messages
- breaking_bad_early (Days 1-7): 8 messages
- breaking_bad_urge (Ongoing): 6 messages

Use exact messages from TDD section 4.9 (lines 324-390).

### 5.2 Create Encouragement Template Library

**Task:** Create `src/lib/content/encouragement.json`

Create JSON file with message templates from TDD section 4.10:

**Categories:**
- streak_active: 8 templates with variables {streak}, {habit_name}, {buddy}, {completion_7d}, {completion_30d}, {days_since_start}, {best_streak}, {total_checkins}
- just_checked_in: 6 templates
- comeback: 6 templates

Use exact templates from TDD section 4.10 (lines 407-430).

### 5.3 Build Context-Based Message Selector

**Task:** Create `src/lib/content/selector.ts`

- Function `getHabitScienceMessage(habit: Habit, checkIns: CheckIn[], trigger: TriggerType): string`
- Function `getEncouragementMessage(habit: Habit, checkIns: CheckIn[], context: ContextType): string`
- Logic:
  - Determine user's current state (days since start, streak length, recent completion rate)
  - Select appropriate category
  - Cycle through messages without repeating until all exhausted, then reset
- Return formatted message with variable substitution

### 5.4 Create Content API Endpoint

**Task:** Build `GET /api/content/message` endpoint

- Query params: `habit_id`, `trigger` (streak_broken/first_steps/etc.)
- Call selector to get appropriate message
- Return message object

### 5.5 Display Messages in UI

**Task:** Add message displays to habit detail and check-in flow

- Create `src/components/content/HabitScienceCard.tsx`:
  - Display contextual advice in habit detail view
  - Position: Below check-in button
  - Show one message per day per habit maximum
- Create `src/components/content/EncouragementToast.tsx`:
  - Show brief encouragement after check-in
  - Auto-dismiss after 3 seconds
  - Position: Toast at bottom of screen

---

## Phase 6: Notifications

Implement OneSignal integration, notification scheduling, and PWA install guidance.

### 6.1 Set Up OneSignal Account

**Task:** Configure OneSignal for web push notifications

- Create OneSignal account at onesignal.com
- Create new app: "Habit Garden"
- Select platform: Web (Chrome, Firefox, Safari)
- Configure site URL: Your deployed domain
- Get API credentials: App ID and API key
- Add to environment: `ONESIGNAL_APP_ID`, `ONESIGNAL_API_KEY`

### 6.2 Integrate OneSignal SDK

**Task:** Add OneSignal to Next.js app

- Install: `npm install react-onesignal`
- Create `src/lib/notifications/onesignal.ts`:
  - Initialize OneSignal with app ID
  - Handle notification permission
  - Function `registerPlayerId(): Promise<string>` — returns player ID
- Add OneSignal initialization to `src/app/layout.tsx` (client-side only)
- Create `POST /api/notifications/register` endpoint to save player ID to user record

### 6.3 Create Notification Scheduler

**Task:** Build cron-based notification system

- Create `src/cron/notification-worker.ts`:
  - Run every 15 minutes
  - Query all users with notification preferences
  - For each user, check each active habit:
    - **Reminder:** If reminder_time matches current time, send scheduled reminder
    - **Missed check-in:** If no check-in by 9pm local, send nudge
    - **Re-engagement:** If no app opens for 3+ days, send re-engagement message
    - **Weekly summary:** If Sunday 10am, send weekly summary
- Create `src/lib/notifications/scheduler.ts`:
  - OneSignal API client functions
  - Message template selection by type

### 6.4 Define Notification Templates

**Task:** Create notification message templates

From TDD section 4.8:

**Reminder:**
- "🦉 is wondering if you stayed off your phone tonight"

**Missed check-in (9pm):**
- "📚 is still waiting for you today — there's still time"

**Streak celebration:**
- "🔥 7 days straight! 🏃 just earned a 🎩!"

**Re-engagement (3+ days):**
- "Your garden misses you 🌱 — your buddies are getting lonely"

**Weekly summary (Sunday 10am):**
- "This week: 🏃 5/7, 📚 7/7, 🦉 4/7 — your garden is looking good!"

**Personality rules:**
- Always include relevant buddy emoji
- Warm, light, playful tone
- Never guilt-tripping

### 6.5 Create iOS PWA Install Guide

**Task:** Build step-by-step iOS install instructions

- Create `src/components/notifications/NotificationPrompt.tsx`:
  - Detect iOS Safari: `navigator.userAgent.includes('iPhone') && navigator.userAgent.includes('Safari')`
  - Show visual guide: "Tap Share → Add to Home Screen"
  - Explain notifications require home screen install
  - Store shown flag in localStorage
- Create `POST /api/notifications/preferences` endpoint for notification settings

### 6.6 Test Notifications

**Task:** Verify notification delivery

- Enable notifications in development
- Test each notification type manually
- Verify timezone-aware scheduling works correctly

---

## Phase 7: Analytics & Polish

Implement analytics views, onboarding flow, Apple OAuth, PWA features, and final polish.

### 7.1 Create Calendar Heatmap Component

**Task:** Build `src/components/analytics/CalendarHeatmap.tsx`

- Props: habitId, checkIns array
- Display: 90-day grid (13 weeks × 7 days)
- Cell colors:
  - Completed: Green 🟩
  - Partial (measured 50%+): Yellow 🟨
  - Missed: Red 🟥
  - Not scheduled: Grey ⬜
- Click cell to see date and value
- Responsive: Scrollable horizontally on mobile

### 7.2 Build Completion Rate Calculations

**Task:** Add analytics calculation functions

- Create `src/lib/analytics/calculations.ts`:
  - `getCompletionRate7d(habitId): number`
  - `getCompletionRate30d(habitId): number`
  - `getCompletionRate90d(habitId): number`
  - `getCompletionRateAllTime(habitId): number`
  - For measured habits: calculate average value vs. target
- Create `GET /api/analytics/[habitId]` endpoint returning all stats

### 7.3 Create Per-Habit Analytics Page

**Task:** Build `src/app/habits/[id]/analytics/page.tsx`

- Display calendar heatmap
- Show current streak with "best streak" comparison
- Display completion rates: 7-day, 30-day, 90-day, all-time
- For measured habits: show average value vs. target + trend chart

### 7.4 Create Global Analytics Page

**Task:** Build `src/app/analytics/page.tsx`

- Overall completion rate across all habits
- Total check-ins all-time
- Combined streak: Days where ALL active habits completed
- Milestones earned: Gallery of all cosmetic unlocks

### 7.5 Implement Onboarding Flow

**Task:** Build 4-step onboarding at `src/app/onboarding/page.tsx`

**Step 1 — Welcome:**
- "Welcome to Habit Garden 🌱"
- Brief explanation + "Let's go" button

**Step 2 — Create First Habit:**
- Use HabitForm component (from Phase 2)
- Same fields as regular habit creation

**Step 3 — Choose Buddy:**
- Create `src/components/habits/EmojiPicker.tsx`:
  - Grid of ~30 emoji options
  - Categories: People, Animals, Activities, Objects
  - Tap to select, preview shows buddy in happy state
- Suggested pairings hints (not enforced)

**Step 4 — Set Reminder:**
- Optional time picker for daily notification
- "Add to Home Screen" instruction (iOS: Share → Add to HS)
- Skip option

After completion: Set `onboarding_completed = true` in user record, redirect to garden.

### 7.6 Add Apple OAuth

**Task:** Configure Sign in with Apple

- Set up Apple Developer account (if not already)
- Configure OAuth in Apple Developer portal
- Update `src/lib/auth/config.ts` with Apple provider
- Add environment: `APPLE_ID`, `APPLE_SECRET`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`
- Test: Sign in with Apple button appears on sign-in page

### 7.7 Configure PWA

**Task:** Set up Progressive Web App features

- Install: `npm install next-pwa`
- Create `public/manifest.json`:
  - name: "Habit Garden"
  - short_name: "HabitGarden"
  - theme_color: "#4ADE80"
  - background_color: "#FAFAF9"
  - display: "standalone"
  - icons: Various sizes (72, 96, 128, 144, 152, 192, 384, 512)
- Create icon files in `public/icons/`
- Update `next.config.js` with next-pwa configuration
- Test: "Add to Home Screen" works on mobile

### 7.8 Final Responsive Polish

**Task:** Ensure consistent experience across devices

- Test all pages on mobile (< 420px), tablet, desktop
- Verify touch targets are minimum 44px
- Check all animations are smooth (no jank)
- Verify color contrast meets accessibility standards
- Ensure keyboard navigation works on all interactive elements
- Test with screen reader (VoiceOver/TalkBack)

### 7.9 Deploy to AWS Lightsail

**Task:** Production deployment

**Instance setup:**
- Launch Ubuntu 22.04 LTS on Lightsail ($5/month)
- SSH into instance
- Install Node.js 20 LTS, PostgreSQL 16, nginx

**Database:**
- Create production database
- Run migrations: `npx drizzle-kit push`

**Process management:**
- Install PM2: `npm install -g pm2`
- Create ecosystem.config.js for Next.js + cron worker
- Start: `pm2 start ecosystem.config.js`

**Reverse proxy:**
- Configure nginx to proxy port 80/443 → Next.js on port 3000

**SSL:**
- Install certbot
- Run: `sudo certbot --nginx -d yourdomain.com`
- Enable auto-renewal

**Environment:**
- Set all environment variables on server
- Build: `npm run build`
- Restart: `pm2 restart all`

---

## Phase Dependencies

```
Phase 1 ──┬──> Phase 2 ──> Phase 3 ──> Phase 4 ──> Phase 5 ──> Phase 6 ──> Phase 7
          │        │          │          │          │          │
          │        │          │          │          │          └────────> Apple OAuth
          │        │          │          │          └────────────────-> PWA config
          │        │          │          └────────────────---> Milestones in Garden
          │        └────────────────-> Garden API
          │                                        
          └────────────────────────────────> All subsequent phases depend on auth
```

---

## File Structure Summary

```
habit-garden/
├── app/
│   ├── layout.tsx                    # Phase 1.6
│   ├── page.tsx                      # Phase 1.7
│   ├── garden/page.tsx               # Phase 3.6
│   ├── habits/
│   │   ├── new/page.tsx             # Phase 2.2
│   │   ├── [id]/
│   │   │   ├── page.tsx             # Phase 2.5
│   │   │   └── analytics/page.tsx   # Phase 7.3
│   ├── onboarding/page.tsx           # Phase 7.5
│   ├── analytics/page.tsx            # Phase 7.4
│   ├── settings/page.tsx             # Phase 7
│   └── api/
│       ├── auth/[...nextauth]/      # Phase 1.5
│       ├── habits/route.ts          # Phase 2.1
│       ├── habits/[id]/route.ts     # Phase 2.1
│       ├── checkins/route.ts        # Phase 2.3
│       ├── garden/route.ts          # Phase 3.6
│       ├── analytics/[habitId]/    # Phase 7.2
│       ├── notifications/register/ # Phase 6.2
│       └── content/message/        # Phase 5.4
├── components/
│   ├── garden/
│   │   ├── Garden.tsx               # Phase 3.1
│   │   ├── GardenZone.tsx           # Phase 3.4
│   │   ├── BuddyDisplay.tsx         # Phase 3.3
│   │   ├── EnvironmentElements.tsx  # Phase 3.4
│   │   ├── SkyAtmosphere.tsx        # Phase 3.5
│   │   └── MilestoneCosmetics.tsx   # Phase 4.4
│   ├── habits/
│   │   ├── HabitForm.tsx            # Phase 2.2
│   │   ├── CheckInButton.tsx        # Phase 2.3
│   │   ├── MeasuredInput.tsx        # Phase 2.3
│   │   └── EmojiPicker.tsx          # Phase 7.5
│   ├── analytics/
│   │   ├── CalendarHeatmap.tsx      # Phase 7.1
│   │   ├── StreakDisplay.tsx        # Phase 7
│   │   └── CompletionRates.tsx      # Phase 7
│   ├── content/
│   │   ├── HabitScienceCard.tsx     # Phase 5.5
│   │   └── EncouragementToast.tsx   # Phase 5.5
│   ├── notifications/
│   │   └── NotificationPrompt.tsx  # Phase 6.5
│   └── ui/
│       ├── Button.tsx               # Phase 1.6
│       ├── Card.tsx                 # Phase 1.6
│       ├── Modal.tsx                # Phase 1.6
│       └── Toast.tsx                # Phase 1.6
├── lib/
│   ├── db/
│   │   ├── schema.ts                # Phase 1.4
│   │   └── index.ts                 # Phase 1.3
│   ├── auth/config.ts               # Phase 1.5
│   ├── garden/
│   │   ├── engine.ts                # Phase 3
│   │   ├── moods.ts                 # Phase 3.2
│   │   └── elements.ts              # Phase 3.4
│   ├── streaks/calculator.ts        # Phase 2.4
│   ├── milestones/checker.ts        # Phase 4.1
│   ├── content/
│   │   ├── habit-science.json       # Phase 5.1
│   │   ├── encouragement.json       # Phase 5.2
│   │   └── selector.ts              # Phase 5.3
│   ├── notifications/
│   │   ├── onesignal.ts             # Phase 6.2
│   │   └── scheduler.ts             # Phase 6.3
│   └── utils/
│       ├── dates.ts                 # Phase 2
│       └── constants.ts             # Phase 2
├── cron/
│   └── notification-worker.ts       # Phase 6.3
├── public/
│   ├── manifest.json                # Phase 7.7
│   ├── sw.js                        # Phase 7.7
│   └── icons/                       # Phase 7.7
├── drizzle.config.ts                # Phase 1.3
├── next.config.js                   # Phase 7.7
├── tailwind.config.ts               # Phase 1.1
├── tsconfig.json
├── package.json
└── .env.local                       # Phase 1
```

---

## Notes for LLM Execution

1. **Execute phases in order** — Each phase builds on the previous
2. **Test after each task** — Run `npm run dev` and verify functionality
3. **Check dependencies** — Ensure all imports resolve correctly
4. **TypeScript strict mode** — Fix all type errors before proceeding
5. **Tailwind classes** — Use utility classes; avoid custom CSS unless necessary
6. **Environment variables** — Document required vars in comments
7. **Accessibility** — Add aria-labels to emoji, ensure keyboard navigation
8. **Mobile-first** — Design for mobile (< 420px) first, then scale up

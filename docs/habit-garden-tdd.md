# Habit Garden — Technical Design Document

## 1. Product Overview

Habit Garden is a cozy, emoji-powered habit tracker that turns personal consistency into a living visual world. Users track up to 3 habits (building or breaking), each represented by an emoji buddy that lives in a shared garden. The garden thrives when users stay consistent and wilts when they don't. Contextual encouragement, habit science, and milestone unlocks create emotional stakes that keep users engaged beyond the typical two-week abandonment window.

**Platform:** Progressive Web App (PWA), mobile-first, installable to home screen  
**Target Users:** Anyone building or breaking habits. Technical enough to find a PWA, non-technical enough to enjoy emoji friends.  
**Monetization:** None (personal project / process demonstration)

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 14 (App Router) | React-based, excellent PWA support, SSR for landing page SEO, strong LLM training data coverage |
| Styling | Tailwind CSS | Utility-first, rapid prototyping, well-understood by LLMs |
| Backend/API | Next.js API Routes | Co-located with frontend, no separate server to manage |
| Database | PostgreSQL on AWS Lightsail | Reliable, well-supported, runs on same Lightsail instance |
| ORM | Drizzle ORM | Lightweight, TypeScript-native, no Prisma issues |
| Authentication | NextAuth.js (Auth.js v5) | Built-in Google and Apple OAuth providers, session management |
| Push Notifications | OneSignal (free tier) | 10k/month email, unlimited mobile push, handles service worker complexity |
| Hosting | AWS Lightsail | Single instance running Node.js + PostgreSQL |
| Package Manager | npm | Standard, no surprises |

---

## 3. Information Architecture

### 3.1 Core Data Model

```
User
├── id (uuid, PK)
├── email (string, unique)
├── name (string)
├── avatar_url (string, nullable)
├── oauth_provider (enum: google, apple)
├── oauth_id (string)
├── onboarding_completed (boolean, default false)
├── notification_preferences (jsonb)
├── onesignal_player_id (string, nullable)
├── timezone (string)
├── created_at (timestamp)
└── updated_at (timestamp)

Habit
├── id (uuid, PK)
├── user_id (uuid, FK → User)
├── name (string, max 50 chars)
├── emoji_buddy (string — single emoji)
├── direction (enum: build, break)
├── type (enum: binary, measured)
├── target_value (integer, nullable — only for measured type)
├── target_unit (string, nullable — e.g., "minutes", "glasses")
├── frequency (enum: daily, weekdays, weekends, custom)
├── custom_days (integer[], nullable — 0=Sun, 6=Sat)
├── reminder_time (time, nullable)
├── active (boolean, default true)
├── sort_order (integer)
├── created_at (timestamp)
└── updated_at (timestamp)

CheckIn
├── id (uuid, PK)
├── habit_id (uuid, FK → Habit)
├── user_id (uuid, FK → User)
├── date (date — the calendar day this check-in is for)
├── completed (boolean)
├── value (integer, nullable — for measured habits)
├── created_at (timestamp)
└── updated_at (timestamp)
UNIQUE CONSTRAINT: (habit_id, date)

Milestone
├── id (uuid, PK)
├── habit_id (uuid, FK → Habit)
├── user_id (uuid, FK → User)
├── type (enum: streak_7, streak_30, streak_100)
├── cosmetic (string — emoji awarded)
├── earned_at (timestamp)
└── streak_snapshot (integer — the streak length when earned)

GardenState (computed/cached, not a table — derived from CheckIn + Milestone data)
```

### 3.2 Habit Limits

- Maximum 3 active habits per user (hard limit, enforced server-side)
- Archived habits are retained for history but don't count toward the limit
- Users must archive or delete a habit before creating a new one when at the limit

---

## 4. Feature Specifications

### 4.1 Authentication

**Google OAuth**
- Standard OAuth 2.0 flow via NextAuth.js Google provider
- Scopes: email, profile

**Apple OAuth**
- Sign in with Apple via NextAuth.js Apple provider
- Requires Apple Developer account configuration
- Returns name only on first sign-in (cache it)

**Session Management**
- JWT-based sessions via NextAuth.js
- 30-day session expiry
- Automatic refresh on activity

### 4.2 Onboarding Flow

A guided 4-step walkthrough shown once after first sign-in.

**Step 1: Welcome**
- "Welcome to Habit Garden 🌱"
- Brief explanation: "Your habits grow a living garden. Stay consistent and watch it thrive."
- Single "Let's go" button

**Step 2: Create Your First Habit**
- Choose direction: "Building a new habit" or "Breaking an old one"
- Enter habit name (text input, max 50 chars)
- Choose type: "Yes/No each day" or "Track a number" (with target + unit if measured)
- Choose frequency: Daily, Weekdays, Weekends, Custom (day picker)

**Step 3: Choose Your Buddy**
- Grid of ~30 emoji options, organized loosely by category
- User taps to select
- Preview shows the buddy in happy state with name underneath
- Suggested pairings shown as hints (e.g., 🏃 for exercise, 📚 for reading, 🦉 for sleep habits) but any emoji can be used for any habit

**Step 4: Set Reminder**
- Optional time picker for daily push notification
- Brief explanation of PWA install requirement for iOS
- "Add to Home Screen" instruction with platform-specific guidance
- Skip option available

After completing onboarding, user lands on the Garden view with their first buddy planted.

### 4.3 Habit Management

**Creating a Habit**
- Available from garden view via "+" button (only shown if < 3 active habits)
- Same form as onboarding Step 2 + 3 combined
- New buddy appears in garden immediately in neutral/happy state

**Editing a Habit**
- Accessible from habit detail view
- Can change: name, reminder time, frequency
- Cannot change: emoji buddy, direction, type (these are identity — create a new one instead)

**Archiving a Habit**
- Moves habit to inactive state
- Buddy disappears from garden
- History and milestones preserved
- Frees up a slot for a new habit

**Deleting a Habit**
- Confirmation required ("This will permanently delete all check-in history")
- Hard delete of habit, check-ins, and milestones

### 4.4 Daily Check-In

**Binary Habits**
- Single tap on the buddy in the garden view, or tap from habit detail
- Toggleable — tap again to undo if checked in by mistake
- Buddy reacts immediately (emoji state change + brief CSS animation)

**Measured Habits**
- Tap buddy opens a simple number input overlay
- Shows target ("Goal: 20 minutes")
- User enters actual value
- Buddy reacts proportionally:
  - Met or exceeded goal → full completion, thrilled reaction
  - 50%+ of goal → partial completion, content reaction
  - Under 50% → logged but buddy is unimpressed

**Check-In Rules**
- One check-in per habit per calendar day (user's timezone)
- Can check in for today only (no backdating, no future-dating)
- Check-ins are editable/deletable until midnight local time

### 4.5 The Garden

The garden is the home screen — the first thing users see.

**Layout**
- Freeform scene composition, not a rigid grid
- Garden has designated zones: left, center, right — one per possible habit (max 3)
- Each zone contains: the buddy emoji (large, central), surrounding environment elements
- A shared "commons" area between zones shows global garden health elements (sky, ground, ambient decorations)

**Garden Element Progression**
Each buddy's zone evolves based on that habit's consistency over the trailing 14 days:

| Consistency (14-day) | Zone State | Elements |
|---------------------|------------|----------|
| 90-100% | Thriving | 🌳🌻🦋✨ Lush, mature, sparkles |
| 70-89% | Healthy | 🌿🌸🌼 Growing well |
| 50-69% | Okay | 🌱🌾 Basic growth |
| 25-49% | Struggling | 🍂🥀 Wilting, autumn colors |
| 0-24% | Neglected | 🍂💨🕸️ Dead leaves, cobwebs |

**Shared Commons Elements**
The overall garden environment reflects aggregate health across all habits:

| Aggregate Health | Sky/Atmosphere | Ground | Ambient |
|-----------------|---------------|--------|---------|
| All thriving | ☀️🌈 | 💚 green | 🦋🐝🐦 |
| Mostly good | 🌤️ | 🌿 green | 🐦 |
| Mixed | ⛅ | mixed | — |
| Mostly struggling | 🌥️ | 🍂 brown | — |
| All neglected | 🌧️ | grey | 🕸️ |

**Milestone Cosmetics Display**
Earned cosmetics appear permanently in the buddy's zone:
- 7-day accessories appear on/near the buddy
- 30-day companions appear beside the buddy
- 100-day landmarks appear in the background of the zone

**Technical Implementation**
- Garden rendered as a CSS-positioned container with emoji elements
- Each element has absolute/relative positioning within its zone
- CSS transitions (0.3-0.5s) for state changes
- Garden state recalculated on page load and after each check-in
- No canvas or complex rendering — pure HTML/CSS with emoji text

### 4.6 Buddy Mood Engine

Each buddy displays a mood emoji overlay/replacement based on recent performance.

**Mood Calculation**
Input: check-in completion data for trailing 7 days (or fewer if habit is newer than 7 days)

| 7-Day Completion | Mood | Display |
|-----------------|------|---------|
| 100% | Ecstatic | 🤩 + bounce animation |
| 85-99% | Happy | 😄 |
| 70-84% | Content | 😊 |
| 50-69% | Neutral | 😐 |
| 25-49% | Sad | 😟 |
| 1-24% | Very sad | 😢 |
| 0% | Dormant | 😴 |

**Mood Display**
- The buddy's chosen emoji is always visible as identity
- Mood is shown as a smaller emoji badge/overlay on the buddy
- The mood badge is the primary emotional signal; the buddy emoji is the identity anchor

**New Habit Grace Period**
- First 3 days: mood starts at 😊 regardless of check-ins
- Prevents new users from seeing sad buddies before they've had a chance to establish a pattern

### 4.7 Milestones & Unlocks

Milestones are earned permanently when a streak threshold is reached. They are never revoked.

**Streak Calculation**
- Consecutive days where the habit was completed (binary: checked in; measured: met 50%+ of target)
- Only counts days where the habit was scheduled (respects frequency settings)
- A missed scheduled day breaks the streak

**Milestone Tiers**

| Streak | Tier | Cosmetic Type | Examples (random selection from pool) |
|--------|------|--------------|---------------------------------------|
| 7 days | Bronze | Accessory for buddy | 🎩 🕶️ 👑 🎀 🧢 🎪 |
| 30 days | Silver | Companion | 🐕 🐈 🐦 🐿️ 🦊 🐸 |
| 100 days | Gold | Landmark | 🏰 🌈 ⛲ 🎪 🗿 🎠 |

**Award Flow**
1. Check-in triggers streak recalculation
2. If streak crosses a threshold → milestone record created
3. Cosmetic randomly selected from tier pool (ensuring no duplicates across user's milestones)
4. Celebration overlay shown: the awarded emoji with congratulatory message
5. Cosmetic permanently appears in buddy's garden zone

**Re-earning After Streak Break**
- Once a milestone tier is earned for a specific habit, it cannot be earned again for that habit
- The cosmetic persists forever in the garden regardless of future streaks

### 4.8 Contextual Notifications (OneSignal)

**Notification Types**

| Type | Trigger | Timing | Example |
|------|---------|--------|---------|
| Reminder | Scheduled by user per habit | User-set time | "🦉 is wondering if you stayed off your phone tonight" |
| Missed check-in | No check-in by 9pm local | 9:00 PM | "📚 is still waiting for you today — there's still time" |
| Streak celebration | Streak milestone reached | Immediately after check-in | "🔥 7 days straight! 🏃 just earned a 🎩!" |
| Re-engagement | No app opens for 3+ days | 10:00 AM | "Your garden misses you 🌱 — your buddies are getting lonely" |
| Weekly summary | Every Sunday | 10:00 AM | "This week: 🏃 5/7, 📚 7/7, 🦉 4/7 — your garden is looking good!" |

**Notification Personality**
- Always include the relevant buddy emoji
- Tone: warm, light, slightly playful, never guilt-tripping
- Missed check-in messages acknowledge there's still time rather than shaming
- Re-engagement messages focus on the garden/buddies missing the user, not on failure

**OneSignal Integration**
- OneSignal Web SDK initialized on app load
- Player ID stored in User record after notification permission granted
- Notification scheduling handled by server-side cron job (runs every 15 minutes)
- Cron checks each user's habits, timezone, and notification preferences
- Sends via OneSignal REST API

**PWA Requirements for Notifications**
- Service worker registered via next-pwa
- iOS users must add to home screen (prompted during onboarding)
- Notification permission requested during onboarding Step 4

### 4.9 Contextual Habit Science

Research-backed advice delivered at the right moment in the user's journey. All content is pre-written and stored as a static JSON content library. Messages are selected based on the user's current state.

**State Triggers & Content Categories**

Each category contains 8-12 unique messages. The system selects one message per trigger event, cycling through without repeats until all are exhausted.

**Category: First Steps (Days 1-3 of a new habit)**
1. "The first few days aren't about building the habit — they're about building the identity of someone who does this. You're not 'trying to read more.' You're a reader now."
2. "Research from UCL found the average time to form a habit is 66 days, but the range is huge — 18 to 254 days. Don't measure yourself against a magic number. Just keep showing up."
3. "The most effective strategy for new habits is called 'habit stacking' — attach your new habit to something you already do. 'After I pour my coffee, I read for 10 minutes.' The existing habit becomes the trigger."
4. "BJ Fogg's research at Stanford shows that making a habit tiny is more effective than relying on motivation. If your goal feels hard today, do the smallest possible version. One page. One minute. It counts."
5. "Your brain hasn't built the neural pathway for this yet. Right now, doing this habit requires active decision-making. In a few weeks, it'll start to feel automatic. The hard part is right now."
6. "Environment design beats willpower every time. Want to read more? Put the book on your pillow. Want to stop snacking? Move the snacks out of sight. Make the right choice the easy choice."
7. "James Clear calls it the 'two-minute rule' — when you start a new habit, it should take less than two minutes to do. The point isn't the activity. The point is showing up consistently."
8. "You're in the 'initiation phase' right now. Research shows this is when conscious effort is highest. It gets easier — not because the habit changes, but because your brain starts automating it."

**Category: Building Momentum (Days 4-14)**
1. "You're past the first few days. That matters more than you think — most people who attempt a new habit don't make it past day 3."
2. "Your brain is starting to build the neural pathway now. Each repetition strengthens it. Think of it like a path through tall grass — the more you walk it, the clearer it gets."
3. "Motivation is unreliable. What you're building right now is something better: a routine. Routines don't need motivation. They run on momentum."
4. "Research shows that the context — same time, same place, same preceding action — matters as much as the habit itself. Your brain is learning the pattern, not just the behavior."
5. "If you're finding some days harder than others, that's normal. Habit strength isn't linear. It's more like a stock market — volatile day to day, trending upward over time."
6. "Don't optimize yet. Don't try to read more pages, run farther, or meditate longer. Just keep the streak alive. Volume comes after consistency."
7. "You're in what researchers call the 'learning phase.' Your brain is associating cue → routine → reward. The reward matters — notice how it feels after you complete this habit."
8. "Social accountability increases habit adherence by 65% in some studies. Even just telling one person what you're working on can help."

**Category: Streak Broken**
1. "A broken streak feels like starting over. It's not. Research shows that missing once has almost no measurable impact on long-term habit formation. Missing twice is where it gets dangerous."
2. "Perfection isn't the goal — consistency is. And consistency includes recovery. The fact that you're here, seeing this message, means you haven't quit."
3. "There's a concept called 'abstinence violation effect' — the tendency to go all-in on failure after one slip. 'I already missed one day, why bother?' That's the real enemy, not the missed day."
4. "The best athletes in the world miss training sessions. The difference is they show up the next day. Your streak number reset. Your progress didn't."
5. "Ask yourself: what got in the way? Not to judge yourself, but to problem-solve. If the answer is 'I forgot,' that's an environment design problem. If it's 'I didn't feel like it,' that's a motivation design problem. Both are solvable."
6. "Research from Phillippa Lally at UCL found that a single missed day did not meaningfully affect the habit formation process. The trajectory stayed the same. One miss is noise, not signal."
7. "Your buddy doesn't know what a 'streak' is. It just knows you showed up today. That's all that matters right now."
8. "Here's what didn't reset: every neural pathway you've built, every time you chose this habit over the alternative, every day you showed up before today. That infrastructure is still there."

**Category: Hitting a Wall (Completion dropping, days 14-30)**
1. "This is the part nobody talks about — the messy middle. The novelty has worn off. The results haven't fully arrived yet. This is where most habits die. But it's also where real habits are made."
2. "If it's feeling like a chore, try reducing the scope temporarily. Half the time, half the effort. It's better to do a tiny version than to skip entirely."
3. "Discipline isn't a personality trait — it's a skill, and it fatigues like a muscle. If you're struggling, look at what else is draining your willpower right now. Sometimes the answer isn't 'try harder' — it's 'simplify everything else.'"
4. "Research on 'ego depletion' suggests that self-control is a limited resource. If your days are full of hard decisions, you'll have less energy for your habits. Consider moving your habit to a time when you're freshest."
5. "Boredom is the biggest threat to habit maintenance, not difficulty. If the habit feels boring, that's actually a sign it's becoming automatic. The boredom is the pathway to permanence."
6. "This is a great time to revisit your 'why.' Not the surface reason — the deep one. You're not just reading 20 minutes a day. You're becoming someone who prioritizes learning. Reconnect with that."
7. "Consider adding a small reward immediately after the habit. Your brain needs the dopamine loop to close. The long-term benefits are too distant — give yourself something now too."
8. "You've been at this for weeks. That's not nothing — that's remarkable, statistically. Most people are already gone by now. You're in a smaller group than you think."

**Category: Long-Term Consistency (30+ days)**
1. "At this point, the research suggests your habit is transitioning from 'effortful' to 'automatic.' You might notice some days you do it without even thinking about it. That's the goal."
2. "30+ days. This is no longer an experiment — it's part of your life now. The neural pathway is well-worn. Protect it, but also know that it's getting more resilient every day."
3. "Here's something interesting: people who maintain habits long-term report that the habit itself becomes the reward. It stops being 'something I have to do' and becomes 'something I'd miss if I didn't do.' Watch for that shift."
4. "You've proven something to yourself that no app, book, or motivational speaker could prove for you: you can decide to change a behavior and actually do it. That's transferable to everything."
5. "At this stage, the main risk isn't quitting — it's disruption. Travel, illness, life changes. Have a plan for those. What's the minimum viable version of this habit when everything else falls apart?"
6. "Your consistency is now a data point your brain uses for identity. 'I'm someone who does this.' That's the most powerful force in habit psychology — identity-based habits outlast goal-based ones."
7. "Consider leveling up slightly. Not dramatically — just enough to keep growth happening. Add 5 minutes. One more rep. A slightly harder version. Stagnation and boredom are the enemies now."
8. "You don't need this advice anymore. But here's some anyway: the fact that you're still checking in after 30+ days means the system is working. Trust it."

**Category: Breaking a Bad Habit — Early Days (Days 1-7)**
1. "Breaking a habit is neurologically harder than building one. You're not just creating a new pathway — you're fighting an existing one. Be patient with yourself."
2. "The urge to do the thing you're quitting will come in waves. They peak and pass, usually within 10-15 minutes. If you can ride it out, the wave subsides. Every wave you survive weakens the next one."
3. "Identify your triggers. Every bad habit has a cue — a time, place, emotion, or preceding action that kicks off the behavior. You can't fight what you can't see."
4. "Replacement is more effective than elimination. Don't just stop doing the thing — replace it with something else that satisfies the same underlying need. Doomscrolling fills a need for stimulation. What else could fill it?"
5. "Tell yourself 'not right now' instead of 'never again.' Your brain panics at permanent restriction. 'Not right now' is manageable. String enough of those together and you've broken the habit."
6. "Remove friction from the right choice, add friction to the wrong one. Want to stop late-night scrolling? Charge your phone in another room. The 30 seconds of effort to go get it is often enough."
7. "Expect the first 72 hours to be the hardest. After that, the acute withdrawal of the dopamine loop starts to fade. You're in the hardest part right now."
8. "You're not 'giving something up.' You're gaining something: control, time, health, freedom. Frame it as an addition, not a subtraction."

**Category: Breaking a Bad Habit — Urge Management (Ongoing)**
1. "Feeling the pull right now? That's your basal ganglia — the habit center of your brain — sending a signal. It's automated and unconscious. Recognizing it as a signal, not a command, is half the battle."
2. "The 'urge surfing' technique: instead of fighting the urge, observe it. Where do you feel it in your body? How intense is it on a 1-10 scale? Just watching it with curiosity tends to reduce its power."
3. "Each time you feel the urge and don't act on it, you're weakening the neural pathway. It doesn't feel like progress, but it is. The pathway is literally decaying from disuse."
4. "If you caved today, the worst thing you can do is binge on it. One slip is recoverable. A full relapse is much harder to come back from. Limit the damage and reset tomorrow."
5. "High-risk times for bad habits: when you're tired, hungry, lonely, stressed, or bored (the HALT-B framework). If you're feeling any of these, address that need first. The urge may disappear on its own."
6. "Change your environment during high-risk windows. If evenings are your danger zone, be somewhere different. Go for a walk. Call someone. Physical environment change disrupts the cue-routine loop."

**Display Rules**
- One message shown per day per habit, maximum
- Messages appear in the habit detail view, below the check-in button
- Also included in relevant push notifications when contextually appropriate
- Messages cycle through the category pool without repeating until all are exhausted, then reset
- Category selection is based on current state: streak length, direction (build/break), recent completion rate, and specific trigger events (streak broken, milestone reached, etc.)

### 4.10 Data-Informed Encouragement

Supportive messages generated from templates using the user's actual data. These are distinct from the habit science messages — they're short, personal, and data-driven.

**Template Library**

Messages use variables: `{streak}`, `{habit_name}`, `{buddy}`, `{completion_7d}`, `{completion_30d}`, `{days_since_start}`, `{best_streak}`, `{total_checkins}`

**Streak Active**
1. "{streak} days. {buddy} is proud of you, and frankly so am I."
2. "You've done {habit_name} {streak} days in a row. That's not luck. That's you."
3. "{completion_7d} out of 7 this week. {buddy} is thriving."
4. "Day {streak}. {days_since_start} days ago this habit didn't exist in your life."
5. "{total_checkins} total check-ins on {habit_name}. Every one of those was a choice you made."
6. "Your best streak is {best_streak} days. Current streak: {streak}. Closing in."
7. "{streak} days. At this point {buddy} would be worried if you *didn't* show up."
8. "Week over week, you're at {completion_7d}/7. That's a pattern, not a fluke."

**Just Checked In**
1. "Done. {buddy} is happy. That's all there is to it."
2. "Checked in. Another brick in the wall."
3. "Day {streak} is in the books."
4. "{buddy} says thanks."
5. "That's {completion_7d} out of 7 this week. Nice."
6. "Logged. Your garden is a little greener today."

**Comeback (checking in after a miss)**
1. "You're back. That's the only thing that matters."
2. "{buddy} missed you. But {buddy} doesn't hold grudges."
3. "Streak's at 1. That's a start. It's always a start."
4. "The hardest check-in is the one after a miss. This was that one. It's done now."
5. "Welcome back. Your garden remembers what it looked like when you were here."
6. "Day 1 again. But day 1 with {total_checkins} check-ins of experience behind you."

**Display Rules**
- One encouragement message shown per check-in action
- Appears briefly as a toast/overlay after checking in, then available in habit detail view
- Selected based on current context (active streak, just returned, milestone proximity, etc.)
- Cycles without repeats within each category

### 4.11 Analytics View

Accessible from each habit's detail screen.

**Per-Habit Analytics**
- Calendar heatmap (trailing 90 days): colored squares showing completion (green), partial (yellow), missed (red), not scheduled (grey)
- Current streak (with "best streak" comparison)
- Completion rate: 7-day, 30-day, 90-day, all-time
- For measured habits: average value vs. target, trend line

**Global Analytics** (accessible from settings or garden view)
- Overall completion rate across all habits
- Total check-ins all-time
- Combined streak (days where ALL active habits were completed)
- Milestones earned (gallery of all cosmetic unlocks)

### 4.12 Onboarding & PWA Install Flow

**PWA Configuration**
- Web app manifest with app name, icons, theme color, display: standalone
- Service worker via next-pwa for caching and offline shell
- "Add to Home Screen" prompt integrated into onboarding

**iOS-Specific Handling**
- Detect iOS Safari
- Show visual step-by-step guide for "Share → Add to Home Screen"
- Explain that notifications require home screen install
- Store a flag so this guide is only shown once

**Android Handling**
- Use native `beforeinstallprompt` event
- Show install prompt during onboarding

---

## 5. Garden Rendering System

### 5.1 Architecture

The garden is a single responsive container, rendered entirely with HTML/CSS and emoji text nodes. No canvas, no images, no SVG.

```
┌─────────────────────────────────────────────┐
│                  Sky Zone                     │
│            (atmosphere emoji)                 │
├─────────────────────────────────────────────┤
│                                               │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│   │ Zone 1  │  │ Zone 2  │  │ Zone 3  │     │
│   │ Habit 1 │  │ Habit 2 │  │ Habit 3 │     │
│   │         │  │         │  │         │     │
│   │ 🏃+😄  │  │ 📚+😊  │  │ 🦉+😐  │     │
│   │ 🌳🌻🦋 │  │ 🌿🌸   │  │ 🌱     │     │
│   │ 🎩🐕   │  │         │  │         │     │
│   └─────────┘  └─────────┘  └─────────┘     │
│                                               │
│              Ground / Path Zone               │
│           (shared environment)                │
└─────────────────────────────────────────────┘
```

### 5.2 Rendering Rules

- Garden container is max-width 420px, centered, aspect ratio ~3:4
- Each habit zone is a flex/grid child, equally sized
- Empty zones (fewer than 3 habits) show dormant garden patch: 🌫️ with "Plant a habit" prompt
- Emoji elements are absolutely positioned within their zone using percentage-based coordinates
- Buddy emoji is always largest (2-3rem), mood badge is smaller (1-1.5rem), positioned bottom-right of buddy
- Environment elements are 1-1.5rem, scattered in predefined positions per zone
- CSS transitions on all positioned elements: opacity 0.5s, transform 0.3s
- Garden recalculates on: page load, check-in completion, habit creation/deletion

### 5.3 Responsive Behavior

- Mobile (< 420px): Full width, single column of zones stacked vertically, each zone is a horizontal strip
- Tablet/Desktop (> 420px): Fixed 420px container, zones side by side

---

## 6. API Design

All API routes are Next.js App Router API routes under `/api/`.

### 6.1 Endpoints

**Auth**
- `GET /api/auth/[...nextauth]` — NextAuth.js handler (Google, Apple OAuth)

**Habits**
- `GET /api/habits` — List user's habits (active and archived)
- `POST /api/habits` — Create new habit (enforces 3-active limit)
- `PATCH /api/habits/:id` — Update habit details
- `DELETE /api/habits/:id` — Delete habit and all related data
- `POST /api/habits/:id/archive` — Archive a habit

**Check-Ins**
- `POST /api/checkins` — Create or update check-in for today `{ habit_id, completed, value? }`
- `GET /api/checkins?habit_id=X&from=DATE&to=DATE` — Get check-ins for date range
- `DELETE /api/checkins/:id` — Remove a check-in (today only)

**Garden**
- `GET /api/garden` — Computed garden state (all buddy moods, zone states, environment, milestones)

**Analytics**
- `GET /api/analytics/:habit_id` — Per-habit stats (streaks, completion rates, heatmap data)
- `GET /api/analytics/global` — Cross-habit aggregate stats

**Notifications**
- `POST /api/notifications/register` — Store OneSignal player ID
- `PATCH /api/notifications/preferences` — Update notification preferences

**Content**
- `GET /api/content/message?habit_id=X&trigger=TYPE` — Get contextual habit science or encouragement message

### 6.2 Cron Jobs

Run via a simple setInterval in a long-running process on Lightsail, or via cron on the host.

- **Every 15 minutes:** Check for due reminders, send via OneSignal API
- **Daily at midnight (per timezone):** Reset daily check-in eligibility
- **Sundays at 10am (per timezone):** Send weekly summary notification
- **Daily at 9pm (per timezone):** Send missed check-in nudge for any habit not yet checked in

---

## 7. Project Structure

```
habit-garden/
├── app/
│   ├── layout.tsx                  # Root layout, providers
│   ├── page.tsx                    # Landing page (unauthenticated) / Garden (authenticated)
│   ├── garden/
│   │   └── page.tsx                # Garden view (main screen)
│   ├── habits/
│   │   ├── new/
│   │   │   └── page.tsx            # Create habit form
│   │   └── [id]/
│   │       ├── page.tsx            # Habit detail + check-in
│   │       └── analytics/
│   │           └── page.tsx        # Per-habit analytics
│   ├── onboarding/
│   │   └── page.tsx                # Guided onboarding flow
│   ├── settings/
│   │   └── page.tsx                # App settings, notification prefs, account
│   ├── analytics/
│   │   └── page.tsx                # Global analytics dashboard
│   └── api/
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts
│       ├── habits/
│       │   ├── route.ts            # GET, POST
│       │   └── [id]/
│       │       ├── route.ts        # PATCH, DELETE
│       │       └── archive/
│       │           └── route.ts    # POST
│       ├── checkins/
│       │   ├── route.ts            # GET, POST
│       │   └── [id]/
│       │       └── route.ts        # DELETE
│       ├── garden/
│       │   └── route.ts            # GET
│       ├── analytics/
│       │   ├── [habitId]/
│       │   │   └── route.ts        # GET
│       │   └── global/
│       │       └── route.ts        # GET
│       ├── notifications/
│       │   ├── register/
│       │   │   └── route.ts        # POST
│       │   └── preferences/
│       │       └── route.ts        # PATCH
│       └── content/
│           └── message/
│               └── route.ts        # GET
├── components/
│   ├── garden/
│   │   ├── Garden.tsx              # Main garden container
│   │   ├── GardenZone.tsx          # Individual habit zone
│   │   ├── BuddyDisplay.tsx        # Buddy emoji + mood badge
│   │   ├── EnvironmentElements.tsx # Zone flora/fauna
│   │   ├── SkyAtmosphere.tsx       # Shared sky rendering
│   │   └── MilestoneCosmetics.tsx  # Earned cosmetics display
│   ├── habits/
│   │   ├── HabitForm.tsx           # Create/edit habit form
│   │   ├── HabitCard.tsx           # Habit summary in list views
│   │   ├── CheckInButton.tsx       # Binary check-in tap target
│   │   ├── MeasuredInput.tsx       # Number input for measured habits
│   │   └── EmojiPicker.tsx         # Emoji selection grid
│   ├── analytics/
│   │   ├── CalendarHeatmap.tsx     # 90-day heatmap
│   │   ├── StreakDisplay.tsx       # Current/best streak
│   │   ├── CompletionRates.tsx     # 7/30/90/all-time rates
│   │   └── TrendChart.tsx          # Measured habit trend line
│   ├── onboarding/
│   │   ├── OnboardingFlow.tsx      # Step container
│   │   ├── WelcomeStep.tsx
│   │   ├── CreateHabitStep.tsx
│   │   ├── ChooseBuddyStep.tsx
│   │   └── SetReminderStep.tsx
│   ├── notifications/
│   │   └── NotificationPrompt.tsx  # Permission request + iOS guide
│   ├── content/
│   │   ├── HabitScienceCard.tsx    # Contextual advice display
│   │   └── EncouragementToast.tsx  # Post-check-in encouragement
│   └── ui/
│       ├── Toast.tsx
│       ├── Modal.tsx
│       ├── Button.tsx
│       └── Card.tsx
├── lib/
│   ├── db/
│   │   ├── schema.ts              # Drizzle schema definitions
│   │   ├── index.ts               # Database connection
│   │   └── migrations/            # Drizzle migration files
│   ├── auth/
│   │   └── config.ts              # NextAuth configuration
│   ├── garden/
│   │   ├── engine.ts              # Garden state calculation
│   │   ├── moods.ts               # Buddy mood calculation
│   │   └── elements.ts            # Element selection logic
│   ├── streaks/
│   │   └── calculator.ts          # Streak calculation logic
│   ├── milestones/
│   │   └── checker.ts             # Milestone threshold checking + cosmetic award
│   ├── content/
│   │   ├── habit-science.json     # All habit science messages
│   │   ├── encouragement.json     # All encouragement templates
│   │   └── selector.ts            # Context-based message selection
│   ├── notifications/
│   │   ├── onesignal.ts           # OneSignal API client
│   │   └── scheduler.ts           # Notification scheduling logic
│   └── utils/
│       ├── dates.ts               # Timezone-aware date utilities
│       └── constants.ts           # App-wide constants
├── cron/
│   └── notification-worker.ts     # Cron job for scheduled notifications
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── sw.js                      # Service worker (generated by next-pwa)
│   └── icons/                     # PWA icons (various sizes)
├── drizzle.config.ts
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.local                     # Environment variables
```

---

## 8. Environment Variables

```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/habitgarden

# NextAuth
NEXTAUTH_URL=https://habitgarden.app
NEXTAUTH_SECRET=<generated-secret>

# Google OAuth
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-google-console>

# Apple OAuth
APPLE_ID=<from-apple-developer>
APPLE_SECRET=<from-apple-developer>
APPLE_TEAM_ID=<team-id>
APPLE_KEY_ID=<key-id>

# OneSignal
ONESIGNAL_APP_ID=<from-onesignal>
ONESIGNAL_API_KEY=<from-onesignal>
```

---

## 9. Deployment (AWS Lightsail)

### 9.1 Instance Setup
- Ubuntu 22.04 LTS, minimum 1GB RAM / 1 vCPU ($5/month tier)
- Install: Node.js 20 LTS, PostgreSQL 16, nginx (reverse proxy), certbot (SSL)

### 9.2 Process Management
- Use PM2 to run the Next.js production server
- PM2 also runs the notification cron worker as a separate process
- nginx reverse proxies port 80/443 → Next.js on port 3000

### 9.3 Database
- PostgreSQL running locally on the same Lightsail instance
- Daily pg_dump backup to Lightsail object storage (optional)

### 9.4 SSL
- Let's Encrypt via certbot with nginx plugin
- Auto-renewal via certbot's systemd timer

### 9.5 Deploy Process
- SSH into instance
- `git pull` → `npm install` → `npm run build` → `pm2 restart all`
- Database migrations: `npx drizzle-kit migrate`

---

## 10. Build Phases

Suggested order for vibe coding sessions.

### Phase 1: Foundation
- Next.js project setup with Tailwind
- Drizzle schema + PostgreSQL connection
- NextAuth with Google OAuth (Apple can be Phase 2)
- Basic layout with mobile-first responsive shell

### Phase 2: Core Habit Loop
- Habit CRUD (create, list, edit, archive, delete)
- Check-in system (binary + measured)
- Streak calculation engine
- Habit detail view with basic stats

### Phase 3: The Garden
- Garden container and zone layout
- Buddy display with mood engine
- Environment element rendering based on consistency
- CSS transitions for state changes
- Shared atmosphere system

### Phase 4: Milestones & Rewards
- Milestone detection on check-in
- Cosmetic award system
- Celebration overlay
- Persistent cosmetic display in garden

### Phase 5: Content System
- Habit science message library (JSON)
- Encouragement template library (JSON)
- Context-based message selector
- Display in habit detail view + toast on check-in

### Phase 6: Notifications
- OneSignal SDK integration
- Player ID registration
- Notification scheduling cron
- All notification types (reminder, missed, streak, re-engagement, weekly summary)
- iOS PWA install guide

### Phase 7: Analytics & Polish
- Calendar heatmap component
- Completion rate calculations
- Global analytics view
- Onboarding flow
- Apple OAuth
- PWA manifest, icons, service worker
- Final responsive polish

---

## 11. Non-Functional Requirements

- **Performance:** Garden view loads in < 1s on 4G connection. No heavy frameworks or image assets.
- **Accessibility:** All interactive elements keyboard-navigable. Emoji have aria-labels. Color is not the sole indicator of state.
- **Data Privacy:** No data shared with third parties. Only OAuth profile data and user-generated habit data stored. Full account deletion available in settings.
- **Timezone Handling:** All date logic uses the user's stored timezone. Check-ins, streaks, and notifications are timezone-aware.
- **Browser Support:** Latest Chrome, Safari, Firefox, Edge. Mobile Safari on iOS 16.4+ for PWA notifications.

import habitScienceData from './habit-science.json';
import encouragementData from './encouragement.json';

export type TriggerType = 
  | 'first_steps'
  | 'building_momentum'
  | 'streak_broken'
  | 'hitting_wall'
  | 'long_term'
  | 'breaking_bad_early'
  | 'breaking_bad_urge';

export type ContextType = 
  | 'streak_active'
  | 'just_checked_in'
  | 'comeback';

interface HabitInfo {
  id: number;
  name: string;
  emojiBuddy: string;
  direction: 'build' | 'break';
  createdAt: Date;
}

interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  totalCheckIns: number;
  isActiveToday: boolean;
  completionRate7Days: number;
  completionRate30Days: number;
  daysSinceStart: number;
}

// Simple in-memory store for message cycling (in production, store in DB)
const messageIndex: Map<number, Map<string, number>> = new Map();

function getNextMessageIndex(habitId: number, category: string): number {
  const habitMap = messageIndex.get(habitId) || new Map();
  const currentIndex = habitMap.get(category) || 0;
  
  // Get the length of the message array for this category
  const messages = getMessagesForCategory(category);
  const nextIndex = (currentIndex + 1) % messages.length;
  
  habitMap.set(category, nextIndex);
  messageIndex.set(habitId, habitMap);
  
  return currentIndex;
}

function getMessagesForCategory(category: string): string[] {
  return (habitScienceData as Record<string, string[]>)[category] || [];
}

function getEncouragementForCategory(category: string): string[] {
  return (encouragementData as Record<string, string[]>)[category] || [];
}

export function determineTrigger(
  habit: HabitInfo,
  streakInfo: StreakInfo,
  wasBroken: boolean = false
): TriggerType {
  const { currentStreak, daysSinceStart } = streakInfo;
  const isBreaking = habit.direction === 'break';

  // Check for streak broken
  if (wasBroken) {
    if (isBreaking) {
      return 'breaking_bad_urge';
    }
    return 'streak_broken';
  }

  // Breaking bad habits
  if (isBreaking) {
    if (daysSinceStart <= 7) {
      return 'breaking_bad_early';
    }
    return 'breaking_bad_urge';
  }

  // Building good habits
  if (currentStreak === 0 && daysSinceStart <= 3) {
    return 'first_steps';
  }
  
  if (currentStreak >= 1 && currentStreak <= 14) {
    return 'building_momentum';
  }
  
  if (currentStreak >= 14 && currentStreak < 30) {
    return 'hitting_wall';
  }
  
  // 30+ days
  return 'long_term';
}

export function determineContext(
  streakInfo: StreakInfo,
  justCheckedIn: boolean,
  wasBroken: boolean
): ContextType {
  if (justCheckedIn) {
    if (wasBroken || streakInfo.currentStreak === 1) {
      return 'comeback';
    }
    return 'just_checked_in';
  }
  
  if (streakInfo.currentStreak > 0) {
    return 'streak_active';
  }
  
  return 'comeback';
}

export function getHabitScienceMessage(
  habit: HabitInfo,
  streakInfo: StreakInfo,
  trigger?: TriggerType
): string {
  const actualTrigger = trigger || determineTrigger(habit, streakInfo);
  const messages = getMessagesForCategory(actualTrigger);
  const index = getNextMessageIndex(habit.id, `science_${actualTrigger}`);
  
  return messages[index];
}

export function getEncouragementMessage(
  habit: HabitInfo,
  streakInfo: StreakInfo,
  context?: ContextType,
  justCheckedIn: boolean = false,
  wasBroken: boolean = false
): string {
  const actualContext = context || determineContext(streakInfo, justCheckedIn, wasBroken);
  const templates = getEncouragementForCategory(actualContext);
  const index = getNextMessageIndex(habit.id, `encouragement_${actualContext}`);
  
  let message = templates[index];
  
  // Replace variables
  message = message
    .replace(/{streak}/g, String(streakInfo.currentStreak))
    .replace(/{habit_name}/g, habit.name)
    .replace(/{buddy}/g, habit.emojiBuddy)
    .replace(/{completion_7d}/g, String(streakInfo.completionRate7Days))
    .replace(/{completion_30d}/g, String(streakInfo.completionRate30Days))
    .replace(/{days_since_start}/g, String(streakInfo.daysSinceStart))
    .replace(/{best_streak}/g, String(streakInfo.longestStreak))
    .replace(/{total_checkins}/g, String(streakInfo.totalCheckIns));
  
  return message;
}

export interface ContentMessage {
  type: 'habit_science' | 'encouragement';
  message: string;
  trigger?: TriggerType;
  context?: ContextType;
}

export function getContentMessage(
  habit: HabitInfo,
  streakInfo: StreakInfo,
  type: 'habit_science' | 'encouragement',
  options?: {
    trigger?: TriggerType;
    context?: ContextType;
    justCheckedIn?: boolean;
    wasBroken?: boolean;
  }
): ContentMessage {
  if (type === 'habit_science') {
    const message = getHabitScienceMessage(habit, streakInfo, options?.trigger);
    const trigger = options?.trigger || determineTrigger(habit, streakInfo);
    return {
      type: 'habit_science',
      message,
      trigger,
    };
  }
  
  const message = getEncouragementMessage(
    habit,
    streakInfo,
    options?.context,
    options?.justCheckedIn || false,
    options?.wasBroken || false
  );
  const context = options?.context || determineContext(
    streakInfo, 
    options?.justCheckedIn || false, 
    options?.wasBroken || false
  );
  
  return {
    type: 'encouragement',
    message,
    context,
  };
}

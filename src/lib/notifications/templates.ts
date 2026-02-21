// Notification message templates
// Used by the scheduler and for displaying in-app messages

export interface NotificationTemplate {
  type: 'reminder' | 'missed' | 'streak' | 'reengagement' | 'weekly_summary';
  title: string;
  body: string;
  data?: Record<string, string>;
}

export const notificationTemplates: Record<string, NotificationTemplate[]> = {
  reminder: [
    {
      type: 'reminder',
      title: 'Time to check in!',
      body: '{buddy} is waiting for you today 🌱',
    },
    {
      type: 'reminder',
      title: 'Hey, {buddy} misses you!',
      body: "Don't forget to check in today",
    },
    {
      type: 'reminder',
      title: 'Quick check-in?',
      body: '{habit_name} is just one tap away',
    },
  ],
  missed: [
    {
      type: 'missed',
      title: 'Still time!',
      body: '{habit_name} is waiting for you today',
    },
    {
      type: 'missed',
      title: "Don't break the streak",
      body: 'You\'re at {streak} days — keep it going!',
    },
  ],
  streak: [
    {
      type: 'streak',
      title: '🎉 Amazing!',
      body: '{streak} days straight! You earned a {reward}!',
    },
    {
      type: 'streak',
      title: '🔥 On fire!',
      body: '{streak} days! {buddy} is so proud!',
    },
  ],
  reengagement: [
    {
      type: 'reengagement',
      title: 'Your garden misses you 🌱',
      body: 'Your buddies are getting lonely',
    },
    {
      type: 'reengagement',
      title: 'We miss you!',
      body: 'Come back to your garden — it\'s not the same without you',
    },
  ],
  weekly_summary: [
    {
      type: 'weekly_summary',
      title: '📊 Weekly Summary',
      body: 'This week: {summary} — your garden is looking good!',
    },
  ],
};

export function getNotificationMessage(
  templateType: string,
  variables: Record<string, string>
): NotificationTemplate {
  const templates = notificationTemplates[templateType] || notificationTemplates.reminder;
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  let title = template.title;
  let body = template.body;
  
  // Replace variables
  Object.entries(variables).forEach(([key, value]) => {
    title = title.replace(new RegExp(`{${key}}`, 'g'), value);
    body = body.replace(new RegExp(`{${key}}`, 'g'), value);
  });
  
  return {
    ...template,
    title,
    body,
  };
}

// Create notification templates based on habit data
export function createReminderNotification(
  habitName: string,
  buddyEmoji: string
): NotificationTemplate {
  return getNotificationMessage('reminder', {
    habit_name: habitName,
    buddy: buddyEmoji,
  });
}

export function createMissedNotification(
  habitName: string,
  streak: number
): NotificationTemplate {
  return getNotificationMessage('missed', {
    habit_name: habitName,
    streak: String(streak),
  });
}

export function createStreakNotification(
  streak: number,
  reward: string,
  buddyEmoji: string
): NotificationTemplate {
  return getNotificationMessage('streak', {
    streak: String(streak),
    reward,
    buddy: buddyEmoji,
  });
}

export function createReengagementNotification(): NotificationTemplate {
  return getNotificationMessage('reengagement', {});
}

export function createWeeklySummaryNotification(
  summary: string
): NotificationTemplate {
  return getNotificationMessage('weekly_summary', {
    summary,
  });
}

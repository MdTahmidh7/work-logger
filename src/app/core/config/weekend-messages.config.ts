export interface WeekendMessage {
  title: string;
  message: string;
  icon: string;
  emoji: string;
}

export const WEEKEND_MESSAGES: WeekendMessage[] = [
  {
    title: 'Weekend is Coming!',
    message: 'Today is the last working day of the week. Get ready for a great weekend ahead!',
    icon: 'celebration',
    emoji: '🎉'
  },
  {
    title: 'Almost There!',
    message: 'Thursday vibes! The weekend is just around the corner. Finish strong!',
    icon: 'weekend',
    emoji: '🏖️'
  },
  {
    title: 'Time to Recharge!',
    message: 'You\'ve earned it! The weekend starts tonight. Plan something fun!',
    icon: 'wb_sunny',
    emoji: '☀️'
  },
  {
    title: 'Final Stretch!',
    message: 'One more day and you\'re free! Make today count and enjoy what\'s coming.',
    icon: 'emoji_events',
    emoji: '🏆'
  },
  {
    title: 'Happy Thursday!',
    message: 'The weekend is within reach! Time to wrap up and unwind soon.',
    icon: 'sentiment_very_satisfied',
    emoji: '😊'
  },
  {
    title: 'You Made It!',
    message: 'Another productive week almost done! The weekend is your reward.',
    icon: 'military_tech',
    emoji: '💪'
  },
  {
    title: 'Weekend Loading...',
    message: 'Just a few more hours! Get ready for some well-deserved rest and fun.',
    icon: 'downloading',
    emoji: '⏳'
  },
  {
    title: 'Cheers to the Weekend!',
    message: 'Today\'s the day! Wrap up your tasks and dive into the weekend spirit.',
    icon: 'local_bar',
    emoji: '🥂'
  },
  {
    title: 'Adventure Awaits!',
    message: 'The weekend is almost here! What exciting plans do you have in store?',
    icon: 'explore',
    emoji: '🗺️'
  },
  {
    title: 'Relaxation Mode: ON',
    message: 'Almost clock-out time! The weekend is calling. Answer it with joy!',
    icon: 'spa',
    emoji: '🧘'
  }
];

export const BREAK_START_HOUR = 17;
export const BREAK_START_MINUTE = 0;
export const BREAK_END_HOUR = 9;
export const BREAK_END_MINUTE = 0;
export const BREAK_TOTAL_HOURS = 64;

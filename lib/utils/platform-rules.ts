// Platform-specific rules and best practices

export const LINKEDIN_RULES = {
  // Character limits
  maxPostLength: 3000,
  optimalMinLength: 1300,
  optimalMaxLength: 2000,
  hookMaxLength: 210, // Characters before "see more"
  
  // Hashtag rules
  maxHashtags: 10,
  optimalHashtags: { min: 3, max: 5 },
  
  // Formatting
  maxLineBreaks: 50,
  optimalParagraphLength: { min: 1, max: 3 }, // sentences
  
  // Engagement best practices
  bestPostingTimes: ['8:00', '10:00', '12:00', '17:00'], // UTC
  bestPostingDays: ['Tuesday', 'Wednesday', 'Thursday'],
  
  // Content rules
  avoidPatterns: [
    /click\s+here/i,
    /link\s+in\s+(bio|comments)/i,
    /follow\s+for\s+more/i, // Engagement bait
  ],
};

export const X_RULES = {
  // Character limits
  maxTweetLength: 280,
  maxThreadLength: 25, // tweets
  optimalThreadLength: { min: 3, max: 10 },
  
  // Media
  maxImages: 4,
  maxVideos: 1,
  
  // Hashtag rules
  maxHashtags: 3, // X penalizes too many hashtags
  
  // Thread formatting
  threadNumberingFormat: '{current}/{total}',
  
  // Engagement best practices
  bestPostingTimes: ['9:00', '12:00', '15:00', '18:00'], // UTC
  bestPostingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
  
  // Content rules
  avoidPatterns: [
    /rt\s+to/i, // Engagement bait
    /like\s+if/i,
    /follow\s+for\s+follow/i,
  ],
};

export function validateLinkedInPost(content: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  // Check length
  if (content.length > LINKEDIN_RULES.maxPostLength) {
    errors.push(`Post exceeds maximum length of ${LINKEDIN_RULES.maxPostLength} characters`);
    score -= 30;
  }

  if (content.length < LINKEDIN_RULES.optimalMinLength) {
    warnings.push('Post is shorter than optimal length');
    score -= 10;
  }

  if (content.length > LINKEDIN_RULES.optimalMaxLength) {
    warnings.push('Post is longer than optimal length');
    score -= 5;
  }

  // Check hashtags
  const hashtagCount = (content.match(/#\w+/g) || []).length;
  if (hashtagCount > LINKEDIN_RULES.maxHashtags) {
    errors.push(`Too many hashtags (${hashtagCount}/${LINKEDIN_RULES.maxHashtags})`);
    score -= 15;
  }

  if (hashtagCount < LINKEDIN_RULES.optimalHashtags.min) {
    warnings.push('Consider adding more hashtags for discoverability');
    score -= 5;
  }

  // Check hook
  const firstLine = content.split('\n')[0];
  if (firstLine && firstLine.length > LINKEDIN_RULES.hookMaxLength) {
    warnings.push('First line may be cut off before "see more"');
    score -= 5;
  }

  // Check for engagement bait
  for (const pattern of LINKEDIN_RULES.avoidPatterns) {
    if (pattern.test(content)) {
      warnings.push('Contains potentially spammy phrases');
      score -= 10;
      break;
    }
  }

  // Check for question (engagement driver)
  if (!content.includes('?')) {
    warnings.push('Consider ending with a question to drive engagement');
    score -= 5;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score: Math.max(0, score),
  };
}

export function validateXPost(content: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  charactersRemaining: number;
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const charactersRemaining = X_RULES.maxTweetLength - content.length;

  // Check length
  if (content.length > X_RULES.maxTweetLength) {
    errors.push(`Tweet exceeds ${X_RULES.maxTweetLength} characters by ${-charactersRemaining}`);
  }

  // Check hashtags
  const hashtagCount = (content.match(/#\w+/g) || []).length;
  if (hashtagCount > X_RULES.maxHashtags) {
    warnings.push('Too many hashtags may reduce reach');
  }

  // Check for engagement bait
  for (const pattern of X_RULES.avoidPatterns) {
    if (pattern.test(content)) {
      warnings.push('Contains potentially spammy phrases');
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    charactersRemaining,
  };
}

export function validateThread(tweets: string[]): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check thread length
  if (tweets.length > X_RULES.maxThreadLength) {
    errors.push(`Thread is too long (${tweets.length}/${X_RULES.maxThreadLength} tweets)`);
  }

  if (tweets.length < X_RULES.optimalThreadLength.min) {
    warnings.push('Thread may be too short to warrant thread format');
  }

  if (tweets.length > X_RULES.optimalThreadLength.max) {
    warnings.push('Consider breaking this into multiple threads');
  }

  // Validate each tweet
  tweets.forEach((tweet, i) => {
    const validation = validateXPost(tweet);
    if (!validation.isValid) {
      errors.push(`Tweet ${i + 1}: ${validation.errors.join(', ')}`);
    }
  });

  // Check first tweet (must work standalone)
  if (tweets[0] && tweets[0].length < 50) {
    warnings.push('First tweet should be substantial enough to work standalone');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function getOptimalPostingTime(platform: 'linkedin' | 'x'): string {
  const rules = platform === 'linkedin' ? LINKEDIN_RULES : X_RULES;
  const now = new Date();
  const currentHour = now.getUTCHours();
  
  // Find the next optimal posting time
  const times = rules.bestPostingTimes.map(t => parseInt(t.split(':')[0]));
  const nextTime = times.find(t => t > currentHour) || times[0];
  
  return `${nextTime}:00 UTC`;
}







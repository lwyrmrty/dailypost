import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ARTICLE_DRAFT_FOLLOW_UP,
  QUICK_POST_FOLLOW_UP,
  REFINE_ONLY_FOLLOW_UP,
} from '@/lib/chat/follow-ups';
import { buildChatSystemPrompt } from '@/lib/claude/prompts/chat-assistant';

const bannedCrossPlatformTerms = [
  /\bX\b/i,
  /Twitter/i,
  /another platform/i,
  /platform version/i,
];

test('chat follow-up copy stays LinkedIn-only', () => {
  const followUps = [
    ARTICLE_DRAFT_FOLLOW_UP,
    QUICK_POST_FOLLOW_UP,
    REFINE_ONLY_FOLLOW_UP,
  ];

  for (const followUp of followUps) {
    for (const pattern of bannedCrossPlatformTerms) {
      assert.doesNotMatch(followUp, pattern);
    }
  }
});

test('chat system prompt does not volunteer X or Twitter', () => {
  const promptWithoutProfile = buildChatSystemPrompt(null);
  const promptWithProfile = buildChatSystemPrompt({
    jobDescription: 'founder',
    primaryTopics: ['AI'],
    avoidTopics: ['crypto'],
    postingGoals: ['thought leadership'],
  });

  for (const prompt of [promptWithoutProfile, promptWithProfile]) {
    assert.match(prompt, /LinkedIn/i);
    assert.doesNotMatch(prompt, /\bX\b/i);
    assert.doesNotMatch(prompt, /Twitter/i);
  }
});

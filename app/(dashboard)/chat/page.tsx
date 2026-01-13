'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface PostBlock {
  type: 'post';
  platform: 'linkedin' | 'x';
  content: string;
  isThread?: boolean;
  threadParts?: string[];
}

interface TextBlock {
  type: 'text';
  content: string;
}

type ContentBlock = PostBlock | TextBlock;

interface Message {
  role: 'user' | 'assistant';
  content?: string;
  blocks?: ContentBlock[];
}

function PostCard({ post }: { post: PostBlock }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(post.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  return (
    <div className="my-3 border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          {post.platform === 'linkedin' ? (
            <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">in</span>
            </div>
          ) : (
            <div className="w-5 h-5 bg-black rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">𝕏</span>
            </div>
          )}
          <span className="text-sm font-medium text-gray-700">
            {post.platform === 'linkedin' ? 'LinkedIn Post' : post.isThread ? 'X Thread' : 'Tweet'}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            copied 
              ? 'bg-green-100 text-green-700' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      
      {/* Content */}
      <div className="p-4">
        {post.isThread && post.threadParts ? (
          <div className="space-y-4">
            {post.threadParts.map((part, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                  {i + 1}
                </div>
                <p className="text-gray-900 whitespace-pre-wrap flex-1">{part}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-900 whitespace-pre-wrap">{post.content}</p>
        )}
      </div>
    </div>
  );
}

function AssistantMessage({ message }: { message: Message }) {
  // If it's a simple text reply
  if (message.content && !message.blocks) {
    return (
      <div className="flex justify-start">
        <div className="rounded-2xl px-4 py-2.5 max-w-[80%] bg-gray-100 text-gray-900">
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>
      </div>
    );
  }

  // If it has structured blocks
  if (message.blocks) {
    return (
      <div className="space-y-2 max-w-[90%]">
        {message.blocks.map((block, i) => {
          if (block.type === 'text') {
            return (
              <div key={i} className="flex justify-start">
                <div className="rounded-2xl px-4 py-2.5 bg-gray-100 text-gray-900">
                  <div className="whitespace-pre-wrap">{block.content}</div>
                </div>
              </div>
            );
          }
          if (block.type === 'post') {
            return <PostCard key={i} post={block} />;
          }
          return null;
        })}
      </div>
    );
  }

  return null;
}

export default function ChatPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your content assistant. I can help you create posts, refine ideas, or find past content. What would you like to work on today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          userId: session?.user?.id,
        }),
      });

      const data = await response.json();
      
      // Handle both structured blocks and simple reply
      if (data.blocks) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          blocks: data.blocks,
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.reply || 'Sorry, I couldn\'t generate a response.',
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, something went wrong. Please try again.' 
      }]);
    } finally {
      setLoading(false);
    }
  }

  const quickActionPrompts = {
    aiPost: [
      'Create a LinkedIn post about the latest AI breakthroughs',
      'Write a LinkedIn post about how AI is transforming startups',
      'Create a post about the future of foundation models',
      'Write about why AI infrastructure is the next big opportunity',
      'Create a LinkedIn post about AI agents and automation',
      'Write a post about the state of AI in 2025',
      'Create a post about underrated AI applications in deep tech',
    ],
    hotTake: [
      'Write a hot take about the current state of deep tech investing',
      'Give me a contrarian take on the AI hype cycle',
      'Write a hot take about why most climate tech startups will fail',
      'Give me a spicy take about startup valuations in 2025',
      'Write a hot take about the future of venture capital',
      'Give me a contrarian view on the robotics market',
      'Write a provocative take about technical founders vs business founders',
    ],
    xThread: [
      'Create an X thread about startup fundraising lessons',
      'Write a thread breaking down a recent tech acquisition',
      'Create a thread about the biggest mistakes founders make',
      'Write an X thread about building in deep tech',
      'Create a thread about lessons from failed startups',
      'Write a thread about what VCs actually look for',
      'Create a thread about the future of hard tech',
    ],
    weeklyIdeas: [
      'Give me 5 post ideas for this week',
      'What should I post about this week based on trending topics?',
      'Generate a week of content ideas around AI and startups',
      'Give me 5 different angles for posts about deep tech',
      'What are some timely topics I should cover this week?',
      'Suggest 5 engaging post ideas for my audience',
    ],
    poll: [
      'Help me write a poll about deep tech startup challenges',
      'Create a poll asking about AI adoption in enterprises',
      'Write a poll about the biggest risks in climate tech',
      'Create a poll about startup fundraising preferences',
      'Help me write a poll about remote work in tech',
      'Create a poll asking about the most promising emerging tech',
      'Write a poll about what founders struggle with most',
    ],
  };

  function getRandomPrompt(category: keyof typeof quickActionPrompts) {
    const prompts = quickActionPrompts[category];
    return prompts[Math.floor(Math.random() * prompts.length)];
  }

  function handleQuickAction(category: keyof typeof quickActionPrompts) {
    setInput(getRandomPrompt(category));
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Content Assistant</h1>
        <p className="text-gray-600 mt-1">
          Create posts on-demand, get ideas, or refine your content
        </p>
      </div>

      {/* Messages */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4">
        <div className="h-[500px] overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i}>
              {msg.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="rounded-2xl px-4 py-2.5 max-w-[80%] bg-blue-600 text-white">
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ) : (
                <AssistantMessage message={msg} />
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-2.5">
                <span className="animate-pulse text-gray-600">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me to create a post, find past content, or give advice..."
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Send
            </button>
          </div>
        </form>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => handleQuickAction('aiPost')}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Create AI post
        </button>
        <button
          onClick={() => handleQuickAction('hotTake')}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Hot take
        </button>
        <button
          onClick={() => handleQuickAction('xThread')}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          X thread
        </button>
        <button
          onClick={() => handleQuickAction('weeklyIdeas')}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Weekly ideas
        </button>
        <button
          onClick={() => handleQuickAction('poll')}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Create poll
        </button>
      </div>
    </div>
  );
}

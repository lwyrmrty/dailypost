'use client';

import { useState } from 'react';

type ReactionType = 'comment' | 'reshare' | 'original_post';

interface LinkedInStatus {
  connected: boolean;
  expired?: boolean;
}

export default function ReactToPost() {
  const [postContent, setPostContent] = useState('');
  const [postAuthor, setPostAuthor] = useState('');
  const [reactionType, setReactionType] = useState<ReactionType>('comment');
  const [generatedContent, setGeneratedContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState('');
  const [linkedinStatus, setLinkedinStatus] = useState<LinkedInStatus | null>(null);

  // Check LinkedIn status on first interaction
  async function checkLinkedIn() {
    if (linkedinStatus !== null) return;
    try {
      const res = await fetch('/api/linkedin/status');
      const data = await res.json();
      setLinkedinStatus(data);
    } catch {
      setLinkedinStatus({ connected: false });
    }
  }

  async function handleGenerate() {
    if (!postContent.trim()) return;

    setGenerating(true);
    setError('');
    setGeneratedContent('');
    setPublished(false);

    try {
      const res = await fetch('/api/linkedin/react-to-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postContent: postContent.trim(),
          postAuthor: postAuthor.trim() || undefined,
          reactionType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate');
      }

      const data = await res.json();
      setGeneratedContent(data.content);
      await checkLinkedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setGenerating(false);
    }
  }

  async function handlePublish() {
    if (!generatedContent) return;

    setPublishing(true);
    setError('');

    try {
      const action = reactionType === 'comment'
        ? 'comment'
        : reactionType === 'reshare'
        ? 'reshare'
        : 'post';

      const res = await fetch('/api/linkedin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          content: generatedContent,
          // Note: for comment/reshare we'd need the post URN — for now this works for original posts
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to publish');
      }

      setPublished(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(generatedContent);
  }

  function handleReset() {
    setPostContent('');
    setPostAuthor('');
    setGeneratedContent('');
    setError('');
    setPublished(false);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-1">React to a Post</h2>
      <p className="text-sm text-gray-500 mb-4">
        Paste a LinkedIn post and we&apos;ll draft a response in your voice
      </p>

      {!generatedContent ? (
        <div className="space-y-4">
          {/* Post content input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paste the post content
            </label>
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="Copy and paste the LinkedIn post you want to react to..."
              className="w-full border border-gray-300 rounded-lg p-4 h-40 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Author name (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Post author (optional)
            </label>
            <input
              type="text"
              value={postAuthor}
              onChange={(e) => setPostAuthor(e.target.value)}
              placeholder="e.g., John Smith, CEO of Acme Corp"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Reaction type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How do you want to react?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'comment' as const, label: 'Comment', desc: 'Reply directly on their post' },
                { value: 'reshare' as const, label: 'Reshare', desc: 'Share with your take' },
                { value: 'original_post' as const, label: 'New Post', desc: 'Write your own post about it' },
              ]).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setReactionType(option.value)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    reactionType === option.value
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-gray-500">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            onClick={handleGenerate}
            disabled={!postContent.trim() || generating}
            className="w-full bg-blue-600 text-white rounded-lg py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            {generating ? 'Generating...' : 'Generate Reaction'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Original post reference */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 border-l-4 border-gray-200">
            <span className="font-medium">Reacting to{postAuthor ? ` ${postAuthor}'s` : ''} post</span>
            <p className="mt-1 line-clamp-2">{postContent}</p>
          </div>

          {/* Generated content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your {reactionType === 'comment' ? 'comment' : reactionType === 'reshare' ? 'reshare commentary' : 'post'}
            </label>
            <textarea
              value={generatedContent}
              onChange={(e) => setGeneratedContent(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-4 h-48 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {generatedContent.length} characters — edit freely before publishing
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {published && (
            <p className="text-sm text-green-600 font-medium">
              Published to LinkedIn!
            </p>
          )}

          <div className="flex gap-2">
            {linkedinStatus?.connected && !published && (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="flex-1 bg-blue-700 text-white rounded-lg py-2.5 font-medium hover:bg-blue-800 disabled:opacity-50 transition-colors"
              >
                {publishing ? 'Publishing...' : 'Publish to LinkedIn'}
              </button>
            )}

            <button
              onClick={copyToClipboard}
              className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2.5 font-medium hover:bg-gray-200 transition-colors"
            >
              Copy to Clipboard
            </button>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Regenerate
            </button>

            <button
              onClick={handleReset}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              New
            </button>
          </div>

          {!linkedinStatus?.connected && (
            <p className="text-xs text-gray-500">
              <a href="/settings" className="text-blue-600 hover:underline">Connect LinkedIn</a> in settings to publish directly
            </p>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { GeneratedPost } from '@/lib/db/schema';
import EditPostModal from './EditPostModal';

interface PostCardProps {
  post: GeneratedPost;
}

export default function PostCard({ post }: PostCardProps) {
  const [status, setStatus] = useState(post.status);
  const [showEditModal, setShowEditModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  async function updateStatus(newStatus: string, editedContent?: string) {
    setUpdating(true);
    try {
      await fetch(`/api/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          editedContent 
        }),
      });
      setStatus(newStatus);
    } catch (error) {
      console.error('Failed to update post status:', error);
    } finally {
      setUpdating(false);
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(post.content);
  }

  const isActioned = status !== 'suggested';

  return (
    <div className={`border rounded-xl p-5 bg-white shadow-sm transition-opacity ${
      isActioned ? 'opacity-60' : ''
    }`}>
      {/* Status indicator */}
      {isActioned && (
        <div className="mb-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            status === 'posted' || status === 'posted_edited' 
              ? 'bg-green-100 text-green-800' 
              : status === 'saved'
              ? 'bg-blue-100 text-blue-800'
              : status === 'skipped'
              ? 'bg-gray-100 text-gray-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {status === 'posted' && '✓ Posted'}
            {status === 'posted_edited' && '✓ Posted (edited)'}
            {status === 'saved' && '💾 Saved'}
            {status === 'skipped' && '⏭ Skipped'}
            {status === 'rejected' && '🚫 Rejected'}
          </span>
        </div>
      )}

      {/* Badges */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {post.topic && (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
            {post.topic}
          </span>
        )}
        {post.postType && (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
            {post.postType.replace('_', ' ')}
          </span>
        )}
        {post.engagementPrediction && (
          <span className={`px-2 py-1 text-xs rounded-full ${
            post.engagementPrediction === 'high' 
              ? 'bg-green-100 text-green-800' 
              : post.engagementPrediction === 'medium'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {post.engagementPrediction} engagement
          </span>
        )}
      </div>

      {/* Content */}
      <div className="prose prose-sm mb-4 whitespace-pre-wrap text-gray-900 leading-relaxed">
        {post.content}
      </div>

      {/* Thread for X */}
      {post.platform === 'x' && post.threadBreakdown && post.threadBreakdown.length > 0 && (
        <details className="mb-4">
          <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
            View as thread ({post.threadBreakdown.length} tweets)
          </summary>
          <div className="mt-3 space-y-2">
            {post.threadBreakdown.map((tweet: string, i: number) => (
              <div 
                key={i} 
                className="border-l-2 border-gray-300 pl-3 py-1 text-sm text-gray-700"
              >
                {tweet}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Source */}
      {post.sourceStoryUrl && (
        <a
          href={post.sourceStoryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline mb-4 block"
        >
          📰 {post.sourceStoryTitle || 'View source'}
        </a>
      )}

      {/* Actions */}
      {!isActioned && (
        <div className="flex gap-2 flex-wrap pt-3 border-t border-gray-100">
          <button
            onClick={() => updateStatus('posted')}
            disabled={updating}
            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50 transition-colors"
          >
            ✓ Posted
          </button>

          <button
            onClick={() => setShowEditModal(true)}
            disabled={updating}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 transition-colors"
          >
            ✏️ Edit & Post
          </button>

          <button
            onClick={copyToClipboard}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm transition-colors"
          >
            📋 Copy
          </button>

          <button
            onClick={() => updateStatus('saved')}
            disabled={updating}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm transition-colors disabled:opacity-50"
          >
            💾 Save
          </button>

          <button
            onClick={() => updateStatus('skipped')}
            disabled={updating}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm transition-colors disabled:opacity-50"
          >
            ⏭ Skip
          </button>

          <button
            onClick={() => updateStatus('rejected')}
            disabled={updating}
            className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm transition-colors disabled:opacity-50"
          >
            🚫 Never
          </button>
        </div>
      )}

      {showEditModal && (
        <EditPostModal
          post={post}
          onSave={(edited) => {
            updateStatus('posted_edited', edited);
            setShowEditModal(false);
          }}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}







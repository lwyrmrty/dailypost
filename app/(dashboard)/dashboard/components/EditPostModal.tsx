'use client';

import { useState, useEffect, useRef } from 'react';
import { GeneratedPost } from '@/lib/db/schema';

interface EditPostModalProps {
  post: GeneratedPost;
  onSave: (editedContent: string) => void;
  onClose: () => void;
}

export default function EditPostModal({ post, onSave, onClose }: EditPostModalProps) {
  const [content, setContent] = useState(post.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus and select all on mount
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(0, 0);
    }

    // Handle escape key
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function handleSave() {
    if (content.trim()) {
      onSave(content);
    }
  }

  const characterCount = content.length;
  const isLinkedIn = post.platform === 'linkedin';
  const optimalMin = isLinkedIn ? 1300 : 100;
  const optimalMax = isLinkedIn ? 2000 : 280;
  const hardMax = isLinkedIn ? 3000 : 280;

  const isOverLimit = post.platform === 'x' && characterCount > 280;
  const isInOptimalRange = characterCount >= optimalMin && characterCount <= optimalMax;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded flex items-center justify-center ${
              isLinkedIn ? 'bg-blue-600' : 'bg-black'
            }`}>
              <span className="text-white text-sm font-bold">
                {isLinkedIn ? 'in' : '𝕏'}
              </span>
            </div>
            <h2 className="text-lg font-semibold">Edit Post</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border border-gray-300 rounded-xl p-4 h-80 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900"
            placeholder="Edit your post..."
          />
          
          {/* Character count */}
          <div className="flex justify-between items-center mt-2">
            <div className="text-sm text-gray-500">
              {isLinkedIn ? (
                <span className={isInOptimalRange ? 'text-green-600' : ''}>
                  {characterCount} characters
                  {isInOptimalRange && ' (optimal range)'}
                </span>
              ) : (
                <span className={isOverLimit ? 'text-red-600 font-medium' : ''}>
                  {characterCount}/280 characters
                  {isOverLimit && ` (${characterCount - 280} over limit)`}
                </span>
              )}
            </div>
            
            {/* Quick actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setContent(post.content)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(content)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            📋 Copy
          </button>
          <button
            onClick={handleSave}
            disabled={isOverLimit || !content.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✓ Mark as Posted
          </button>
        </div>
      </div>
    </div>
  );
}







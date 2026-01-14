'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type SourceType = 'rss' | 'reddit' | 'x' | 'linkedin';

interface UserData {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  onboardingProgress: number;
  onboardingCompleted: boolean;
}

interface ProfileData {
  jobDescription: string | null;
  primaryTopics: string[] | null;
  avoidTopics: string[] | null;
  postingGoals: string[] | null;
}

interface SourceData {
  id: string;
  sourceName: string | null;
  sourceUrl: string;
  sourceType: SourceType;
  isActive: boolean;
  priority: number;
}

interface SettingsData {
  user: UserData;
  profile: ProfileData | null;
  sources: SourceData[];
}

const SOURCE_TYPE_INFO: Record<SourceType, { label: string; icon: string; placeholder: string; help: string }> = {
  rss: {
    label: 'RSS Feed',
    icon: '📰',
    placeholder: 'https://techcrunch.com/feed/',
    help: 'Any RSS or Atom feed URL',
  },
  reddit: {
    label: 'Reddit',
    icon: '🔴',
    placeholder: 'https://reddit.com/r/technology',
    help: 'Subreddit or user profile URL',
  },
  x: {
    label: 'X / Twitter',
    icon: '𝕏',
    placeholder: 'https://x.com/elonmusk',
    help: 'Twitter/X profile URL or @username',
  },
  linkedin: {
    label: 'LinkedIn',
    icon: '💼',
    placeholder: 'https://linkedin.com/newsletters/...',
    help: 'Newsletter or article URL',
  },
};

function detectSourceType(url: string): SourceType {
  if (/reddit\.com/.test(url)) return 'reddit';
  if (/twitter\.com|x\.com|^@/.test(url)) return 'x';
  if (/linkedin\.com/.test(url)) return 'linkedin';
  return 'rss';
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSource, setEditingSource] = useState<SourceData | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (status !== 'authenticated' || !session?.user?.id) {
      return;
    }

    try {
      const response = await fetch(`/api/settings?userId=${session.user.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError('Failed to load settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [session, status]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    fetchData();
  }, [status, router, fetchData]);

  const handleAddSource = async (sourceData: {
    sourceUrl: string;
    sourceName: string;
    sourceType: SourceType;
    priority: number;
  }) => {
    if (!session?.user?.id) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          ...sourceData,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to add source');
      
      await fetchData();
      setShowAddModal(false);
    } catch (err) {
      console.error('Add source error:', err);
      alert('Failed to add source');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSource = async (id: string, updates: Partial<SourceData>) => {
    if (!session?.user?.id) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/settings/sources/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          ...updates,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to update source');
      
      await fetchData();
      setShowEditModal(false);
      setEditingSource(null);
    } catch (err) {
      console.error('Update source error:', err);
      alert('Failed to update source');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!session?.user?.id) return;
    if (!confirm('Are you sure you want to delete this source?')) return;
    
    try {
      const response = await fetch(`/api/settings/sources/${id}?userId=${session.user.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete source');
      
      await fetchData();
    } catch (err) {
      console.error('Delete source error:', err);
      alert('Failed to delete source');
    }
  };

  const handleToggleActive = async (source: SourceData) => {
    await handleUpdateSource(source.id, { isActive: !source.isActive });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto py-16 px-4 text-center">
        <div className="animate-pulse text-gray-500">Loading settings...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto py-16 px-4 text-center">
        <p className="text-red-600">{error || 'Something went wrong'}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

      {/* Account Section */}
      <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Account</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <p className="text-gray-900">{data.user.name || 'Not set'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <p className="text-gray-900">{data.user.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Created</label>
            <p className="text-gray-900">
              {data.user.createdAt ? new Date(data.user.createdAt).toLocaleDateString() : 'Unknown'}
            </p>
          </div>
        </div>
      </section>

      {/* Voice Profile Section */}
      <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Voice Profile</h2>
          <Link href="/onboarding" className="text-blue-600 hover:underline text-sm">
            Edit Profile
          </Link>
        </div>
        
        {data.profile ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
              <p className="text-gray-900">{data.profile.jobDescription || 'Not set'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Topics</label>
              <div className="flex flex-wrap gap-2">
                {(data.profile.primaryTopics || []).map((topic, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                    {topic}
                  </span>
                ))}
                {(!data.profile.primaryTopics || data.profile.primaryTopics.length === 0) && (
                  <span className="text-gray-500">No topics set</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Topics to Avoid</label>
              <div className="flex flex-wrap gap-2">
                {(data.profile.avoidTopics || []).map((topic, i) => (
                  <span key={i} className="px-2 py-1 bg-red-100 text-red-800 text-sm rounded">
                    {topic}
                  </span>
                ))}
                {(!data.profile.avoidTopics || data.profile.avoidTopics.length === 0) && (
                  <span className="text-gray-500">None</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">
            No voice profile yet.{' '}
            <Link href="/onboarding" className="text-blue-600 hover:underline">
              Complete onboarding
            </Link>
          </p>
        )}
      </section>

      {/* News Sources Section */}
      <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">News Sources</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            + Add Source
          </button>
        </div>
        
        {data.sources.length > 0 ? (
          <div className="space-y-3">
            {data.sources.map((source) => (
              <SourceCard
                key={source.id}
                source={source}
                onEdit={() => {
                  setEditingSource(source);
                  setShowEditModal(true);
                }}
                onDelete={() => handleDeleteSource(source.id)}
                onToggleActive={() => handleToggleActive(source)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              No custom sources yet. Add your favorite news sources, subreddits, or X accounts.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-blue-600 hover:underline"
            >
              Add your first source
            </button>
          </div>
        )}
      </section>

      {/* Danger Zone */}
      <section className="bg-white rounded-xl shadow-sm p-6 border border-red-200">
        <h2 className="text-xl font-semibold text-red-600 mb-4">Danger Zone</h2>
        <p className="text-gray-600 mb-4">
          These actions are irreversible. Please be certain.
        </p>
        <div className="space-y-3">
          <button
            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            onClick={() => alert('Coming soon: Export all your data')}
          >
            Export Data
          </button>
          <button
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors ml-3"
            onClick={() => alert('Coming soon: Delete account')}
          >
            Delete Account
          </button>
        </div>
      </section>

      {/* Add Source Modal */}
      {showAddModal && (
        <SourceModal
          title="Add News Source"
          onClose={() => setShowAddModal(false)}
          onSave={handleAddSource}
          saving={saving}
        />
      )}

      {/* Edit Source Modal */}
      {showEditModal && editingSource && (
        <SourceModal
          title="Edit Source"
          source={editingSource}
          onClose={() => {
            setShowEditModal(false);
            setEditingSource(null);
          }}
          onSave={(data) => handleUpdateSource(editingSource.id, data)}
          saving={saving}
        />
      )}
    </div>
  );
}

function SourceCard({
  source,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  source: SourceData;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  const typeInfo = SOURCE_TYPE_INFO[source.sourceType] || SOURCE_TYPE_INFO.rss;
  
  return (
    <div className={`flex items-center justify-between py-3 px-4 rounded-lg border ${
      source.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
    }`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-xl">{typeInfo.icon}</span>
        <div className="min-w-0 flex-1">
          <p className={`font-medium truncate ${source.isActive ? 'text-gray-900' : 'text-gray-500'}`}>
            {source.sourceName || source.sourceUrl}
          </p>
          <p className="text-sm text-gray-500 truncate">
            {source.sourceUrl}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 ml-4">
        <span className={`px-2 py-1 text-xs rounded ${
          source.isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-600'
        }`}>
          {source.isActive ? 'Active' : 'Paused'}
        </span>
        <span className="text-xs text-gray-500 w-8">
          P{source.priority}
        </span>
        <button
          onClick={onToggleActive}
          className="p-1 text-gray-400 hover:text-gray-600"
          title={source.isActive ? 'Pause' : 'Activate'}
        >
          {source.isActive ? '⏸️' : '▶️'}
        </button>
        <button
          onClick={onEdit}
          className="p-1 text-gray-400 hover:text-blue-600"
          title="Edit"
        >
          ✏️
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-gray-400 hover:text-red-600"
          title="Delete"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

function SourceModal({
  title,
  source,
  onClose,
  onSave,
  saving,
}: {
  title: string;
  source?: SourceData;
  onClose: () => void;
  onSave: (data: { sourceUrl: string; sourceName: string; sourceType: SourceType; priority: number }) => void;
  saving: boolean;
}) {
  const [url, setUrl] = useState(source?.sourceUrl || '');
  const [name, setName] = useState(source?.sourceName || '');
  const [type, setType] = useState<SourceType>(source?.sourceType || 'rss');
  const [priority, setPriority] = useState(source?.priority || 3);

  // Auto-detect source type when URL changes
  useEffect(() => {
    if (url && !source) {
      setType(detectSourceType(url));
    }
  }, [url, source]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    onSave({
      sourceUrl: url.trim(),
      sourceName: name.trim(),
      sourceType: type,
      priority,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-semibold mb-4">{title}</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Source Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(SOURCE_TYPE_INFO) as [SourceType, typeof SOURCE_TYPE_INFO.rss][]).map(([key, info]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setType(key)}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-left ${
                    type === key
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span>{info.icon}</span>
                  <span className="text-sm font-medium">{info.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={SOURCE_TYPE_INFO[type].placeholder}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">{SOURCE_TYPE_INFO[type].help}</p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Tech News, AI Updates"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority: {priority}
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={saving || !url.trim()}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';

type SourceType = 'rss' | 'reddit' | 'x' | 'linkedin';

export interface SelectedSource {
  sourceType: SourceType;
  sourceUrl: string;
  sourceName: string;
  priority: number;
}

interface Props {
  onComplete: (data: { sources: SelectedSource[] }) => void;
  onSkip: () => void;
  initialData?: { sources: SelectedSource[] };
}

const SUGGESTED_SOURCES: Array<{
  category: string;
  sources: SelectedSource[];
}> = [
  {
    category: 'Tech News',
    sources: [
      { sourceType: 'rss', sourceUrl: 'https://techcrunch.com/feed/', sourceName: 'TechCrunch', priority: 5 },
      { sourceType: 'rss', sourceUrl: 'https://www.theverge.com/rss/index.xml', sourceName: 'The Verge', priority: 4 },
      { sourceType: 'rss', sourceUrl: 'https://www.wired.com/feed/rss', sourceName: 'Wired', priority: 4 },
      { sourceType: 'rss', sourceUrl: 'https://feeds.arstechnica.com/arstechnica/technology-lab', sourceName: 'Ars Technica', priority: 4 },
    ],
  },
  {
    category: 'AI & Machine Learning',
    sources: [
      { sourceType: 'rss', sourceUrl: 'https://news.mit.edu/rss/topic/artificial-intelligence2', sourceName: 'MIT News - AI', priority: 5 },
      { sourceType: 'reddit', sourceUrl: 'https://reddit.com/r/MachineLearning', sourceName: 'r/MachineLearning', priority: 5 },
      { sourceType: 'reddit', sourceUrl: 'https://reddit.com/r/artificial', sourceName: 'r/artificial', priority: 4 },
      { sourceType: 'rss', sourceUrl: 'https://openai.com/blog/rss.xml', sourceName: 'OpenAI Blog', priority: 5 },
    ],
  },
  {
    category: 'Startups & Business',
    sources: [
      { sourceType: 'reddit', sourceUrl: 'https://reddit.com/r/startups', sourceName: 'r/startups', priority: 4 },
      { sourceType: 'reddit', sourceUrl: 'https://reddit.com/r/entrepreneur', sourceName: 'r/entrepreneur', priority: 3 },
      { sourceType: 'rss', sourceUrl: 'https://feeds.feedburner.com/venturebeat/SZYF', sourceName: 'VentureBeat', priority: 4 },
    ],
  },
  {
    category: 'Science & Engineering',
    sources: [
      { sourceType: 'rss', sourceUrl: 'https://spectrum.ieee.org/feeds/feed.rss', sourceName: 'IEEE Spectrum', priority: 4 },
      { sourceType: 'reddit', sourceUrl: 'https://reddit.com/r/technology', sourceName: 'r/technology', priority: 4 },
      { sourceType: 'reddit', sourceUrl: 'https://reddit.com/r/programming', sourceName: 'r/programming', priority: 3 },
    ],
  },
];

const SOURCE_TYPE_ICONS: Record<SourceType, string> = {
  rss: '📰',
  reddit: '🔴',
  x: '𝕏',
  linkedin: '💼',
};

export default function Step8Sources({ onComplete, onSkip, initialData }: Props) {
  const [selectedSources, setSelectedSources] = useState<SelectedSource[]>(
    initialData?.sources || []
  );
  const [customUrl, setCustomUrl] = useState('');
  const [customName, setCustomName] = useState('');

  const isSelected = (source: SelectedSource) => 
    selectedSources.some(s => s.sourceUrl === source.sourceUrl);

  const toggleSource = (source: SelectedSource) => {
    if (isSelected(source)) {
      setSelectedSources(prev => prev.filter(s => s.sourceUrl !== source.sourceUrl));
    } else {
      setSelectedSources(prev => [...prev, source]);
    }
  };

  const addCustomSource = () => {
    if (!customUrl.trim()) return;
    
    // Auto-detect type
    let type: SourceType = 'rss';
    if (customUrl.includes('reddit.com')) type = 'reddit';
    else if (customUrl.includes('twitter.com') || customUrl.includes('x.com')) type = 'x';
    else if (customUrl.includes('linkedin.com')) type = 'linkedin';
    
    const newSource: SelectedSource = {
      sourceType: type,
      sourceUrl: customUrl.trim(),
      sourceName: customName.trim() || customUrl.trim(),
      priority: 3,
    };
    
    if (!isSelected(newSource)) {
      setSelectedSources(prev => [...prev, newSource]);
    }
    
    setCustomUrl('');
    setCustomName('');
  };

  const removeSource = (url: string) => {
    setSelectedSources(prev => prev.filter(s => s.sourceUrl !== url));
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choose your news sources
        </h2>
        <p className="text-gray-600">
          Select the sources you want us to monitor for content inspiration. 
          You can always add more later in settings.
        </p>
      </div>

      {/* Selected sources */}
      {selectedSources.length > 0 && (
        <div className="bg-blue-50 rounded-xl p-4">
          <h3 className="font-medium text-blue-900 mb-3">
            Selected ({selectedSources.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {selectedSources.map((source) => (
              <span
                key={source.sourceUrl}
                className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-full text-sm border border-blue-200"
              >
                <span>{SOURCE_TYPE_ICONS[source.sourceType]}</span>
                <span>{source.sourceName}</span>
                <button
                  type="button"
                  onClick={() => removeSource(source.sourceUrl)}
                  className="ml-1 text-gray-400 hover:text-red-500"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Suggested sources by category */}
      <div className="space-y-6">
        {SUGGESTED_SOURCES.map((category) => (
          <div key={category.category}>
            <h3 className="font-medium text-gray-900 mb-3">{category.category}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {category.sources.map((source) => (
                <button
                  key={source.sourceUrl}
                  type="button"
                  onClick={() => toggleSource(source)}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    isSelected(source)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{SOURCE_TYPE_ICONS[source.sourceType]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{source.sourceName}</p>
                    <p className="text-xs text-gray-500 truncate">{source.sourceUrl}</p>
                  </div>
                  {isSelected(source) && (
                    <span className="text-blue-600">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add custom source */}
      <div className="border-t pt-6">
        <h3 className="font-medium text-gray-900 mb-3">Add custom source</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="https://example.com/feed.xml"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Name (optional)"
            className="w-40 border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={addCustomSource}
            disabled={!customUrl.trim()}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            Add
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Supports RSS feeds, Reddit (r/subreddit), X/Twitter (@username), and LinkedIn newsletters
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onSkip}
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50"
        >
          Skip for now
        </button>
        <button
          type="button"
          onClick={() => onComplete({ sources: selectedSources })}
          disabled={selectedSources.length === 0}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {selectedSources.length === 0 
            ? 'Select at least one source' 
            : `Continue with ${selectedSources.length} source${selectedSources.length > 1 ? 's' : ''}`
          }
        </button>
      </div>
    </div>
  );
}

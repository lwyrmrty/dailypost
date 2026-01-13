'use client';

import { useState } from 'react';

interface Step4Props {
  onComplete: (data: { inspirationAccounts: InspirationAccount[] }) => void;
  onSkip: () => void;
  initialData?: { inspirationAccounts: InspirationAccount[] };
}

export interface InspirationAccount {
  platform: 'linkedin' | 'x';
  url: string;
  whatYouLike: string;
}

export default function Step4Inspiration({ onComplete, onSkip, initialData }: Step4Props) {
  const [accounts, setAccounts] = useState<InspirationAccount[]>(
    initialData?.inspirationAccounts || []
  );
  const [newAccount, setNewAccount] = useState<InspirationAccount>({
    platform: 'linkedin',
    url: '',
    whatYouLike: '',
  });

  function addAccount() {
    if (newAccount.url && newAccount.whatYouLike) {
      setAccounts(prev => [...prev, newAccount]);
      setNewAccount({ platform: 'linkedin', url: '', whatYouLike: '' });
    }
  }

  function removeAccount(index: number) {
    setAccounts(prev => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (accounts.length >= 2) {
      onComplete({ inspirationAccounts: accounts });
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Who inspires you?</h2>
        <p className="text-gray-600">
          Share 2-5 LinkedIn or X accounts whose content style you admire. 
          Tell us what you like about each.
        </p>
      </div>

      {/* Added Accounts */}
      {accounts.length > 0 && (
        <div className="space-y-3">
          {accounts.map((account, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      account.platform === 'linkedin' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-900 text-white'
                    }`}>
                      {account.platform === 'linkedin' ? 'LinkedIn' : 'X'}
                    </span>
                    <a 
                      href={account.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline truncate max-w-xs"
                    >
                      {account.url}
                    </a>
                  </div>
                  <p className="text-sm text-gray-700">{account.whatYouLike}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAccount(idx)}
                  className="text-gray-400 hover:text-red-500 ml-2"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Account Form */}
      <div className="border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="font-medium">Add an inspiration account</h3>
        
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Platform</label>
            <select
              value={newAccount.platform}
              onChange={(e) => setNewAccount(prev => ({ 
                ...prev, 
                platform: e.target.value as 'linkedin' | 'x' 
              }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="linkedin">LinkedIn</option>
              <option value="x">X (Twitter)</option>
            </select>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Profile URL</label>
            <input
              type="url"
              value={newAccount.url}
              onChange={(e) => setNewAccount(prev => ({ ...prev, url: e.target.value }))}
              placeholder={newAccount.platform === 'linkedin' 
                ? 'https://linkedin.com/in/username' 
                : 'https://x.com/username'
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">
            What do you like about their content?
          </label>
          <textarea
            value={newAccount.whatYouLike}
            onChange={(e) => setNewAccount(prev => ({ ...prev, whatYouLike: e.target.value }))}
            placeholder="e.g., Their hot takes are always well-researched. They use data effectively. Their threads are engaging..."
            className="w-full border border-gray-300 rounded-lg p-3 h-24 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
        
        <button
          type="button"
          onClick={addAccount}
          disabled={!newAccount.url || !newAccount.whatYouLike}
          className="px-4 py-2 bg-gray-200 rounded-lg text-sm hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Add Account
        </button>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onSkip}
          className="flex-1 border border-gray-300 rounded-lg py-3 font-medium hover:bg-gray-50 transition-colors"
        >
          Skip This Step
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={accounts.length < 2}
          className="flex-1 bg-blue-600 text-white rounded-lg py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          Continue ({accounts.length}/2 minimum)
        </button>
      </div>
    </div>
  );
}






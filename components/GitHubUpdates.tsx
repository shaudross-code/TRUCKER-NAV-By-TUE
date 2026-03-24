import React, { useState, useEffect } from 'react';
import { fetchRepoDetails, fetchRecentCommits, GitHubRepo, GitHubCommit } from '../services/githubService';

const GitHubUpdates: React.FC = () => {
  const [owner, setOwner] = useState('facebook');
  const [repo, setRepo] = useState('react');
  const [repoDetails, setRepoDetails] = useState<GitHubRepo | null>(null);
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!owner || !repo) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [details, recentCommits] = await Promise.all([
        fetchRepoDetails(owner, repo),
        fetchRecentCommits(owner, repo, 10)
      ]);
      
      setRepoDetails(details);
      setCommits(recentCommits);
    } catch (err: any) {
      setError(err.message || 'Failed to load GitHub data');
      setRepoDetails(null);
      setCommits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black italic uppercase text-[#D4AF37] tracking-tighter">System Updates</h1>
        <div className="text-zinc-400 text-sm">GitHub Integration</div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
        <div className="flex-1">
          <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-1">Owner / Org</label>
          <input 
            type="text" 
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
            placeholder="e.g., facebook"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-1">Repository</label>
          <input 
            type="text" 
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
            placeholder="e.g., react"
          />
        </div>
        <div className="flex items-end">
          <button 
            type="submit"
            disabled={loading}
            className="bg-[#D4AF37] text-black font-bold px-6 py-2 rounded-xl h-[42px] hover:bg-[#D4AF37]/90 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Fetch'}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-2xl">
          {error}
        </div>
      )}

      {repoDetails && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl md:col-span-4">
            <h2 className="text-2xl font-bold text-white mb-2">{repoDetails.full_name}</h2>
            <p className="text-zinc-400">{repoDetails.description}</p>
            <div className="flex gap-6 mt-4 text-sm">
              <span className="flex items-center gap-2 text-zinc-300">
                <svg className="w-4 h-4 text-[#D4AF37]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                {repoDetails.stargazers_count.toLocaleString()} Stars
              </span>
              <span className="flex items-center gap-2 text-zinc-300">
                <svg className="w-4 h-4 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                {repoDetails.forks_count.toLocaleString()} Forks
              </span>
              <span className="flex items-center gap-2 text-zinc-300">
                <svg className="w-4 h-4 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Updated {new Date(repoDetails.updated_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {commits.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">Recent Commits</h3>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            {commits.map((commit, index) => (
              <div key={commit.sha} className={`p-4 flex flex-col gap-2 ${index !== commits.length - 1 ? 'border-b border-zinc-800' : ''}`}>
                <div className="flex justify-between items-start">
                  <span className="font-medium text-white">{commit.commit.message.split('\n')[0]}</span>
                  <a href={commit.html_url} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-[#D4AF37] hover:underline">
                    {commit.sha.substring(0, 7)}
                  </a>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span className="font-medium text-zinc-400">{commit.commit.author.name}</span>
                  <span>•</span>
                  <span>{new Date(commit.commit.author.date).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GitHubUpdates;

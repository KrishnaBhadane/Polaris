import type { FC } from 'react';
import { useHealth } from '../hooks/useHealth';

export const HealthStatus: FC = () => {
  const { data, loading, error, refetch } = useHealth();

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
          Backend API Connection
        </h3>
        <button
          onClick={refetch}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition duration-150 disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Checking...' : 'Refresh Status'}
        </button>
      </div>

      <div className="rounded-lg bg-slate-950 p-4 border border-slate-800 font-mono text-sm">
        <div className="text-xs text-slate-500 mb-2 uppercase tracking-wider">GET /api/health</div>
        {loading && (
          <p className="text-slate-400 flex items-center gap-2">
            <span className="inline-block animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></span>
            Connecting to http://localhost:5000/api/health...
          </p>
        )}

        {error && (
          <div className="text-rose-400">
            <p className="font-semibold">⚠️ Connection Error</p>
            <p className="text-xs text-rose-300/80 mt-1">{error}</p>
          </div>
        )}

        {data && (
          <div className="text-emerald-400 space-y-1">
            <p className="font-semibold text-emerald-300">✓ Connected Successfully</p>
            <pre className="text-xs text-emerald-400/90 bg-emerald-950/30 p-2 rounded border border-emerald-900/50 mt-2">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

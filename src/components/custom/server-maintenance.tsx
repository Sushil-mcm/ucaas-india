import { useState } from 'react';
import { Server, Wrench, RefreshCw } from 'lucide-react';

interface ServerMaintenanceProps {
  onRefresh: () => Promise<void>;
}

export default function ServerMaintenance({ onRefresh }: ServerMaintenanceProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (err) {
      console.log(err);

      // The parent handles error states
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="w-screen min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col items-center text-center gap-6">
        {/* Brand Aligned Icon Cluster */}
        <div className="relative flex items-center justify-center w-24 h-24 mb-2">
          {/* Subtle background pulse */}
          <div className="absolute inset-0 bg-gray-100 rounded-full animate-pulse" />

          <Server className="w-12 h-12 text-gray-800 relative z-10" />

          {/* Accent wrench overlay */}
          <div className="absolute -bottom-1 -right-1 bg-black text-white p-2 rounded-xl border-4 border-white shadow-sm z-20">
            <Wrench className="w-4 h-4" />
          </div>
        </div>

        {/* Title and Description */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">System Maintenance</h1>
          <p className="text-gray-500 text-sm max-w-sm leading-relaxed">
            We are currently performing maintenance or updating our systems to serve you better.
            We&apos;ll be back online shortly. Thank you for your patience!
          </p>
        </div>

        {/* Brand Button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="w-full max-w-xs h-10 px-4 py-2 font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 bg-[#121212] hover:bg-black text-white rounded-lg disabled:opacity-50 text-sm shadow-xs"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Reconnecting...' : 'Refresh Page'}
        </button>

        {/* Footer Support Info */}
        <p className="text-xs text-gray-400 mt-4">
          If the issue persists, please check your internet connection or contact support.
        </p>
      </div>
    </div>
  );
}

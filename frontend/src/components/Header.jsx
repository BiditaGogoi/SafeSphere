import React from 'react';
import { ShieldAlert, MapPin, Compass } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md z-20">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-wide m-0">SafeRoute AI</h1>
          <p className="text-[11px] text-slate-400 m-0">
            AI-Powered Safety Navigation &amp; Fast-Help Routing
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-md border border-slate-700">
          <MapPin className="w-3.5 h-3.5 text-indigo-400" />
          <span>Jalandhar, Punjab</span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-md border border-slate-700">
          <Compass className="w-3.5 h-3.5 text-emerald-400" />
          <span>OpenStreetMap</span>
        </div>
      </div>
    </header>
  );
}

import React from 'react';
import { ShieldAlert, MapPin, Compass } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md z-20">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white tracking-wide m-0">SafeRoute</h1>
            <span className="text-xs bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-medium">
              Stage 4: Custom A* Routing Active
            </span>
          </div>
          <p className="text-xs text-slate-400 m-0">
            AI Foundation CA1 &bull; Tourist Safety Risk Mapping & Fast-Help Routing
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-300">
        <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-md border border-slate-700">
          <MapPin className="w-3.5 h-3.5 text-indigo-400" />
          <span>Jalandhar, Punjab</span>
          <span className="text-slate-500 font-mono">(31.3260° N, 75.5762° E)</span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-md border border-slate-700">
          <Compass className="w-3.5 h-3.5 text-emerald-400" />
          <span>OpenStreetMap Active</span>
        </div>
      </div>
    </header>
  );
}

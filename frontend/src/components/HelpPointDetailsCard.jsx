import React from 'react';
import {
  ShieldCheck,
  Building2,
  Clock,
  Phone,
  MapPin,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  X,
  Navigation,
} from 'lucide-react';

const CATEGORY_ICONS = {
  'Hospital': Building2,
  'Police station': ShieldCheck,
  'First-aid centre': CheckCircle,
  'Emergency assistance point': AlertCircle,
};

export default function HelpPointDetailsCard({ point, distanceKm, onClose }) {
  if (!point) return null;

  const CategoryIcon = CATEGORY_ICONS[point.category] || HelpCircle;
  const isSynthetic = point.verification_status === 'Synthetic Demonstration Location';

  return (
    <div className="bg-slate-900 border border-indigo-500/40 rounded-xl p-3.5 shadow-xl text-xs text-slate-200 flex flex-col gap-2.5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
            <CategoryIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-100 text-xs leading-tight">
              {point.name}
            </h4>
            <span className="text-[10px] text-indigo-300 font-mono">
              {point.category || 'Help Point'}
            </span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-0.5 rounded cursor-pointer"
            title="Close details"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Road Distance Badge (if routed by A*) */}
      {distanceKm !== undefined && distanceKm !== null && (
        <div className="flex items-center justify-between bg-indigo-950/50 border border-indigo-500/30 px-2.5 py-1 rounded-md text-[11px]">
          <span className="text-slate-400 flex items-center gap-1">
            <Navigation className="w-3 h-3 text-indigo-400" />
            A* Road Distance:
          </span>
          <span className="font-mono text-indigo-300 font-bold">{distanceKm} km</span>
        </div>
      )}

      {/* Information Fields */}
      <div className="space-y-1.5 text-[11px]">
        {/* Address & Coordinates */}
        <div className="flex items-start gap-1.5 text-slate-300">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <div className="leading-tight">
            <span>{point.address || 'Information unavailable'}</span>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              Lat: {point.lat?.toFixed(4)}, Lng: {point.lng?.toFixed(4)}
            </div>
          </div>
        </div>

        {/* Operating Hours */}
        <div className="flex items-center gap-1.5 text-slate-300">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Hours: <strong className="text-slate-200">{point.opening_hours || 'Information unavailable'}</strong></span>
        </div>

        {/* Contact Phone */}
        <div className="flex items-center gap-1.5 text-slate-300">
          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Contact: <strong className="text-slate-400 font-mono">{point.contact || 'Not verified'}</strong></span>
        </div>

        {/* Services List */}
        <div className="pt-1">
          <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block mb-1">
            Available Services:
          </span>
          {Array.isArray(point.services) && point.services.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {point.services.map((srv, idx) => (
                <span
                  key={idx}
                  className="bg-slate-800 border border-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-[10px]"
                >
                  {srv}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[10px] text-slate-500 italic">Information unavailable</span>
          )}
        </div>
      </div>

      {/* Verification Status Banner */}
      <div
        className={`mt-1 p-2 rounded text-[10px] border flex items-center justify-between ${
          isSynthetic
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            : point.verification_status === 'Verified'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-slate-800 border-slate-700 text-slate-400'
        }`}
      >
        <span>Verification Status:</span>
        <strong className="font-semibold">{point.verification_status || 'Synthetic Demonstration Location'}</strong>
      </div>
    </div>
  );
}


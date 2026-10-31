import React, { useState, useEffect } from 'react';
import {
  Navigation,
  Route,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Bot,
  ShieldAlert,
  AlertOctagon,
  XCircle,
} from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function RoutePlannerCard({
  onRouteCalculated,
  onClearRoute,
  onHelpPointSelected,
  activeRoute,
}) {
  const [nodes, setNodes] = useState([]);
  const [startNode, setStartNode] = useState('N_MODEL_TOWN');
  const [goalNode, setGoalNode] = useState('H_CIVIL_HOSPITAL');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Agent reasoning & Demo SOS state
  const [agentReasoning, setAgentReasoning] = useState(null);
  const [showSosConfirm, setShowSosConfirm] = useState(false);
  const [sosAlert, setSosAlert] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/nodes`)
      .then((res) => res.json())
      .then((data) => {
        if (data.nodes && Array.isArray(data.nodes)) setNodes(data.nodes);
      })
      .catch((err) => console.error('Error loading graph nodes:', err));
  }, []);

  // Generic API request helper to avoid repetitive code
  const executeApiCall = (endpoint, payload, onSuccess) => {
    setLoading(true);
    setErrorMsg(null);
    fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || data.status === 'error' || data.status === 'unreachable' || data.status === 'no_reachable_help_point') {
          setErrorMsg(data.message || 'Routing operation could not be completed.');
          onRouteCalculated(null);
        } else {
          onSuccess(data);
        }
      })
      .catch(() => {
        setErrorMsg('Routing service unavailable. Verify backend is running.');
        onRouteCalculated(null);
      })
      .finally(() => setLoading(false));
  };

  // 1. Compute standard A* road route
  const handleFindRoute = () => {
    setAgentReasoning(null);
    setSosAlert(null);
    executeApiCall('/api/route', { start_node: startNode, goal_node: goalNode }, (data) => {
      onRouteCalculated(data);
      if (onHelpPointSelected && nodes.length > 0) {
        const target = nodes.find((n) => n.id === goalNode);
        if (target && target.type === 'help_point') {
          onHelpPointSelected(target, data.road_distance_km);
        }
      }
    });
  };

  // Goal-Based Agent auto-select
  const handleAgentNearest = () => {
    executeApiCall('/api/agent/nearest-help', { start_node: startNode }, (data) => {
      setGoalNode(data.selected_help_point.id);
      setAgentReasoning(data.reasoning);
      onRouteCalculated(data);
      if (onHelpPointSelected) {
        onHelpPointSelected(data.selected_help_point, data.road_distance_km);
      }
    });
  };

  // Demo SOS safety trigger
  const handleConfirmSos = () => {
    setShowSosConfirm(false);
    executeApiCall('/api/agent/sos', { start_node: startNode, confirmed: true }, (data) => {
      setSosAlert(data);
      setGoalNode(data.selected_help_point.id);
      setAgentReasoning(data.reasoning);
      onRouteCalculated(data);
      if (onHelpPointSelected) {
        onHelpPointSelected(data.selected_help_point, data.road_distance_km);
      }
    });
  };

  const handleClear = () => {
    setErrorMsg(null);
    setAgentReasoning(null);
    setSosAlert(null);
    setShowSosConfirm(false);
    onClearRoute();
  };

  const startOptions = nodes.filter((n) => n.type !== 'help_point');
  const helpOptions = nodes.filter((n) => n.type === 'help_point' || n.type === 'test_isolated');

  return (
    <div className="bg-slate-900/95 border border-indigo-500/30 rounded-xl p-4 shadow-2xl backdrop-blur text-xs w-84 text-slate-200 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-md">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-xs tracking-wide">A* Router & AI Agent</h3>
            <span className="text-[10px] text-indigo-300 font-mono">Goal-Based Agent</span>
          </div>
        </div>
        {activeRoute && (
          <button onClick={handleClear} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition cursor-pointer" title="Clear Route">
            <RotateCcw className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Select Start & Destination */}
      <div className="space-y-2">
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Starting Location:</label>
          <select value={startNode} onChange={(e) => setStartNode(e.target.value)} className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer">
            {startOptions.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Help Point Destination:</label>
          <select
            value={goalNode}
            onChange={(e) => {
              const selectedId = e.target.value;
              setGoalNode(selectedId);
              if (onHelpPointSelected && nodes.length > 0) {
                const target = nodes.find((n) => n.id === selectedId);
                if (target && target.type === 'help_point') {
                  onHelpPointSelected(target, null);
                }
              }
            }}
            className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {helpOptions.map((n) => <option key={n.id} value={n.id}>{n.name} {n.type === 'test_isolated' ? '(Unreachable Test)' : ''}</option>)}
          </select>
        </div>
      </div>

      {/* Action Buttons: 1. A* Route, 2. Agent Auto-Select, 3. Demo SOS */}
      <div className="flex flex-col gap-2 pt-1">
        <button onClick={handleFindRoute} disabled={loading} className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white font-medium rounded-lg shadow transition flex items-center justify-center gap-2 cursor-pointer text-xs">
          <Route className="w-3.5 h-3.5" />
          <span>{loading ? 'Calculating Route...' : 'Compute A* Road Route'}</span>
        </button>

        <button onClick={handleAgentNearest} disabled={loading} className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-medium rounded-lg border border-indigo-500/30 transition flex items-center justify-center gap-2 cursor-pointer text-xs" title="Agent automatically selects nearest assistance post by A* road distance">
          <Bot className="w-3.5 h-3.5 text-indigo-400" />
          <span>Auto-Select Nearest Safe Point</span>
        </button>

        <button onClick={() => setShowSosConfirm(true)} disabled={loading} className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-900 text-white font-semibold rounded-lg shadow-md transition flex items-center justify-center gap-2 cursor-pointer text-xs">
          <AlertOctagon className="w-4 h-4 text-white animate-pulse" />
          <span>Trigger Demo SOS Assistance</span>
        </button>
      </div>

      {/* Rule-Based Confirmation Dialog */}
      {showSosConfirm && (
        <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-200 text-[11px] flex flex-col gap-2 shadow-lg">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-tight">
              <strong className="text-rose-100">Confirm Demo SOS Activation?</strong>
              <p className="mt-1 text-[10px] text-rose-300">Rule Check: Confirmation required. Agent will route to the nearest safe assistance post.</p>
              <p className="mt-1 text-[10px] text-amber-300 font-medium">* Academic simulation: No real emergency services will be contacted.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end pt-1">
            <button onClick={() => setShowSosConfirm(false)} className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer">Cancel</button>
            <button onClick={handleConfirmSos} disabled={loading} className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 disabled:bg-rose-900 disabled:opacity-60 text-white font-semibold text-[10px] shadow cursor-pointer">
              {loading ? 'Activating...' : 'Confirm Demo SOS'}
            </button>
          </div>
        </div>
      )}

      {/* Active Demo SOS Banner */}
      {sosAlert && (
        <div className="p-2.5 rounded-lg bg-rose-900/30 border border-rose-500/40 text-rose-200 text-[11px] flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-rose-300 flex items-center gap-1.5 text-xs"><AlertOctagon className="w-3.5 h-3.5 text-rose-400" />DEMONSTRATION ALERT ACTIVE</span>
            <button onClick={() => setSosAlert(null)} className="text-slate-400 hover:text-slate-200 cursor-pointer" title="Dismiss Alert"><XCircle className="w-3.5 h-3.5" /></button>
          </div>
          <p className="text-[10px] leading-tight text-slate-200">{sosAlert.message}</p>
          <div className="text-[9px] text-amber-300/90 font-mono bg-rose-950/50 p-1.5 rounded border border-rose-800/40">{sosAlert.disclaimer}</div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="leading-tight"><strong>Routing Notice:</strong><p className="mt-0.5">{errorMsg}</p></div>
        </div>
      )}

      {/* Agent Reasoning Notice */}
      {agentReasoning && !errorMsg && (
        <div className="p-2 rounded-lg bg-indigo-950/50 border border-indigo-500/30 text-indigo-200 text-[10px] flex items-start gap-1.5 leading-tight">
          <Bot className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
          <div><strong className="text-indigo-300">Goal-Based Agent Decision:</strong><p className="mt-0.5 text-slate-300">{agentReasoning}</p></div>
        </div>
      )}

      {/* Route Results Box */}
      {activeRoute && (activeRoute.status === 'success' || activeRoute.status === 'demo_alert_triggered') && (
        <div className="bg-slate-950/70 p-3 rounded-lg border border-indigo-500/30 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Optimal Road Route Connected</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Road Distance (A* Path)</span>
              <strong className="text-sm text-indigo-300 font-mono">{activeRoute.road_distance_km} km</strong>
            </div>
            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Straight-Line (Heuristic)</span>
              <strong className="text-sm text-amber-300 font-mono">{activeRoute.straight_line_distance_km} km</strong>
            </div>
          </div>

          <div className="mt-1 pt-1.5 border-t border-slate-800 text-[10px] text-slate-300">
            <span className="text-slate-400 font-semibold block mb-1">Route Nodes ({activeRoute.node_ids ? activeRoute.node_ids.length : activeRoute.route.length}):</span>
            <div className="flex flex-wrap items-center gap-1 max-h-24 overflow-y-auto pr-1">
              {activeRoute.route.slice(0, 8).map((p, idx) => (
                <React.Fragment key={p.id || idx}>
                  <span className="bg-slate-800/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-200">{p.name ? p.name.split(' ')[0] : `Node ${p.id.slice(-4)}`}</span>
                  {idx < Math.min(activeRoute.route.length, 8) - 1 && <ArrowRight className="w-2.5 h-2.5 text-indigo-400 shrink-0" />}
                </React.Fragment>
              ))}
              {activeRoute.route.length > 8 && <span className="text-slate-500 font-mono text-[9px]">+{activeRoute.route.length - 8} more</span>}
            </div>
          </div>
        </div>
      )}

      {/* Academic Disclaimer */}
      <div className="text-[10px] text-slate-500 pt-1.5 border-t border-slate-800/80 leading-tight">
        * <strong>Academic Demonstration:</strong> Road routes calculated on central Jalandhar walkable ways. Help points are simulation points for CA1 evaluation, not real emergency dispatches.
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';

export default function App() {
  const [selectedHelpPoint, setSelectedHelpPoint] = useState(null);
  const [roadDistanceKm, setRoadDistanceKm] = useState(null);

  const handleHelpPointSelected = (point, distKm = null) => {
    setSelectedHelpPoint(point);
    if (distKm !== undefined) {
      setRoadDistanceKm(distKm);
    }
  };

  const handleClearHelpPoint = () => {
    setSelectedHelpPoint(null);
    setRoadDistanceKm(null);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Navigation Bar */}
      <Header />

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          selectedHelpPoint={selectedHelpPoint}
          roadDistanceKm={roadDistanceKm}
          onClearHelpPoint={handleClearHelpPoint}
        />
        <main className="flex-1 flex flex-col relative h-full">
          <MapView
            onHelpPointSelected={handleHelpPointSelected}
            selectedHelpPoint={selectedHelpPoint}
          />
        </main>
      </div>
    </div>
  );
}

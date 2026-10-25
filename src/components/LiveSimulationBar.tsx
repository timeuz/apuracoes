import React from 'react';
import { Play, Pause, RotateCcw, FastForward, Activity } from 'lucide-react';

interface LiveSimulationBarProps {
  isSimulating: boolean;
  setIsSimulating: (active: boolean) => void;
  simulationProgress: number;
  setSimulationProgress: (pct: number) => void;
  onReset: () => void;
  speed: number;
  setSpeed: (speed: number) => void;
}

export const LiveSimulationBar: React.FC<LiveSimulationBarProps> = ({
  isSimulating,
  setIsSimulating,
  simulationProgress,
  setSimulationProgress,
  onReset,
  speed,
  setSpeed,
}) => {
  return (
    <div className="bg-emerald-950/90 text-white border border-emerald-800/80 rounded-xl p-4 shadow-md backdrop-blur-xs transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Indicator */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-800/60 text-emerald-300">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                Simulador de Apuração em Tempo Real
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                {isSimulating ? 'Ao Vivo' : 'Pausado'}
              </span>
            </div>
            <p className="text-xs text-emerald-200/70 mt-0.5">
              Assista à evolução das urnas, gatilhos de virada histórica e alertas sonoros da urna eletrônica.
            </p>
          </div>
        </div>

        {/* Center: Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            {isSimulating ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Pausar
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Iniciar Apuração
              </>
            )}
          </button>

          <button
            onClick={onReset}
            title="Reiniciar contagem de urnas"
            className="p-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 text-xs transition-colors border border-emerald-700/50 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Speed Toggle */}
          <div className="flex items-center gap-1 bg-emerald-900/60 rounded-lg p-1 border border-emerald-700/50 text-xs">
            <FastForward className="w-3 h-3 text-emerald-300 ml-1" />
            {[1, 2, 5].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                  speed === s ? 'bg-emerald-500 text-white' : 'text-emerald-300 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrubber slider */}
      <div className="mt-3 flex items-center gap-3">
        <span className="text-xs font-tabular font-bold text-emerald-300 w-12 text-right">
          {simulationProgress.toFixed(1)}%
        </span>
        <input
          type="range"
          min="0"
          max="100"
          step="0.5"
          value={simulationProgress}
          onChange={(e) => {
            setIsSimulating(false);
            setSimulationProgress(parseFloat(e.target.value));
          }}
          className="w-full accent-emerald-400 h-1.5 bg-emerald-900/80 rounded-lg cursor-pointer"
        />
        <span className="text-xs font-tabular text-emerald-200/70 whitespace-nowrap">
          100% Totalizado
        </span>
      </div>
    </div>
  );
};

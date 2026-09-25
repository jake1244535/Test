import React from 'react';
import { TrailerModel, TrailerType, TruckModel } from '../types/game';
import { X, Layers, AlertTriangle, Check, ShieldCheck, Scale } from 'lucide-react';

interface TrailerPickerModalProps {
  trailers: TrailerModel[];
  currentTrailer: TrailerType;
  currentTruck: TruckModel;
  cargoFillPercent: number;
  onSelectTrailer: (trailerType: TrailerType) => void;
  onChangeCargoFill: (percent: number) => void;
  onClose: () => void;
}

export const TrailerPickerModal: React.FC<TrailerPickerModalProps> = ({
  trailers,
  currentTrailer,
  currentTruck,
  cargoFillPercent,
  onSelectTrailer,
  onChangeCargoFill,
  onClose,
}) => {
  const selectedTrailer = trailers.find((t) => t.id === currentTrailer) || trailers[0];
  const cargoWeight = ((cargoFillPercent / 100) * selectedTrailer.maxCargoWeightTons).toFixed(1);
  const totalWeight = (
    currentTruck.baseStats.curbWeightTons +
    selectedTrailer.emptyWeightTons +
    parseFloat(cargoWeight)
  ).toFixed(1);

  // Rollover risk estimation
  const isHighRisk =
    selectedTrailer.type !== 'none' &&
    cargoFillPercent > 65 &&
    (selectedTrailer.type === 'box' || selectedTrailer.type === 'tanker');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Patio de Remolques y Carga</h2>
              <p className="text-xs text-slate-400">
                Engancha o desengancha remolques y ajusta el nivel de carga para sentir el peso y la inercia real.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Cargo Fill Slider */}
          {selectedTrailer.type !== 'none' && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    <span>Nivel de Llenado de Carga: {cargoFillPercent}%</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Masa de Carga: <strong className="text-amber-300">{cargoWeight} Toneladas</strong> | Peso Total Conjunto:{' '}
                    <strong className="text-white">{totalWeight} Toneladas</strong>
                  </p>
                </div>

                {isHighRisk && (
                  <div className="bg-red-950/80 border border-red-500 text-red-300 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                    <span>¡Centro de Gravedad Alto! Gran riesgo de vuelco en curvas rápidas.</span>
                  </div>
                )}
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={cargoFillPercent}
                onChange={(e) => onChangeCargoFill(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />

              <div className="flex justify-between text-[11px] text-slate-400 mt-2">
                <span>0% (Vacío)</span>
                <span>25%</span>
                <span>50% (Media Carga)</span>
                <span>75%</span>
                <span>100% (Capacidad Máxima)</span>
              </div>
            </div>
          )}

          {/* Trailer Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trailers.map((trailer) => {
              const isSelected = currentTrailer === trailer.id;
              const isCompatible = currentTruck.allowedTrailers.includes(trailer.type);

              return (
                <div
                  key={trailer.id}
                  className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'bg-amber-950/20 border-amber-500 ring-2 ring-amber-500/30'
                      : isCompatible
                      ? 'bg-slate-800/40 border-slate-700/70 hover:border-slate-600'
                      : 'bg-slate-900/40 border-slate-800/60 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h4 className="font-bold text-white text-sm">{trailer.name}</h4>
                      {isSelected && (
                        <span className="px-2 py-0.5 bg-amber-500 text-black text-[10px] font-black rounded-full uppercase">
                          Enganchado
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 mb-3">{trailer.description}</p>

                    <div className="space-y-1 text-xs bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80 mb-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tara (Vacío):</span>
                        <span className="font-medium text-white">{trailer.emptyWeightTons} T</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Carga Máxima:</span>
                        <span className="font-medium text-amber-300">{trailer.maxCargoWeightTons} T</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Compatibilidad:</span>
                        <span className="font-medium text-slate-300">{trailer.compatibilityNote}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {!isCompatible && (
                      <div className="text-[11px] text-red-400 font-semibold mb-2">
                        Tu camión actual ({currentTruck.name}) no tiene la tracción necesaria para este remolque.
                      </div>
                    )}

                    <button
                      onClick={() => onSelectTrailer(trailer.type)}
                      disabled={isSelected || !isCompatible}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800 text-slate-400 cursor-default'
                          : isCompatible
                          ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/20 active:scale-95'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Actualmente Enganchado</span>
                        </>
                      ) : isCompatible ? (
                        <span>Enganchar al Camión</span>
                      ) : (
                        <span>No Compatible con {currentTruck.brand}</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

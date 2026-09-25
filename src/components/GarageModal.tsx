import React from 'react';
import { TruckModel, TruckUpgradeLevels } from '../types/game';
import { X, Wrench, Zap, Disc, Compass, Palette, DollarSign, ArrowUpCircle } from 'lucide-react';

interface GarageModalProps {
  truck: TruckModel;
  upgrades: TruckUpgradeLevels;
  playerMoney: number;
  isSandbox: boolean;
  onUpgradePart: (part: 'engine' | 'brakes' | 'suspension' | 'tires', cost: number) => void;
  onChangeColor: (color: string) => void;
  onClose: () => void;
}

export const GarageModal: React.FC<GarageModalProps> = ({
  truck,
  upgrades,
  playerMoney,
  isSandbox,
  onUpgradePart,
  onChangeColor,
  onClose,
}) => {
  const upgradeCost = 4500;

  const colorPresets = [
    { name: 'Azul Real', hex: '#2563eb' },
    { name: 'Rojo Fuego', hex: '#dc2626' },
    { name: 'Ámbar Minero', hex: '#f59e0b' },
    { name: 'Verde Esmeralda', hex: '#059669' },
    { name: 'Blanco Glaciar', hex: '#f8fafc' },
    { name: 'Gris Grafito', hex: '#475569' },
    { name: 'Negro Mate', hex: '#18181b' },
  ];

  const renderUpgradeRow = (
    title: string,
    desc: string,
    level: number,
    partKey: 'engine' | 'brakes' | 'suspension' | 'tires',
    icon: React.ReactNode
  ) => {
    const isMax = level >= 4;
    const canAfford = isSandbox || playerMoney >= upgradeCost;

    return (
      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-slate-800 text-amber-400 rounded-xl mt-0.5">{icon}</div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-white text-sm">{title}</h4>
              <span className="text-[11px] font-mono font-bold text-amber-400">
                Nivel {level} / 4
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
            {/* Visual level pips */}
            <div className="flex gap-1.5 mt-2">
              {[1, 2, 3, 4].map((pip) => (
                <div
                  key={pip}
                  className={`w-7 h-2 rounded-full transition-all ${
                    pip <= level ? 'bg-amber-400 shadow-sm shadow-amber-400/50' : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => onUpgradePart(partKey, upgradeCost)}
          disabled={isMax || !canAfford}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto ${
            isMax
              ? 'bg-slate-800 text-slate-500 cursor-default'
              : canAfford
              ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/20 active:scale-95'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <ArrowUpCircle className="w-4 h-4" />
          {isMax ? 'Nivel Máximo' : `Mejorar ($${upgradeCost.toLocaleString()})`}
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Taller Mecánico y Personalización</h2>
              <p className="text-xs text-slate-400">
                Mejorando: <strong className="text-amber-400">{truck.name}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-400 font-extrabold text-sm">
              <DollarSign className="w-4 h-4" />
              <span>{isSandbox ? '∞ MODO LIBRE' : `$${playerMoney.toLocaleString()}`}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Mechanical Upgrades */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
              Mejoras de Rendimiento
            </h3>
            <div className="space-y-3">
              {renderUpgradeRow(
                'Kit Turbo & Electrónica de Motor',
                'Reduce los segundos de aceleración 0-100 km/h y aumenta la velocidad máxima.',
                upgrades.engine,
                'engine',
                <Zap className="w-5 h-5 text-amber-400" />
              )}

              {renderUpgradeRow(
                'Barras Estabilizadoras y Suspensión Reforzada',
                'Reduce drásticamente el balanceo en curva y el riesgo de vuelco con remolques cargados.',
                upgrades.suspension,
                'suspension',
                <Compass className="w-5 h-5 text-blue-400" />
              )}

              {renderUpgradeRow(
                'Frenos Neumáticos Cerámicos con ABS',
                'Acorta la distancia de frenado con remolques pesados en pendientes de montaña.',
                upgrades.brakes,
                'brakes',
                <Disc className="w-5 h-5 text-red-400" />
              )}

              {renderUpgradeRow(
                'Neumáticos de Carga de Alto Agarre',
                'Maximiza la adherencia lateral en asfalto húmedo y curvas cerradas para evitar derrapes.',
                upgrades.tires,
                'tires',
                <Wrench className="w-5 h-5 text-emerald-400" />
              )}
            </div>
          </div>

          {/* Paint Customization */}
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Pintura y Carrocería Metalizada
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {colorPresets.map((preset) => (
                <button
                  key={preset.hex}
                  onClick={() => onChangeColor(preset.hex)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer active:scale-95 ${
                    upgrades.paintColor.toLowerCase() === preset.hex.toLowerCase()
                      ? 'border-white bg-slate-800 shadow-md ring-2 ring-purple-500/50'
                      : 'border-slate-700 bg-slate-900/60 hover:border-slate-500 text-slate-300'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-black/40 shadow-sm shrink-0"
                    style={{ backgroundColor: preset.hex }}
                  />
                  <span>{preset.name}</span>
                </button>
              ))}

              <div className="flex items-center gap-2 ml-2">
                <span className="text-xs text-slate-400">Color libre:</span>
                <input
                  type="color"
                  value={upgrades.paintColor}
                  onChange={(e) => onChangeColor(e.target.value)}
                  className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

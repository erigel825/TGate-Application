import React from 'react';
import { Check, Lock } from 'lucide-react';
import type { Gate } from '../types';

const STAGE_NAMES = ['Ideation', 'Scoping', 'Business Case', 'Development', 'Testing', 'Launch'];

interface Props {
  currentStage: number;
  gates: Gate[];
  compact?: boolean;
}

export default function StageProgress({ currentStage, gates, compact = false }: Props) {
  const gateMap = Object.fromEntries(gates.map(g => [g.gate_number, g]));

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {STAGE_NAMES.map((name, i) => (
          <React.Fragment key={i}>
            <div
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                i < currentStage ? 'bg-green-500' :
                i === currentStage ? 'bg-blue-500' : 'bg-gray-200'
              }`}
              title={name}
            />
            {i < STAGE_NAMES.length - 1 && (
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                gateMap[i + 1]?.status === 'approved' ? 'bg-green-500' :
                gateMap[i + 1]?.status === 'in_review' ? 'bg-yellow-400' :
                gateMap[i + 1]?.status === 'rejected' ? 'bg-red-500' : 'bg-gray-300'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[640px] flex items-start gap-0">
        {STAGE_NAMES.map((stage, stageIdx) => (
          <React.Fragment key={stageIdx}>
            {/* Stage */}
            <div className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                stageIdx < currentStage
                  ? 'bg-green-500 border-green-500 text-white'
                  : stageIdx === currentStage
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'bg-white border-gray-300 text-gray-400'
              }`}>
                {stageIdx < currentStage ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-bold">{stageIdx}</span>
                )}
              </div>
              <div className={`mt-2 text-xs font-medium text-center ${
                stageIdx === currentStage ? 'text-blue-600' :
                stageIdx < currentStage ? 'text-green-600' : 'text-gray-400'
              }`}>{stage}</div>
            </div>

            {/* Gate connector */}
            {stageIdx < STAGE_NAMES.length - 1 && (() => {
              const gate = gateMap[stageIdx + 1];
              const gateStatus = gate?.status;
              return (
                <div className="flex flex-col items-center pt-4 w-16 flex-shrink-0">
                  <div className="relative flex items-center w-full">
                    <div className={`flex-1 h-0.5 ${
                      gateStatus === 'approved' ? 'bg-green-400' :
                      stageIdx < currentStage ? 'bg-green-200' : 'bg-gray-200'
                    }`} />
                    <div className={`absolute left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-white text-xs font-bold z-10 ${
                      gateStatus === 'approved' ? 'border-green-500 text-green-600' :
                      gateStatus === 'in_review' ? 'border-yellow-500 text-yellow-600' :
                      gateStatus === 'rejected' ? 'border-red-500 text-red-600' :
                      gateStatus === 'on_hold' ? 'border-orange-500 text-orange-600' :
                      'border-gray-300 text-gray-400'
                    }`}>
                      {gateStatus === 'approved' ? <Check className="w-3 h-3" /> :
                       gateStatus === 'in_review' ? '!' :
                       <Lock className="w-3 h-3" />}
                    </div>
                    <div className={`flex-1 h-0.5 ${
                      gateStatus === 'approved' ? 'bg-green-400' : 'bg-gray-200'
                    }`} />
                  </div>
                  <div className={`mt-1 text-center text-[10px] leading-tight whitespace-pre-line ${
                    gateStatus === 'approved' ? 'text-green-600' :
                    gateStatus === 'in_review' ? 'text-yellow-600' : 'text-gray-400'
                  }`}>{`G${stageIdx + 1}`}</div>
                </div>
              );
            })()}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

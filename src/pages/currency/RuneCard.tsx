import React from 'react';

function RuneCard({ name, amount, value }: { name: string; amount: number; value: number }) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 shadow-xl transition-shadow duration-300 hover:shadow-xl hover:shadow-slate-500/25">
      <div className="font-bold text-gray-100 text-lg mb-1">{name}</div>
      <div className="text-sm text-gray-400 space-y-1">
        <div>
          <span className="font-medium text-slate-400">Amount:</span> {amount}
        </div>
        <div>
          <span className="font-medium text-slate-400">Value:</span> {value} HR
        </div>
      </div>
    </div>
  );
}

export default RuneCard;

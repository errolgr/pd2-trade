import React from 'react';

type RuneCardProps = {
  name: string;
  amount: number;
  price: number;
  value: number;
};

function RuneCard({ name, amount, price, value }: RuneCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl transition-shadow duration-300 hover:shadow-xl hover:shadow-slate-500/25">
      <div className="font-bold text-gray-100 text-lg mb-1">{name}</div>
      <div className="text-sm text-gray-400">
        <p className="font-medium text-slate-400">Stashed: {amount}</p>
        <p className="font-medium text-slate-400">Price: {price} HR</p>
        <p className="font-medium text-slate-400">Value: {value} HR</p>
      </div>
    </div>
  );
}

export default RuneCard;

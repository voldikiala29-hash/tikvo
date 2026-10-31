import React, { useState } from 'react';
import { DailyFactory } from './DailyFactory';
import { ProgramView } from './ProgramView';
import { UserProfile } from '../services/factoryStore';

interface FactoryHomeProps {
  uid: string;
  profile: UserProfile;
}

export const FactoryHome: React.FC<FactoryHomeProps> = ({ uid, profile }) => {
  const [tab, setTab] = useState<'today' | 'program'>('today');
  const tabClass = (active: boolean) =>
    `px-4 py-2 rounded-lg text-xs font-bold transition-all ${
      active ? 'bg-[#00FFC6] text-black' : 'text-gray-300 hover:text-white'
    }`;

  return (
    <div className="space-y-6">
      <div className="inline-flex gap-1 p-1 rounded-xl bg-[#12121A] border border-white/5">
        <button type="button" className={tabClass(tab === 'today')} onClick={() => setTab('today')}>
          Aujourd’hui
        </button>
        <button type="button" className={tabClass(tab === 'program')} onClick={() => setTab('program')}>
          Programme complet
        </button>
      </div>
      {tab === 'today' ? (
        <DailyFactory uid={uid} profile={profile} onViewProgram={() => setTab('program')} />
      ) : (
        <ProgramView uid={uid} profile={profile} />
      )}
    </div>
  );
};

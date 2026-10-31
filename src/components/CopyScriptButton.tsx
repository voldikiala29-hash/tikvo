import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { ProgramVideo } from '../services/programGenerator';

export const CopyScriptButton: React.FC<{ video: ProgramVideo }> = ({ video }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${video.title}\n\n${video.script}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* presse-papiers indisponible : rien à afficher */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-bold"
    >
      {copied ? <Check size={13} className="text-[#00FFC6]" /> : <Copy size={13} />}
      <span>{copied ? 'Copié' : 'Copier script'}</span>
    </button>
  );
};

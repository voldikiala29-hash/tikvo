// Éditeur de l'aperçu d'une histoire : noms, voix, apparence, décors, durées, narration, répliques et gestes.
// Les identifiants des héros ne changent pas (ils relient répliques et gestes) ; seuls les noms sont modifiables.
import React from 'react';
import { CHARACTERS, EXPRESSIONS, SETS } from '../video-engine/cartoon/catalog';
import { Character } from '../video-engine/cartoon/Character';
import { STORY_ACTIONS, type Story } from '../video-engine/story';

const field = 'w-full rounded-lg bg-black/40 border border-white/10 p-2 text-xs text-gray-200 focus:outline-none focus:border-[#00FFC6]/50';

export const StoryEditor: React.FC<{ story: Story; onChange: (next: Story) => void }> = ({ story, onChange }) => {
  const setCharacter = (id: string, patch: Partial<Story['characters'][number]>) =>
    onChange({ ...story, characters: story.characters.map((c) => (c.id === id ? { ...c, ...patch } : c)) });

  const setScene = (index: number, patch: Partial<Story['scenes'][number]>) =>
    onChange({ ...story, scenes: story.scenes.map((s, i) => (i === index ? { ...s, ...patch } : s)) });

  const setLine = (sceneIndex: number, lineIndex: number, patch: Partial<Story['scenes'][number]['lines'][number]>) => {
    const scene = story.scenes[sceneIndex];
    setScene(sceneIndex, { lines: scene.lines.map((l, k) => (k === lineIndex ? { ...l, ...patch } : l)) });
  };

  const removeLine = (sceneIndex: number, lineIndex: number) => {
    const scene = story.scenes[sceneIndex];
    setScene(sceneIndex, { lines: scene.lines.filter((_, k) => k !== lineIndex) });
  };

  const addLine = (sceneIndex: number) => {
    const scene = story.scenes[sceneIndex];
    if (scene.lines.length >= 3) return;
    const speaker = story.characters[0]?.id ?? 'narrator';
    setScene(sceneIndex, { lines: [...scene.lines, { speaker, text: 'Nouvelle réplique.', expression: 'neutre' }] });
  };

  const setActions = (sceneIndex: number, actions: Story['scenes'][number]['actions']) => setScene(sceneIndex, { actions });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <span className="block text-[11px] text-gray-400">Héros</span>
        {story.characters.map((c) => {
          const preset = CHARACTERS.find((p) => p.hairColor === c.hairColor && p.shirt === c.shirt) ?? CHARACTERS[0];
          return (
            <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 p-2">
              <span className="block rounded-md bg-white overflow-hidden">
                <Character
                  characterId={c.id}
                  look={{ id: c.id, name: c.name, role: 'employe', hair: c.hair, hairColor: c.hairColor, shirt: c.shirt, tie: c.tie, glasses: c.glasses, skin: '#FFFFFF' }}
                  height={48}
                />
              </span>
              <input value={c.name} onChange={(e) => setCharacter(c.id, { name: e.target.value.slice(0, 30) })} className={`${field} w-32`} aria-label="Nom" />
              <select
                value={preset.id}
                onChange={(e) => {
                  const p = CHARACTERS.find((x) => x.id === e.target.value);
                  if (p) setCharacter(c.id, { hair: p.hair, hairColor: p.hairColor, shirt: p.shirt, tie: p.tie, glasses: p.glasses ?? false });
                }}
                className={`${field} w-28`}
                aria-label="Apparence"
              >
                {CHARACTERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select value={c.voice.gender} onChange={(e) => setCharacter(c.id, { voice: { ...c.voice, gender: e.target.value as 'f' | 'm' } })} className={`${field} w-24`} aria-label="Voix">
                <option value="f">Voix féminine</option>
                <option value="m">Voix masculine</option>
              </select>
              <select value={c.voice.age} onChange={(e) => setCharacter(c.id, { voice: { ...c.voice, age: e.target.value as 'jeune' | 'adulte' | 'senior' } })} className={`${field} w-24`} aria-label="Âge de la voix">
                <option value="jeune">Jeune</option>
                <option value="adulte">Adulte</option>
                <option value="senior">Senior</option>
              </select>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <span className="block text-[11px] text-gray-400">Scènes</span>
        {story.scenes.map((scene, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-white/10 p-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-gray-200">{i + 1}.</span>
              <select value={scene.set} onChange={(e) => setScene(i, { set: e.target.value as Story['scenes'][number]['set'] })} className={`${field} w-40`} aria-label="Décor">
                {SETS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <label className="text-[11px] text-gray-400">
                Durée (s){' '}
                <input
                  type="number"
                  min={2}
                  max={15}
                  value={scene.seconds}
                  onChange={(e) => setScene(i, { seconds: Math.min(15, Math.max(2, Math.round(Number(e.target.value) || 2))) })}
                  className={`${field} w-16`}
                />
              </label>
            </div>

            {scene.narration !== undefined && (
              <textarea
                value={scene.narration}
                onChange={(e) => setScene(i, { narration: e.target.value.slice(0, 400) })}
                rows={2}
                className={field}
                aria-label="Narration"
              />
            )}

            {scene.lines.map((line, k) => (
              <div key={k} className="flex flex-wrap items-center gap-2">
                <select value={line.speaker} onChange={(e) => setLine(i, k, { speaker: e.target.value })} className={`${field} w-32`} aria-label="Locuteur">
                  <option value="narrator">Narrateur</option>
                  {story.characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input value={line.text} onChange={(e) => setLine(i, k, { text: e.target.value.slice(0, 160) })} className={`${field} flex-1 min-w-[10rem]`} aria-label="Réplique" />
                <select value={line.expression} onChange={(e) => setLine(i, k, { expression: e.target.value as (typeof EXPRESSIONS)[number] })} className={`${field} w-28`} aria-label="Émotion">
                  {EXPRESSIONS.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => removeLine(i, k)} className="text-[11px] text-red-400">
                  Retirer
                </button>
              </div>
            ))}

            <div className="flex flex-wrap gap-3 text-[11px]">
              <button type="button" onClick={() => addLine(i)} disabled={scene.lines.length >= 3} className="font-bold text-[#00FFC6] disabled:opacity-40">
                + Réplique
              </button>
              {scene.narration === undefined && (
                <button type="button" onClick={() => setScene(i, { narration: 'Nouvelle narration.' })} className="font-bold text-[#00FFC6]">
                  + Narration
                </button>
              )}
            </div>

            <div className="space-y-1">
              <span className="block text-[10px] text-gray-500">Gestes</span>
              {scene.actions.map((a, k) => (
                <div key={k} className="flex items-center gap-2">
                  <select
                    value={a.actor}
                    onChange={(e) => setActions(i, scene.actions.map((x, n) => (n === k ? { ...x, actor: e.target.value } : x)))}
                    className={`${field} w-32`}
                    aria-label="Héros du geste"
                  >
                    {story.characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={a.action}
                    onChange={(e) => setActions(i, scene.actions.map((x, n) => (n === k ? { ...x, action: e.target.value as (typeof STORY_ACTIONS)[number] } : x)))}
                    className={`${field} w-36`}
                    aria-label="Geste"
                  >
                    {STORY_ACTIONS.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setActions(i, scene.actions.filter((_, n) => n !== k))} className="text-[11px] text-red-400">
                    Retirer
                  </button>
                </div>
              ))}
              {scene.actions.length < 3 && (
                <button
                  type="button"
                  onClick={() => setActions(i, [...scene.actions, { actor: story.characters[0]?.id ?? '', action: 'immobile' }])}
                  className="text-[11px] font-bold text-[#00FFC6]"
                >
                  + Geste
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

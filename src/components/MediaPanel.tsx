import React, { useEffect, useState } from 'react';
import { deleteMedia, listMedia, mediaObjectUrl, updateMedia, uploadMedia, type UserMedia } from '../services/backendApi';

const ACCEPT = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime';

const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

/** Aperçu d'un média : chargé avec le jeton, libéré quand on le retire de l'écran. */
const MediaThumb: React.FC<{ media: UserMedia }> = ({ media }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    mediaObjectUrl(media.id)
      .then((u) => {
        if (cancelled) URL.revokeObjectURL(u);
        else {
          objectUrl = u;
          setUrl(u);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [media.id]);
  if (!url) return <div className="w-20 h-28 rounded-lg bg-white/5" />;
  return media.kind === 'image' ? (
    <img src={url} alt="" className="w-20 h-28 rounded-lg object-cover bg-black" />
  ) : (
    <video src={url} muted playsInline className="w-20 h-28 rounded-lg object-cover bg-black" />
  );
};

/** Mes photos et vidéos : tikvo les utilise pour les phrases qu'elles illustrent, sinon il cherche sur Pixabay. */
export const MediaPanel: React.FC = () => {
  const [items, setItems] = useState<UserMedia[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = () =>
    listMedia()
      .then((m) => {
        setItems(m);
        setNotice(null);
      })
      .catch((err: unknown) => setNotice(errorText(err, 'Médias indisponibles.')))
      .finally(() => setLoaded(true));

  useEffect(() => {
    void refresh();
  }, []);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setNotice(null);
    try {
      const created = await uploadMedia(file, description.trim());
      setItems((prev) => [created, ...prev]);
      setDescription('');
    } catch (err) {
      setNotice(errorText(err, 'Envoi impossible.'));
    } finally {
      setBusy(false);
    }
  };

  const saveDescription = async (media: UserMedia, text: string) => {
    if (text.trim() === media.description) return;
    try {
      await updateMedia(media.id, text.trim());
      setItems((prev) => prev.map((m) => (m.id === media.id ? { ...m, description: text.trim() } : m)));
    } catch (err) {
      setNotice(errorText(err, 'Description non enregistrée.'));
    }
  };

  const remove = async (media: UserMedia) => {
    try {
      await deleteMedia(media.id);
      setItems((prev) => prev.filter((m) => m.id !== media.id));
    } catch (err) {
      setNotice(errorText(err, 'Suppression impossible.'));
    }
  };

  return (
    <section className="rounded-2xl bg-[#12121A] border border-white/5 p-4 space-y-3">
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Mes photos et vidéos</p>
        <p className="text-[11px] text-gray-500">
          Décris ce qu’on voit (ex. « femme qui pleure dans sa cuisine »). tikvo ne l’utilise que pour les phrases qu’elle illustre
          exactement ; sinon il cherche sur Pixabay.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
          placeholder="Description (ce qu’on voit)"
          className="flex-1 min-w-[180px] rounded-lg bg-black/40 border border-white/10 px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-[#00FFC6]/50"
        />
        <label
          className={`px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-bold cursor-pointer hover:bg-white/15 ${busy ? 'opacity-40 pointer-events-none' : ''}`}
        >
          {busy ? 'Envoi…' : 'Ajouter un fichier'}
          <input type="file" accept={ACCEPT} className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
        </label>
      </div>
      <p className="text-[10px] text-gray-500">JPG, PNG, WebP, MP4 ou MOV, 25 Mo maximum.</p>

      {notice && <p className="text-xs text-red-300">{notice}</p>}

      {loaded && items.length === 0 && !notice && <p className="text-xs text-gray-500">Aucun média pour l’instant.</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((media) => (
          <div key={media.id} className="space-y-1.5">
            <MediaThumb media={media} />
            <input
              defaultValue={media.description}
              onBlur={(e) => void saveDescription(media, e.target.value)}
              maxLength={200}
              placeholder="Description"
              className="w-full rounded-md bg-black/40 border border-white/10 px-2 py-1 text-[11px] text-gray-200 focus:outline-none focus:border-[#00FFC6]/50"
            />
            <button type="button" onClick={() => void remove(media)} className="text-[11px] text-gray-500 hover:text-red-300">
              Supprimer
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

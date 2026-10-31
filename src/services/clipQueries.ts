// 30 requêtes de clips par niche (anglais : Pixabay donne de bien meilleurs résultats qu'en français).
// La vidéo n du programme reçoit CLIP_QUERIES[niche][n % 30] : les 3 vidéos d'un même jour
// tirent donc 3 requêtes différentes, et le cycle ne se répète qu'au bout de 10 jours.

export const CLIP_QUERIES: Record<string, string[]> = {
  mode: [
    'fashion outfit', 'street style', 'clothing store', 'fashion model walking', 'wardrobe closet',
    'shopping clothes', 'sewing fabric', 'minimalist fashion', 'vintage clothes', 'sneakers closeup',
    'handbag fashion', 'sunglasses style', 'denim jeans', 'runway fashion', 'boutique window',
    'tailor measuring', 'fashion designer sketch', 'colorful outfit', 'woman dressing mirror', 'clothes rack',
    'fashion photoshoot', 'leather jacket', 'summer dress', 'jewelry accessories', 'fashion magazine',
    'hat style', 'knitwear sweater', 'shoe shopping', 'clothing folding', 'fashion lifestyle city',
  ],
  fitness: [
    'home workout', 'gym workout', 'push ups', 'squats training', 'running outdoors',
    'yoga stretching', 'weight lifting', 'abs exercise', 'cycling workout', 'jump rope',
    'morning run', 'stretching routine', 'dumbbell training', 'kettlebell swing', 'sprint training',
    'pilates core', 'athlete training', 'hiit workout', 'fitness woman', 'protein shake',
    'bodyweight exercise', 'treadmill running', 'boxing training', 'plank exercise', 'outdoor fitness park',
    'rowing machine', 'healthy meal prep', 'foam roller recovery', 'mountain climbers', 'gym mirror',
  ],
  business: [
    'office laptop work', 'business meeting startup', 'entrepreneur success money', 'office team collaboration', 'business presentation',
    'working from home laptop', 'startup office workspace', 'coffee shop laptop', 'financial charts planning', 'sales phone call',
    'business handshake', 'notebook planning goals', 'team brainstorming whiteboard', 'online store ecommerce', 'invoice calculator',
    'networking conference', 'business woman office', 'typing keyboard closeup', 'city skyline business', 'client meeting',
    'office desk morning', 'marketing social media phone', 'cash money counting', 'business plan writing', 'remote work video call',
    'office elevator business', 'packing boxes shipping', 'coworking space', 'job interview', 'startup founders',
  ],
  crypto: [
    'bitcoin chart', 'crypto trading screen', 'cryptocurrency coins', 'stock market screen', 'trading desk monitors',
    'digital money concept', 'blockchain network abstract', 'smartphone crypto app', 'gold coins investment', 'price candlestick chart',
    'hacker laptop dark', 'hardware wallet', 'digital currency coins', 'stock ticker display', 'trader analyzing data',
    'bitcoin mining', 'neon financial graph', 'contactless payment card', 'business chart growth', 'finance abstract blue',
    'economy newspaper', 'calculator finances', 'bull market green', 'bear market red', 'ethereum digital',
    'stock exchange floor', 'investment planning', 'money falling', 'data center servers', 'laptop trading night',
  ],
  motivation: [
    'sunrise running', 'motivation success', 'mountain summit hiking', 'morning routine coffee', 'woman journaling',
    'man running city', 'sunrise yoga', 'goal achievement', 'discipline training', 'peaceful lake nature',
    'waking up early alarm', 'fitness inspiration', 'rock climbing', 'sunset beach walk', 'reading book morning',
    'focus concentration', 'champion victory', 'path forward road', 'clock time passing', 'stairs climbing success',
    'meditation calm', 'ocean waves sunrise', 'athlete determination', 'breathing exercise', 'planning journal',
    'lighthouse sunrise', 'fireworks celebration', 'runner finish line', 'hands raised sky', 'forest sunlight',
  ],
  cuisine: [
    'cooking kitchen', 'chef cooking', 'food preparation', 'vegetables chopping', 'baking bread',
    'pasta cooking', 'healthy salad bowl', 'breakfast eggs pan', 'spices kitchen', 'pizza making',
    'soup pot steam', 'dessert baking cake', 'coffee brewing', 'grilling barbecue', 'fruit smoothie blender',
    'meal prep containers', 'sushi preparation', 'frying pan sizzling', 'kitchen knife cutting', 'honey drizzle',
    'tea pouring', 'cookies oven', 'restaurant kitchen', 'baking tray oven', 'sauce stirring',
    'fresh herbs', 'fruit vegetables market', 'sandwich making', 'ice cream dessert', 'wine pouring dinner',
  ],
  voyage: [
    'travel landscape', 'backpacking mountains', 'airplane window view', 'airport departure', 'tropical beach travel',
    'city street tourism', 'train journey window', 'hotel room luggage', 'suitcase packing', 'map planning trip',
    'road trip car', 'sunset ocean travel', 'hiking forest trail', 'paris street', 'sailing boat',
    'camping tent night', 'desert landscape travel', 'old town village', 'tourist taking photo', 'passport travel documents',
    'bus station travel', 'island aerial drone', 'cruise ship sea', 'mountain valley sunrise', 'market street asia',
    'cable car alps', 'lake reflection', 'travel bag', 'waterfall nature', 'surfing waves',
  ],
  tech: [
    'technology smartphone', 'laptop typing code', 'smartphone scrolling', 'computer programming screen', 'tech gadgets desk',
    'cloud computing abstract', 'wifi router', 'data server room', 'keyboard closeup typing', 'phone notifications',
    'virtual reality headset', 'artificial intelligence abstract', 'circuit board closeup', 'video call tech', 'smart home devices',
    'cyber security lock', 'app development coding', 'tablet touchscreen', 'wireless earbuds', 'phone charging battery',
    'robot technology', 'digital network abstract', 'mobile payment', 'computer repair', 'social media phone',
    '3d printer', 'drone flying', 'camera photography', 'smartwatch', 'futuristic hologram',
  ],
  beaute: [
    'skincare routine', 'makeup brush', 'face cream applying', 'woman applying lipstick', 'beauty salon',
    'nail polish manicure', 'hair styling brush', 'skin serum dropper', 'facial massage', 'cosmetics flat lay',
    'eyelash makeup', 'hair care shampoo', 'woman mirror makeup', 'spa beauty treatment', 'face mask cleansing',
    'perfume bottle', 'beauty products bathroom', 'makeup tutorial', 'cleansing face water', 'hair straightener',
    'moisturizer cream jar', 'lip balm closeup', 'barber shaving', 'facial skin closeup', 'natural cosmetics',
    'hair dye salon', 'beauty blogger filming', 'morning skincare', 'nail art', 'eyeshadow palette',
  ],
  musique: [
    'music studio', 'singer microphone', 'concert crowd', 'guitar playing', 'drums performance',
    'dj mixing', 'piano keys closeup', 'headphones listening music', 'recording studio mixing board', 'violin playing',
    'music festival crowd', 'vinyl record player', 'rapper performing', 'synthesizer keyboard', 'singing woman stage',
    'music producer laptop', 'bass guitar closeup', 'orchestra performance', 'street musician', 'karaoke party',
    'music notes abstract', 'headphones dancing', 'saxophone jazz', 'microphone closeup', 'music video dancing',
    'concert lights stage', 'choir singing', 'electric guitar amplifier', 'beat making pads', 'music equipment',
  ],
  sport: [
    'football training', 'soccer ball field', 'basketball court', 'tennis match', 'running track athletes',
    'swimming pool race', 'cycling race road', 'sports stadium crowd', 'goalkeeper saves', 'american football game',
    'beach volleyball', 'athlete stretching', 'sports training field', 'skateboard tricks', 'boxing gloves',
    'marathon runners', 'cricket match', 'rugby tackle', 'golf swing', 'baseball pitch',
    'sports coach whistle', 'sprint start blocks', 'ice hockey game', 'surfing action', 'skiing downhill',
    'rock climbing sport', 'sports fans cheering', 'kids soccer training', 'gymnastics routine', 'basketball dunk',
  ],
  humour: [
    'funny reaction', 'funny cat', 'laughing friends', 'comedy stage', 'silly dance',
    'people laughing', 'surprised face', 'party fun', 'awkward moment', 'kids being silly',
    'funny dog', 'meme expression', 'eye roll', 'clumsy fail', 'friends goofing around',
    'funny faces', 'comedian talking', 'shocked expression', 'pranks', 'office funny',
    'woman laughing out loud', 'crazy dancing', 'sleepy funny', 'puppy playing', 'confused face',
    'bowling fail', 'grandpa funny', 'goofy smile', 'teenager laughing', 'comedy show audience',
  ],
};

const FALLBACK = ['aesthetic lifestyle'];

/** Requête de clips de la vidéo n (numéro global dans le programme), en tournant sur les 30 requêtes. */
export function clipQueryFor(nicheId: string, n: number): string {
  const pool = CLIP_QUERIES[nicheId] ?? FALLBACK;
  return pool[((n % pool.length) + pool.length) % pool.length];
}

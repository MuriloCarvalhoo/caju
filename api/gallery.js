const { Redis } = require('@upstash/redis');
const jwt = require('jsonwebtoken');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const JWT_SECRET = process.env.JWT_SECRET;
const GALLERY_KEY = 'caju:gallery';

const defaultGallery = [];

const VALID_CATS = new Set([
  '',
  'incensarios',
  'incensario-cascata',
  'porta-objetos',
  'cinzeiro',
  'porta-velas',
  'pendentes-parede',
]);

function verifyToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return false;
  try {
    jwt.verify(auth.slice(7), JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

function sanitizeItem(p) {
  const cat = String(p.category || '');
  return {
    name: String(p.name || '').slice(0, 100),
    img: String(p.img || '').slice(0, 500),
    category: VALID_CATS.has(cat) ? cat : '',
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET - listar peças da galeria (público)
  if (req.method === 'GET') {
    try {
      const data = await redis.get(GALLERY_KEY);
      const gallery = data || defaultGallery;
      return res.status(200).json({ gallery });
    } catch (e) {
      return res.status(200).json({ gallery: defaultGallery });
    }
  }

  // PUT - atualizar galeria (protegido)
  if (req.method === 'PUT') {
    if (!verifyToken(req)) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    try {
      const { gallery } = req.body;

      if (!Array.isArray(gallery) || gallery.length > 80) {
        return res.status(400).json({ error: 'Dados inválidos' });
      }

      const sanitized = gallery.map(sanitizeItem);
      await redis.set(GALLERY_KEY, sanitized);
      return res.status(200).json({ gallery: sanitized });
    } catch (e) {
      return res.status(500).json({ error: 'Erro ao salvar galeria' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

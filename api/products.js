const { Redis } = require('@upstash/redis');
const jwt = require('jsonwebtoken');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const JWT_SECRET = process.env.JWT_SECRET;
const PRODUCTS_KEY = 'caju:products';

const defaultProducts = [
  { name: 'Produto 1', price: 'R$ 00,00', img: '', category: '' },
  { name: 'Produto 2', price: 'R$ 00,00', img: '', category: '' },
  { name: 'Produto 3', price: 'R$ 00,00', img: '', category: '' },
  { name: 'Produto 4', price: 'R$ 00,00', img: '', category: '' },
  { name: 'Produto 5', price: 'R$ 00,00', img: '', category: '' },
  { name: 'Produto 6', price: 'R$ 00,00', img: '', category: '' },
];

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

function sanitizeProduct(p) {
  const cat = String(p.category || '');
  return {
    name: String(p.name || '').slice(0, 100),
    price: String(p.price || '').slice(0, 20),
    img: String(p.img || '').slice(0, 500),
    category: VALID_CATS.has(cat) ? cat : '',
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET - listar produtos (público)
  if (req.method === 'GET') {
    try {
      const data = await redis.get(PRODUCTS_KEY);
      const products = data || defaultProducts;
      return res.status(200).json({ products });
    } catch (e) {
      return res.status(200).json({ products: defaultProducts });
    }
  }

  // PUT - atualizar produtos (protegido)
  if (req.method === 'PUT') {
    if (!verifyToken(req)) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    try {
      const { products } = req.body;

      if (!Array.isArray(products) || products.length > 60) {
        return res.status(400).json({ error: 'Dados inválidos' });
      }

      const sanitized = products.map(sanitizeProduct);
      await redis.set(PRODUCTS_KEY, sanitized);
      return res.status(200).json({ products: sanitized });
    } catch (e) {
      return res.status(500).json({ error: 'Erro ao salvar produtos' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

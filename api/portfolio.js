const { Redis } = require('@upstash/redis');
const jwt = require('jsonwebtoken');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const JWT_SECRET = process.env.JWT_SECRET;
const PORTFOLIO_KEY = 'caju:portfolio';

const defaultPortfolio = [
  { name: 'Peça 1', img: '' },
  { name: 'Peça 2', img: '' },
  { name: 'Peça 3', img: '' },
];

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

function sanitizePiece(p) {
  return {
    name: String(p.name || '').slice(0, 100),
    img: String(p.img || '').slice(0, 500),
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const data = await redis.get(PORTFOLIO_KEY);
      const portfolio = data || defaultPortfolio;
      return res.status(200).json({ portfolio });
    } catch (e) {
      return res.status(200).json({ portfolio: defaultPortfolio });
    }
  }

  if (req.method === 'PUT') {
    if (!verifyToken(req)) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    try {
      const { portfolio } = req.body;

      if (!Array.isArray(portfolio) || portfolio.length > 30) {
        return res.status(400).json({ error: 'Dados inválidos' });
      }

      const sanitized = portfolio.map(sanitizePiece);
      await redis.set(PORTFOLIO_KEY, sanitized);
      return res.status(200).json({ portfolio: sanitized });
    } catch (e) {
      return res.status(500).json({ error: 'Erro ao salvar portfólio' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

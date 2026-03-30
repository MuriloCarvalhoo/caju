const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { password } = req.body;

    if (!password || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '2h' });
    return res.status(200).json({ token });
  } catch (e) {
    return res.status(500).json({ error: 'Erro interno' });
  }
};

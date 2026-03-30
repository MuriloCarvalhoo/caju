const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!verifyToken(req)) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    const { image } = req.body; // base64 string

    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Imagem inválida' });
    }

    // Limitar tamanho (~10MB em base64)
    if (image.length > 13_400_000) {
      return res.status(400).json({ error: 'Imagem muito grande (máx 10MB)' });
    }

    const form = new URLSearchParams();
    form.append('key', IMGBB_API_KEY);
    form.append('image', image);

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: form,
    });

    const data = await response.json();

    if (!data.success) {
      return res.status(500).json({ error: 'Erro ao enviar imagem' });
    }

    return res.status(200).json({ url: data.data.url });
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao processar upload' });
  }
};

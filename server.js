const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'data', 'posts.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Postlarni o'qish
function readPosts() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error("Faylni o'qishda xatolik:", error);
    return [];
  }
}

// Helper: Postlarni saqlash
function savePosts(posts) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2), 'utf8');
  } catch (error) {
    console.error("Faylga yozishda xatolik:", error);
  }
}

// GET /api/posts - Barcha postlarni olish
app.get('/api/posts', (req, res) => {
  const posts = readPosts();
  res.status(200).json({
    success: true,
    count: posts.length,
    posts: posts
  });
});

// POST /api/posts - Yangi post yaratish va Validatsiya (8-slayd talabi)
app.post('/api/posts', async (req, res) => {
  // Frontendlarga "Yuborilmoqda..." (7-slayd) holatini namoyish etish uchun 1 soniya sun'iy kutish qo'shamiz
  await new Promise(resolve => setTimeout(resolve, 1000));

  const { title, category, author, imageUrl, content } = req.body || {};
  const errors = {};

  // Validatsiya qoidalari
  if (!title || typeof title !== 'string' || !title.trim()) {
    errors.title = "Sarlavha kiritilishi shart!";
  } else if (title.trim().length < 5) {
    errors.title = "Sarlavha kamida 5 ta belgidan iborat bo'lishi kerak!";
  } else if (title.trim().length > 100) {
    errors.title = "Sarlavha 100 ta belgidan oshmasligi kerak!";
  }

  if (!category || typeof category !== 'string' || !category.trim()) {
    errors.category = "Kategoriya tanlanishi yoki kiritilishi shart!";
  }

  if (!author || typeof author !== 'string' || !author.trim()) {
    errors.author = "Muallif ismi kiritilishi shart!";
  }

  if (!content || typeof content !== 'string' || !content.trim()) {
    errors.content = "Maqola matni kiritilishi shart!";
  } else if (content.trim().length < 15) {
    errors.content = "Maqola matni kamida 15 ta belgidan iborat bo'lishi kerak!";
  }

  if (imageUrl && imageUrl.trim()) {
    const urlPattern = /^(https?:\/\/)?([\w.-]+)+[\w\-_~:/?#[\]@!$&'()*+,;=.]+\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i;
    // Oddiyroq URL format tekshiruvi
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      errors.imageUrl = "Rasm havolasi 'http://' yoki 'https://' bilan boshlanishi kerak!";
    }
  }

  // Agar validatsiya xatolari bo'lsa: 400 Bad Request
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validatsiya xatolari mavjud. Iltimos, barcha maydonlarni to'g'ri to'ldiring!",
      errors: errors
    });
  }

  // Muvaffaqiyatli saqlash
  const posts = readPosts();
  const newPost = {
    id: `post-${Date.now()}`,
    title: title.trim(),
    category: category.trim(),
    author: author.trim(),
    imageUrl: imageUrl && imageUrl.trim() ? imageUrl.trim() : 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=80',
    content: content.trim(),
    createdAt: new Date().toISOString()
  };

  posts.unshift(newPost); // Yangi post eng yuqorida turishi uchun
  savePosts(posts);

  return res.status(201).json({
    success: true,
    message: "Post muvaffaqiyatli yaratildi va saqlandi!",
    post: newPost
  });
});

// DELETE /api/posts/:id - Postni o'chirish
app.delete('/api/posts/:id', (req, res) => {
  const { id } = req.params;
  let posts = readPosts();
  const exists = posts.some(p => p.id === id);

  if (!exists) {
    return res.status(404).json({
      success: false,
      message: "Post topilmadi!"
    });
  }

  posts = posts.filter(p => p.id !== id);
  savePosts(posts);

  res.status(200).json({
    success: true,
    message: "Post o'chirildi!"
  });
});

app.listen(PORT, () => {
  console.log(`Server muvaffaqiyatli ishga tushdi: http://localhost:${PORT}`);
});

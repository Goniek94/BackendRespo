// index.js
import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import * as AdminJSMongoose from '@adminjs/mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Import middleware i tras
import auth from './middleware/auth.js';
import userRoutes from './routes/userRoutes.js';
import adRoutes from './routes/adRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import cepikRoutes from './routes/cepikRoutes.js';
import User from './models/user.js';

const app = express();
app.use(express.json());

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
      scriptSrc: ["'self'", 'https:', "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
      connectSrc: ["'self'", 'https://api.cloudinary.com'],
      fontSrc: ["'self'", 'https:', 'data:'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  referrerPolicy: { policy: 'no-referrer' },
  xssFilter: true,
  hidePoweredBy: true,
  frameGuard: { action: 'deny' },
}));

app.use(cors({
  origin: '*',
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Przekroczono globalny limit żądań, spróbuj ponownie później.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Przekroczono limit żądań dla autoryzacji, spróbuj ponownie za 15 minut.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB', err));

// Serwowanie plików statycznych
app.use('/uploads', express.static(path.join(path.resolve(), 'uploads')));

// Główne trasy
app.use('/api/auth', userRoutes); // WAŻNE: tu jest route do rejestracji
app.use('/api/ads', adRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/cepik', cepikRoutes);

app.get('/', (req, res) => {
  res.send('Backend Marketplace działa!');
});

// Obsługa błędów
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || 'Błąd serwera',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

AdminJS.registerAdapter(AdminJSMongoose);

const adminJs = new AdminJS({
  databases: [mongoose],
  rootPath: '/admin',
});

const adminRouter = AdminJSExpress.buildAuthenticatedRouter(adminJs, {
  authenticate: async (email, password) => {
    const user = await User.findOne({ email });
    if (user && (user.role === 'admin' || user.role === 'moderator')) {
      const validPassword = await bcrypt.compare(password, user.password);
      if (validPassword) {
        return user;
      }
    }
    return null;
  },
  cookiePassword: 'supersecret-cookie-password',
});

app.use(adminJs.options.rootPath, adminRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}, panel admina dostępny pod /admin`);
});

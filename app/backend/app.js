require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const session = require('express-session');
const helmet  = require('helmet');
const path    = require('path');

const authRoutes      = require('./routes/auth');
const userRoutes      = require('./routes/users');
const resourceRoutes  = require('./routes/resources');
const bookingRoutes   = require('./routes/bookings');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// Security headers
app.set('trust proxy', 1); // Required when behind ALB/ELB
app.use(helmet({
  hsts: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      upgradeInsecureRequests: false,
    },
  },
}));

app.use(express.json());

const isProduction = process.env.NODE_ENV === 'production';

app.use(session({
  secret:            process.env.SESSION_SECRET || 'crb-dev-secret-change-in-prod',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure:   isProduction,  // HTTPS-only in production (behind ALB with SSL termination)
    sameSite: 'lax',
    maxAge:   24 * 60 * 60 * 1000,
  },
}));

// Serve the frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// API routes
app.use('/api/auth',      authRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/bookings',  bookingRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint for ALB target group
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Campus Resource Booking server running on port ${PORT}`);
});

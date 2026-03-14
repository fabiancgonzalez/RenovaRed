/**
 * app.js / index.js  —  registro de todos los endpoints
 * 
 * Agregá estas líneas a tu app principal (donde ya tenés auth.routes y health.routes)
 */

const authRoutes         = require('./routes/auth.routes');
const userRoutes         = require('./routes/user.routes');
const categoryRoutes     = require('./routes/category.routes');
const publicationRoutes  = require('./routes/publication.routes');
const conversationRoutes = require('./routes/conversation.routes');
const exchangeRoutes     = require('./routes/exchange.routes');
const favoriteRoutes     = require('./routes/favorite.routes');
const dailyStatsRoutes   = require('./routes/dailyStats.routes');

// ──────────────────────────────────────────────
//  REGISTRO EN Express app
// ──────────────────────────────────────────────
// app.use('/api/auth',          authRoutes);
// app.use('/api/users',         userRoutes);
// app.use('/api/categories',    categoryRoutes);
// app.use('/api/publications',  publicationRoutes);
// app.use('/api/conversations', conversationRoutes);
// app.use('/api/exchanges',     exchangeRoutes);
// app.use('/api/favorites',     favoriteRoutes);
// app.use('/api/stats',         dailyStatsRoutes);

module.exports = {
  authRoutes,
  userRoutes,
  categoryRoutes,
  publicationRoutes,
  conversationRoutes,
  exchangeRoutes,
  favoriteRoutes,
  dailyStatsRoutes
};

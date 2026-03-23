const authRoutes         = require('./routes/auth.routes');
const userRoutes         = require('./routes/user.routes');
const categoryRoutes     = require('./routes/category.routes');
const publicationRoutes  = require('./routes/publication.routes');
const conversationRoutes = require('./routes/conversation.routes');
const exchangeRoutes     = require('./routes/exchange.routes');
const favoriteRoutes     = require('./routes/favorite.routes');
const dailyStatsRoutes   = require('./routes/dailyStats.routes');

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

const sequelize = require('../config/database');
const User = require('./User.model');
const Category = require('./Category.model');
const Publication = require('./Publication.model');
const Conversation = require('./Conversation.model');
const Exchange = require('./Exchange.model');
const Message = require('./Message.model');
const Favorite = require('./Favorite.model');
const DailyStats = require('./DailyStats.model');
const MaterialQuote = require('./MaterialQuote.model');

// = ASOCIACIONES =

// User - Publication
User.hasMany(Publication, { foreignKey: 'user_id', as: 'publicaciones' });
Publication.belongsTo(User, { foreignKey: 'user_id', as: 'usuario' });

// Category - Publication
Category.hasMany(Publication, { foreignKey: 'categoria_id', as: 'publicaciones' });
Publication.belongsTo(Category, { foreignKey: 'categoria_id', as: 'categoria' });

// Conversation - Publication
Conversation.belongsTo(Publication, { foreignKey: 'publication_id' });
Publication.hasMany(Conversation, { foreignKey: 'publication_id' });

// Conversation - Messages
Conversation.hasMany(Message, { foreignKey: 'conversation_id', as: 'mensajes' });
Message.belongsTo(Conversation, { foreignKey: 'conversation_id' });

// Conversation - User (comprador y vendedor)
Conversation.belongsTo(User, { foreignKey: 'buyer_id', as: 'comprador' });
Conversation.belongsTo(User, { foreignKey: 'seller_id', as: 'vendedor' });
User.hasMany(Conversation, { foreignKey: 'buyer_id', as: 'conversacionesComoComprador' });
User.hasMany(Conversation, { foreignKey: 'seller_id', as: 'conversacionesComoVendedor' });

// User - Messages
User.hasMany(Message, { foreignKey: 'sender_id' });
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'remitente' });

// User - Favorites
User.hasMany(Favorite, { foreignKey: 'user_id' });
Favorite.belongsTo(User, { foreignKey: 'user_id' });

// Publication - Favorites
Publication.hasMany(Favorite, { foreignKey: 'publication_id' });
Favorite.belongsTo(Publication, { foreignKey: 'publication_id' });

// User - Exchanges (como comprador/vendedor)
User.hasMany(Exchange, { foreignKey: 'buyer_id', as: 'intercambios_comprados' });
User.hasMany(Exchange, { foreignKey: 'seller_id', as: 'intercambios_vendidos' });

// Publication - Exchanges
Publication.hasMany(Exchange, { foreignKey: 'publication_id', as: 'exchanges' });
Exchange.belongsTo(Publication, { foreignKey: 'publication_id', as: 'publication' });

// Exchange - Conversation
Exchange.belongsTo(Conversation, { foreignKey: 'conversation_id', as: 'conversation' });
Conversation.hasOne(Exchange, { foreignKey: 'conversation_id', as: 'exchange' });

module.exports = {
  sequelize,
  User,
  Category,
  Publication,
  Conversation,
  Exchange,
  Message,
  Favorite,
  DailyStats,
  MaterialQuote
};

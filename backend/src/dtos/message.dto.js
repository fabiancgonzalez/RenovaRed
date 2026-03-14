const UserDTO = require('./user.dto');

class MessageDTO {
  static item(msg) {
    return {
      id: msg.id,
      conversation_id: msg.conversation_id,
      sender_id: msg.sender_id,
      content: msg.content,
      attachments: msg.attachments || [],
      read: msg.read,
      created_at: msg.created_at,
      remitente: msg.remitente ? UserDTO.list(msg.remitente) : null
    };
  }

  static list(messages) {
    return messages.map(MessageDTO.item);
  }
}

module.exports = MessageDTO;

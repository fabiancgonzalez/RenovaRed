const PublicationDTO = require('./publication.dto');

class FavoriteDTO {
  // Una entrada de favorito con su publicación embebida
  static item(fav) {
    return {
      id: fav.id,
      created_at: fav.created_at,
      publication: fav.Publication ? PublicationDTO.list(fav.Publication) : null
    };
  }

  // Lista de favoritos
  static list(favorites) {
    return favorites.map(FavoriteDTO.item);
  }
}

module.exports = FavoriteDTO;

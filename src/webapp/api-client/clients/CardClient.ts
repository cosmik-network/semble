import { BaseClient } from './BaseClient';
import {
  AddUrlToLibraryRequest,
  AddUrlToLibraryResponse,
  AddCardToLibraryRequest,
  AddCardToLibraryResponse,
  AddCardToCollectionRequest,
  AddCardToCollectionResponse,
  UpdateNoteCardRequest,
  UpdateNoteCardResponse,
  UpdateUrlCardAssociationsRequest,
  UpdateUrlCardAssociationsResponse,
  RemoveCardFromLibraryRequest,
  RemoveCardFromLibraryResponse,
  RemoveCardFromCollectionRequest,
  RemoveCardFromCollectionResponse,
  routes,
} from '@semble/types';

export class CardClient extends BaseClient {
  async addUrlToLibrary(
    request: AddUrlToLibraryRequest,
  ): Promise<AddUrlToLibraryResponse> {
    return this.request<AddUrlToLibraryResponse>(
      'POST',
      routes.cards.addUrlToLibrary.path,
      request,
    );
  }

  async addCardToLibrary(
    request: AddCardToLibraryRequest,
  ): Promise<AddCardToLibraryResponse> {
    return this.request<AddCardToLibraryResponse>(
      'POST',
      routes.cards.addCardToLibrary.path,
      request,
    );
  }

  async addCardToCollection(
    request: AddCardToCollectionRequest,
  ): Promise<AddCardToCollectionResponse> {
    return this.request<AddCardToCollectionResponse>(
      'POST',
      routes.cards.addCardToCollection.path,
      request,
    );
  }

  async updateNoteCard(
    request: UpdateNoteCardRequest,
  ): Promise<UpdateNoteCardResponse> {
    return this.request<UpdateNoteCardResponse>(
      'PUT',
      routes.cards.cardNote.build({ cardId: request.cardId }),
      { note: request.note },
    );
  }

  async updateUrlCardAssociations(
    request: UpdateUrlCardAssociationsRequest,
  ): Promise<UpdateUrlCardAssociationsResponse> {
    return this.request<UpdateUrlCardAssociationsResponse>(
      'PUT',
      routes.cards.urlCardAssociations.path,
      request,
    );
  }

  async removeCardFromLibrary(
    request: RemoveCardFromLibraryRequest,
  ): Promise<RemoveCardFromLibraryResponse> {
    return this.request<RemoveCardFromLibraryResponse>(
      'DELETE',
      routes.cards.removeFromLibrary.build({ cardId: request.cardId }),
    );
  }

  async removeCardFromCollection(
    request: RemoveCardFromCollectionRequest,
  ): Promise<RemoveCardFromCollectionResponse> {
    const collectionIdsParam = request.collectionIds.join(',');
    return this.request<RemoveCardFromCollectionResponse>(
      'DELETE',
      `${routes.cards.removeFromCollections.build({ cardId: request.cardId })}?collectionIds=${encodeURIComponent(collectionIdsParam)}`,
    );
  }
}

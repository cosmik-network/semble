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
    return this.request<AddUrlToLibraryResponse>(routes.cards.addUrlToLibrary, {
      body: request,
    });
  }

  async addCardToLibrary(
    request: AddCardToLibraryRequest,
  ): Promise<AddCardToLibraryResponse> {
    return this.request<AddCardToLibraryResponse>(
      routes.cards.addCardToLibrary,
      {
        body: request,
      },
    );
  }

  async addCardToCollection(
    request: AddCardToCollectionRequest,
  ): Promise<AddCardToCollectionResponse> {
    return this.request<AddCardToCollectionResponse>(
      routes.cards.addCardToCollection,
      { body: request },
    );
  }

  async updateNoteCard(
    request: UpdateNoteCardRequest,
  ): Promise<UpdateNoteCardResponse> {
    return this.request<UpdateNoteCardResponse>(routes.cards.cardNote, {
      body: { cardId: request.cardId, note: request.note },
    });
  }

  async updateUrlCardAssociations(
    request: UpdateUrlCardAssociationsRequest,
  ): Promise<UpdateUrlCardAssociationsResponse> {
    return this.request<UpdateUrlCardAssociationsResponse>(
      routes.cards.urlCardAssociations,
      { body: request },
    );
  }

  async removeCardFromLibrary(
    request: RemoveCardFromLibraryRequest,
  ): Promise<RemoveCardFromLibraryResponse> {
    return this.request<RemoveCardFromLibraryResponse>(
      routes.cards.removeFromLibrary,
      { query: { cardId: request.cardId } },
    );
  }

  async removeCardFromCollection(
    request: RemoveCardFromCollectionRequest,
  ): Promise<RemoveCardFromCollectionResponse> {
    return this.request<RemoveCardFromCollectionResponse>(
      routes.cards.removeFromCollections,
      {
        query: {
          cardId: request.cardId,
          collectionIds: request.collectionIds.join(','),
        },
      },
    );
  }
}

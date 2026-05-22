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
} from '@semble/types';

export class CardClient extends BaseClient {
  async addUrlToLibrary(
    request: AddUrlToLibraryRequest,
  ): Promise<AddUrlToLibraryResponse> {
    const res = await this.client.cards.addUrlToLibrary({ body: request });
    return res.body as AddUrlToLibraryResponse;
  }

  async addCardToLibrary(
    request: AddCardToLibraryRequest,
  ): Promise<AddCardToLibraryResponse> {
    const res = await this.client.cards.addCardToLibrary({ body: request });
    return res.body as AddCardToLibraryResponse;
  }

  async addCardToCollection(
    request: AddCardToCollectionRequest,
  ): Promise<AddCardToCollectionResponse> {
    const res = await this.client.cards.addCardToCollection({ body: request });
    return res.body as AddCardToCollectionResponse;
  }

  async updateNoteCard(
    request: UpdateNoteCardRequest,
  ): Promise<UpdateNoteCardResponse> {
    const res = await this.client.cards.cardNote({
      body: { cardId: request.cardId, note: request.note },
    });
    return res.body as UpdateNoteCardResponse;
  }

  async updateUrlCardAssociations(
    request: UpdateUrlCardAssociationsRequest,
  ): Promise<UpdateUrlCardAssociationsResponse> {
    const res = await this.client.cards.urlCardAssociations({ body: request });
    return res.body as UpdateUrlCardAssociationsResponse;
  }

  async removeCardFromLibrary(
    request: RemoveCardFromLibraryRequest,
  ): Promise<RemoveCardFromLibraryResponse> {
    const res = await this.client.cards.removeFromLibrary({
      body: { cardId: request.cardId },
    });
    return res.body as RemoveCardFromLibraryResponse;
  }

  async removeCardFromCollection(
    request: RemoveCardFromCollectionRequest,
  ): Promise<RemoveCardFromCollectionResponse> {
    const res = await this.client.cards.removeFromCollections({
      body: { cardId: request.cardId, collectionIds: request.collectionIds },
    });
    return res.body as RemoveCardFromCollectionResponse;
  }
}

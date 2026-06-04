import { BaseClient } from './BaseClient';
import { unwrap } from '../unwrap';
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
    return unwrap<AddUrlToLibraryResponse>(res);
  }

  async addCardToLibrary(
    request: AddCardToLibraryRequest,
  ): Promise<AddCardToLibraryResponse> {
    const res = await this.client.cards.addCardToLibrary({ body: request });
    return unwrap<AddCardToLibraryResponse>(res);
  }

  async addCardToCollection(
    request: AddCardToCollectionRequest,
  ): Promise<AddCardToCollectionResponse> {
    const res = await this.client.cards.addCardToCollection({ body: request });
    return unwrap<AddCardToCollectionResponse>(res);
  }

  async updateNoteCard(
    request: UpdateNoteCardRequest,
  ): Promise<UpdateNoteCardResponse> {
    const res = await this.client.cards.cardNote({
      body: { cardId: request.cardId, note: request.note },
    });
    return unwrap<UpdateNoteCardResponse>(res);
  }

  async updateUrlCardAssociations(
    request: UpdateUrlCardAssociationsRequest,
  ): Promise<UpdateUrlCardAssociationsResponse> {
    const res = await this.client.cards.urlCardAssociations({ body: request });
    return unwrap<UpdateUrlCardAssociationsResponse>(res);
  }

  async removeCardFromLibrary(
    request: RemoveCardFromLibraryRequest,
  ): Promise<RemoveCardFromLibraryResponse> {
    const res = await this.client.cards.removeFromLibrary({
      body: { cardId: request.cardId },
    });
    return unwrap<RemoveCardFromLibraryResponse>(res);
  }

  async removeCardFromCollection(
    request: RemoveCardFromCollectionRequest,
  ): Promise<RemoveCardFromCollectionResponse> {
    const res = await this.client.cards.removeFromCollections({
      body: { cardId: request.cardId, collectionIds: request.collectionIds },
    });
    return unwrap<RemoveCardFromCollectionResponse>(res);
  }
}

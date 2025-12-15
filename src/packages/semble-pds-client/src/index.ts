import { AtpAgent } from '@atproto/api';
import {
  StrongRef,
  CreateCardOptions,
  CreateCollectionOptions,
  SemblePDSClientOptions,
  CreateCardResult,
  CardRecord,
  CollectionRecord,
  GetCardsResult,
  GetCollectionsResult,
  ListQueryParams,
  CreateCardsOptions,
  CreateCollectionsOptions,
  AddCardsToCollectionOptions,
  BatchCreateResult,
} from './types';
import { CardManager } from './cards/CardManager';
import { CardBatchManager } from './cards/CardBatchManager';
import { CollectionManager } from './collections/CollectionManager';
import { CollectionBatchManager } from './collections/CollectionBatchManager';
import { CollectionLinkManager } from './collection-link/CollectionLinkManager';

export class SemblePDSClient {
  private agent: AtpAgent;
  private readonly BASE_NSID: string;
  private readonly CARD_COLLECTION: string;
  private readonly COLLECTION_COLLECTION: string;
  private readonly COLLECTION_LINK_COLLECTION: string;

  private cardManager: CardManager;
  private cardBatchManager: CardBatchManager;
  private collectionManager: CollectionManager;
  private collectionBatchManager: CollectionBatchManager;
  private collectionLinkManager: CollectionLinkManager;

  constructor(options: SemblePDSClientOptions) {
    this.agent = new AtpAgent({
      service: options.service,
    });

    this.BASE_NSID = options.env
      ? `network.cosmik.${options.env}`
      : 'network.cosmik';
    this.CARD_COLLECTION = `${this.BASE_NSID}.card`;
    this.COLLECTION_COLLECTION = `${this.BASE_NSID}.collection`;
    this.COLLECTION_LINK_COLLECTION = `${this.BASE_NSID}.collectionLink`;

    // Initialize managers
    this.cardManager = new CardManager(this.agent, this.BASE_NSID, this.CARD_COLLECTION);
    this.cardBatchManager = new CardBatchManager(this.agent, this.BASE_NSID, this.CARD_COLLECTION);
    this.collectionManager = new CollectionManager(this.agent, this.COLLECTION_COLLECTION);
    this.collectionBatchManager = new CollectionBatchManager(this.agent, this.COLLECTION_COLLECTION);
    this.collectionLinkManager = new CollectionLinkManager(this.agent, this.BASE_NSID, this.COLLECTION_LINK_COLLECTION);
  }

  async login(identifier: string, password: string): Promise<void> {
    await this.agent.login({
      identifier,
      password,
    });
  }

  // Card operations - delegate to CardManager
  async createCard(options: CreateCardOptions): Promise<CreateCardResult> {
    return this.cardManager.create(options);
  }

  async addNoteToCard(parentCard: StrongRef, noteText: string): Promise<StrongRef> {
    return this.cardManager.addNote(parentCard, noteText);
  }

  async updateNote(noteRef: StrongRef, updatedText: string): Promise<void> {
    return this.cardManager.updateNote(noteRef, updatedText);
  }

  async deleteCard(cardRef: StrongRef): Promise<void> {
    return this.cardManager.delete(cardRef);
  }

  async getCard(cardRef: StrongRef): Promise<CardRecord> {
    return this.cardManager.get(cardRef);
  }

  async getMyCards(params?: ListQueryParams): Promise<GetCardsResult> {
    return this.cardManager.getMy(params);
  }

  async getCards(did: string, params?: ListQueryParams): Promise<GetCardsResult> {
    return this.cardManager.getForUser(did, params);
  }

  // Collection operations - delegate to CollectionManager
  async createCollection(options: CreateCollectionOptions): Promise<StrongRef> {
    return this.collectionManager.create(options);
  }

  async updateCollection(
    collectionRef: StrongRef,
    name: string,
    description?: string,
  ): Promise<void> {
    return this.collectionManager.update(collectionRef, name, description);
  }

  async deleteCollection(collectionRef: StrongRef): Promise<void> {
    return this.collectionManager.delete(collectionRef);
  }

  async getCollection(collectionRef: StrongRef): Promise<CollectionRecord> {
    return this.collectionManager.get(collectionRef);
  }

  async getMyCollections(params?: ListQueryParams): Promise<GetCollectionsResult> {
    return this.collectionManager.getMy(params);
  }

  async getCollections(did: string, params?: ListQueryParams): Promise<GetCollectionsResult> {
    return this.collectionManager.getForUser(did, params);
  }

  // Collection link operations - delegate to CollectionLinkManager
  async addCardToCollection(
    card: StrongRef,
    collection: StrongRef,
    viaCard?: StrongRef,
  ): Promise<StrongRef> {
    return this.collectionLinkManager.addCardToCollection(card, collection, viaCard);
  }

  async removeCardFromCollection(collectionLinkRef: StrongRef): Promise<void> {
    return this.collectionLinkManager.removeCardFromCollection(collectionLinkRef);
  }

  // Batch operations - delegate to batch managers
  async createCards(options: CreateCardsOptions): Promise<BatchCreateResult> {
    return this.cardBatchManager.createCards(options);
  }

  async createCollections(options: CreateCollectionsOptions): Promise<BatchCreateResult> {
    return this.collectionBatchManager.createCollections(options);
  }

  async addCardsToCollection(options: AddCardsToCollectionOptions): Promise<BatchCreateResult> {
    return this.collectionLinkManager.addCardsToCollection(options);
  }
}

export * from './types';

import { AggregateRoot } from '../../../shared/domain/AggregateRoot';
import { UniqueEntityID } from '../../../shared/domain/UniqueEntityID';
import { ok, err, Result } from '../../../shared/core/Result';
import { CollectionId } from './value-objects/CollectionId';
import { CardId } from './value-objects/CardId';
import { CuratorId } from './value-objects/CuratorId';
import { CollectionName } from './value-objects/CollectionName';
import { CollectionDescription } from './value-objects/CollectionDescription';
import { PublishedRecordId } from './value-objects/PublishedRecordId';
import { CardAddedToCollectionEvent } from './events/CardAddedToCollectionEvent';
import { CollectionCreatedEvent } from './events/CollectionCreatedEvent';

export interface CardLink {
  cardId: CardId;
  addedBy: CuratorId;
  addedAt: Date;
  viaCardId?: CardId; // Card that led to this addition
  publishedRecordId?: PublishedRecordId; // AT URI of the link record
}

export enum CollectionAccessType {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export class CollectionAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CollectionAccessError';
  }
}

export class CollectionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CollectionValidationError';
  }
}

interface CollectionProps {
  authorId: CuratorId;
  name: CollectionName;
  description?: CollectionDescription;
  accessType: CollectionAccessType;
  collaboratorIds: CuratorId[];
  cardLinks: CardLink[]; // Instead of cardIds: CardId[]
  cardCount: number;
  publishedRecordId?: PublishedRecordId; // Collection's own published record
  createdAt: Date;
  updatedAt: Date;
}

export class Collection extends AggregateRoot<CollectionProps> {
  get collectionId(): CollectionId {
    return CollectionId.create(this._id).unwrap();
  }

  get authorId(): CuratorId {
    return this.props.authorId;
  }

  get name(): CollectionName {
    return this.props.name;
  }

  get description(): CollectionDescription | undefined {
    return this.props.description;
  }

  get accessType(): CollectionAccessType {
    return this.props.accessType;
  }

  get collaboratorIds(): CuratorId[] {
    return [...this.props.collaboratorIds];
  }

  get cardIds(): CardId[] {
    return this.props.cardLinks.map((link) => link.cardId);
  }

  get cardLinks(): CardLink[] {
    return [...this.props.cardLinks];
  }

  get cardCount(): number {
    return this.props.cardCount;
  }

  get unpublishedCardLinks(): CardLink[] {
    return this.props.cardLinks.filter((link) => !link.publishedRecordId);
  }

  get hasUnpublishedLinks(): boolean {
    return this.unpublishedCardLinks.length > 0;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get isOpen(): boolean {
    return this.props.accessType === CollectionAccessType.OPEN;
  }

  get isClosed(): boolean {
    return this.props.accessType === CollectionAccessType.CLOSED;
  }

  get publishedRecordId(): PublishedRecordId | undefined {
    return this.props.publishedRecordId;
  }

  get isPublished(): boolean {
    return this.props.publishedRecordId !== undefined;
  }

  private constructor(props: CollectionProps, id?: UniqueEntityID) {
    super(props, id);
  }

  public static create(
    props: Omit<
      CollectionProps,
      'name' | 'description' | 'cardLinks' | 'cardCount'
    > & {
      name: string;
      description?: string;
      cardLinks?: CardLink[];
      cardCount?: number;
    },
    id?: UniqueEntityID,
  ): Result<Collection, CollectionValidationError> {
    // Validate and create CollectionName
    const nameResult = CollectionName.create(props.name);
    if (nameResult.isErr()) {
      return err(new CollectionValidationError(nameResult.error.message));
    }

    // Validate and create CollectionDescription if provided
    let description: CollectionDescription | undefined;
    if (props.description) {
      const descriptionResult = CollectionDescription.create(props.description);
      if (descriptionResult.isErr()) {
        return err(
          new CollectionValidationError(descriptionResult.error.message),
        );
      }
      description = descriptionResult.value;
    }

    // Validate access type
    if (!Object.values(CollectionAccessType).includes(props.accessType)) {
      return err(new CollectionValidationError('Invalid access type'));
    }

    const collectionProps: CollectionProps = {
      ...props,
      name: nameResult.value,
      description,
      cardLinks: props.cardLinks || [],
      cardCount: props.cardCount ?? (props.cardLinks || []).length,
    };

    const collection = new Collection(collectionProps, id);

    // Raise domain event for new collections (when no id is provided)
    if (!id) {
      collection.addDomainEvent(
        CollectionCreatedEvent.create(
          collection.collectionId,
          collection.authorId,
          collection.name.value,
        ).unwrap(),
      );
    }

    return ok(collection);
  }

  public canAddCard(userId: CuratorId): boolean {
    // Author can always add cards
    if (this.props.authorId.equals(userId)) {
      return true;
    }

    // If collection is open, anyone can add cards
    if (this.isOpen) {
      return true;
    }

    // If collection is closed, only collaborators can add cards
    return this.props.collaboratorIds.some((collaboratorId) =>
      collaboratorId.equals(userId),
    );
  }

  public addCard(
    cardId: CardId,
    userId: CuratorId,
    viaCardId?: CardId,
  ): Result<CardLink, CollectionAccessError> {
    if (!this.canAddCard(userId)) {
      return err(
        new CollectionAccessError(
          'User does not have permission to add cards to this collection',
        ),
      );
    }

    // Check if card is already in collection
    const existingLink = this.props.cardLinks.find((link) =>
      link.cardId.equals(cardId),
    );
    if (existingLink) {
      return ok(existingLink); // Return existing link
    }

    const newLink: CardLink = {
      cardId,
      addedBy: userId,
      addedAt: new Date(),
      viaCardId,
      publishedRecordId: undefined, // Will be set when published
    };

    this.props.cardLinks.push(newLink);
    this.props.cardCount = this.props.cardLinks.length;
    this.props.updatedAt = new Date();

    // Raise domain event
    this.addDomainEvent(
      CardAddedToCollectionEvent.create(
        cardId,
        this.collectionId,
        userId,
      ).unwrap(),
    );

    return ok(newLink);
  }

  public markCardLinkAsPublished(
    cardId: CardId,
    publishedRecordId: PublishedRecordId,
  ): void {
    const link = this.props.cardLinks.find((link) =>
      link.cardId.equals(cardId),
    );
    if (link) {
      link.publishedRecordId = publishedRecordId;
      this.props.updatedAt = new Date();
    }
  }

  public removeCard(
    cardId: CardId,
    userId: CuratorId,
  ): Result<void, CollectionAccessError> {
    if (!this.canAddCard(userId)) {
      return err(
        new CollectionAccessError(
          'User does not have permission to remove cards from this collection',
        ),
      );
    }

    this.props.cardLinks = this.props.cardLinks.filter(
      (link) => !link.cardId.equals(cardId),
    );
    this.props.cardCount = this.props.cardLinks.length;
    this.props.updatedAt = new Date();

    return ok(undefined);
  }

  public addCollaborator(
    collaboratorId: CuratorId,
    userId: CuratorId,
  ): Result<void, CollectionAccessError> {
    if (!this.props.authorId.equals(userId)) {
      return err(
        new CollectionAccessError('Only the author can add collaborators'),
      );
    }

    if (this.props.collaboratorIds.some((id) => id.equals(collaboratorId))) {
      return ok(undefined); // Already a collaborator
    }

    this.props.collaboratorIds.push(collaboratorId);
    this.props.updatedAt = new Date();

    return ok(undefined);
  }

  public removeCollaborator(
    collaboratorId: CuratorId,
    userId: CuratorId,
  ): Result<void, CollectionAccessError> {
    if (!this.props.authorId.equals(userId)) {
      return err(
        new CollectionAccessError('Only the author can remove collaborators'),
      );
    }

    this.props.collaboratorIds = this.props.collaboratorIds.filter(
      (id) => !id.equals(collaboratorId),
    );
    this.props.updatedAt = new Date();

    return ok(undefined);
  }

  public changeAccessType(
    accessType: CollectionAccessType,
    userId: CuratorId,
  ): Result<void, CollectionAccessError> {
    if (!this.props.authorId.equals(userId)) {
      return err(
        new CollectionAccessError(
          'Only the author can change collection access type',
        ),
      );
    }

    this.props.accessType = accessType;
    this.props.updatedAt = new Date();

    return ok(undefined);
  }

  public markAsPublished(publishedRecordId: PublishedRecordId): void {
    this.props.publishedRecordId = publishedRecordId;
    this.props.updatedAt = new Date();
  }

  public markAsUnpublished(): void {
    this.props.publishedRecordId = undefined;
    this.props.updatedAt = new Date();
  }

  public updateDetails(
    name: string,
    description?: string,
  ): Result<void, CollectionValidationError> {
    // Validate and create CollectionName
    const nameResult = CollectionName.create(name);
    if (nameResult.isErr()) {
      return err(new CollectionValidationError(nameResult.error.message));
    }

    // Validate and create CollectionDescription if provided
    let newDescription: CollectionDescription | undefined;
    if (description) {
      const descriptionResult = CollectionDescription.create(description);
      if (descriptionResult.isErr()) {
        return err(
          new CollectionValidationError(descriptionResult.error.message),
        );
      }
      newDescription = descriptionResult.value;
    }

    // Update properties
    this.props.name = nameResult.value;
    this.props.description = newDescription;
    this.props.updatedAt = new Date();

    return ok(undefined);
  }

  public getUnpublishedCardLinks(): CardLink[] {
    return this.props.cardLinks.filter((link) => !link.publishedRecordId);
  }
}

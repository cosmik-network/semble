# Implementation Plan: FollowTargetUseCase & UnfollowTargetUseCase

## Overview

Implement follow/unfollow functionality with AT Protocol publishing and notification support, following DDD patterns with proper validation and event-driven architecture.

## User Requirements (Confirmed)

- ✅ Publish to AT Protocol (network.cosmik.follow)
- ✅ Send notifications when users are followed
- ✅ Validate target existence before allowing follow
- ✅ Prevent self-follows (business rule)
- ✅ Store publishedRecordId in Follow aggregate (similar to Card)

## Implementation Steps

### Phase 0: AT Protocol Lexicon Definition

#### 0.1 Create network.cosmik.follow Lexicon

**File:** `src/modules/atproto/infrastructure/lexicons/follow.json` (NEW)

**Implementation:**

```json
{
  "lexicon": 1,
  "id": "network.cosmik.follow",
  "description": "A record representing a follow relationship.",
  "defs": {
    "main": {
      "type": "record",
      "description": "A record representing a follow of a user or collection.",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["subject", "createdAt"],
        "properties": {
          "subject": {
            "type": "string",
            "description": "DID of the user being followed, or AT URI of the collection being followed"
          },
          "createdAt": {
            "type": "string",
            "format": "datetime",
            "description": "Timestamp when this follow was created."
          }
        }
      }
    }
  }
}
```

**Notes:**

- Similar to app.bsky.graph.follow but under network.cosmik namespace
- `subject` can be either a DID (for user follows) or an AT URI (for collection follows)
- Collections will be referenced via their published AT URI (at://did/network.cosmik.collection/rkey)

---

### Phase 1: Domain Layer - Events & Aggregate Updates

#### 1.1 Add Event Names to EventConfig

**File:** `src/shared/infrastructure/events/EventConfig.ts`

**Changes:**

```typescript
export const EventNames = {
  // ... existing events ...
  USER_FOLLOWED_TARGET: 'USER_FOLLOWED_TARGET',
  USER_UNFOLLOWED_TARGET: 'USER_UNFOLLOWED_TARGET',
} as const;
```

---

#### 1.2 Create UserFollowedTargetEvent

**File:** `src/modules/user/domain/events/UserFollowedTargetEvent.ts` (NEW)

**Implementation:**

```typescript
import { IDomainEvent } from '../../../../shared/domain/events/IDomainEvent';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';
import { DID } from '../value-objects/DID';
import { FollowTargetType } from '../value-objects/FollowTargetType';
import { EventNames } from '../../../../shared/infrastructure/events/EventConfig';
import { Result, ok } from '../../../../shared/core/Result';

export class UserFollowedTargetEvent implements IDomainEvent {
  public readonly eventName = EventNames.USER_FOLLOWED_TARGET;
  public readonly dateTimeOccurred: Date;

  private constructor(
    public readonly followId: UniqueEntityID,
    public readonly followerId: DID,
    public readonly targetId: string,
    public readonly targetType: FollowTargetType,
    public readonly createdAt: Date,
    dateTimeOccurred?: Date,
  ) {
    this.dateTimeOccurred = dateTimeOccurred || new Date();
  }

  public static create(
    followId: UniqueEntityID,
    followerId: DID,
    targetId: string,
    targetType: FollowTargetType,
    createdAt: Date,
  ): Result<UserFollowedTargetEvent> {
    return ok(
      new UserFollowedTargetEvent(
        followId,
        followerId,
        targetId,
        targetType,
        createdAt,
      ),
    );
  }

  public static reconstruct(
    followId: UniqueEntityID,
    followerId: DID,
    targetId: string,
    targetType: FollowTargetType,
    createdAt: Date,
    dateTimeOccurred: Date,
  ): Result<UserFollowedTargetEvent> {
    return ok(
      new UserFollowedTargetEvent(
        followId,
        followerId,
        targetId,
        targetType,
        createdAt,
        dateTimeOccurred,
      ),
    );
  }

  getAggregateId(): UniqueEntityID {
    return this.followId;
  }
}
```

---

#### 1.3 Create UserUnfollowedTargetEvent

**File:** `src/modules/user/domain/events/UserUnfollowedTargetEvent.ts` (NEW)

**Implementation:**

```typescript
import { IDomainEvent } from '../../../../shared/domain/events/IDomainEvent';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';
import { DID } from '../value-objects/DID';
import { FollowTargetType } from '../value-objects/FollowTargetType';
import { EventNames } from '../../../../shared/infrastructure/events/EventConfig';
import { Result, ok } from '../../../../shared/core/Result';

export class UserUnfollowedTargetEvent implements IDomainEvent {
  public readonly eventName = EventNames.USER_UNFOLLOWED_TARGET;
  public readonly dateTimeOccurred: Date;

  private constructor(
    public readonly followId: UniqueEntityID,
    public readonly followerId: DID,
    public readonly targetId: string,
    public readonly targetType: FollowTargetType,
    dateTimeOccurred?: Date,
  ) {
    this.dateTimeOccurred = dateTimeOccurred || new Date();
  }

  public static create(
    followId: UniqueEntityID,
    followerId: DID,
    targetId: string,
    targetType: FollowTargetType,
  ): Result<UserUnfollowedTargetEvent> {
    return ok(
      new UserUnfollowedTargetEvent(followId, followerId, targetId, targetType),
    );
  }

  public static reconstruct(
    followId: UniqueEntityID,
    followerId: DID,
    targetId: string,
    targetType: FollowTargetType,
    dateTimeOccurred: Date,
  ): Result<UserUnfollowedTargetEvent> {
    return ok(
      new UserUnfollowedTargetEvent(
        followId,
        followerId,
        targetId,
        targetType,
        dateTimeOccurred,
      ),
    );
  }

  getAggregateId(): UniqueEntityID {
    return this.followId;
  }
}
```

---

#### 1.4 Update Follow Aggregate

**File:** `src/modules/user/domain/Follow.ts` (MODIFY)

**Update FollowProps interface to include publishedRecordId:**

```typescript
import { PublishedRecordId } from '../../../cards/domain/value-objects/PublishedRecordId';

export interface FollowProps {
  followerId: DID;
  targetId: string;
  targetType: FollowTargetType;
  publishedRecordId?: PublishedRecordId; // NEW
  createdAt: Date;
}
```

**Add getter for publishedRecordId:**

```typescript
get publishedRecordId(): PublishedRecordId | undefined {
  return this.props.publishedRecordId;
}
```

**Add markAsPublished method (similar to Card):**

```typescript
public markAsPublished(publishedRecordId: PublishedRecordId): void {
  this.props.publishedRecordId = publishedRecordId;
}
```

**Add markForRemoval method:**

```typescript
public markForRemoval(): Result<void> {
  const event = UserUnfollowedTargetEvent.create(
    this.followId,
    this.followerId,
    this.targetId,
    this.targetType,
  );

  if (event.isErr()) {
    return err(new Error(event.error.message));
  }

  this.addDomainEvent(event.value);
  return ok(undefined);
}
```

**Update createNew method (don't raise event here - will be raised after publish in use case):**

```typescript
public static createNew(
  followerId: DID,
  targetId: string,
  targetType: FollowTargetType,
): Result<Follow> {
  const now = new Date();

  return Follow.create({
    followerId,
    targetId,
    targetType,
    createdAt: now,
  });
}
```

**Note:** Unlike the initial plan, we do NOT raise the UserFollowedTargetEvent in createNew().
The event will be raised in the use case AFTER successful publishing, similar to how Card handles it.

---

### Phase 1.5: Event Serialization - EventMapper

#### 1.5.1 Update EventMapper for Serialization/Deserialization

**File:** `src/shared/infrastructure/events/EventMapper.ts` (MODIFY)

**Step 1.5.1a: Add Imports**
Add these imports at the top of the file:

```typescript
import { UserFollowedTargetEvent } from '../../../modules/user/domain/events/UserFollowedTargetEvent';
import { UserUnfollowedTargetEvent } from '../../../modules/user/domain/events/UserUnfollowedTargetEvent';
import { DID } from '../../../modules/user/domain/value-objects/DID';
import { FollowTargetType } from '../../../modules/user/domain/value-objects/FollowTargetType';
```

**Step 1.5.1b: Add Serialized Interfaces**
Add these interfaces after existing serialized event interfaces:

```typescript
export interface SerializedUserFollowedTargetEvent extends SerializedEvent {
  eventType: typeof EventNames.USER_FOLLOWED_TARGET;
  followId: string;
  followerId: string;
  targetId: string;
  targetType: 'USER' | 'COLLECTION';
  createdAt: string;
}

export interface SerializedUserUnfollowedTargetEvent extends SerializedEvent {
  eventType: typeof EventNames.USER_UNFOLLOWED_TARGET;
  followId: string;
  followerId: string;
  targetId: string;
  targetType: 'USER' | 'COLLECTION';
}
```

**Step 1.5.1c: Update SerializedEventUnion**
Add to the SerializedEventUnion type:

```typescript
export type SerializedEventUnion =
  | SerializedCardAddedToLibraryEvent
  // ... other events ...
  | SerializedUserFollowedTargetEvent
  | SerializedUserUnfollowedTargetEvent;
```

**Step 1.5.1d: Add toSerialized() Cases**
Add these cases in the `toSerialized()` method:

```typescript
if (event instanceof UserFollowedTargetEvent) {
  return {
    eventType: EventNames.USER_FOLLOWED_TARGET,
    aggregateId: event.getAggregateId().toString(),
    dateTimeOccurred: event.dateTimeOccurred.toISOString(),
    followId: event.followId.toString(),
    followerId: event.followerId.value,
    targetId: event.targetId,
    targetType: event.targetType.value,
    createdAt: event.createdAt.toISOString(),
  };
}

if (event instanceof UserUnfollowedTargetEvent) {
  return {
    eventType: EventNames.USER_UNFOLLOWED_TARGET,
    aggregateId: event.getAggregateId().toString(),
    dateTimeOccurred: event.dateTimeOccurred.toISOString(),
    followId: event.followId.toString(),
    followerId: event.followerId.value,
    targetId: event.targetId,
    targetType: event.targetType.value,
  };
}
```

**Step 1.5.1e: Add fromSerialized() Cases**
Add these cases in the `fromSerialized()` method:

```typescript
case EventNames.USER_FOLLOWED_TARGET: {
  const followId = UniqueEntityID.createFromString(eventData.followId).unwrap();
  const followerId = DID.create(eventData.followerId).unwrap();
  const targetType = FollowTargetType.create(eventData.targetType).unwrap();
  const createdAt = new Date(eventData.createdAt);
  const dateTimeOccurred = new Date(eventData.dateTimeOccurred);
  return UserFollowedTargetEvent.reconstruct(
    followId,
    followerId,
    eventData.targetId,
    targetType,
    createdAt,
    dateTimeOccurred,
  ).unwrap();
}

case EventNames.USER_UNFOLLOWED_TARGET: {
  const followId = UniqueEntityID.createFromString(eventData.followId).unwrap();
  const followerId = DID.create(eventData.followerId).unwrap();
  const targetType = FollowTargetType.create(eventData.targetType).unwrap();
  const dateTimeOccurred = new Date(eventData.dateTimeOccurred);
  return UserUnfollowedTargetEvent.reconstruct(
    followId,
    followerId,
    eventData.targetId,
    targetType,
    dateTimeOccurred,
  ).unwrap();
}
```

---

### Phase 2: Repository Extensions

#### 2.1 Extend IFollowsRepository Interface

**File:** `src/modules/user/domain/repositories/IFollowsRepository.ts` (MODIFY)

**Add these methods:**

```typescript
/**
 * Save a follow relationship.
 *
 * @param follow - The follow entity to persist
 * @returns Success or error
 *
 * Idempotency: Uses INSERT ON CONFLICT DO NOTHING on composite key
 */
save(follow: Follow): Promise<Result<void>>;

/**
 * Delete a follow relationship.
 *
 * @param followerId - DID of the follower
 * @param targetId - ID of the target (user DID or collection UUID)
 * @param targetType - Type of target
 * @returns Success or error
 *
 * Idempotency: Returns success even if follow doesn't exist
 */
delete(
  followerId: string,
  targetId: string,
  targetType: FollowTargetType,
): Promise<Result<void>>;

/**
 * Find a specific follow relationship.
 *
 * @param followerId - DID of the follower
 * @param targetId - ID of the target
 * @param targetType - Type of target
 * @returns Follow entity or null if not found
 */
findByFollowerAndTarget(
  followerId: string,
  targetId: string,
  targetType: FollowTargetType,
): Promise<Result<Follow | null>>;
```

---

#### 2.2 Update Database Schema

**File:** `src/modules/user/infrastructure/repositories/schema/follows.sql.ts` (MODIFY)

**Add published_record_id column:**

```typescript
import { publishedRecords } from '../../../../cards/infrastructure/repositories/schema/publishedRecord.sql';

export const follows = pgTable(
  'follows',
  {
    follower_id: text('follower_id').notNull(),
    target_id: text('target_id').notNull(),
    target_type: text('target_type').notNull(),
    published_record_id: uuid('published_record_id').references(
      () => publishedRecords.id,
    ), // NEW
    created_at: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey(table.follower_id, table.target_id, table.target_type),
    followerIdx: index('idx_follows_follower').on(table.follower_id),
    targetIdx: index('idx_follows_target').on(
      table.target_id,
      table.target_type,
    ),
  }),
);
```

**Note:** This will require a database migration. Run `npm run db:generate` after making this change.

---

#### 2.3 Update DrizzleFollowsRepository Implementation

**File:** `src/modules/user/infrastructure/repositories/DrizzleFollowsRepository.ts` (MODIFY)

**Add these implementations:**

```typescript
import { PublishedRecordId } from '../../../../cards/domain/value-objects/PublishedRecordId';

async save(follow: Follow): Promise<Result<void>> {
  try {
    // Handle publishedRecordId persistence (similar to Card repository)
    let publishedRecordIdUuid: string | undefined;
    if (follow.publishedRecordId) {
      const publishedRecordId = follow.publishedRecordId.getValue();

      // Insert or get existing published record
      const existingRecord = await this.db
        .select()
        .from(publishedRecords)
        .where(
          and(
            eq(publishedRecords.uri, publishedRecordId.uri),
            eq(publishedRecords.cid, publishedRecordId.cid),
          ),
        )
        .limit(1);

      if (existingRecord.length > 0) {
        publishedRecordIdUuid = existingRecord[0].id;
      } else {
        const insertResult = await this.db
          .insert(publishedRecords)
          .values({
            id: randomUUID(),
            uri: publishedRecordId.uri,
            cid: publishedRecordId.cid,
          })
          .returning({ id: publishedRecords.id });
        publishedRecordIdUuid = insertResult[0].id;
      }
    }

    await this.db
      .insert(follows)
      .values({
        follower_id: follow.followerId.value,
        target_id: follow.targetId,
        target_type: follow.targetType.value,
        published_record_id: publishedRecordIdUuid,
        created_at: follow.createdAt,
      })
      .onConflictDoUpdate({
        target: [follows.follower_id, follows.target_id, follows.target_type],
        set: {
          published_record_id: publishedRecordIdUuid,
        },
      });

    return ok(undefined);
  } catch (error) {
    return err(error as Error);
  }
}

async delete(
  followerId: string,
  targetId: string,
  targetType: FollowTargetType,
): Promise<Result<void>> {
  try {
    await this.db
      .delete(follows)
      .where(
        and(
          eq(follows.follower_id, followerId),
          eq(follows.target_id, targetId),
          eq(follows.target_type, targetType.value),
        ),
      );

    return ok(undefined);
  } catch (error) {
    return err(error as Error);
  }
}

async findByFollowerAndTarget(
  followerId: string,
  targetId: string,
  targetType: FollowTargetType,
): Promise<Result<Follow | null>> {
  try {
    const results = await this.db
      .select({
        follow: follows,
        publishedRecord: publishedRecords,
      })
      .from(follows)
      .leftJoin(
        publishedRecords,
        eq(follows.published_record_id, publishedRecords.id),
      )
      .where(
        and(
          eq(follows.follower_id, followerId),
          eq(follows.target_id, targetId),
          eq(follows.target_type, targetType.value),
        ),
      )
      .limit(1);

    if (results.length === 0) {
      return ok(null);
    }

    const row = results[0];
    const followerDid = DID.create(row.follow.follower_id);
    if (followerDid.isErr()) {
      return err(followerDid.error);
    }

    const targetTypeVO = FollowTargetType.create(row.follow.target_type as 'USER' | 'COLLECTION');
    if (targetTypeVO.isErr()) {
      return err(targetTypeVO.error);
    }

    // Reconstruct publishedRecordId if present
    let publishedRecordId: PublishedRecordId | undefined;
    if (row.publishedRecord) {
      const publishedRecordIdResult = PublishedRecordId.create({
        uri: row.publishedRecord.uri,
        cid: row.publishedRecord.cid,
      });
      if (publishedRecordIdResult.isErr()) {
        return err(publishedRecordIdResult.error);
      }
      publishedRecordId = publishedRecordIdResult.value;
    }

    return Follow.create({
      followerId: followerDid.value,
      targetId: row.follow.target_id,
      targetType: targetTypeVO.value,
      publishedRecordId,
      createdAt: row.follow.created_at,
    });
  } catch (error) {
    return err(error as Error);
  }
}
```

---

#### 2.4 Update InMemoryFollowsRepository (for tests)

**File:** Find existing in-memory implementation (MODIFY)

**Add these implementations:**

```typescript
private follows: Map<string, Follow> = new Map();

private getKey(followerId: string, targetId: string, targetType: string): string {
  return `${followerId}:${targetId}:${targetType}`;
}

async save(follow: Follow): Promise<Result<void>> {
  const key = this.getKey(
    follow.followerId.value,
    follow.targetId,
    follow.targetType.value,
  );
  this.follows.set(key, follow);
  return ok(undefined);
}

async delete(
  followerId: string,
  targetId: string,
  targetType: FollowTargetType,
): Promise<Result<void>> {
  const key = this.getKey(followerId, targetId, targetType.value);
  this.follows.delete(key);
  return ok(undefined);
}

async findByFollowerAndTarget(
  followerId: string,
  targetId: string,
  targetType: FollowTargetType,
): Promise<Result<Follow | null>> {
  const key = this.getKey(followerId, targetId, targetType.value);
  const follow = this.follows.get(key);
  return ok(follow || null);
}
```

---

### Phase 3: Publisher Interface & Implementation

#### 3.1 Create IFollowPublisher Interface

**File:** `src/modules/user/application/ports/IFollowPublisher.ts` (NEW)

**Implementation:**

```typescript
import { Result } from '../../../../shared/core/Result';
import { UseCaseError } from '../../../../shared/core/UseCaseError';
import { Follow } from '../../domain/Follow';
import { PublishedRecordId } from '../../../cards/domain/value-objects/PublishedRecordId';
import { DID } from '../../domain/value-objects/DID';

export interface IFollowPublisher {
  /**
   * Publish a follow relationship to AT Protocol.
   *
   * @param follow - The Follow domain object to publish
   * @returns Published record ID (AT URI + CID)
   */
  publishFollow(
    follow: Follow,
  ): Promise<Result<PublishedRecordId, UseCaseError>>;

  /**
   * Unpublish (delete) a follow relationship from AT Protocol.
   *
   * @param follow - The Follow domain object with publishedRecordId to unpublish
   * @returns Success or error
   */
  unpublishFollow(follow: Follow): Promise<Result<void, UseCaseError>>;
}
```

**Note:** Similar to ICardPublisher, this interface now accepts the Follow domain object directly
rather than individual parameters. This follows DDD principles by keeping behavior with data.

---

#### 3.2 Create ATProtoFollowPublisher

**File:** `src/modules/atproto/infrastructure/publishers/ATProtoFollowPublisher.ts` (NEW)

**Implementation:**

```typescript
import { IFollowPublisher } from '../../../user/application/ports/IFollowPublisher';
import { Follow } from '../../../user/domain/Follow';
import { Result, ok, err } from '../../../../shared/core/Result';
import { UseCaseError } from '../../../../shared/core/UseCaseError';
import { PublishedRecordId } from '../../../cards/domain/value-objects/PublishedRecordId';
import { IAgentService } from '../../application/ports/IAgentService';
import { DID } from '../../domain/DID';
import { ICollectionRepository } from '../../../cards/domain/ICollectionRepository';
import { CollectionId } from '../../../cards/domain/value-objects/CollectionId';
import { AuthenticationError } from '../../../../shared/core/AuthenticationError';

export class ATProtoFollowPublisher implements IFollowPublisher {
  constructor(
    private readonly agentService: IAgentService,
    private readonly followCollection: string, // 'network.cosmik.follow'
    private readonly collectionRepository: ICollectionRepository,
  ) {}

  async publishFollow(
    follow: Follow,
  ): Promise<Result<PublishedRecordId, UseCaseError>> {
    try {
      const followerDid = DID.create(follow.followerId.value);
      if (followerDid.isErr()) {
        return err(
          new UseCaseError(
            `Invalid follower DID: ${followerDid.error.message}`,
          ),
        );
      }

      const agentResult = await this.agentService.getAuthenticatedAgent(
        followerDid.value,
      );

      if (agentResult.isErr()) {
        // Propagate authentication errors as-is
        if (agentResult.error instanceof AuthenticationError) {
          return err(agentResult.error);
        }
        return err(
          new UseCaseError(
            `Failed to get authenticated agent: ${agentResult.error.message}`,
          ),
        );
      }

      const agent = agentResult.value;

      if (!agent) {
        return err(
          new UseCaseError('No authenticated session found for follower'),
        );
      }

      // Determine the subject based on target type
      let subject: string;
      if (follow.targetType.value === 'USER') {
        // For user follows, subject is the DID
        subject = follow.targetId;
      } else {
        // For collection follows, subject is the AT URI of the published collection
        const collectionIdResult = CollectionId.createFromString(
          follow.targetId,
        );
        if (collectionIdResult.isErr()) {
          return err(
            new UseCaseError(
              `Invalid collection ID: ${collectionIdResult.error.message}`,
            ),
          );
        }

        const collectionResult = await this.collectionRepository.findById(
          collectionIdResult.value,
        );
        if (collectionResult.isErr()) {
          return err(
            new UseCaseError(
              `Failed to find collection: ${collectionResult.error.message}`,
            ),
          );
        }

        const collection = collectionResult.value;
        if (!collection) {
          return err(new UseCaseError('Collection not found'));
        }

        if (!collection.publishedRecordId) {
          return err(
            new UseCaseError(
              'Collection must be published before it can be followed',
            ),
          );
        }

        // Use the AT URI of the published collection
        subject = collection.publishedRecordId.uri;
      }

      const record = {
        $type: this.followCollection,
        subject: subject,
        createdAt: follow.createdAt.toISOString(),
      };

      const createResult = await agent.com.atproto.repo.createRecord({
        repo: follow.followerId.value,
        collection: this.followCollection,
        record,
      });

      const publishedRecordId = PublishedRecordId.create({
        uri: createResult.data.uri,
        cid: createResult.data.cid,
      });

      if (publishedRecordId.isErr()) {
        return err(new UseCaseError(publishedRecordId.error.message));
      }

      return ok(publishedRecordId.value);
    } catch (error) {
      return err(
        new UseCaseError(
          `Failed to publish follow: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async unpublishFollow(follow: Follow): Promise<Result<void, UseCaseError>> {
    try {
      if (!follow.publishedRecordId) {
        // Already unpublished or never published
        return ok(undefined);
      }

      const followerDid = DID.create(follow.followerId.value);
      if (followerDid.isErr()) {
        return err(
          new UseCaseError(
            `Invalid follower DID: ${followerDid.error.message}`,
          ),
        );
      }

      const agentResult = await this.agentService.getAuthenticatedAgent(
        followerDid.value,
      );

      if (agentResult.isErr()) {
        // Propagate authentication errors as-is
        if (agentResult.error instanceof AuthenticationError) {
          return err(agentResult.error);
        }
        return err(
          new UseCaseError(
            `Failed to get authenticated agent: ${agentResult.error.message}`,
          ),
        );
      }

      const agent = agentResult.value;

      if (!agent) {
        return err(
          new UseCaseError('No authenticated session found for follower'),
        );
      }

      // Extract rkey from AT URI (format: at://did/collection/rkey)
      const uriParts = follow.publishedRecordId.uri.split('/');
      const rkey = uriParts[uriParts.length - 1];

      await agent.com.atproto.repo.deleteRecord({
        repo: follow.followerId.value,
        collection: this.followCollection,
        rkey,
      });

      return ok(undefined);
    } catch (error) {
      return err(
        new UseCaseError(
          `Failed to unpublish follow: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
```

---

#### 3.3 Create FakeFollowPublisher (for tests)

**File:** `src/modules/atproto/infrastructure/publishers/FakeFollowPublisher.ts` (NEW)

**Implementation:**

```typescript
import { IFollowPublisher } from '../../../user/application/ports/IFollowPublisher';
import { Follow } from '../../../user/domain/Follow';
import { Result, ok } from '../../../../shared/core/Result';
import { UseCaseError } from '../../../../shared/core/UseCaseError';
import { PublishedRecordId } from '../../../cards/domain/value-objects/PublishedRecordId';

export class FakeFollowPublisher implements IFollowPublisher {
  private publishedFollows: Map<string, PublishedRecordId> = new Map();

  async publishFollow(
    follow: Follow,
  ): Promise<Result<PublishedRecordId, UseCaseError>> {
    const key = `${follow.followerId.value}:${follow.targetId}`;
    const fakeUri = `at://${follow.followerId.value}/network.cosmik.follow/${Date.now()}`;
    const fakeCid = `fake-cid-${Date.now()}`;

    const recordId = PublishedRecordId.create({
      uri: fakeUri,
      cid: fakeCid,
    }).unwrap();

    this.publishedFollows.set(key, recordId);

    return ok(recordId);
  }

  async unpublishFollow(follow: Follow): Promise<Result<void, UseCaseError>> {
    if (!follow.publishedRecordId) {
      return ok(undefined);
    }

    // Find and remove from map
    for (const [key, value] of this.publishedFollows.entries()) {
      if (value.uri === follow.publishedRecordId.uri) {
        this.publishedFollows.delete(key);
        break;
      }
    }

    return ok(undefined);
  }

  // Test helper
  getPublishedFollows(): Map<string, PublishedRecordId> {
    return this.publishedFollows;
  }
}
```

---

#### 3.4 Add Follow Publisher to ServiceFactory

**File:** `src/shared/infrastructure/http/factories/ServiceFactory.ts` (MODIFY)

**Add to Services interface:**

```typescript
export interface Services extends SharedServices {
  // ... existing services ...
  followPublisher: IFollowPublisher;
}
```

**Add to create() method:**

```typescript
const followPublisher = useFakePublishers
  ? new FakeFollowPublisher()
  : new ATProtoFollowPublisher(
      atProtoAgentService,
      collections.follow,
      repositories.collectionRepository, // Need collection repository for AT URI resolution
    );

return {
  // ... existing services ...
  followPublisher,
};
```

---

#### 3.5 Update Environment Config

**File:** `src/shared/infrastructure/config/EnvironmentConfigService.ts` (MODIFY)

**Update getAtProtoCollections():**

```typescript
getAtProtoCollections() {
  return {
    card: 'network.cosmik.card',
    collection: 'network.cosmik.collection',
    collectionLink: 'network.cosmik.collectionLink',
    collectionLinkRemoval: 'network.cosmik.collectionLinkRemoval',
    follow: 'network.cosmik.follow', // NEW
  };
}
```

---

#### 3.6 Configure Queue Routing

**File:** `src/shared/infrastructure/events/BullMQEventPublisher.ts` (MODIFY)

**Purpose:** Route follow/unfollow events to the correct queue for processing.

Update the `getTargetQueues()` method to include routing for the new events:

```typescript
private getTargetQueues(eventName: EventName): QueueName[] {
  switch (eventName) {
    // ... existing cases ...
    case EventNames.USER_FOLLOWED_TARGET:
      return [QueueNames.NOTIFICATIONS]; // Route to notifications queue
    case EventNames.USER_UNFOLLOWED_TARGET:
      return [QueueNames.NOTIFICATIONS]; // Route to notifications queue
    default:
      return [QueueNames.FEEDS];
  }
}
```

**Why NOTIFICATIONS queue?**

- Follow events trigger user notifications
- The NotificationWorkerProcess subscribes to this queue
- Keeps notification events separate from feed generation events

---

### Phase 4: Application Layer - Use Cases

#### 4.1 Create FollowTargetUseCase

**File:** `src/modules/user/application/useCases/commands/FollowTargetUseCase.ts` (NEW)

**Full implementation:**

```typescript
import { Result, ok, err } from '../../../../../shared/core/Result';
import { BaseUseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { IEventPublisher } from '../../../../../shared/application/events/IEventPublisher';
import { IFollowsRepository } from '../../../domain/repositories/IFollowsRepository';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { ICollectionRepository } from '../../../../cards/domain/ICollectionRepository';
import { IFollowPublisher } from '../../ports/IFollowPublisher';
import { DID } from '../../../domain/value-objects/DID';
import { FollowTargetType } from '../../../domain/value-objects/FollowTargetType';
import { Follow } from '../../../domain/Follow';
import { CollectionId } from '../../../../cards/domain/value-objects/CollectionId';

export interface FollowTargetDTO {
  followerId: string; // DID
  targetId: string; // DID or Collection UUID
  targetType: 'USER' | 'COLLECTION';
}

export interface FollowTargetResponseDTO {
  followId: string;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class FollowTargetUseCase extends BaseUseCase<
  FollowTargetDTO,
  Result<FollowTargetResponseDTO, ValidationError | AppError.UnexpectedError>
> {
  constructor(
    private followsRepository: IFollowsRepository,
    private userRepository: IUserRepository,
    private collectionRepository: ICollectionRepository,
    private followPublisher: IFollowPublisher,
    eventPublisher: IEventPublisher,
  ) {
    super(eventPublisher);
  }

  async execute(
    request: FollowTargetDTO,
  ): Promise<
    Result<FollowTargetResponseDTO, ValidationError | AppError.UnexpectedError>
  > {
    try {
      // 1. Validate followerId (create DID value object)
      const followerDidResult = DID.create(request.followerId);
      if (followerDidResult.isErr()) {
        return err(
          new ValidationError(
            `Invalid follower ID: ${followerDidResult.error.message}`,
          ),
        );
      }
      const followerDid = followerDidResult.value;

      // 2. Validate targetType
      const targetTypeResult = FollowTargetType.create(request.targetType);
      if (targetTypeResult.isErr()) {
        return err(
          new ValidationError(
            `Invalid target type: ${targetTypeResult.error.message}`,
          ),
        );
      }
      const targetType = targetTypeResult.value;

      // 3. Prevent self-follows (only for USER type)
      if (
        targetType.value === 'USER' &&
        request.followerId === request.targetId
      ) {
        return err(new ValidationError('Users cannot follow themselves'));
      }

      // 4. Validate target exists
      if (targetType.value === 'USER') {
        const targetDidResult = DID.create(request.targetId);
        if (targetDidResult.isErr()) {
          return err(
            new ValidationError(
              `Invalid target ID: ${targetDidResult.error.message}`,
            ),
          );
        }

        const userResult = await this.userRepository.findByDID(
          targetDidResult.value,
        );
        if (userResult.isErr()) {
          return err(AppError.UnexpectedError.create(userResult.error));
        }

        if (!userResult.value) {
          return err(new ValidationError('Target user not found'));
        }
      } else if (targetType.value === 'COLLECTION') {
        const collectionIdResult = CollectionId.createFromString(
          request.targetId,
        );
        if (collectionIdResult.isErr()) {
          return err(
            new ValidationError(
              `Invalid collection ID: ${collectionIdResult.error.message}`,
            ),
          );
        }

        const collectionResult = await this.collectionRepository.findById(
          collectionIdResult.value,
        );
        if (collectionResult.isErr()) {
          return err(AppError.UnexpectedError.create(collectionResult.error));
        }

        if (!collectionResult.value) {
          return err(new ValidationError('Target collection not found'));
        }
      }

      // 5. Check if already following (idempotent)
      const existingFollowResult =
        await this.followsRepository.findByFollowerAndTarget(
          request.followerId,
          request.targetId,
          targetType,
        );

      if (existingFollowResult.isErr()) {
        return err(AppError.UnexpectedError.create(existingFollowResult.error));
      }

      if (existingFollowResult.value) {
        // Already following - return success with existing follow ID
        return ok({
          followId: existingFollowResult.value.followId.toString(),
        });
      }

      // 6. Create Follow aggregate (does NOT raise event yet)
      const followResult = Follow.createNew(
        followerDid,
        request.targetId,
        targetType,
      );

      if (followResult.isErr()) {
        return err(new ValidationError(followResult.error.message));
      }

      let follow = followResult.value;

      // 7. Publish to AT Protocol BEFORE saving
      const publishResult = await this.followPublisher.publishFollow(follow);

      if (publishResult.isErr()) {
        // Propagate authentication errors
        if (publishResult.error instanceof AuthenticationError) {
          return err(publishResult.error);
        }
        if (publishResult.error instanceof AppError.UnexpectedError) {
          return err(publishResult.error);
        }
        return err(new ValidationError(publishResult.error.message));
      }

      // 8. Mark follow as published with the returned publishedRecordId
      const publishedRecordId = publishResult.value;
      follow.markAsPublished(publishedRecordId);

      // 9. Save to repository with publishedRecordId
      const saveResult = await this.followsRepository.save(follow);
      if (saveResult.isErr()) {
        return err(AppError.UnexpectedError.create(saveResult.error));
      }

      // 10. Raise UserFollowedTargetEvent (now that publish succeeded)
      const event = UserFollowedTargetEvent.create(
        follow.followId,
        follow.followerId,
        follow.targetId,
        follow.targetType,
        follow.createdAt,
      );

      if (event.isErr()) {
        console.error('Failed to create domain event:', event.error);
      } else {
        follow.addDomainEvent(event.value);
      }

      // 11. Publish domain events
      const publishEventsResult = await this.publishEventsForAggregate(follow);
      if (publishEventsResult.isErr()) {
        console.error(
          'Failed to publish domain events:',
          publishEventsResult.error,
        );
        // Don't fail the operation
      }

      // 12. Return success
      return ok({
        followId: follow.followId.toString(),
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
```

---

#### 4.2 Create UnfollowTargetUseCase

**File:** `src/modules/user/application/useCases/commands/UnfollowTargetUseCase.ts` (NEW)

**Full implementation:**

```typescript
import { Result, ok, err } from '../../../../../shared/core/Result';
import { BaseUseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { IEventPublisher } from '../../../../../shared/application/events/IEventPublisher';
import { IFollowsRepository } from '../../../domain/repositories/IFollowsRepository';
import { IFollowPublisher } from '../../ports/IFollowPublisher';
import { DID } from '../../../domain/value-objects/DID';
import { FollowTargetType } from '../../../domain/value-objects/FollowTargetType';

export interface UnfollowTargetDTO {
  followerId: string; // DID
  targetId: string; // DID or Collection UUID
  targetType: 'USER' | 'COLLECTION';
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class UnfollowTargetUseCase extends BaseUseCase<
  UnfollowTargetDTO,
  Result<void, ValidationError | AppError.UnexpectedError>
> {
  constructor(
    private followsRepository: IFollowsRepository,
    private followPublisher: IFollowPublisher,
    eventPublisher: IEventPublisher,
  ) {
    super(eventPublisher);
  }

  async execute(
    request: UnfollowTargetDTO,
  ): Promise<Result<void, ValidationError | AppError.UnexpectedError>> {
    try {
      // 1. Validate followerId (create DID value object)
      const followerDidResult = DID.create(request.followerId);
      if (followerDidResult.isErr()) {
        return err(
          new ValidationError(
            `Invalid follower ID: ${followerDidResult.error.message}`,
          ),
        );
      }
      const followerDid = followerDidResult.value;

      // 2. Validate targetType
      const targetTypeResult = FollowTargetType.create(request.targetType);
      if (targetTypeResult.isErr()) {
        return err(
          new ValidationError(
            `Invalid target type: ${targetTypeResult.error.message}`,
          ),
        );
      }
      const targetType = targetTypeResult.value;

      // 3. Find existing follow record
      const existingFollowResult =
        await this.followsRepository.findByFollowerAndTarget(
          request.followerId,
          request.targetId,
          targetType,
        );

      if (existingFollowResult.isErr()) {
        return err(AppError.UnexpectedError.create(existingFollowResult.error));
      }

      // 4. If not found, return success (idempotent)
      if (!existingFollowResult.value) {
        return ok(undefined);
      }

      const follow = existingFollowResult.value;

      // 5. Unpublish from AT Protocol (if has publishedRecordId)
      if (follow.publishedRecordId) {
        const unpublishResult =
          await this.followPublisher.unpublishFollow(follow);
        if (unpublishResult.isErr()) {
          // Log but don't fail - we still want to delete locally
          console.error(
            'Failed to unpublish follow from AT Protocol:',
            unpublishResult.error,
          );
        }
      }

      // 6. Call markForRemoval() (raises UserUnfollowedTargetEvent)
      const markResult = follow.markForRemoval();
      if (markResult.isErr()) {
        return err(new ValidationError(markResult.error.message));
      }

      // 7. Delete from repository
      const deleteResult = await this.followsRepository.delete(
        request.followerId,
        request.targetId,
        targetType,
      );

      if (deleteResult.isErr()) {
        return err(AppError.UnexpectedError.create(deleteResult.error));
      }

      // 8. Publish domain events
      const publishEventsResult = await this.publishEventsForAggregate(follow);
      if (publishEventsResult.isErr()) {
        console.error(
          'Failed to publish domain events:',
          publishEventsResult.error,
        );
        // Don't fail the operation
      }

      // 9. Return success
      return ok(undefined);
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
```

---

#### 4.3 Register Use Cases in UseCaseFactory

**File:** `src/shared/infrastructure/http/factories/UseCaseFactory.ts` (MODIFY)

**Add to UseCases interface:**

```typescript
export interface UseCases {
  // ... existing use cases ...
  followTargetUseCase: FollowTargetUseCase;
  unfollowTargetUseCase: UnfollowTargetUseCase;
}
```

**Add to createForWebApp():**

```typescript
import { FollowTargetUseCase } from '../../../modules/user/application/useCases/commands/FollowTargetUseCase';
import { UnfollowTargetUseCase } from '../../../modules/user/application/useCases/commands/UnfollowTargetUseCase';

// Inside createForWebApp method:
followTargetUseCase: new FollowTargetUseCase(
  repositories.followsRepository,
  repositories.userRepository,
  repositories.collectionRepository,
  services.followPublisher,
  services.eventPublisher,
),
unfollowTargetUseCase: new UnfollowTargetUseCase(
  repositories.followsRepository,
  services.followPublisher,
  services.eventPublisher,
),
```

---

### Phase 5: Notification System

#### 5.1 Extend NotificationType Enum

**File:** `src/types/src/api/responses.ts` (MODIFY)

**Add to enum:**

```typescript
export enum NotificationType {
  USER_ADDED_YOUR_CARD = 'USER_ADDED_YOUR_CARD',
  USER_ADDED_YOUR_BSKY_POST = 'USER_ADDED_YOUR_BSKY_POST',
  USER_ADDED_YOUR_COLLECTION = 'USER_ADDED_YOUR_COLLECTION',
  USER_ADDED_TO_YOUR_COLLECTION = 'USER_ADDED_TO_YOUR_COLLECTION',
  USER_FOLLOWED_YOU = 'USER_FOLLOWED_YOU', // NEW
  USER_FOLLOWED_YOUR_COLLECTION = 'USER_FOLLOWED_YOUR_COLLECTION', // NEW
}
```

---

#### 5.2 Extend Notification Domain Entity

**File:** `src/modules/notifications/domain/Notification.ts` (MODIFY)

**Add metadata interface (if not already extended):**

```typescript
export interface FollowNotificationMetadata {
  targetType: 'USER' | 'COLLECTION';
  targetId?: string; // Collection ID if applicable
}
```

**Add factory methods:**

```typescript
public static createUserFollowedYou(
  recipientUserId: CuratorId,
  actorUserId: CuratorId,
): Result<Notification> {
  const metadata: FollowNotificationMetadata = {
    targetType: 'USER',
  };

  return Notification.create({
    recipientUserId,
    actorUserId,
    type: NotificationType.USER_FOLLOWED_YOU,
    metadata: metadata as any,
    read: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

public static createUserFollowedYourCollection(
  recipientUserId: CuratorId,
  actorUserId: CuratorId,
  collectionId: CollectionId,
): Result<Notification> {
  const metadata: FollowNotificationMetadata = {
    targetType: 'COLLECTION',
    targetId: collectionId.getStringValue(),
  };

  return Notification.create({
    recipientUserId,
    actorUserId,
    type: NotificationType.USER_FOLLOWED_YOUR_COLLECTION,
    metadata: metadata as any,
    read: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}
```

---

#### 5.3 Extend NotificationService

**File:** `src/modules/notifications/domain/services/NotificationService.ts` (MODIFY)

**Add methods:**

```typescript
async createUserFollowedYouNotification(
  recipientUserId: CuratorId,
  actorUserId: CuratorId,
): Promise<Result<Notification, NotificationServiceError>> {
  // Don't create notification if user is following themselves (shouldn't happen)
  if (recipientUserId.equals(actorUserId)) {
    return err(
      new NotificationServiceError(
        'Cannot notify user about their own action',
      ),
    );
  }

  const notificationResult = Notification.createUserFollowedYou(
    recipientUserId,
    actorUserId,
  );

  if (notificationResult.isErr()) {
    return err(
      new NotificationServiceError(notificationResult.error.message),
    );
  }

  const notification = notificationResult.value;

  const saveResult = await this.notificationRepository.save(notification);

  if (saveResult.isErr()) {
    return err(new NotificationServiceError(saveResult.error.message));
  }

  return ok(notification);
}

async createUserFollowedYourCollectionNotification(
  recipientUserId: CuratorId,
  actorUserId: CuratorId,
  collectionId: CollectionId,
): Promise<Result<Notification, NotificationServiceError>> {
  // Don't create notification if user is following their own collection
  if (recipientUserId.equals(actorUserId)) {
    return err(
      new NotificationServiceError(
        'Cannot notify user about their own action',
      ),
    );
  }

  const notificationResult = Notification.createUserFollowedYourCollection(
    recipientUserId,
    actorUserId,
    collectionId,
  );

  if (notificationResult.isErr()) {
    return err(
      new NotificationServiceError(notificationResult.error.message),
    );
  }

  const notification = notificationResult.value;

  const saveResult = await this.notificationRepository.save(notification);

  if (saveResult.isErr()) {
    return err(new NotificationServiceError(saveResult.error.message));
  }

  return ok(notification);
}
```

---

#### 5.4 Create Event Handler for Notifications

**File:** `src/modules/notifications/application/eventHandlers/UserFollowedTargetEventHandler.ts` (NEW)

**Implementation:**

```typescript
import { IEventHandler } from '../../../../shared/application/events/IEventHandler';
import { UserFollowedTargetEvent } from '../../../user/domain/events/UserFollowedTargetEvent';
import { Result, ok, err } from '../../../../shared/core/Result';
import { NotificationService } from '../../domain/services/NotificationService';
import { IUserRepository } from '../../../user/domain/repositories/IUserRepository';
import { ICollectionRepository } from '../../../cards/domain/ICollectionRepository';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { CollectionId } from '../../../cards/domain/value-objects/CollectionId';

export class UserFollowedTargetEventHandler
  implements IEventHandler<UserFollowedTargetEvent>
{
  constructor(
    private notificationService: NotificationService,
    private userRepository: IUserRepository,
    private collectionRepository: ICollectionRepository,
  ) {}

  async handle(event: UserFollowedTargetEvent): Promise<Result<void>> {
    try {
      const actorIdResult = CuratorId.create(event.followerId.value);
      if (actorIdResult.isErr()) {
        console.error('Invalid actor ID:', actorIdResult.error);
        return err(actorIdResult.error);
      }
      const actorId = actorIdResult.value;

      if (event.targetType.value === 'USER') {
        // User followed another user - notify the followed user
        const recipientIdResult = CuratorId.create(event.targetId);
        if (recipientIdResult.isErr()) {
          console.error('Invalid recipient ID:', recipientIdResult.error);
          return err(recipientIdResult.error);
        }
        const recipientId = recipientIdResult.value;

        // Skip if user is following themselves (shouldn't happen due to validation)
        if (actorId.equals(recipientId)) {
          return ok(undefined);
        }

        const notificationResult =
          await this.notificationService.createUserFollowedYouNotification(
            recipientId,
            actorId,
          );

        if (notificationResult.isErr()) {
          console.error(
            'Failed to create user followed notification:',
            notificationResult.error,
          );
          return err(notificationResult.error);
        }
      } else if (event.targetType.value === 'COLLECTION') {
        // User followed a collection - notify the collection author
        const collectionIdResult = CollectionId.createFromString(
          event.targetId,
        );
        if (collectionIdResult.isErr()) {
          console.error('Invalid collection ID:', collectionIdResult.error);
          return err(collectionIdResult.error);
        }
        const collectionId = collectionIdResult.value;

        const collectionResult =
          await this.collectionRepository.findById(collectionId);
        if (collectionResult.isErr()) {
          console.error('Failed to find collection:', collectionResult.error);
          return err(collectionResult.error);
        }

        const collection = collectionResult.value;
        if (!collection) {
          console.warn(
            'Collection not found for notification:',
            event.targetId,
          );
          return ok(undefined);
        }

        const recipientId = collection.authorId;

        // Skip if user is following their own collection
        if (actorId.equals(recipientId)) {
          return ok(undefined);
        }

        const notificationResult =
          await this.notificationService.createUserFollowedYourCollectionNotification(
            recipientId,
            actorId,
            collectionId,
          );

        if (notificationResult.isErr()) {
          console.error(
            'Failed to create collection followed notification:',
            notificationResult.error,
          );
          return err(notificationResult.error);
        }
      }

      return ok(undefined);
    } catch (error) {
      console.error('Error handling UserFollowedTargetEvent:', error);
      return err(error as Error);
    }
  }
}
```

---

#### 5.5 Register Event Handler in Worker Process

**File:** `src/shared/infrastructure/processes/NotificationWorkerProcess.ts` (MODIFY)

**Add to registerHandlers method:**

```typescript
import { UserFollowedTargetEventHandler } from '../../../modules/notifications/application/eventHandlers/UserFollowedTargetEventHandler';
import { EventNames } from '../events/EventConfig';

// Inside registerHandlers method:
const userFollowedTargetHandler = new UserFollowedTargetEventHandler(
  services.notificationService,
  repositories.userRepository,
  repositories.collectionRepository,
);

await subscriber.subscribe(
  EventNames.USER_FOLLOWED_TARGET,
  userFollowedTargetHandler,
);
```

---

### Phase 6: HTTP Layer - Controllers

#### 6.1 Create FollowTargetController

**File:** `src/modules/user/infrastructure/http/controllers/FollowTargetController.ts` (NEW)

**Implementation:**

```typescript
import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { FollowTargetUseCase } from '../../../application/useCases/commands/FollowTargetUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';

export class FollowTargetController extends Controller {
  constructor(private followTargetUseCase: FollowTargetUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { targetId, targetType } = req.body;
      const followerId = req.did;

      if (!followerId) {
        return this.unauthorized(res);
      }

      if (!targetId || !targetType) {
        return this.badRequest(res, 'Target ID and type are required');
      }

      const result = await this.followTargetUseCase.execute({
        followerId,
        targetId,
        targetType,
      });

      if (result.isErr()) {
        if (result.error instanceof AuthenticationError) {
          return this.unauthorized(res, result.error.message);
        }
        return this.fail(res, result.error);
      }

      return this.ok(res, result.value);
    } catch (error: any) {
      return this.handleError(res, error);
    }
  }
}
```

---

#### 6.2 Create UnfollowTargetController

**File:** `src/modules/user/infrastructure/http/controllers/UnfollowTargetController.ts` (NEW)

**Implementation:**

```typescript
import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Response } from 'express';
import { UnfollowTargetUseCase } from '../../../application/useCases/commands/UnfollowTargetUseCase';
import { AuthenticatedRequest } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';

export class UnfollowTargetController extends Controller {
  constructor(private unfollowTargetUseCase: UnfollowTargetUseCase) {
    super();
  }

  async executeImpl(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { targetId, targetType } = req.params;
      const followerId = req.did;

      if (!followerId) {
        return this.unauthorized(res);
      }

      if (!targetId || !targetType) {
        return this.badRequest(res, 'Target ID and type are required');
      }

      const result = await this.unfollowTargetUseCase.execute({
        followerId,
        targetId,
        targetType: targetType as 'USER' | 'COLLECTION',
      });

      if (result.isErr()) {
        if (result.error instanceof AuthenticationError) {
          return this.unauthorized(res, result.error.message);
        }
        return this.fail(res, result.error);
      }

      return this.noContent(res);
    } catch (error: any) {
      return this.handleError(res, error);
    }
  }
}
```

---

### Phase 7: HTTP Layer - Routes

#### 7.1 Add Follow/Unfollow Routes

**File:** `src/modules/user/infrastructure/http/routes/userRoutes.ts` (MODIFY)

**Implementation:**

```typescript
import { Router } from 'express';
import { AuthMiddleware } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { FollowTargetController } from '../controllers/FollowTargetController';
import { UnfollowTargetController } from '../controllers/UnfollowTargetController';

export function createUserRoutes(
  authMiddleware: AuthMiddleware,
  followTargetController: FollowTargetController,
  unfollowTargetController: UnfollowTargetController,
  // ... other controllers ...
): Router {
  const router = Router();

  // Follow/Unfollow routes
  router.post('/follows', authMiddleware.ensureAuthenticated(), (req, res) =>
    followTargetController.execute(req, res),
  );

  router.delete(
    '/follows/:targetId/:targetType',
    authMiddleware.ensureAuthenticated(),
    (req, res) => unfollowTargetController.execute(req, res),
  );

  // ... existing routes ...

  return router;
}
```

**API Endpoints:**

- `POST /api/users/follows` - Follow a user or collection
- `DELETE /api/users/follows/:targetId/:targetType` - Unfollow a user or collection

---

### Phase 8: API Types

#### 8.1 Add Request Types

**File:** `src/types/src/api/requests.ts` (MODIFY)

**Add these interfaces:**

```typescript
export interface FollowTargetRequest {
  targetId: string; // DID or Collection UUID
  targetType: 'USER' | 'COLLECTION';
}

export interface UnfollowTargetRequest {
  targetId: string;
  targetType: 'USER' | 'COLLECTION';
}
```

---

#### 8.2 Add Response Types

**File:** `src/types/src/api/responses.ts` (MODIFY)

**Add these interfaces:**

```typescript
export interface FollowTargetResponse {
  followId: string;
}

// Optional: Response types for getting follows
export interface GetFollowsParams extends PaginationParams {
  targetType?: 'USER' | 'COLLECTION';
}

export interface FollowDTO {
  followId: string;
  followerId: string;
  targetId: string;
  targetType: 'USER' | 'COLLECTION';
  createdAt: string;
}

export interface GetFollowsResponse {
  follows: FollowDTO[];
  pagination: Pagination;
}
```

---

### Phase 9: API Client

#### 9.1 Extend UserClient

**File:** `src/webapp/api-client/clients/UserClient.ts` (MODIFY)

**Add these methods:**

```typescript
import { FollowTargetRequest, FollowTargetResponse } from '@semble/types';

export class UserClient extends BaseClient {
  // ... existing methods ...

  async followTarget(
    request: FollowTargetRequest,
  ): Promise<FollowTargetResponse> {
    return this.request<FollowTargetResponse>(
      'POST',
      '/api/users/follows',
      request,
    );
  }

  async unfollowTarget(
    targetId: string,
    targetType: 'USER' | 'COLLECTION',
  ): Promise<void> {
    return this.request<void>(
      'DELETE',
      `/api/users/follows/${targetId}/${targetType}`,
    );
  }

  // Optional: Get follows for a user
  async getFollows(params?: GetFollowsParams): Promise<GetFollowsResponse> {
    return this.request<GetFollowsResponse>(
      'GET',
      '/api/users/follows',
      undefined,
      params,
    );
  }
}
```

---

#### 9.2 Update ApiClient

**File:** `src/webapp/api-client/ApiClient.ts` (MODIFY)

**Add delegation methods:**

```typescript
export class ApiClient {
  // ... existing properties ...
  private userClient: UserClient;

  // ... constructor ...

  // Add delegation methods
  async followTarget(
    request: FollowTargetRequest,
  ): Promise<FollowTargetResponse> {
    return this.userClient.followTarget(request);
  }

  async unfollowTarget(
    targetId: string,
    targetType: 'USER' | 'COLLECTION',
  ): Promise<void> {
    return this.userClient.unfollowTarget(targetId, targetType);
  }

  async getFollows(params?: GetFollowsParams): Promise<GetFollowsResponse> {
    return this.userClient.getFollows(params);
  }
}
```

---

### Phase 10: Factory & Route Registration

#### 10.1 Update ControllerFactory

**File:** `src/shared/infrastructure/http/factories/ControllerFactory.ts` (MODIFY)

**Update the interface:**

```typescript
export interface Controllers {
  // ... existing controllers ...
  followTargetController: FollowTargetController;
  unfollowTargetController: UnfollowTargetController;
}
```

**Add controller instantiation:**

```typescript
import { FollowTargetController } from '../../../modules/user/infrastructure/http/controllers/FollowTargetController';
import { UnfollowTargetController } from '../../../modules/user/infrastructure/http/controllers/UnfollowTargetController';

export function createControllers(useCases: UseCases): Controllers {
  return {
    // ... existing controllers ...
    followTargetController: new FollowTargetController(
      useCases.followTargetUseCase,
    ),
    unfollowTargetController: new UnfollowTargetController(
      useCases.unfollowTargetUseCase,
    ),
  };
}
```

---

#### 10.2 Register Routes in Main App

**File:** Main app initialization file (e.g., `src/index.ts` or similar) (MODIFY)

**Update route registration:**

```typescript
import { createUserRoutes } from './modules/user/infrastructure/http/routes/userRoutes';

// ... initialization code ...

const userRoutes = createUserRoutes(
  authMiddleware,
  controllers.followTargetController,
  controllers.unfollowTargetController,
  // ... other user controllers ...
);

app.use('/api/users', userRoutes);
```

---

## Files Summary

### New Files (17):

1. `src/modules/atproto/infrastructure/lexicons/follow.json` - AT Protocol lexicon definition
2. `src/modules/user/domain/events/UserFollowedTargetEvent.ts`
3. `src/modules/user/domain/events/UserUnfollowedTargetEvent.ts`
4. `src/modules/user/application/ports/IFollowPublisher.ts`
5. `src/modules/user/application/useCases/commands/FollowTargetUseCase.ts`
6. `src/modules/user/application/useCases/commands/UnfollowTargetUseCase.ts`
7. `src/modules/atproto/infrastructure/publishers/ATProtoFollowPublisher.ts`
8. `src/modules/atproto/infrastructure/publishers/FakeFollowPublisher.ts`
9. `src/modules/notifications/application/eventHandlers/UserFollowedTargetEventHandler.ts`
10. `src/modules/user/infrastructure/http/controllers/FollowTargetController.ts`
11. `src/modules/user/infrastructure/http/controllers/UnfollowTargetController.ts`

### Modified Files (20):

1. `src/shared/infrastructure/events/EventConfig.ts` - Add event names
2. `src/shared/infrastructure/events/EventMapper.ts` - Add serialization/deserialization
3. `src/modules/user/domain/Follow.ts` - Add publishedRecordId property, markAsPublished(), markForRemoval() methods
4. `src/modules/user/infrastructure/repositories/schema/follows.sql.ts` - **Add published_record_id column (requires migration)**
5. `src/modules/cards/tests/test-utils/createTestSchema.ts` - **Update test schema for published_record_id column**
6. `src/modules/user/domain/repositories/IFollowsRepository.ts` - Add write methods
7. `src/modules/user/infrastructure/repositories/DrizzleFollowsRepository.ts` - Implement write methods with publishedRecordId handling
8. `src/shared/infrastructure/events/BullMQEventPublisher.ts` - Add queue routing
9. `src/shared/infrastructure/http/factories/ServiceFactory.ts` - Register follow publisher with collectionRepository
10. `src/shared/infrastructure/http/factories/UseCaseFactory.ts` - Register use cases
11. `src/shared/infrastructure/config/EnvironmentConfigService.ts` - Add 'network.cosmik.follow' collection
12. `src/modules/user/infrastructure/http/routes/userRoutes.ts` - Add follow/unfollow routes
13. `src/types/src/api/requests.ts` - Add follow request types
14. `src/types/src/api/responses.ts` - Add follow response types and notification types
15. `src/webapp/api-client/clients/UserClient.ts` - Add follow/unfollow methods
16. `src/webapp/api-client/ApiClient.ts` - Add delegation methods
17. `src/shared/infrastructure/http/factories/ControllerFactory.ts` - Register controllers
18. `src/modules/notifications/domain/Notification.ts` - Add factory methods
19. `src/modules/notifications/domain/services/NotificationService.ts` - Add notification methods
20. `src/shared/infrastructure/processes/NotificationWorkerProcess.ts` - Register event handler
21. Main app initialization file (e.g., `src/index.ts`) - Register routes

### Database Migration Required

After modifying `follows.sql.ts` to add the `published_record_id` column:

1. Run `npm run db:generate` to create migration files
2. Apply migrations to development/production databases

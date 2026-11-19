import { eq, and, inArray } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { ICardRepository } from '../../domain/ICardRepository';
import { Card } from '../../domain/Card';
import { CardId } from '../../domain/value-objects/CardId';
import { cards } from './schema/card.sql';
import { libraryMemberships } from './schema/libraryMembership.sql';
import { publishedRecords } from './schema/publishedRecord.sql';
import { annotationSelectors } from './schema/annotationSelector.sql';
import { CardDTO, CardMapper, CardSelectorDTO } from './mappers/CardMapper';
import { Result, ok, err } from '../../../../shared/core/Result';
import { URL } from '../../domain/value-objects/URL';
import { CuratorId } from '../../domain/value-objects/CuratorId';

export class DrizzleCardRepository implements ICardRepository {
  constructor(private db: PostgresJsDatabase) {}

  /**
   * Fetch annotation selector rows for the given cards, keyed by cardId and
   * ordered by ordinal. Only meaningful for ANNOTATION cards.
   */
  private async fetchAnnotationSelectors(
    cardIds: string[],
  ): Promise<Map<string, CardSelectorDTO[]>> {
    const selectorsByCard = new Map<string, CardSelectorDTO[]>();
    if (cardIds.length === 0) {
      return selectorsByCard;
    }

    const rows = await this.db
      .select({
        cardId: annotationSelectors.cardId,
        selectorType: annotationSelectors.selectorType,
        ordinal: annotationSelectors.ordinal,
        exact: annotationSelectors.exact,
        prefix: annotationSelectors.prefix,
        suffix: annotationSelectors.suffix,
      })
      .from(annotationSelectors)
      .where(inArray(annotationSelectors.cardId, cardIds))
      .orderBy(annotationSelectors.ordinal);

    for (const row of rows) {
      const list = selectorsByCard.get(row.cardId) ?? [];
      list.push({
        selectorType: row.selectorType,
        ordinal: row.ordinal,
        exact: row.exact,
        prefix: row.prefix ?? undefined,
        suffix: row.suffix ?? undefined,
      });
      selectorsByCard.set(row.cardId, list);
    }
    return selectorsByCard;
  }

  async findById(id: CardId): Promise<Result<Card | null>> {
    try {
      const cardId = id.getStringValue();

      // Fetch the card (with its published record folded in via LEFT JOIN)
      // and its library memberships concurrently
      const [cardResult, membershipResults] = await Promise.all([
        this.db
          .select({
            card: cards,
            publishedRecord: publishedRecords,
          })
          .from(cards)
          .leftJoin(
            publishedRecords,
            eq(cards.publishedRecordId, publishedRecords.id),
          )
          .where(eq(cards.id, cardId))
          .limit(1),
        this.db
          .select({
            userId: libraryMemberships.userId,
            addedAt: libraryMemberships.addedAt,
            publishedRecordUri: publishedRecords.uri,
            publishedRecordCid: publishedRecords.cid,
          })
          .from(libraryMemberships)
          .leftJoin(
            publishedRecords,
            eq(libraryMemberships.publishedRecordId, publishedRecords.id),
          )
          .where(eq(libraryMemberships.cardId, cardId)),
      ]);

      if (cardResult.length === 0 || !cardResult[0]) {
        return ok(null);
      }

      const result = cardResult[0].card;
      const publishedRecord = cardResult[0].publishedRecord;

      if (!result) {
        return ok(null);
      }

      // Hydrate selector rows for annotation cards
      const selectors =
        result.type === 'ANNOTATION'
          ? (await this.fetchAnnotationSelectors([result.id])).get(result.id)
          : undefined;

      const cardDTO: CardDTO = {
        id: result.id,
        curatorId: result.authorId,
        type: result.type,
        contentData: result.contentData,
        url: result.url || undefined,
        parentCardId: result.parentCardId || undefined,
        viaCardId: result.viaCardId || undefined,
        selectors,
        publishedRecordId: publishedRecord
          ? {
              uri: publishedRecord.uri,
              cid: publishedRecord.cid,
            }
          : undefined,
        libraryCount: result.libraryCount ?? 0,
        libraryMemberships: membershipResults.map((membership) => ({
          userId: membership.userId,
          addedAt: membership.addedAt,
          publishedRecordId:
            membership.publishedRecordUri && membership.publishedRecordCid
              ? {
                  uri: membership.publishedRecordUri,
                  cid: membership.publishedRecordCid,
                }
              : undefined,
        })),
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };

      const domainResult = CardMapper.toDomain(cardDTO);
      if (domainResult.isErr()) {
        return err(domainResult.error);
      }

      return ok(domainResult.value);
    } catch (error) {
      return err(error as Error);
    }
  }

  async save(card: Card): Promise<Result<void>> {
    try {
      const {
        card: cardData,
        libraryMemberships: membershipData,
        publishedRecord,
        membershipPublishedRecords,
        annotationSelectors: selectorData,
      } = CardMapper.toPersistence(card);

      await this.db.transaction(async (tx) => {
        // Handle published record if it exists
        let publishedRecordId: string | undefined = undefined;

        if (publishedRecord) {
          const publishedRecordResult = await tx
            .insert(publishedRecords)
            .values({
              id: publishedRecord.id,
              uri: publishedRecord.uri,
              cid: publishedRecord.cid,
              recordedAt: publishedRecord.recordedAt || new Date(),
            })
            .onConflictDoNothing({
              target: [publishedRecords.uri, publishedRecords.cid],
            })
            .returning({ id: publishedRecords.id });

          if (publishedRecordResult.length === 0) {
            const existingRecord = await tx
              .select()
              .from(publishedRecords)
              .where(
                and(
                  eq(publishedRecords.uri, publishedRecord.uri),
                  eq(publishedRecords.cid, publishedRecord.cid),
                ),
              )
              .limit(1);

            if (existingRecord.length > 0) {
              publishedRecordId = existingRecord[0]!.id;
            }
          } else {
            publishedRecordId = publishedRecordResult[0]!.id;
          }
        }

        // Handle membership published records
        const membershipPublishedRecordMap = new Map<string, string>();
        if (membershipPublishedRecords) {
          for (const membershipRecord of membershipPublishedRecords) {
            const membershipRecordResult = await tx
              .insert(publishedRecords)
              .values({
                id: membershipRecord.id,
                uri: membershipRecord.uri,
                cid: membershipRecord.cid,
                recordedAt: membershipRecord.recordedAt || new Date(),
              })
              .onConflictDoNothing({
                target: [publishedRecords.uri, publishedRecords.cid],
              })
              .returning({ id: publishedRecords.id });

            let actualRecordId: string;
            if (membershipRecordResult.length === 0) {
              const existingRecord = await tx
                .select()
                .from(publishedRecords)
                .where(
                  and(
                    eq(publishedRecords.uri, membershipRecord.uri),
                    eq(publishedRecords.cid, membershipRecord.cid),
                  ),
                )
                .limit(1);

              if (existingRecord.length > 0) {
                actualRecordId = existingRecord[0]!.id;
              } else {
                actualRecordId = membershipRecord.id;
              }
            } else {
              actualRecordId = membershipRecordResult[0]!.id;
            }

            membershipPublishedRecordMap.set(
              membershipRecord.id,
              actualRecordId,
            );
          }
        }

        // Upsert the card
        await tx
          .insert(cards)
          .values({
            ...cardData,
            publishedRecordId: publishedRecordId,
          })
          .onConflictDoUpdate({
            target: cards.id,
            set: {
              authorId: cardData.authorId,
              type: cardData.type,
              contentData: cardData.contentData,
              url: cardData.url,
              parentCardId: cardData.parentCardId,
              viaCardId: cardData.viaCardId,
              publishedRecordId: publishedRecordId,
              libraryCount: cardData.libraryCount,
              updatedAt: cardData.updatedAt,
            },
          });

        // Handle library memberships - diff against existing rows instead of
        // deleting and reinserting everything
        const desiredMemberships = membershipData.map((membership) => ({
          cardId: membership.cardId,
          userId: membership.userId,
          addedAt: membership.addedAt,
          publishedRecordId: membership.publishedRecordId
            ? membershipPublishedRecordMap.get(membership.publishedRecordId) ||
              membership.publishedRecordId
            : null,
        }));

        const existingMemberships = await tx
          .select({
            userId: libraryMemberships.userId,
            addedAt: libraryMemberships.addedAt,
            publishedRecordId: libraryMemberships.publishedRecordId,
          })
          .from(libraryMemberships)
          .where(eq(libraryMemberships.cardId, cardData.id));

        const desiredByUserId = new Map(
          desiredMemberships.map((m) => [m.userId, m]),
        );
        const existingByUserId = new Map(
          existingMemberships.map((m) => [m.userId, m]),
        );

        // Delete memberships that no longer exist
        const userIdsToDelete = existingMemberships
          .filter((m) => !desiredByUserId.has(m.userId))
          .map((m) => m.userId);

        if (userIdsToDelete.length > 0) {
          await tx
            .delete(libraryMemberships)
            .where(
              and(
                eq(libraryMemberships.cardId, cardData.id),
                inArray(libraryMemberships.userId, userIdsToDelete),
              ),
            );
        }

        // Insert new memberships
        const membershipsToInsert = desiredMemberships.filter(
          (m) => !existingByUserId.has(m.userId),
        );

        if (membershipsToInsert.length > 0) {
          await tx.insert(libraryMemberships).values(membershipsToInsert);
        }

        // Update memberships whose data changed
        const membershipsToUpdate = desiredMemberships.filter((m) => {
          const existing = existingByUserId.get(m.userId);
          if (!existing) {
            return false;
          }
          return (
            existing.addedAt.getTime() !== m.addedAt.getTime() ||
            (existing.publishedRecordId ?? null) !==
              (m.publishedRecordId ?? null)
          );
        });

        for (const membership of membershipsToUpdate) {
          await tx
            .update(libraryMemberships)
            .set({
              addedAt: membership.addedAt,
              publishedRecordId: membership.publishedRecordId,
            })
            .where(
              and(
                eq(libraryMemberships.cardId, cardData.id),
                eq(libraryMemberships.userId, membership.userId),
              ),
            );
        }

        // Sync annotation selector rows — replace wholesale. Selectors are a
        // small ordered set (max 4) that may be rewritten on update, so
        // delete-and-reinsert avoids per-row diffing on ordinal.
        if (selectorData) {
          await tx
            .delete(annotationSelectors)
            .where(eq(annotationSelectors.cardId, cardData.id));
          if (selectorData.length > 0) {
            await tx.insert(annotationSelectors).values(selectorData);
          }
        }
      });

      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  async delete(cardId: CardId): Promise<Result<void>> {
    try {
      const id = cardId.getStringValue();
      await this.db.delete(cards).where(eq(cards.id, id));
      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findUsersUrlCardByUrl(
    url: URL,
    curatorId: CuratorId,
  ): Promise<Result<Card | null>> {
    try {
      const urlValue = url.value;

      // Fetch the card with its published record folded in via LEFT JOIN
      const cardResult = await this.db
        .select({
          card: cards,
          publishedRecord: publishedRecords,
        })
        .from(cards)
        .leftJoin(
          publishedRecords,
          eq(cards.publishedRecordId, publishedRecords.id),
        )
        .where(
          and(
            eq(cards.url, urlValue),
            eq(cards.type, 'URL'),
            eq(cards.authorId, curatorId.value),
          ),
        )
        .limit(1);

      if (cardResult.length === 0 || !cardResult[0]) {
        return ok(null);
      }

      const result = cardResult[0].card;
      const publishedRecord = cardResult[0].publishedRecord;

      if (!result) {
        return ok(null);
      }

      // Get library memberships for this card with published record details
      const membershipResults = await this.db
        .select({
          userId: libraryMemberships.userId,
          addedAt: libraryMemberships.addedAt,
          publishedRecordUri: publishedRecords.uri,
          publishedRecordCid: publishedRecords.cid,
        })
        .from(libraryMemberships)
        .leftJoin(
          publishedRecords,
          eq(libraryMemberships.publishedRecordId, publishedRecords.id),
        )
        .where(eq(libraryMemberships.cardId, result.id));

      const cardDTO: CardDTO = {
        id: result.id,
        curatorId: result.authorId,
        type: result.type,
        contentData: result.contentData,
        url: result.url || undefined,
        parentCardId: result.parentCardId || undefined,
        viaCardId: result.viaCardId || undefined,
        publishedRecordId: publishedRecord
          ? {
              uri: publishedRecord.uri,
              cid: publishedRecord.cid,
            }
          : undefined,
        libraryCount: result.libraryCount ?? 0,
        libraryMemberships: membershipResults.map((membership) => ({
          userId: membership.userId,
          addedAt: membership.addedAt,
          publishedRecordId:
            membership.publishedRecordUri && membership.publishedRecordCid
              ? {
                  uri: membership.publishedRecordUri,
                  cid: membership.publishedRecordCid,
                }
              : undefined,
        })),
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };

      const domainResult = CardMapper.toDomain(cardDTO);
      if (domainResult.isErr()) {
        return err(domainResult.error);
      }

      return ok(domainResult.value);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findUsersNoteCardByUrl(
    url: URL,
    curatorId: CuratorId,
  ): Promise<Result<Card | null>> {
    try {
      const urlValue = url.value;

      // Fetch the card with its published record folded in via LEFT JOIN
      const cardResult = await this.db
        .select({
          card: cards,
          publishedRecord: publishedRecords,
        })
        .from(cards)
        .leftJoin(
          publishedRecords,
          eq(cards.publishedRecordId, publishedRecords.id),
        )
        .where(
          and(
            eq(cards.url, urlValue),
            eq(cards.type, 'NOTE'),
            eq(cards.authorId, curatorId.value),
          ),
        )
        .limit(1);

      if (cardResult.length === 0 || !cardResult[0]) {
        return ok(null);
      }

      const result = cardResult[0].card;
      const publishedRecord = cardResult[0].publishedRecord;

      if (!result) {
        return ok(null);
      }

      // Get library memberships for this card with published record details
      const membershipResults = await this.db
        .select({
          userId: libraryMemberships.userId,
          addedAt: libraryMemberships.addedAt,
          publishedRecordUri: publishedRecords.uri,
          publishedRecordCid: publishedRecords.cid,
        })
        .from(libraryMemberships)
        .leftJoin(
          publishedRecords,
          eq(libraryMemberships.publishedRecordId, publishedRecords.id),
        )
        .where(eq(libraryMemberships.cardId, result.id));

      const cardDTO: CardDTO = {
        id: result.id,
        curatorId: result.authorId,
        type: result.type,
        contentData: result.contentData,
        url: result.url || undefined,
        parentCardId: result.parentCardId || undefined,
        viaCardId: result.viaCardId || undefined,
        publishedRecordId: publishedRecord
          ? {
              uri: publishedRecord.uri,
              cid: publishedRecord.cid,
            }
          : undefined,
        libraryCount: result.libraryCount ?? 0,
        libraryMemberships: membershipResults.map((membership) => ({
          userId: membership.userId,
          addedAt: membership.addedAt,
          publishedRecordId:
            membership.publishedRecordUri && membership.publishedRecordCid
              ? {
                  uri: membership.publishedRecordUri,
                  cid: membership.publishedRecordCid,
                }
              : undefined,
        })),
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };

      const domainResult = CardMapper.toDomain(cardDTO);
      if (domainResult.isErr()) {
        return err(domainResult.error);
      }

      return ok(domainResult.value);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findUsersAnnotationCardsByUrl(
    url: URL,
    curatorId: CuratorId,
  ): Promise<Result<Card[]>> {
    try {
      const cardResults = await this.db
        .select({
          card: cards,
          publishedRecord: publishedRecords,
        })
        .from(cards)
        .leftJoin(
          publishedRecords,
          eq(cards.publishedRecordId, publishedRecords.id),
        )
        .where(
          and(
            eq(cards.url, url.value),
            eq(cards.type, 'ANNOTATION'),
            eq(cards.authorId, curatorId.value),
          ),
        );

      if (cardResults.length === 0) {
        return ok([]);
      }

      const cardIds = cardResults.map((row) => row.card!.id);

      // Batch-fetch memberships and selector rows for all matched cards
      const [membershipResults, selectorsByCard] = await Promise.all([
        this.db
          .select({
            cardId: libraryMemberships.cardId,
            userId: libraryMemberships.userId,
            addedAt: libraryMemberships.addedAt,
            publishedRecordUri: publishedRecords.uri,
            publishedRecordCid: publishedRecords.cid,
          })
          .from(libraryMemberships)
          .leftJoin(
            publishedRecords,
            eq(libraryMemberships.publishedRecordId, publishedRecords.id),
          )
          .where(inArray(libraryMemberships.cardId, cardIds)),
        this.fetchAnnotationSelectors(cardIds),
      ]);

      const membershipsByCard = new Map<
        string,
        Array<CardDTO['libraryMemberships'][number]>
      >();
      for (const membership of membershipResults) {
        const list = membershipsByCard.get(membership.cardId) ?? [];
        list.push({
          userId: membership.userId,
          addedAt: membership.addedAt,
          publishedRecordId:
            membership.publishedRecordUri && membership.publishedRecordCid
              ? {
                  uri: membership.publishedRecordUri,
                  cid: membership.publishedRecordCid,
                }
              : undefined,
        });
        membershipsByCard.set(membership.cardId, list);
      }

      const annotationCards: Card[] = [];
      for (const row of cardResults) {
        if (!row.card) {
          continue;
        }

        const cardDTO: CardDTO = {
          id: row.card.id,
          curatorId: row.card.authorId,
          type: row.card.type,
          contentData: row.card.contentData,
          url: row.card.url || undefined,
          parentCardId: row.card.parentCardId || undefined,
          viaCardId: row.card.viaCardId || undefined,
          publishedRecordId: row.publishedRecord
            ? {
                uri: row.publishedRecord.uri,
                cid: row.publishedRecord.cid,
              }
            : undefined,
          selectors: selectorsByCard.get(row.card.id),
          libraryCount: row.card.libraryCount ?? 0,
          libraryMemberships: membershipsByCard.get(row.card.id) ?? [],
          createdAt: row.card.createdAt,
          updatedAt: row.card.updatedAt,
        };

        const domainResult = CardMapper.toDomain(cardDTO);
        if (domainResult.isErr()) {
          return err(domainResult.error);
        }
        annotationCards.push(domainResult.value);
      }

      return ok(annotationCards);
    } catch (error) {
      return err(error as Error);
    }
  }
}

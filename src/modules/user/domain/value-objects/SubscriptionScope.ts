import { err, ok, Result } from 'src/shared/core/Result';
import { ValueObject } from 'src/shared/domain/ValueObject';
import { FollowTargetType, FollowTargetTypeEnum } from './FollowTargetType';

export enum SubscriptionScopeEnum {
  CARD = 'CARD',
  CONNECTION = 'CONNECTION',
  COLLECTION_SAVED = 'COLLECTION_SAVED',
}

const VALID_BY_TARGET: Record<
  FollowTargetTypeEnum,
  Set<SubscriptionScopeEnum>
> = {
  [FollowTargetTypeEnum.USER]: new Set([
    SubscriptionScopeEnum.CARD,
    SubscriptionScopeEnum.CONNECTION,
  ]),
  [FollowTargetTypeEnum.COLLECTION]: new Set([
    SubscriptionScopeEnum.CARD,
    SubscriptionScopeEnum.COLLECTION_SAVED,
    SubscriptionScopeEnum.CONNECTION,
  ]),
};

interface SubscriptionScopeProps {
  value: SubscriptionScopeEnum;
}

export class SubscriptionScope extends ValueObject<SubscriptionScopeProps> {
  get value(): SubscriptionScopeEnum {
    return this.props.value;
  }

  private constructor(props: SubscriptionScopeProps) {
    super(props);
  }

  public static create(
    value: SubscriptionScopeEnum,
  ): Result<SubscriptionScope> {
    if (!Object.values(SubscriptionScopeEnum).includes(value)) {
      return err(new Error(`Invalid subscription scope: ${value}`));
    }
    return ok(new SubscriptionScope({ value }));
  }

  /**
   * Validate and normalize a scope list for a given target type.
   * - Rejects any scope not allowed for the target type.
   * - Dedupes.
   * - Rejects an empty array (a subscription with no scopes is meaningless;
   *   callers should unsubscribe instead).
   */
  public static validForTarget(
    scopes: SubscriptionScopeEnum[],
    targetType: FollowTargetType,
  ): Result<SubscriptionScopeEnum[]> {
    if (!scopes || scopes.length === 0) {
      return err(new Error('Subscription must have at least one scope'));
    }

    const allowed = VALID_BY_TARGET[targetType.value];
    const deduped = new Set<SubscriptionScopeEnum>();
    for (const scope of scopes) {
      if (!allowed.has(scope)) {
        return err(
          new Error(
            `Scope ${scope} is not valid for target type ${targetType.value}`,
          ),
        );
      }
      deduped.add(scope);
    }
    return ok(Array.from(deduped));
  }

  /**
   * Default scope set for a target type — every scope valid for it.
   * Used when callers subscribe without specifying scopes.
   */
  public static defaultForTarget(
    targetType: FollowTargetType,
  ): SubscriptionScopeEnum[] {
    return Array.from(VALID_BY_TARGET[targetType.value]);
  }
}

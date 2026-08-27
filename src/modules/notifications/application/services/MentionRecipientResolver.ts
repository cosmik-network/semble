import { extractMentions } from '@semble/types';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { DIDOrHandle } from '../../../atproto/domain/DIDOrHandle';
import { IIdentityResolutionService } from '../../../atproto/domain/services/IIdentityResolutionService';
import { IUserRepository } from '../../../user/domain/repositories/IUserRepository';

/**
 * Resolves @handle mentions in free text to registered Semble users.
 * Handles resolve to DIDs via the identity resolver (users.handle is not
 * reliable), then gate on the user existing in the users table (users.id is
 * the DID). Unresolvable handles and non-Semble users are silently skipped.
 */
export class MentionRecipientResolver {
  constructor(
    private identityResolutionService: IIdentityResolutionService,
    private userRepository: IUserRepository,
  ) {}

  async resolveMentionedUsers(text: string): Promise<CuratorId[]> {
    const handles = extractMentions(text);
    const recipients: CuratorId[] = [];
    const seenDids = new Set<string>();

    for (const handle of handles) {
      try {
        const identifierResult = DIDOrHandle.create(handle);
        if (identifierResult.isErr()) continue;

        const didResult = await this.identityResolutionService.resolveToDID(
          identifierResult.value,
        );
        if (didResult.isErr()) continue;

        const did = didResult.value;
        if (seenDids.has(did.value)) continue;
        seenDids.add(did.value);

        const userResult = await this.userRepository.findByDID(did);
        if (userResult.isErr() || !userResult.value) continue;

        const curatorIdResult = CuratorId.create(did.value);
        if (curatorIdResult.isOk()) {
          recipients.push(curatorIdResult.value);
        }
      } catch {
        // Skip handles that fail resolution for any reason
        continue;
      }
    }

    return recipients;
  }
}

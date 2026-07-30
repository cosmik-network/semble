import { Result } from 'src/shared/core/Result';
import { User } from '../User';
import { DID } from '../value-objects/DID';

export interface IUserRepository {
  findByDID(did: DID): Promise<Result<User | null>>;
  save(user: User): Promise<Result<void>>;
  /**
   * Given a list of DIDs, return the subset that exist as Semble users
   */
  findExistingDIDs(dids: string[]): Promise<Result<string[]>>;
}

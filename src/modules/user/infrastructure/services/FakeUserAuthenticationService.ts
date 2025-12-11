import { Result, err, ok } from 'src/shared/core/Result';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import {
  IUserAuthenticationService,
  AuthenticationResult,
} from '../../domain/services/IUserAuthenticationService';
import { DID } from '../../domain/value-objects/DID';
import { Handle } from '../../domain/value-objects/Handle';
import { User } from '../../domain/User';

export class FakeUserAuthenticationService
  implements IUserAuthenticationService
{
  constructor(private userRepository: IUserRepository) {}

  async validateUserCredentials(
    did: DID,
    handle?: Handle,
  ): Promise<Result<AuthenticationResult>> {
    try {
      // Try to find existing user first
      const userResult = await this.userRepository.findByDID(did);

      if (userResult.isErr()) {
        return err(userResult.error);
      }

      const existingUser = userResult.value;

      // If user exists, return it
      if (existingUser) {
        return ok({
          user: existingUser,
          isNewUser: false,
        });
      }

      // Create new user with the provided DID and handle
      if (!handle) {
        return err(new Error('Handle is required for new user creation'));
      }

      const newUserResult = User.createNew(did, handle);

      if (newUserResult.isErr()) {
        return err(newUserResult.error);
      }

      return ok({
        user: newUserResult.value,
        isNewUser: true,
      });
    } catch (error: any) {
      return err(error);
    }
  }
}

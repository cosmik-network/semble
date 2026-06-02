import { UseCase } from 'src/shared/core/UseCase';
import { Result, err, ok } from 'src/shared/core/Result';
import { AppError } from 'src/shared/core/AppError';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserDTO } from '@semble/types';
import { DID } from '../../domain/value-objects/DID';
import { GetCurrentUserErrors } from './errors/GetCurrentUserErrors';
import { UserMap } from '../mappers/UserMap';

export interface GetCurrentUserDTO {
  did: string;
}

export type GetCurrentUserResponse = Result<
  UserDTO,
  GetCurrentUserErrors.UserNotFoundError | AppError.UnexpectedError
>;

export class GetCurrentUserUseCase implements UseCase<
  GetCurrentUserDTO,
  Promise<GetCurrentUserResponse>
> {
  constructor(private userRepository: IUserRepository) {}

  async execute(request: GetCurrentUserDTO): Promise<GetCurrentUserResponse> {
    try {
      const didOrError = DID.create(request.did);

      if (didOrError.isErr()) {
        return err(new GetCurrentUserErrors.UserNotFoundError());
      }

      const userResult = await this.userRepository.findByDID(didOrError.value);

      if (userResult.isErr()) {
        return err(new AppError.UnexpectedError(userResult.error));
      }

      const user = userResult.value;

      if (!user) {
        return err(new GetCurrentUserErrors.UserNotFoundError());
      }

      // Map domain entity to DTO
      const userDTO = UserMap.toDTO(user);

      return ok(userDTO);
    } catch (error: any) {
      return err(new AppError.UnexpectedError(error));
    }
  }
}

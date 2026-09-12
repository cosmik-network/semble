import { err, ok, Result } from 'src/shared/core/Result';
import { IAppPasswordSessionRepository } from '../repositories/IAppPasswordSessionRepository';
import { AtpSessionData } from '@atproto/api';
import { IAppPasswordSessionService } from '../../application/IAppPasswordSessionService';
import { createPdsAgent } from './PdsAgent';

export class AppPasswordSessionService implements IAppPasswordSessionService {
  constructor(
    private readonly appPasswordSessionRepository: IAppPasswordSessionRepository,
    private readonly createAgent = createPdsAgent,
  ) {}
  async getSession(did: string): Promise<Result<AtpSessionData>> {
    const sessionResult =
      await this.appPasswordSessionRepository.getSession(did);
    if (sessionResult.isErr()) {
      return err(sessionResult.error);
    }
    const sessionWithAppPassword = sessionResult.value;
    if (!sessionWithAppPassword) {
      return err(new Error(`No session found for DID: ${did}`));
    }
    try {
      const { agent } = await this.createAgent(did);
      await agent.resumeSession(sessionWithAppPassword.session);
      const session = agent.session;
      if (!session || session.did !== did || !session.active) {
        throw new Error(
          'Restored session does not belong to an active target account',
        );
      }
      const saved = await this.appPasswordSessionRepository.saveSession(did, {
        session,
        appPassword: sessionWithAppPassword.appPassword,
      });
      if (saved.isErr()) return err(saved.error);
      return ok(session);
    } catch (error) {
      try {
        const { agent } = await this.createAgent(did);
        await agent.login({
          identifier: sessionWithAppPassword.session.did,
          password: sessionWithAppPassword.appPassword,
        });
        const updatedSession = agent.session;
        if (
          !updatedSession ||
          updatedSession.did !== did ||
          !updatedSession.active
        ) {
          return err(
            new Error(`Failed to login with app password for DID: ${did}`),
          );
        }
        const saveResult = await this.appPasswordSessionRepository.saveSession(
          did,
          {
            session: updatedSession,
            appPassword: sessionWithAppPassword.appPassword,
          },
        );
        if (saveResult.isErr()) {
          return err(
            new Error(
              `Failed to save session after login for DID: ${did}, error: ${saveResult.error.message}`,
            ),
          );
        }
        return ok(updatedSession);
      } catch (error) {
        return err(
          new Error(
            `Failed to login with app password for DID: ${did}, error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
        );
      }
    }
  }
  async createSession(
    identifier: string,
    appPassword: string,
  ): Promise<Result<AtpSessionData>> {
    try {
      const { did, agent } = await this.createAgent(identifier);
      await agent.login({
        identifier: did,
        password: appPassword,
      });
      const session = agent.session;
      if (!session || session.did !== did || !session.active) {
        return err(
          new Error(
            `Failed to create an active session for identifier: ${identifier}`,
          ),
        );
      }
      const saveResult = await this.appPasswordSessionRepository.saveSession(
        session.did,
        { session, appPassword },
      );
      if (saveResult.isErr()) {
        return err(
          new Error(
            `Failed to save session after login for identifier: ${identifier}, error: ${saveResult.error.message}`,
          ),
        );
      }
      return ok(session);
    } catch (error) {
      return err(
        new Error(
          `Failed to create session for identifier: ${identifier}, error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      );
    }
  }
}

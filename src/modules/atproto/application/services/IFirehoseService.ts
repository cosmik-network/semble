export interface IFirehoseService {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}

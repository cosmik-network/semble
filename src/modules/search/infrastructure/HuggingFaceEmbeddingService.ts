import { Result, ok, err } from '../../../shared/core/Result';
import { IEmbeddingService } from '../domain/services/IEmbeddingService';

export class HuggingFaceEmbeddingService implements IEmbeddingService {
  private readonly baseUrl =
    'https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction';
  private readonly apiToken: string | null;

  constructor(apiToken: string) {
    if (!apiToken || apiToken.trim().length === 0) {
      console.warn(
        'HuggingFaceEmbeddingService: No API token provided. Embedding fallback will be unavailable.',
      );
      this.apiToken = null;
    } else {
      this.apiToken = apiToken;
    }
  }

  async embed(text: string): Promise<Result<number[]>> {
    if (!this.apiToken) {
      return err(new Error('HuggingFace API token not configured'));
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        return err(
          new Error(
            `HuggingFace embedding failed with status ${response.status}: ${body || response.statusText}`,
          ),
        );
      }

      const data = (await response.json()) as number[];

      if (!Array.isArray(data) || data.length === 0) {
        return err(
          new Error('HuggingFace embedding failed: unexpected response shape'),
        );
      }

      return ok(data);
    } catch (error) {
      return err(
        new Error(
          `HuggingFace embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async healthCheck(): Promise<Result<boolean>> {
    const result = await this.embed('ok');
    if (result.isErr()) {
      return err(result.error);
    }
    return ok(true);
  }
}

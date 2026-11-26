import { SemanticSearchUrlsUseCase } from '../../application/useCases/queries/SemanticSearchUrlsUseCase';
import { SearchService } from '../../domain/services/SearchService';
import { InMemoryVectorDatabase } from '../../infrastructure/InMemoryVectorDatabase';
import { CardTypeEnum } from '../../../cards/domain/value-objects/CardType';
import { annotationPassageKey } from '../../../cards/domain/value-objects/selectors/normalizeQuotedText';
import { UserProfile } from '../../../cards/domain/services/IProfileService';
import { ok } from '../../../../shared/core/Result';

const PAGE_A = 'https://example.com/a';
const PASSAGE = 'the committee found no evidence of collusion whatsoever';
const AUTHOR_ID = 'did:plc:author';

const AUTHOR_PROFILE: UserProfile = {
  id: AUTHOR_ID,
  name: 'Annotation Author',
  handle: 'author.example.com',
};

function makeUseCase() {
  const vectorDatabase = InMemoryVectorDatabase.getInstance();
  vectorDatabase.clear();

  const searchService = new SearchService(
    vectorDatabase,
    {} as any, // metadataService — unused by semanticSearchCards
    {
      getUrlTypes: jest.fn(async () => new Map()),
      getAnnotationCardsByPassages: jest.fn(async () => {
        const view = {
          id: 'ann-1',
          type: CardTypeEnum.ANNOTATION,
          url: PAGE_A,
          libraryCount: 2,
          connectionCount: 0,
          selectors: [{ type: 'TextQuoteSelector', exact: PASSAGE }],
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-02T00:00:00Z'),
          authorId: AUTHOR_ID,
        };
        return new Map([
          [annotationPassageKey(PAGE_A, PASSAGE), [view]],
        ]) as any;
      }),
      getBatchUrlLibraryInfo: jest.fn(async () => new Map()),
      getUrlsSavedByUser: jest.fn(async () => new Set()),
    } as any,
  );

  const identityResolutionService = {
    resolveToDID: jest.fn(),
  } as any;

  const profileService = {
    getProfiles: jest.fn(async () =>
      ok(new Map([[AUTHOR_ID, AUTHOR_PROFILE]])),
    ),
  } as any;

  const useCase = new SemanticSearchUrlsUseCase(
    searchService,
    identityResolutionService,
    profileService,
  );

  return { useCase, vectorDatabase };
}

describe('SemanticSearchUrlsUseCase — annotation results', () => {
  it('maps blended results to the wire union with cardType and similarity', async () => {
    const { useCase, vectorDatabase } = makeUseCase();
    await vectorDatabase.indexAnnotation({
      url: PAGE_A,
      exactNormalized: PASSAGE,
      passage: `${PASSAGE}.`,
    });

    const result = await useCase.execute({
      query: 'committee evidence collusion',
    });

    expect(result.isOk()).toBe(true);
    const value = result.unwrap();
    expect(value.pagination.totalCount).toBe(1);
    expect(value.results).toHaveLength(1);

    const annotation = value.results[0]!;
    expect(annotation.cardType).toBe('ANNOTATION');
    if (annotation.cardType === 'ANNOTATION') {
      expect(annotation.id).toBe('ann-1');
      expect(annotation.url).toBe(PAGE_A);
      expect(annotation.similarity).toBeGreaterThan(0);
      expect(annotation.author.handle).toBe('author.example.com');
      expect(annotation.selectors[0]!.type).toBe('TextQuoteSelector');
      expect(annotation.createdAt).toBe('2026-01-01T00:00:00.000Z');
    }
  });

  it('passes cardType through to restrict the search', async () => {
    const { useCase, vectorDatabase } = makeUseCase();
    await vectorDatabase.indexAnnotation({
      url: PAGE_A,
      exactNormalized: PASSAGE,
      passage: `${PASSAGE}.`,
    });

    const result = await useCase.execute({
      query: 'committee evidence collusion',
      cardType: 'URL',
    });

    expect(result.isOk()).toBe(true);
    expect(result.unwrap().results).toHaveLength(0);
  });
});

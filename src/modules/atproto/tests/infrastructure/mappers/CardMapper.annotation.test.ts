import { Card } from '../../../../cards/domain/Card';
import {
  CardType,
  CardTypeEnum,
} from '../../../../cards/domain/value-objects/CardType';
import { CardContent } from '../../../../cards/domain/value-objects/CardContent';
import { CuratorId } from '../../../../cards/domain/value-objects/CuratorId';
import { URL } from '../../../../cards/domain/value-objects/URL';
import { Selector } from '../../../../cards/domain/value-objects/selectors/Selector';
import { CardMapper } from '../../../infrastructure/mappers/CardMapper';

describe('CardMapper.toMarginNoteRecordDTO', () => {
  const curatorId = CuratorId.create('did:plc:testcurator').unwrap();

  const makeAnnotationCard = (note?: string) =>
    Card.create({
      curatorId,
      type: CardType.create(CardTypeEnum.ANNOTATION).unwrap(),
      content: CardContent.createAnnotationContent(
        [
          Selector.createTextQuote({
            exact: 'Mathematics is a field of knowledge.',
            prefix: 'as we have argued, ',
            suffix: ' appears in three places',
          }).unwrap(),
        ],
        note,
      ).unwrap(),
      url: URL.create('https://en.wikipedia.org/wiki/Mathematics').unwrap(),
      createdAt: new Date('2026-11-04T21:18:42Z'),
      updatedAt: new Date('2026-11-04T21:18:42Z'),
    }).unwrap();

  it('builds a commenting record when the annotation has a note', () => {
    const record = CardMapper.toMarginNoteRecordDTO(
      makeAnnotationCard('math is cool'),
    );

    // The $type is the environment-configured annotation collection
    // (at.margin.note in prod, network.cosmik.<env>.annotation elsewhere)
    expect(record.$type).toBe(CardMapper.annotationCollection);
    expect(record.motivation).toBe('commenting');
    expect(record.createdAt).toBe('2026-11-04T21:18:42.000Z');
    expect(record.body).toEqual({
      value: 'math is cool',
      format: 'text/plain',
    });
    expect(record.target.source).toBe(
      'https://en.wikipedia.org/wiki/Mathematics',
    );
    expect(record.target.selector).toEqual({
      type: 'TextQuoteSelector',
      exact: 'Mathematics is a field of knowledge.',
      prefix: 'as we have argued, ',
      suffix: ' appears in three places',
    });
  });

  it('builds a highlighting record without a body when there is no note', () => {
    const record = CardMapper.toMarginNoteRecordDTO(makeAnnotationCard());

    expect(record.motivation).toBe('highlighting');
    expect(record.body).toBeUndefined();
  });

  it('computes sourceHash as sha256 hex of the source url', () => {
    const record = CardMapper.toMarginNoteRecordDTO(makeAnnotationCard());

    // Our own stable hash of the url for indexing. Margin's normalization
    // scheme is undocumented and we do not replicate it — this value is
    // sha256('https://en.wikipedia.org/wiki/Mathematics'), intentionally
    // different from the one in margin's own records.
    expect(record.target.sourceHash).toBe(
      '6d90af33d816d1b2c2a2e9d277e72862ff076c265da2756ece7d15a517070f5f',
    );
  });

  it('rejects non-annotation cards', () => {
    const noteCard = Card.create({
      curatorId,
      type: CardType.create(CardTypeEnum.NOTE).unwrap(),
      content: CardContent.createNoteContent('a note').unwrap(),
    }).unwrap();

    expect(() => CardMapper.toMarginNoteRecordDTO(noteCard)).toThrow(
      'requires an annotation card',
    );
  });
});

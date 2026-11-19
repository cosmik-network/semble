import { TextQuoteSelector } from '../../../../domain/value-objects/selectors/TextQuoteSelector';
import { Selector } from '../../../../domain/value-objects/selectors/Selector';
import { normalizeQuotedText } from '../../../../domain/value-objects/selectors/normalizeQuotedText';

describe('normalizeQuotedText', () => {
  it('collapses whitespace runs to a single space', () => {
    expect(normalizeQuotedText('a  b')).toBe('a b');
    expect(normalizeQuotedText('a\tb')).toBe('a b');
  });

  it('collapses newlines from block-spanning selections', () => {
    expect(normalizeQuotedText('end of paragraph.\n\nStart of next')).toBe(
      'end of paragraph. Start of next',
    );
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeQuotedText('  quoted passage  ')).toBe('quoted passage');
  });

  it('makes whitespace variants of the same passage equal', () => {
    expect(normalizeQuotedText('same  passage')).toBe(
      normalizeQuotedText('same\npassage'),
    );
  });
});

describe('TextQuoteSelector', () => {
  it('creates with exact, prefix and suffix', () => {
    const result = TextQuoteSelector.create({
      exact: 'the quoted passage',
      prefix: 'as we have argued, ',
      suffix: ' appears three times',
    });

    expect(result.isOk()).toBe(true);
    const selector = result.unwrap();
    expect(selector.exact).toBe('the quoted passage');
    expect(selector.prefix).toBe('as we have argued, ');
    expect(selector.suffix).toBe(' appears three times');
  });

  it('preserves interior whitespace in exact — it is part of the anchor', () => {
    const result = TextQuoteSelector.create({
      exact: 'spanning\n\ntwo blocks',
    });

    expect(result.isOk()).toBe(true);
    expect(result.unwrap().exact).toBe('spanning\n\ntwo blocks');
  });

  it('rejects exact that is empty once normalized', () => {
    const result = TextQuoteSelector.create({ exact: '   \n\t  ' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe(
        'TextQuoteSelector must have exact text',
      );
    }
  });

  it('rejects exact exceeding the max length', () => {
    const result = TextQuoteSelector.create({ exact: 'a'.repeat(10001) });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('cannot exceed 10000');
    }
  });

  it('rejects empty prefix — omit it instead', () => {
    const result = TextQuoteSelector.create({
      exact: 'passage',
      prefix: '',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('prefix cannot be empty');
    }
  });

  it('rejects suffix exceeding the max context length', () => {
    const result = TextQuoteSelector.create({
      exact: 'passage',
      suffix: 'b'.repeat(257),
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('suffix cannot exceed 256');
    }
  });

  it('exposes normalizedExact as the same-passage comparison key', () => {
    const withBreak = TextQuoteSelector.create({
      exact: 'the passage\n\ncontinues',
    }).unwrap();
    const withSpaces = TextQuoteSelector.create({
      exact: 'the passage  continues',
    }).unwrap();

    expect(withBreak.normalizedExact).toBe(withSpaces.normalizedExact);
    expect(withBreak.exact).not.toBe(withSpaces.exact);
  });
});

describe('Selector', () => {
  it('wraps a text quote selector with type-safe access', () => {
    const result = Selector.createTextQuote({
      exact: 'passage',
      prefix: 'before ',
    });

    expect(result.isOk()).toBe(true);
    const selector = result.unwrap();
    expect(selector.type).toBe('TextQuoteSelector');
    expect(selector.textQuoteSelector?.exact).toBe('passage');
    expect(selector.textQuoteSelector?.prefix).toBe('before ');
  });

  it('propagates validation errors from the wrapped selector', () => {
    const result = Selector.createTextQuote({ exact: '' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe(
        'TextQuoteSelector must have exact text',
      );
    }
  });
});

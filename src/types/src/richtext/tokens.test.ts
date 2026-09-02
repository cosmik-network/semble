import {
  extractTags,
  extractMentions,
  normalizeTag,
  findActiveToken,
} from './tokens';

describe('extractTags', () => {
  it('extracts a simple tag', () => {
    expect(extractTags('love this #knowledge resource')).toEqual(['knowledge']);
  });

  it('lowercases and dedupes tags', () => {
    expect(extractTags('#Foo bar #foo #FOO')).toEqual(['foo']);
  });

  it('allows digits, underscore and hyphen in tags', () => {
    expect(extractTags('#web-3 #a_b #tag2')).toEqual(['web-3', 'a_b', 'tag2']);
  });

  it('matches a tag at the start of the text', () => {
    expect(extractTags('#first thing')).toEqual(['first']);
  });

  it('matches tags adjacent to punctuation', () => {
    expect(extractTags('great read (#history), see also,#maps.')).toEqual([
      'history',
      'maps',
    ]);
  });

  it('does not match a hash embedded in a word', () => {
    expect(extractTags('foo#bar and c#')).toEqual([]);
  });

  it('does not match a bare hash', () => {
    expect(extractTags('just a # sign')).toEqual([]);
  });

  it('stops the tag at invalid characters', () => {
    expect(extractTags('#foo#bar')).toEqual(['foo']);
  });

  it('returns empty for empty text', () => {
    expect(extractTags('')).toEqual([]);
  });
});

describe('extractMentions', () => {
  it('extracts a handle mention', () => {
    expect(extractMentions('thanks @alice.bsky.social for this')).toEqual([
      'alice.bsky.social',
    ]);
  });

  it('requires at least one dot in the handle', () => {
    expect(extractMentions('hey @alice what do you think')).toEqual([]);
  });

  it('does not treat emails as mentions', () => {
    expect(extractMentions('mail me at wes@cosmik.network today')).toEqual([]);
  });

  it('lowercases and dedupes mentions', () => {
    expect(
      extractMentions('@Alice.Bsky.Social and @alice.bsky.social'),
    ).toEqual(['alice.bsky.social']);
  });

  it('matches a mention at the start of the text', () => {
    expect(extractMentions('@bob.example.com hi')).toEqual(['bob.example.com']);
  });

  it('does not include a trailing dot', () => {
    expect(extractMentions('cc @carol.dev.br.')).toEqual(['carol.dev.br']);
  });

  it('extracts multiple mentions', () => {
    expect(extractMentions('@a.co and @b.io')).toEqual(['a.co', 'b.io']);
  });
});

describe('normalizeTag', () => {
  it('lowercases and strips a leading hash', () => {
    expect(normalizeTag('#FooBar')).toBe('foobar');
    expect(normalizeTag('FooBar')).toBe('foobar');
  });
});

describe('findActiveToken', () => {
  it('detects an in-progress tag token at the caret', () => {
    const text = 'note about #kno';
    expect(findActiveToken(text, text.length)).toEqual({
      type: 'tag',
      query: 'kno',
      start: 11,
    });
  });

  it('detects a just-typed trigger with empty query', () => {
    const text = 'note #';
    expect(findActiveToken(text, text.length)).toEqual({
      type: 'tag',
      query: '',
      start: 5,
    });
  });

  it('detects an in-progress mention token', () => {
    const text = 'thanks @ali';
    expect(findActiveToken(text, text.length)).toEqual({
      type: 'mention',
      query: 'ali',
      start: 7,
    });
  });

  it('allows dots inside an in-progress mention query', () => {
    const text = 'cc @alice.bs';
    expect(findActiveToken(text, text.length)).toEqual({
      type: 'mention',
      query: 'alice.bs',
      start: 3,
    });
  });

  it('returns null when the caret is not inside a token', () => {
    const text = 'plain note';
    expect(findActiveToken(text, text.length)).toBeNull();
  });

  it('returns null when whitespace ends the token before the caret', () => {
    const text = '#done now';
    expect(findActiveToken(text, text.length)).toBeNull();
  });

  it('returns null for a trigger embedded in a word', () => {
    const text = 'foo#ba';
    expect(findActiveToken(text, text.length)).toBeNull();
  });

  it('detects a token mid-text when the caret sits inside it', () => {
    const text = 'see #his later';
    expect(findActiveToken(text, 8)).toEqual({
      type: 'tag',
      query: 'his',
      start: 4,
    });
  });
});

import { CardType, CardTypeEnum } from '../../../domain/value-objects/CardType';

describe('CardType', () => {
  it('should create URL card type', () => {
    const result = CardType.create(CardTypeEnum.URL);

    expect(result.isOk()).toBe(true);
    const cardType = result.unwrap();
    expect(cardType.value).toBe(CardTypeEnum.URL);
  });

  it('should create NOTE card type', () => {
    const result = CardType.create(CardTypeEnum.NOTE);

    expect(result.isOk()).toBe(true);
    const cardType = result.unwrap();
    expect(cardType.value).toBe(CardTypeEnum.NOTE);
  });

  it('should create ANNOTATION card type', () => {
    const result = CardType.create(CardTypeEnum.ANNOTATION);

    expect(result.isOk()).toBe(true);
    const cardType = result.unwrap();
    expect(cardType.value).toBe(CardTypeEnum.ANNOTATION);
  });

  it('should be equal when same type', () => {
    const type1 = CardType.create(CardTypeEnum.URL).unwrap();
    const type2 = CardType.create(CardTypeEnum.URL).unwrap();

    expect(type1.equals(type2)).toBe(true);
  });

  it('should not be equal when different types', () => {
    const urlType = CardType.create(CardTypeEnum.URL).unwrap();
    const noteType = CardType.create(CardTypeEnum.NOTE).unwrap();

    expect(urlType.equals(noteType)).toBe(false);
  });
});

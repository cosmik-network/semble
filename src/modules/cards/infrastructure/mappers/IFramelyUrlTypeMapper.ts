import { UrlType } from '../../domain/value-objects/UrlType';

export enum IFramelyUrlTypes {
  VIDEO = 'video',
  AUDIO = 'audio',
  PLAYLIST = 'playlist',
  SLIDESHOW = 'slideshow',
  GIFV = 'gifv',
  THREE_D = '3d',
  IMAGE = 'image',
  FILE = 'file',
  ARTICLE = 'article',
  READER = 'reader',
  EVENT = 'event',
  PRODUCT = 'product',
  SURVEY = 'survey',
  FORM = 'form',
  LINK = 'link',
}

export const IFramelyToUrlTypeMapper: Record<IFramelyUrlTypes, UrlType> = {
  [IFramelyUrlTypes.VIDEO]: UrlType.VIDEO,
  [IFramelyUrlTypes.AUDIO]: UrlType.AUDIO,
  [IFramelyUrlTypes.PLAYLIST]: UrlType.LINK,
  [IFramelyUrlTypes.SLIDESHOW]: UrlType.LINK,
  [IFramelyUrlTypes.GIFV]: UrlType.LINK,
  [IFramelyUrlTypes.THREE_D]: UrlType.LINK,
  [IFramelyUrlTypes.IMAGE]: UrlType.LINK,
  [IFramelyUrlTypes.FILE]: UrlType.LINK,
  [IFramelyUrlTypes.ARTICLE]: UrlType.ARTICLE,
  [IFramelyUrlTypes.READER]: UrlType.ARTICLE,
  [IFramelyUrlTypes.EVENT]: UrlType.EVENT,
  [IFramelyUrlTypes.PRODUCT]: UrlType.LINK,
  [IFramelyUrlTypes.SURVEY]: UrlType.LINK,
  [IFramelyUrlTypes.FORM]: UrlType.LINK,
  [IFramelyUrlTypes.LINK]: UrlType.LINK,
};

export function mapIFramelyUrlType(iframelyType?: string): UrlType {
  if (!iframelyType) {
    return UrlType.LINK;
  }

  const normalizedType = iframelyType.toLowerCase() as IFramelyUrlTypes;
  return IFramelyToUrlTypeMapper[normalizedType] || UrlType.LINK;
}

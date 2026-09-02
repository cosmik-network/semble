import { ReactNode } from 'react';
import { UrlType } from '@semble/types';
import { IconBaseProps, IconType } from 'react-icons/lib';
import { GrArticle } from 'react-icons/gr';
import { IoMdLink, IoMdBook } from 'react-icons/io';
import { AiOutlineFileSearch } from 'react-icons/ai';
import { PiFileAudio, PiFileVideo } from 'react-icons/pi';
import { MdOutlinePeopleAlt, MdOutlineEvent } from 'react-icons/md';
import { RiInstallLine } from 'react-icons/ri';

export const getUrlTypeIcon = (urlType?: UrlType): IconType => {
  if (!urlType) return IoMdLink;

  switch (urlType) {
    case UrlType.ARTICLE:
      return GrArticle;
    case UrlType.BOOK:
      return IoMdBook;
    case UrlType.RESEARCH:
      return AiOutlineFileSearch;
    case UrlType.AUDIO:
      return PiFileAudio;
    case UrlType.VIDEO:
      return PiFileVideo;
    case UrlType.SOCIAL:
      return MdOutlinePeopleAlt;
    case UrlType.SOFTWARE:
      return RiInstallLine;
    case UrlType.EVENT:
      return MdOutlineEvent;
    default:
      return IoMdLink;
  }
};

// Element-returning variant for use directly in JSX; the icons are stable
// module-level components, which the static-components lint rule can't see
// through a component-scope variable.
export const renderUrlTypeIcon = (
  urlType?: UrlType,
  props?: IconBaseProps,
): ReactNode => {
  const Icon = getUrlTypeIcon(urlType);
  return <Icon {...props} />;
};

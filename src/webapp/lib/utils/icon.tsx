import { UrlType } from '@semble/types';
import { IconType } from 'react-icons/lib';
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

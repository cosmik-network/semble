export const getDomain = (url: string) => {
  return new URL(url).hostname;
};

export const getUrlFromSlug = (slug: string[]) => {
  const decoded = slug.map(decodeURIComponent);
  const url = decoded.join('/');

  // only normalize if the scheme has a single slash after it (i.e. malformed)
  const normalizedUrl = /^([a-zA-Z]+:)\/[^/]/.test(url)
    ? url.replace(/^([a-zA-Z]+:)\//, '$1//')
    : url;

  return normalizedUrl;
};

export const isCollectionPage = (url: string = window.location.pathname) => {
  try {
    const { pathname } = new URL(url);
    // expect /profile/:handle/collections/:id
    const pattern = /^\/profile\/[^/]+\/collections\/[^/]+\/?$/;
    return pattern.test(pathname);
  } catch {
    // invalid URL
    return false;
  }
};

export const isProfilePage = (url: string = window.location.pathname) => {
  try {
    const { pathname } = new URL(url, window.location.origin);
    // matches:
    // /profile/:handle
    // /profile/:handle/:subroute
    const pattern = /^\/profile\/[^/]+(?:\/[^/]+)?\/?$/;
    return pattern.test(pathname);
  } catch {
    // invalid URL
    return false;
  }
};

export enum SupportedPlatform {
  BLUESKY_POST = 'bluesky post',
  BLACKSKY_POST = 'blacksky post',
  SEMBLE_COLLECTION = 'semble collection',
  SPOTIFY = 'spotify',
  PLYRFM_TRACK = 'plyr.fm',
  YOUTUBE_VIDEO = 'youtube video',
  DEFAULT = 'default',
}

type PlatformData = { type: SupportedPlatform; url: string };

export const detectUrlPlatform = (url: string): PlatformData => {
  if (isCollectionPage(url)) {
    return { type: SupportedPlatform.SEMBLE_COLLECTION, url };
  }

  try {
    const parsedUrl = new URL(url);

    // bluesky posts
    // https://bsky.app/profile/handle/post/id
    if (
      parsedUrl.hostname === 'bsky.app' &&
      parsedUrl.pathname.includes('/post/')
    ) {
      return { type: SupportedPlatform.BLUESKY_POST, url };
    }

    // blacksky posts
    // https://blacksky.community/profile/handle/post/id
    if (
      parsedUrl.hostname === 'blacksky.community' &&
      parsedUrl.pathname.includes('/post/')
    ) {
      return { type: SupportedPlatform.BLACKSKY_POST, url };
    }

    // youtube
    if (parsedUrl.hostname === 'youtu.be') {
      const videoId = parsedUrl.pathname.split('/')[1];
      const t = parsedUrl.searchParams.get('t') ?? '0';
      const seek = encodeURIComponent(t.replace(/s$/, ''));

      if (videoId) {
        return {
          type: SupportedPlatform.YOUTUBE_VIDEO,
          url: `https://www.youtube.com/embed/${videoId}?start=${seek}`,
        };
      }
    }

    // youtube
    if (
      parsedUrl.hostname === 'www.youtube.com' ||
      parsedUrl.hostname === 'youtube.com' ||
      parsedUrl.hostname === 'm.youtube.com' ||
      parsedUrl.hostname === 'music.youtube.com'
    ) {
      const [__, page, shortOrLiveVideoId] = parsedUrl.pathname.split('/');

      const isShorts = page === 'shorts';
      const isLive = page === 'live';
      const videoId =
        isShorts || isLive
          ? shortOrLiveVideoId
          : (parsedUrl.searchParams.get('v') as string);
      const t = parsedUrl.searchParams.get('t') ?? '0';
      const seek = encodeURIComponent(t.replace(/s$/, ''));

      return {
        type: SupportedPlatform.YOUTUBE_VIDEO,
        url: `https://www.youtube.com/embed/${videoId}?start=${seek}`,
      };
    }

    // spotify
    if (parsedUrl.hostname === 'open.spotify.com') {
      const [__, typeOrLocale, idOrType, id] = parsedUrl.pathname.split('/');

      if (typeOrLocale === 'album' || idOrType === 'album') {
        return {
          type: SupportedPlatform.SPOTIFY,
          url: `https://open.spotify.com/embed/album/${id ?? idOrType}`,
        };
      }
      if (typeOrLocale === 'track' || idOrType === 'track') {
        return {
          type: SupportedPlatform.SPOTIFY,
          url: `https://open.spotify.com/embed/track/${id ?? idOrType}`,
        };
      }
      if (typeOrLocale === 'episode' || idOrType === 'episode') {
        return {
          type: SupportedPlatform.SPOTIFY,
          url: `https://open.spotify.com/embed/episode/${id ?? idOrType}`,
        };
      }
      if (typeOrLocale === 'show' || idOrType === 'show') {
        return {
          type: SupportedPlatform.SPOTIFY,
          url: `https://open.spotify.com/embed/show/${id ?? idOrType}`,
        };
      }
    }

    // plyr.fm
    if (
      parsedUrl.hostname === 'plyr.fm' ||
      parsedUrl.hostname === 'www.plyr.fm'
    ) {
      const [__, type, id] = parsedUrl.pathname.split('/');

      if (type === 'track' && id) {
        return {
          type: SupportedPlatform.PLYRFM_TRACK,
          url: `https://plyr.fm/embed/track/${id}`,
        };
      }
    }

    return { type: SupportedPlatform.DEFAULT, url }; // no supported service detected
  } catch (e) {
    // invalid url
    return { type: SupportedPlatform.DEFAULT, url };
  }
};

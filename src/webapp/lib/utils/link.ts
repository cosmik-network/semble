export const getDomain = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
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

const getAppOrigin = () => {
  // Use the configured app URL if available, otherwise fall back to current origin
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      return new URL(appUrl).origin;
    } catch {
      // invalid app URL, fall back to current origin
    }
  }
  return window.location.origin;
};

const isSembleUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url, window.location.origin);
    return parsedUrl.origin === getAppOrigin();
  } catch {
    return false;
  }
};

export const isCollectionPage = (url: string) => {
  try {
    const parsedUrl = new URL(url, window.location.origin);
    // Must be a relative path or our own domain
    if (!isSembleUrl(parsedUrl.href)) return false;
    // expect /profile/:handle/collections/:id
    const pattern = /^\/profile\/[^/]+\/collections\/[^/]+\/?$/;
    return pattern.test(parsedUrl.pathname);
  } catch {
    // invalid URL
    return false;
  }
};

export const isProfilePage = (url: string) => {
  try {
    const parsedUrl = new URL(url, window.location.origin);
    // Must be a relative path or our own domain
    if (!isSembleUrl(parsedUrl.href)) return false;
    // matches /profile/:handle and any subroutes (e.g. /profile/:handle/likes)
    const pattern = /^\/profile\/[^/]+/;
    return pattern.test(parsedUrl.pathname);
  } catch {
    // invalid URL
    return false;
  }
};

export enum SupportedPlatform {
  BLUESKY_POST = 'bluesky post',
  BLACKSKY_POST = 'blacksky post',
  SEMBLE_COLLECTION = 'semble collection',
  SEMBLE_PROFILE = 'semble profile',
  SPOTIFY = 'spotify',
  PLYRFM_TRACK = 'plyr.fm',
  YOUTUBE_VIDEO = 'youtube video',
  BANDCAMP_ALBUM = 'bandcamp album',
  BANDCAMP_TRACK = 'bandcamp track',
  SOUNDCLOUD_TRACK = 'soundcloud track',
  SOUNDCLOUD_SET = 'soundcloud set',
  DEFAULT = 'default',
}

type PlatformData =
  | {
      type: SupportedPlatform.SEMBLE_COLLECTION;
      url: string;
      handle: string;
      rkey: string;
    }
  | {
      type: SupportedPlatform.SEMBLE_PROFILE;
      url: string;
      handle: string;
    }
  | {
      type: Exclude<
        SupportedPlatform,
        SupportedPlatform.SEMBLE_COLLECTION | SupportedPlatform.SEMBLE_PROFILE
      >;
      url: string;
    };

export const detectUrlPlatform = (url: string): PlatformData => {
  if (isCollectionPage(url)) {
    try {
      const parsedUrl = new URL(url, window.location.origin);
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      // expected format: profile/:handle/collections/:rkey
      const handle = pathParts[1];
      const rkey = pathParts[3];
      return { type: SupportedPlatform.SEMBLE_COLLECTION, url, handle, rkey };
    } catch {
      return {
        type: SupportedPlatform.SEMBLE_COLLECTION,
        url,
        handle: '',
        rkey: '',
      };
    }
  }

  if (isProfilePage(url)) {
    try {
      const parsedUrl = new URL(url, window.location.origin);
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      // expected format: profile/:handle or profile/:handle/:subroute
      const handle = pathParts[1];
      return { type: SupportedPlatform.SEMBLE_PROFILE, url, handle };
    } catch {
      return { type: SupportedPlatform.DEFAULT, url };
    }
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

    // bandcamp
    const bandcampRegex = /^[a-z\d][a-z\d-]{2,}[a-z\d]\.bandcamp\.com$/i;
    if (bandcampRegex.test(parsedUrl.hostname)) {
      const pathComponents = parsedUrl.pathname.split('/');
      switch (pathComponents[1]) {
        case 'album':
          return {
            type: SupportedPlatform.BANDCAMP_ALBUM,
            url: `https://bandcamp.com/EmbeddedPlayer/url=${encodeURIComponent(
              parsedUrl.href,
            )}/size=medium/minimal=true/transparent=true/`,
          };
        case 'track':
          return {
            type: SupportedPlatform.BANDCAMP_TRACK,
            url: `https://bandcamp.com/EmbeddedPlayer/url=${encodeURIComponent(
              parsedUrl.href,
            )}/size=medium/minimal=true/transparent=true/`,
          };
      }
    }

    // soundcloud
    if (
      parsedUrl.hostname === 'soundcloud.com' ||
      parsedUrl.hostname === 'www.soundcloud.com'
    ) {
      const [, user, trackOrSets, set] = parsedUrl.pathname.split('/');

      if (user && trackOrSets) {
        if (trackOrSets === 'sets' && set) {
          return {
            type: SupportedPlatform.SOUNDCLOUD_SET,
            url: `https://w.soundcloud.com/player/?url=${url}&auto_play=false&visual=false&hide_related=true`,
          };
        }

        return {
          type: SupportedPlatform.SOUNDCLOUD_TRACK,
          url: `https://w.soundcloud.com/player/?url=${url}&auto_play=false&visual=false&hide_related=true`,
        };
      }
    }

    return { type: SupportedPlatform.DEFAULT, url }; // no supported service detected
  } catch (e) {
    // invalid url
    return { type: SupportedPlatform.DEFAULT, url };
  }
};

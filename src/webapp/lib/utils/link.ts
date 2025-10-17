export const getDomain = (url: string) => {
  return new URL(url).hostname;
};

export const getUrlFromSlug = (slug: string[]) => {
  const decoded = slug.map(decodeURIComponent);
  const url = decoded.join('/');
  const normalizedUrl = url.replace(/^([a-zA-Z]+:)\//, '$1//');

  return normalizedUrl;
};

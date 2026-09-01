export const readerKeys = {
  all: () => ['reader'] as const,
  content: (url: string) => [...readerKeys.all(), url] as const,
};

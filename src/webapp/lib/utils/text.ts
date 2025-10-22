export const truncateText = (text: string, maxLength: number = 100) => {
  if (typeof maxLength !== 'number' || text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength) + '...';
};

export const sanitizeText = (text: string): string => {
  if (typeof text !== 'string') {
    return '';
  }

  // remove known bidirectional control characters
  return text.replace(/[\u202E\u202D\u202B\u200F\u200E\u202C\u200C]/g, '');
};

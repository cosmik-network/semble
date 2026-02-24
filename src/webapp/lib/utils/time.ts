const intervals = [
  { label: 'y', seconds: 31536000 },
  { label: 'mo', seconds: 2592000 },
  { label: 'd', seconds: 86400 },
  { label: 'h', seconds: 3600 },
  { label: 'm', seconds: 60 },
  { label: 's', seconds: 1 },
];

export const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const interval = intervals.find((i) => i.seconds < seconds);

  if (!interval) return 'now';
  const count = Math.floor(seconds / interval.seconds);
  if (count < 1) return 'now';

  return `${count}${interval.label} ago`;
};

export const getFormattedDate = (date: string) => {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  };

  const formattedDate: string = new Date(date).toLocaleString('en-US', options);

  // replace second comma with "at"
  // e.g. Sep 20, 2025, 7:50 PM  -> Sep 20, 2025 at 7:50 PM
  const formattedWithAt: string = formattedDate.replace(/, (.*),/, ', $1 at ');

  return formattedWithAt;
};

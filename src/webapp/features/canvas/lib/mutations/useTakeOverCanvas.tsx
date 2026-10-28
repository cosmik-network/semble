import { useMutation } from '@tanstack/react-query';

export default function useTakeOverCanvas(takeOver: () => Promise<void>) {
  const mutation = useMutation({
    mutationFn: () => {
      return takeOver();
    },
  });

  return mutation;
}

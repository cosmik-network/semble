import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCollection } from '../dal';

export default function useCreateCollection() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newCollection: { name: string; description: string }) => {
      return createCollection(newCollection);
    },

    // Do things that are absolutely necessary and logic related (like query invalidation) in the useMutation callbacks
    // Do UI related things like redirects or showing toast notifications in mutate callbacks. If the user navigated away from the current screen before the mutation finished, those will purposefully not fire
    // https://tkdodo.eu/blog/mastering-mutations-in-react-query#some-callbacks-might-not-fire
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  return mutation;
}

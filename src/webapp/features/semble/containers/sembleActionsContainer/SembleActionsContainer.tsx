import { verifySessionOnServer } from '@/lib/auth/dal.server';
import GuestSembleActions from '../../components/sembleActions/GuestSembleActions';
import SembleActions from '../../components/sembleActions/SembleActions';

interface Props {
  url: string;
  viaCardId?: string;
}

export default async function SembleActionsContainer(props: Props) {
  const session = await verifySessionOnServer();

  if (!session) {
    return <GuestSembleActions />;
  }

  return <SembleActions url={props.url} viaCardId={props.viaCardId} />;
}

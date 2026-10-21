import AddToCollectionOverlay from '../addToCollectionOverlay/AddToCollectionOverlay';
import ConnectOverlay from '../connectOverlay/ConnectOverlay';
import ArrowActionBar from '../arrowActionBar/ArrowActionBar';
import CardActionBar from '../cardActionBar/CardActionBar';
import CardHoverPreview from '../cardHoverPreview/CardHoverPreview';
import CollectionNamePrompt from '../collectionNamePrompt/CollectionNamePrompt';
import ConfirmDeleteConnectionModal from '../confirmDeleteConnection/ConfirmDeleteConnectionModal';
import ConnectionTypePicker from '../connectionTypePicker/ConnectionTypePicker';
import ConnectorHandles from '../connectorHandles/ConnectorHandles';
import FindOnCanvas from '../findOnCanvas/FindOnCanvas';
import QuickAdd from '../quickAdd/QuickAdd';
import SimilarStrip from '../similarStrip/SimilarStrip';
import TrailPlayer from '../trailPlayer/TrailPlayer';

export default function CanvasOverlays() {
  return (
    <>
      <ConnectorHandles />
      <CardHoverPreview />
      <ConnectionTypePicker />
      <ArrowActionBar />
      <CardActionBar />
      <SimilarStrip />
      <CollectionNamePrompt />
      <QuickAdd />
      <ConfirmDeleteConnectionModal />
      <AddToCollectionOverlay />
      <ConnectOverlay />
      <FindOnCanvas />
      <TrailPlayer />
    </>
  );
}

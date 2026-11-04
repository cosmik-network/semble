import type {
  BoardEvents,
  BoardOptions,
  BoardRole,
  BoardSession,
  BoardStatus,
  CanvasRecord,
  CanvasSchema,
  CanvasSource,
  OpenedCanvas,
} from './canvasStorage';

// This tab's hold on a board's one-writer lock
export interface CanvasClaim {
  id: string;
  // False once released, or once another tab takes the board over
  isHeld(): boolean;
  // Resolves once other tabs can claim the board
  release(): Promise<void>;
}

export interface ClaimOptions {
  // if-free gives up at once when another tab writes the board; when-free
  // waits until that tab lets go, or until the signal aborts; take-over
  // always succeeds, and calls the former writer's onLost
  mode?: 'if-free' | 'when-free' | 'take-over';
  signal?: AbortSignal;
}

export interface CanvasSaver {
  documentChanged(): void;
  stop(): Promise<void>;
}

// What a board session needs from the storage that opens it
export interface BoardStorage {
  openCanvas(id: string, runningSchema: CanvasSchema): Promise<OpenedCanvas>;
  createCanvas(ownerDid: string, id: string): Promise<CanvasRecord>;
  // Null when another tab writes the board and the mode is if-free
  claimCanvas(
    id: string,
    onLost: () => void,
    options?: ClaimOptions,
  ): Promise<CanvasClaim | null>;
  // Calls the listener after each save another tab makes to the board
  watchSaves(id: string, listener: () => void): () => void;
  // Writes nothing once the claim is no longer held
  startSaving(
    claim: CanvasClaim,
    source: CanvasSource,
    onError: (error: unknown) => void,
  ): CanvasSaver;
}

export function openBoardSession(
  storage: BoardStorage,
  id: string,
  options: BoardOptions,
  events: BoardEvents,
): BoardSession {
  const { runningSchema, source } = options;
  let closed = false;
  let role: BoardRole | null = null;
  // Set while this tab writes the board
  let claim: CanvasClaim | null = null;
  let saver: CanvasSaver | null = null;
  // Set while this tab reads the board
  let unwatch: (() => void) | null = null;
  let waitingForClaim: {
    cancel: AbortController;
    settled: Promise<void>;
  } | null = null;
  let promoting: Promise<void> | null = null;
  let takingOver: Promise<void> | null = null;
  // Saves heard before the board has loaded are picked up once it has
  let loading = true;
  let savedWhileLoading = false;
  let reloading: Promise<void> | null = null;
  let reloadAgain = false;
  // Reads are numbered so a slow one can't replace a newer one
  let reads = 0;
  let lastApplied = 0;

  function setRole(next: BoardRole) {
    if (role === next) return;
    role = next;
    events.onRoleChange(next);
  }

  // The board's own reaction to a document it was just given reaches
  // documentChanged now, while it isn't saving, rather than as an edit later
  function show(event: () => void) {
    event();
    source.reportPendingChanges();
  }

  function startWriting(next: CanvasClaim) {
    claim = next;
    saver = storage.startSaving(claim, source, events.onSaveError);
    setRole('writer');
  }

  function stopWriting() {
    const stopped = saver?.stop();
    saver = null;
    return stopped;
  }

  function startReading() {
    if (closed) return;
    setRole('reader');
    watchSaves();
    waitForClaim();
  }

  function stopReading() {
    unwatch?.();
    unwatch = null;
    waitingForClaim?.cancel.abort();
    waitingForClaim = null;
  }

  function watchSaves() {
    if (closed) return;
    unwatch ??= storage.watchSaves(id, () => {
      if (loading) savedWhileLoading = true;
      else void reload();
    });
  }

  // Writes once the writer's tab closes
  function waitForClaim() {
    if (closed || waitingForClaim) return;
    const cancel = new AbortController();
    const claimed = storage.claimCanvas(id, onClaimLost, {
      mode: 'when-free',
      signal: cancel.signal,
    });
    const wait = {
      cancel,
      settled: claimed.then(
        () => {},
        () => {},
      ),
    };
    waitingForClaim = wait;
    claimed
      .then(
        (next) => next && promote(next),
        (error) => {
          if (!cancel.signal.aborted) throw error;
        },
      )
      .catch((error) => {
        console.warn(error);
        // Take over is left to recover it: waiting again could spin on the
        // same error
        if (waitingForClaim === wait) waitingForClaim = null;
      });
  }

  // Keeps this tab's camera and selection. Leaves the board alone once this
  // tab writes it.
  async function readLatest() {
    const read = ++reads;
    const opened = await storage.openCanvas(id, runningSchema);
    if (opened.status === 'newer-version') return opened.status;
    if (closed || claim || read < lastApplied) return 'ready';
    if (opened.status === 'ready' && opened.document) {
      lastApplied = read;
      const document = opened.document;
      show(() => events.onRemoteSave(document));
    }
    return 'ready';
  }

  // One reload at a time, plus one more for saves heard while it ran
  function reload() {
    if (reloading) {
      reloadAgain = true;
      return reloading;
    }
    reloading = (async () => {
      do {
        reloadAgain = false;
        // Showing it would take migrating down, which tldraw can't do
        if ((await readLatest()) === 'newer-version' && !claim) {
          return showNewerVersion();
        }
      } while (reloadAgain && !closed);
    })()
      .catch(console.warn)
      .finally(() => {
        reloading = null;
      });
    return reloading;
  }

  function showNewerVersion() {
    stopReading();
    setRole('newer-version');
  }

  // Turns a claim this tab now holds into writing, from the latest save
  function promote(next: CanvasClaim) {
    promoting ??= (async () => {
      let latest;
      try {
        latest = await readLatest();
      } catch (error) {
        await next.release();
        throw error;
      }
      if (closed) return next.release();
      if (latest === 'newer-version') {
        await next.release();
        return showNewerVersion();
      }
      // A third tab took it over meanwhile
      if (!next.isHeld()) {
        waitingForClaim = null;
        return waitForClaim();
      }
      stopReading();
      startWriting(next);
    })().finally(() => {
      promoting = null;
    });
    return promoting;
  }

  function onClaimLost() {
    // While loading, load() sees the lost claim and reads instead
    if (closed || !claim) return;
    claim = null;
    void stopWriting();
    events.onTakenOver();
    startReading();
    void reload();
  }

  async function load(): Promise<BoardStatus> {
    const claimed = await storage.claimCanvas(id, onClaimLost);
    // Before reading, so a save landing in between isn't missed
    if (!claimed) watchSaves();
    const opened = await storage.openCanvas(id, runningSchema);
    if (closed || opened.status === 'newer-version') {
      // Saving would overwrite what the newer app wrote
      stopReading();
      await claimed?.release();
      if (opened.status !== 'newer-version') return 'ready';
      setRole('newer-version');
      return opened.status;
    }

    if (opened.status === 'missing') {
      if (claimed) await storage.createCanvas(options.ownerDid, id);
    } else if (opened.document || opened.session) {
      show(() => events.onLoad(opened.document, opened.session, opened.links));
    }
    if (closed) {
      await claimed?.release();
      return 'ready';
    }

    loading = false;
    if (claimed?.isHeld()) {
      startWriting(claimed);
    } else {
      startReading();
      if (claimed || savedWhileLoading) await reload();
    }
    // A reload above can find a save from a newer app
    return role === 'newer-version' ? 'newer-version' : 'ready';
  }

  return {
    opened: load(),
    documentChanged() {
      saver?.documentChanged();
    },
    takeOver() {
      if (closed || claim || role === 'newer-version') return Promise.resolve();
      if (promoting) return promoting;
      takingOver ??= (async () => {
        // Checked before taking the lock, so a newer app's tab keeps writing
        const opened = await storage.openCanvas(id, runningSchema);
        if (opened.status === 'newer-version') return showNewerVersion();
        // A wait granted meanwhile is used rather than stolen from, which
        // would leave this take-over queued behind this tab's own lock
        const wait = waitingForClaim;
        waitingForClaim = null;
        wait?.cancel.abort();
        await wait?.settled;
        if (closed || claim || promoting) return promoting ?? undefined;
        const next = await storage.claimCanvas(id, onClaimLost, {
          mode: 'take-over',
        });
        if (next) await promote(next);
      })().finally(() => {
        takingOver = null;
      });
      return takingOver;
    },
    async close() {
      closed = true;
      stopReading();
      await stopWriting();
      await claim?.release();
    },
  };
}

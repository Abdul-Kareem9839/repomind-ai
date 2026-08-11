/**
 * State object carried through every node (see ARCHITECTURE.md §6). Each channel's
 * `value` reducer says how a node's return value merges into state — here it's
 * always "last write wins, keep previous if the node didn't touch this field."
 */
export const graphChannels = {
  projectId: { value: (prev, next) => next ?? prev, default: () => null },
  collectionName: { value: (prev, next) => next ?? prev, default: () => null },
  projectName: { value: (prev, next) => next ?? prev, default: () => null },
  repositorySummary: { value: (prev, next) => next ?? prev, default: () => null },
  question: { value: (prev, next) => next ?? prev, default: () => null },
  queryType: { value: (prev, next) => next ?? prev, default: () => null },
  retrievedChunks: { value: (prev, next) => next ?? prev, default: () => [] },
  toolResult: { value: (prev, next) => next ?? prev, default: () => null },
  toolsUsed: { value: (prev, next) => next ?? prev, default: () => [] },
  answer: { value: (prev, next) => next ?? prev, default: () => null }
};

export default graphChannels;

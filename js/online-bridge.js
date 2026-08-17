/**
 * Thin bridge to avoid circular imports between game/vote and online modules.
 * online.js registers handlers here; game.js and vote.js call them.
 */

/** @type {{ onHostGameStarted?: () => void, onHostVotingStarted?: () => void, onHostDiscussionStarted?: (starterName: string) => void, onHostVoteResultsReady?: (html: string) => void, onHostNextRoundStarted?: () => void }} */
export const onlineBridge = {};

export function notifyHostGameStarted() {
  onlineBridge.onHostGameStarted?.();
}

export function notifyHostVotingStarted() {
  onlineBridge.onHostVotingStarted?.();
}

export function notifyHostDiscussionStarted(starterName) {
  onlineBridge.onHostDiscussionStarted?.(starterName);
}

export function notifyHostVoteResultsReady(html) {
  onlineBridge.onHostVoteResultsReady?.(html);
}

export function notifyHostNextRoundStarted() {
  onlineBridge.onHostNextRoundStarted?.();
}

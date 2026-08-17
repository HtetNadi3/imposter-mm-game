const DEFAULT_STATE = {
    totalPlayers: 0,
    currentPlayer: 0,
    playOrder: [],
    playerNames: [],
    imposters: [],
    secretWord: "",
    imposterWord: "",
    useWords: [],
    discussionMinutes: 5,
    hintMode: false,
    gameMode: "classic",
    votes: [],
    currentVoter: 0,
    voteOrder: [],
    pendingVotes: [],
    totalRounds: 3,
    currentRound: 1,
    selectedCategories: [],
    civilianWins: 0,
    imposterWins: 0,
    gameNumber: 0
};

export const state = structuredClone(DEFAULT_STATE);

export function getPlayerName(index) {
    return state.playerNames[index] || `Player ${index + 1}`;
}

export function resetState() {
    Object.assign(state, structuredClone(DEFAULT_STATE));
}
export const state = { 
    totalPlayers: 0, 
    currentPlayer: 0, 
    playOrder: [],
    playerNames: [],
    imposters: [], 
    secretWord: "", 
    imposterWord: "",
    useWords: [], 
    discussionMinutes: 2,
    hintMode: false,
    gameMode: "classic",
    votes: [],
    currentVoter: 0,
    voteOrder: [],
    totalRounds: 3,
    currentRound: 1,
    selectedCategories: [],
    civilianWins: 0,
    imposterWins: 0
};

export function getPlayerName(index) {
    return state.playerNames[index] || `Player ${index + 1}`;
}
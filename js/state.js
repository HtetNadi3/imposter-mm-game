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
    gameMode: "classic"
};

export function getPlayerName(index) {
    return state.playerNames[index] || `Player ${index + 1}`;
}
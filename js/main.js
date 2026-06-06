import { startGame, nextTurn } from "./game.js";
import { toggleReveal, showDiscussionScreen, revealImposters } from "./ui.js";
import { startVoting, submitVote } from "./vote.js";
import { toggleAllCategories, handleIndividualChange, changeValue, toggleRules, changeTimer, toggleHintMode, renderPlayerNameInputs, setGameMode } from "./control.js";
import { startNextRound } from "./game.js";
import { playSound, toggleMute } from "./audio.js";

window.startGame = startGame;
window.nextTurn = nextTurn;
window.toggleReveal = toggleReveal;
window.showDiscussionScreen = showDiscussionScreen;
window.revealImposters = revealImposters;
window.startVoting = startVoting;
window.submitVote = submitVote;
window.toggleAllCategories = toggleAllCategories;
window.handleIndividualChange = handleIndividualChange;
window.changeValue = changeValue;
window.toggleRules = toggleRules;
window.changeTimer = changeTimer;
window.toggleHintMode = toggleHintMode;
window.setGameMode = setGameMode;
window.startNextRound = startNextRound;

renderPlayerNameInputs();
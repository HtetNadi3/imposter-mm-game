import { startGame, nextTurn } from "./game.js";
import { toggleReveal, showDiscussionScreen, revealImposters } from "./ui.js";
import { startVoting, selectVote, confirmVote } from "./vote.js";
import { toggleAllCategories, handleIndividualChange, changeValue, toggleRules, changeTimer, toggleHintMode, renderPlayerNameInputs, setGameMode, toggleModePicker, togglePlayerNames, toggleCategories, initSetupUI } from "./control.js";
import { startNextRound } from "./game.js";
import { playSound, toggleMute } from "./audio.js";

window.startGame = startGame;
window.nextTurn = nextTurn;
window.toggleReveal = toggleReveal;
window.showDiscussionScreen = showDiscussionScreen;
window.revealImposters = revealImposters;
window.startVoting = startVoting;
window.selectVote = selectVote;
window.confirmVote = confirmVote;
window.toggleAllCategories = toggleAllCategories;
window.handleIndividualChange = handleIndividualChange;
window.changeValue = changeValue;
window.toggleRules = toggleRules;
window.changeTimer = changeTimer;
window.toggleHintMode = toggleHintMode;
window.setGameMode = setGameMode;
window.toggleModePicker = toggleModePicker;
window.togglePlayerNames = togglePlayerNames;
window.toggleCategories = toggleCategories;
window.startNextRound = startNextRound;

renderPlayerNameInputs();
initSetupUI();
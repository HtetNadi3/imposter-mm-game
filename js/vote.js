import { state, getPlayerName } from "./state.js";
import { $ } from "./dom.js";
import { playSound } from "./audio.js";
import { stopDiscussionTimer } from "./ui.js";

export function startVoting() {
  stopDiscussionTimer();
  playSound("click");
  state.votes = new Array(state.totalPlayers).fill(null);
  state.voteOrder = [...state.playOrder];
  state.currentVoter = 0;
  state.pendingVote = null;
  showVoterScreen();
}

function showVoterScreen() {
  const voterIndex = state.voteOrder[state.currentVoter];
  const voterName = getPlayerName(voterIndex);
  const progress = `${state.currentVoter + 1} / ${state.totalPlayers}`;

  const options = state.playerNames
    .map((name, i) => {
      if (i === voterIndex) return "";
      const selected = state.pendingVote === i ? " selected" : "";
      return `
        <button type="button" class="vote-option-btn${selected}" onclick="selectVote(${i})">
          <span class="vote-option-name">${name}</span>
        </button>`;
    })
    .join("");

  const confirmBlock = state.pendingVote !== null
    ? `
        <button type="button" class="btn btn-blue vote-confirm-btn" onclick="confirmVote()">မဲအတည်ပြုမည်</button>
      `
    : "";

  $("game-screen").innerHTML = `
    <div class="result-card voting-card">
      <span class="phase-tag phase-tag--active">မဲပေးချိန်</span>
      <h1 class="phase-title yellow-text">မဲပေးပါ</h1>
      <p class="vote-progress">${progress}</p>
      <div class="voter-box">
        <span class="voter-label">မင်းရဲ့ မဲ</span>
        <span class="voter-name">${voterName}</span>
      </div>
      <p class="vote-hint">လူလိမ်ဟု သံသယရှိသူကို ရွေးပါ</p>
      <div class="vote-options">${options}</div>
      ${confirmBlock}
    </div>`;
}

export function selectVote(targetIndex) {
  playSound("click");
  state.pendingVote = targetIndex;
  showVoterScreen();
}

export function confirmVote() {
  if (state.pendingVote === null) return;
  playSound("click");
  const voterIndex = state.voteOrder[state.currentVoter];
  state.votes[voterIndex] = state.pendingVote;
  state.pendingVote = null;
  state.currentVoter++;

  if (state.currentVoter < state.totalPlayers) {
    showVoterScreen();
  } else {
    showVoteResults();
  }
}

function tallyVotes() {
  const counts = new Array(state.totalPlayers).fill(0);
  state.votes.forEach((target) => {
    if (target !== null) counts[target]++;
  });
  return counts;
}

export function calculateWinner() {
  const counts = tallyVotes();
  const maxVotes = Math.max(...counts);
  if (maxVotes === 0) return { civiliansWin: false, topVoted: [], counts };

  const topVoted = counts
    .map((c, i) => ({ index: i, votes: c }))
    .filter((p) => p.votes === maxVotes)
    .map((p) => p.index);

  const imposterSet = new Set(state.imposters);
  const allTopAreImposters = topVoted.every((i) => imposterSet.has(i));
  const allImpostersCaught = state.imposters.every((i) => topVoted.includes(i));
  const civiliansWin = allTopAreImposters && allImpostersCaught;

  return { civiliansWin, topVoted, counts, maxVotes };
}

function showVoteResults() {
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate([60, 50, 60]);
  }
  playSound("success");

  const { civiliansWin, topVoted, counts } = calculateWinner();
  if (civiliansWin) state.civilianWins++;
  else state.imposterWins++;

  const isSecret = state.gameMode === "secret";
  const hasMoreRounds = state.currentRound < state.totalRounds;
  const isFinalRound = !hasMoreRounds;

  const voteBreakdown = state.playerNames
    .map((name, i) => {
      const isImposter = state.imposters.includes(i);
      const isTop = topVoted.includes(i);
      const badge = isImposter ? '<span class="vote-badge imposter-badge">လူလိမ်</span>' : "";
      const highlight = isTop ? " vote-row-top" : "";
      return `
        <div class="vote-row${highlight}">
          <span class="vote-row-name">${name}${badge}</span>
          <span class="vote-row-count">${counts[i]} မဲ</span>
        </div>`;
    })
    .join("");

  const topNames = topVoted.map((i) => getPlayerName(i)).join(", ");
  const imposterNames = state.imposters.map((i) => getPlayerName(i)).join(", ");

  const winnerBlock = civiliansWin
    ? `<div class="winner-banner winner-civilians">
        <span class="winner-icon">🎉</span>
        <h2 class="green-text">ရိုးရိုးကစားသမားများ အနိုင်ရ!</h2>
        <p>လူလိမ်များကို မှန်ကန်စွာ ဖော်ထုတ်နိုင်ခဲ့ပါတယ်</p>
      </div>`
    : `<div class="winner-banner winner-imposters">
        <span class="winner-icon">🎭</span>
        <h2 class="red-text">လူလိမ်များ အနိုင်ရ!</h2>
        <p>လူလိမ်များက လွှတ်မြောက်နိုင်ခဲ့ပါတယ်</p>
      </div>`;

  const revealBlock = isSecret
    ? `
      <p>လူလိမ်များ:</p>
      <h3 class="red-text">${imposterNames}</h3>
      <p>အများစု စကားလုံး:</p>
      <h3 class="green-text">${state.secretWord}</h3>
      <p>လူလိမ် စကားလုံး:</p>
      <h3 class="yellow-text">${state.imposterWord}</h3>`
    : `
      <p>လူလိမ်များ:</p>
      <h3 class="red-text">${imposterNames}</h3>
      <p>စကားလုံး:</p>
      <h3 class="green-text">${state.secretWord}</h3>`;

  const roundLabel = state.totalRounds > 1
    ? `<p class="round-badge-inline">Round ${state.currentRound} / ${state.totalRounds}</p>`
    : "";

  const scoreBlock = state.totalRounds > 1
    ? `<div class="score-summary">
        <span class="score-civilians">ရိုးရိုး ${state.civilianWins}</span>
        <span class="score-divider">—</span>
        <span class="score-imposters">လူလိမ် ${state.imposterWins}</span>
      </div>`
    : "";

  const finalSummary = isFinalRound && state.totalRounds > 1
    ? `<div class="final-winner-banner ${state.civilianWins > state.imposterWins ? "winner-civilians" : state.imposterWins > state.civilianWins ? "winner-imposters" : ""}">
        <h2 class="yellow-text">ဂိမ်းပြီးဆုံးပါပြီ!</h2>
        <p>${state.civilianWins > state.imposterWins
          ? "ရိုးရိုးကစားသမားများ စုစုပေါင်း အနိုင်ရ!"
          : state.imposterWins > state.civilianWins
            ? "လူလိမ်များ စုစုပေါင်း အနိုင်ရ!"
            : "သရေကျပါတယ်!"}</p>
      </div>`
    : "";

  const actionButtons = hasMoreRounds
    ? `<button class="btn btn-blue" onclick="startNextRound()">နောက် Round (${state.currentRound + 1}/${state.totalRounds})</button>
       <button class="btn btn-secondary" onclick="location.reload()">ဂိမ်းအသစ်စတင်မည်</button>`
    : `<button class="btn btn-blue" onclick="location.reload()">ဂိမ်းအသစ်စတင်မည်</button>`;

  $("game-screen").innerHTML = `
    <div class="result-card">
      ${roundLabel}
      <h1 class="yellow-text">မဲရလဒ်</h1>
      ${scoreBlock}
      ${winnerBlock}
      <div class="vote-results-box">
        <p class="section-title">မဲစာရင်း</p>
        ${voteBreakdown}
      </div>
      <p>အများဆုံး မဲရသူ: <strong class="yellow-text">${topNames}</strong></p>
      <div class="hidden-result" style="display:block;">
        ${revealBlock}
      </div>
      ${finalSummary}
      ${actionButtons}
    </div>`;
}


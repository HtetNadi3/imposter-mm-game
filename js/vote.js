import { state, getPlayerName } from "./state.js";
import { recordRoundStats, renderScoreboard } from "./stats.js";
import { $ } from "./dom.js";
import { playSound } from "./audio.js";
import { stopDiscussionTimer } from "./ui.js";

export function startVoting() {
  stopDiscussionTimer();
  playSound("click");
  state.votes = new Array(state.totalPlayers).fill(null);
  state.voteOrder = [...state.playOrder];
  state.currentVoter = 0;
  state.pendingVotes = [];
  showVoterScreen();
}

function showVoterScreen() {
  const voterIndex = state.voteOrder[state.currentVoter];
  const voterName = getPlayerName(voterIndex);
  const progress = `${state.currentVoter + 1} / ${state.totalPlayers}`;
  const voteLimit = state.imposters.length;

  const options = state.playerNames
    .map((name, i) => {
      if (i === voterIndex) return "";
      const selected = state.pendingVotes.includes(i) ? " selected" : "";
      return `
        <button type="button" class="vote-option-btn${selected}" onclick="selectVote(${i})">
          <span class="vote-option-name">${name}</span>
        </button>`;
    })
    .join("");

  const confirmBlock =
    state.pendingVotes.length === voteLimit
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
      <p class="vote-hint">လူလိမ်ဟု သံသယရှိသူ ${voteLimit} ဦးကို ရွေးပါ (${state.pendingVotes.length}/${voteLimit})</p>
      <div class="vote-options">${options}</div>
      ${confirmBlock}
    </div>`;
}

export function selectVote(targetIndex) {
  playSound("click");
  const voteLimit = state.imposters.length;
  const idx = state.pendingVotes.indexOf(targetIndex);

  if (idx !== -1) {
    state.pendingVotes.splice(idx, 1);
  } else if (state.pendingVotes.length < voteLimit) {
    state.pendingVotes.push(targetIndex);
  }
  showVoterScreen();
}

export function confirmVote() {
  const voteLimit = state.imposters.length;
  if (state.pendingVotes.length !== voteLimit) return;

  playSound("click");
  const voterIndex = state.voteOrder[state.currentVoter];
  state.votes[voterIndex] = [...state.pendingVotes];
  state.pendingVotes = [];
  state.currentVoter++;

  if (state.currentVoter < state.totalPlayers) {
    showVoterScreen();
  } else {
    showVoteResults();
  }
}

function tallyVotes() {
  const counts = new Array(state.totalPlayers).fill(0);
  state.votes.forEach((targets) => {
    if (targets) targets.forEach((t) => counts[t]++);
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

  recordRoundStats({
    playerNames: state.playerNames,
    imposters: state.imposters,
    civiliansWin,
    topVoted,
    counts,
  });

  const isSecret = state.gameMode === "secret";
  const hasMoreRounds = true;
  const isFinalRound = false;

  const maxCount = Math.max(...counts, 1);
  const voteBreakdown = state.playerNames
    .map((name, i) => {
      const isImposter = state.imposters.includes(i);
      const isTop = topVoted.includes(i);
      const badge = isImposter
        ? `<span class="vote-badge imposter-badge">လူလိမ်</span>`
        : "";
      const pct = Math.round((counts[i] / maxCount) * 100);
      return `
        <div class="vote-row${isTop ? " vote-row-top" : ""}">
          <div class="vote-row-left">
            <div class="vote-row-namerow">
              <span class="vote-row-name">${name}</span>${badge}
            </div>
            <div class="vote-bar-bg">
              <div class="vote-bar${isTop ? " vote-bar-top" : ""}" style="width:${pct}%"></div>
            </div>
          </div>
          <span class="vote-row-count">${counts[i]}</span>
        </div>`;
    })
    .join("");

  const topNames = topVoted.map((i) => getPlayerName(i)).join(", ");
  const imposterNames = state.imposters.map((i) => getPlayerName(i)).join(", ");

  const winnerBlock = civiliansWin
    ? `<div class="winner-banner winner-civilians">
        <span class="winner-eyebrow">အနိုင်ရသူ</span>
        <span class="winner-main green-text">ရိုးရိုးကစားသမားများ</span>
        <span class="winner-sub">လူလိမ်ကို မှန်ကန်စွာ ဖော်ထုတ်နိုင်ခဲ့သည်</span>
      </div>`
    : `<div class="winner-banner winner-imposters">
        <span class="winner-eyebrow">အနိုင်ရသူ</span>
        <span class="winner-main red-text">လူလိမ်များ</span>
        <span class="winner-sub">လူလိမ်များ လွှတ်မြောက်နိုင်ခဲ့သည်</span>
      </div>`;

  const revealBlock = isSecret
    ? `<div class="reveal-grid">
        <div class="reveal-cell"><span class="reveal-label">လူလိမ်</span><span class="reveal-val red-text">${imposterNames}</span></div>
        <div class="reveal-cell"><span class="reveal-label">ဘုံစကားလုံး</span><span class="reveal-val green-text">${state.secretWord}</span></div>
        <div class="reveal-cell"><span class="reveal-label">လူလိမ် စကားလုံး</span><span class="reveal-val yellow-text">${state.imposterWord}</span></div>
      </div>`
    : `<div class="reveal-grid">
        <div class="reveal-cell"><span class="reveal-label">လူလိမ်</span><span class="reveal-val red-text">${imposterNames}</span></div>
        <div class="reveal-cell"><span class="reveal-label">စကားလုံး</span><span class="reveal-val green-text">${state.secretWord}</span></div>
      </div>`;

  const roundLabel =
    state.totalRounds > 1
      ? `<p class="round-badge-inline">Round ${state.currentRound} / ${state.totalRounds}</p>`
      : "";

  const scoreBlock =
    state.totalRounds > 1
      ? `<div class="score-summary">
        <span class="score-civilians">ရိုးရိုး ${state.civilianWins}</span>
        <span class="score-divider">—</span>
        <span class="score-imposters">လူလိမ် ${state.imposterWins}</span>
      </div>`
      : "";

  const finalSummary =
    isFinalRound && state.totalRounds > 1
      ? `<div class="final-winner-banner ${state.civilianWins > state.imposterWins ? "winner-civilians" : state.imposterWins > state.civilianWins ? "winner-imposters" : ""}">
        <h2 class="yellow-text">ဂိမ်းပြီးဆုံးပါပြီ!</h2>
        <p>${
          state.civilianWins > state.imposterWins
            ? "ရိုးရိုးကစားသမားများ စုစုပေါင်း အနိုင်ရ!"
            : state.imposterWins > state.civilianWins
              ? "လူလိမ်များ စုစုပေါင်း အနိုင်ရ!"
              : "သရေကျပါတယ်!"
        }</p>
      </div>`
      : "";

  const actionButtons = `<button class="btn btn-blue" onclick="startNextRound()">နောက် Round (${state.currentRound + 1})</button>
   <button class="btn btn-secondary" onclick="startNewGame()">ဂိမ်းအသစ်စတင်မည်</button>`;

  $("game-screen").innerHTML = `
    <div class="result-card">
      <div class="result-header-row">
        <span class="result-title">မဲရလဒ်</span>
        ${roundLabel}
      </div>
      ${scoreBlock}
      ${winnerBlock}
      <div class="vote-results-box">
        <p class="section-title">မဲစာရင်း</p>
        ${voteBreakdown}
      </div>
      <div class="reveal-box">${revealBlock}</div>
      ${finalSummary}
      ${renderScoreboard(state.playerNames)}
      <div class="result-actions">${actionButtons}</div>
    </div>`;
}
export const sessionStats = {
  players: {},
  gameCount: 0,
};

export function initPlayerStats(names) {
  names.forEach(name => {
    if (!sessionStats.players[name]) {
      sessionStats.players[name] = {
        wins: 0, losses: 0,
        timesImposter: 0, timesCaught: 0,
        votesReceived: 0
      };
    }
  });
}

export function recordRoundStats({ playerNames, imposters, civiliansWin, topVoted, counts }) {
  playerNames.forEach((name, i) => {
    const p = sessionStats.players[name];
    const isImposter = imposters.includes(i);
    const isCaught = topVoted.includes(i) && isImposter;

    if (isImposter) {
      p.timesImposter++;
      civiliansWin ? p.losses++ : p.wins++;
      if (isCaught) p.timesCaught++;
    } else {
      civiliansWin ? p.wins++ : p.losses++;
    }
    p.votesReceived += (counts[i] || 0);
  });
}

export function assignBadges(playerNames) {
  const ps = sessionStats.players;
  const badges = {};

  if (sessionStats.gameCount < 1 || !Object.keys(ps).length) return badges;

  let mostImposter = null, mostImposterCount = 0;
  let mostCaught = null, mostCaughtCount = 0;
  let mostVotes = null, mostVotesCount = 0;
  let mostWins = null, mostWinsCount = 0;
  let leastVotes = null, leastVotesCount = Infinity;
  let bestLiar = null, bestLiarRate = -1;
  let worstLiar = null, worstLiarRate = -1;

  playerNames.forEach(name => {
    const p = ps[name];
    if (!p) return;
    if (p.timesImposter > mostImposterCount) { mostImposter = name; mostImposterCount = p.timesImposter; }
    if (p.timesCaught > mostCaughtCount) { mostCaught = name; mostCaughtCount = p.timesCaught; }
    if (p.votesReceived > mostVotesCount) { mostVotes = name; mostVotesCount = p.votesReceived; }
    if (p.wins > mostWinsCount) { mostWins = name; mostWinsCount = p.wins; }
    if (p.votesReceived < leastVotesCount) { leastVotes = name; leastVotesCount = p.votesReceived; }

    // လိမ်တာအတော်ဆုံး - best liar: high imposter count, low catch rate
    if (p.timesImposter >= 1) {
      const escapeRate = (p.timesImposter - p.timesCaught) / p.timesImposter;
      if (escapeRate > bestLiarRate || (escapeRate === bestLiarRate && p.timesImposter > (ps[bestLiar]?.timesImposter || 0))) {
        bestLiarRate = escapeRate; bestLiar = name;
      }
    }

    if (p.timesImposter >= 1) {
      const catchRate = p.timesCaught / p.timesImposter;
      if (catchRate > worstLiarRate || (catchRate === worstLiarRate && p.timesImposter > (ps[worstLiar]?.timesImposter || 0))) {
        worstLiarRate = catchRate; worstLiar = name;
      }
    }
  });

  if (mostImposter && mostImposterCount > 0) badges[mostImposter] = "🎭 လူလိမ်ကြီး";
  if (mostCaught && mostCaughtCount > 0 && mostCaught !== mostImposter) badges[mostCaught] = "🔍 အမြဲဖမ်းမိသူ";
  if (mostVotes && mostVotesCount > 0) badges[mostVotes] = "👀 သံသယအဖြစ်ခံရဆုံး";
  if (mostWins && mostWinsCount > 0) badges[mostWins] = "🏆 အနိုင်ရဆုံး";
  if (leastVotes !== null && leastVotesCount === 0) badges[leastVotes] = "🤫 အသံကျယ်သူ";
  if (bestLiar && bestLiarRate > 0) badges[bestLiar] = "🎯 လိမ်တာအတော်ဆုံး";
  if (worstLiar && worstLiarRate === 1 && (ps[worstLiar].timesImposter > 1 || ps[worstLiar].timesCaught > 0)) {
    if (worstLiar !== bestLiar) badges[worstLiar] = "🐱 လိမ်တာညံ့ပြီး အမြဲဖမ်းမိသူ";
  }

  return badges;
}

export function renderScoreboard(playerNames) {
  const ps = sessionStats.players;
  const badges = assignBadges(playerNames);

  const rows = playerNames.map(name => {
    const p = ps[name] || { wins: 0, losses: 0, timesImposter: 0, timesCaught: 0, votesReceived: 0 };
    const winRate = (p.wins + p.losses) > 0 ? Math.round((p.wins / (p.wins + p.losses)) * 100) : 0;
    const badge = badges[name] ? `<span class="mvp-badge">${badges[name]}</span>` : "";
    const id = `sb-detail-${name.replace(/\s+/g, '-')}`;
    return `
      <div class="sb-card">
        <div class="sb-card-top" onclick="this.parentElement.classList.toggle('sb-open')" style="cursor:pointer; display:flex; align-items:center; justify-content:space-between;">
          <span class="sb-name">${name}${badge}</span>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="sb-winrate">${winRate}%</span>
            <span class="sb-arrow">▾</span>
          </div>
        </div>
        <div class="sb-detail">
          <div class="sb-stats-row">
            <div class="sb-stat sb-stat-win">
              <span class="sb-stat-label">အနိုင်</span>
              <span class="sb-stat-value">${p.wins}</span>
            </div>
            <div class="sb-stat sb-stat-loss">
              <span class="sb-stat-label">အရှုံး</span>
              <span class="sb-stat-value">${p.losses}</span>
            </div>
            <div class="sb-stat sb-stat-imp">
              <span class="sb-stat-label">လိမ်</span>
              <span class="sb-stat-value">${p.timesImposter}</span>
            </div>
            <div class="sb-stat sb-stat-caught">
              <span class="sb-stat-label">ဖမ်းမိ</span>
              <span class="sb-stat-value">${p.timesCaught}</span>
            </div>
          </div>
        </div>
      </div>`;
  }).join("");

  return `
    <div class="scoreboard-box">
      <p class="section-title">Scoreboard <span class="sb-gamecount">${sessionStats.gameCount} ပွဲ</span></p>
      <div class="sb-grid">
        ${rows}
      </div>
    </div>`;
}
import { $ } from "./dom.js";
import { state } from "./state.js";
import { playSound } from "./audio.js";

export function setGameMode(mode) {
  playSound("click");
  state.gameMode = mode;

  document.querySelectorAll(".mode-card").forEach((el) => {
    el.classList.toggle("active", el.dataset.mode === mode);
  });

  const hintRow = $("hint-mode-row");
  const selectAllBox = $("select-all-box");
  const categoryHint = $("category-hint");

  if (hintRow) hintRow.style.display = mode === "classic" ? "flex" : "none";
  if (selectAllBox) selectAllBox.style.display = mode === "classic" ? "flex" : "none";
  if (categoryHint) {
    categoryHint.textContent =
      mode === "classic"
        ? "တစ်ခုထက်ပိုရွေးနိုင်သည်"
        : "တစ်ခုသာ ရွေးပါ";
  }

  syncCategoryInputs(mode);
}

function syncCategoryInputs(mode) {
  const inputs = [...document.querySelectorAll("#category-list input")];
  if (mode === "secret") {
    const checked = inputs.find((i) => i.checked);
    inputs.forEach((i) => {
      i.type = "radio";
      i.name = "category-single";
      i.checked = false;
    });
    (checked || inputs[0]).checked = true;
  } else {
    inputs.forEach((i) => {
      i.type = "checkbox";
      i.name = "";
      i.checked = true;
    });
    $("select-all").checked = true;
  }
}

export function toggleAllCategories(source) {
  if (state.gameMode !== "classic") return;
  document
    .querySelectorAll("#category-list input")
    .forEach((cb) => (cb.checked = source.checked));
}

export function handleIndividualChange() {
  if (state.gameMode === "secret") return;
  const checks = [...document.querySelectorAll("#category-list input")];
  $("select-all").checked = checks.every((cb) => cb.checked);
}

export function getSelectedCategories() {
  return [...document.querySelectorAll("#category-list input:checked")].map(
    (i) => i.value
  );
}

export function renderPlayerNameInputs() {
  const count = +$("player-count").value;
  const list = $("player-names-list");
  if (!list) return;

  const existing = [...list.querySelectorAll(".player-name-input")].map((i) => i.value);

  list.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const row = document.createElement("div");
    row.className = "player-name-row";

    const label = document.createElement("label");
    label.textContent = String(i + 1);

    const input = document.createElement("input");
    input.type = "text";
    input.className = "player-name-input";
    input.maxLength = 20;
    input.placeholder = `Player ${i + 1}`;
    input.value = existing[i] || "";

    row.appendChild(label);
    row.appendChild(input);
    list.appendChild(row);
  }
}

export function collectPlayerNames() {
  const inputs = [...document.querySelectorAll(".player-name-input")];
  return inputs.map((input, i) => {
    const name = input.value.trim();
    return name || `Player ${i + 1}`;
  });
}

export function changeValue(id, delta) {
  const input = $(id);
  if (!input) return;
  let val = parseInt(input.value) + delta;

  // Set logic limits
  if (id === "player-count") {
    if (val < 3) val = 3;
    if (val > 12) val = 12;
    input.value = val;
    renderPlayerNameInputs();
  } else if (id === "imposter-count") {
    if (val < 1) val = 1;
    if (val > 5) val = 5;
    input.value = val;
  } else if (id === "timer-value") {
    if (val < 1) val = 1;
    if (val > 10) val = 10;
    input.value = val;
  }
}
export function toggleRules(show) {
  const modal = $("rules-modal");
  modal.style.display = show ? "flex" : "none";
  if (show) {
    playSound('click');
  }
}

const TIMER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function changeTimer(delta) {
  let currentIndex = TIMER_OPTIONS.indexOf(state.discussionMinutes);

  //Default to 2 min
  if (currentIndex === -1) currentIndex = 1;

  let nextIndex = currentIndex + delta;

  if (nextIndex >= 0 && nextIndex < TIMER_OPTIONS.length) {
    state.discussionMinutes = TIMER_OPTIONS[nextIndex];

    const displayInput = $("timer-display") || $("timer-value");
    if (displayInput) {
      displayInput.value = state.discussionMinutes;
    }
  }
}

export function toggleHintMode(checkbox) {
  state.hintMode = checkbox.checked;
}

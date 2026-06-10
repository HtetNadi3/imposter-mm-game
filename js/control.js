import { $ } from "./dom.js";
import { state } from "./state.js";
import { playSound } from "./audio.js";

function getMaxImposters(playerCount) {
  if (playerCount % 2 === 0) {
    return playerCount / 2;
  } else {
    return (playerCount - 1) / 2;
  }
}

function syncStepperDisplay(inputId, displayId) {
  const input = $(inputId);
  const display = $(displayId);
  if (input && display) display.textContent = input.value;
}

function updatePlayersDisplay() {
  const count = +$("player-count").value;
  syncStepperDisplay("player-count", "player-count-display");
  const display = $("players-display");
  if (display) display.textContent = `${count} active`;
}

function updateCategoriesDisplay() {
  const display = $("categories-display");
  if (!display) return;
  const checked = document.querySelectorAll("#category-list input:checked").length;
  const total = document.querySelectorAll("#category-list input").length;
  if (state.gameMode === "secret") {
    const selected = document.querySelector("#category-list input:checked");
    const label = selected?.closest(".category-card")?.querySelector("span:last-child")?.textContent?.trim();
    display.textContent = label || "1 selected";
    return;
  }
  display.textContent = checked === total ? "All selected" : `${checked} selected`;
}

export function toggleModePicker() {
  playSound("click");
  $("mode-picker")?.classList.toggle("open");
  $("mode-row")?.classList.toggle("expanded");
}

export function togglePlayerNames() {
  playSound("click");
  $("player-names-section")?.classList.toggle("open");
  $("players-row")?.classList.toggle("expanded");
}

export function toggleCategories() {
  playSound("click");
  $("categories-panel")?.classList.toggle("open");
  $("categories-row")?.classList.toggle("expanded");
}

export function setGameMode(mode) {
  playSound("click");
  state.gameMode = mode;

  document.querySelectorAll(".mode-option").forEach((el) => {
    el.classList.toggle("active", el.dataset.mode === mode);
  });

  const modeDisplay = $("mode-display");
  if (modeDisplay) modeDisplay.textContent = mode === "classic" ? "Classic" : "Secret";

  $("mode-picker")?.classList.remove("open");
  $("mode-row")?.classList.remove("expanded");

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
  updateCategoriesDisplay();
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
  updateCategoriesDisplay();
}

export function handleIndividualChange() {
  if (state.gameMode === "secret") {
    updateCategoriesDisplay();
    return;
  }
  const checks = [...document.querySelectorAll("#category-list input")];
  $("select-all").checked = checks.every((cb) => cb.checked);
  updateCategoriesDisplay();
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

  updatePlayersDisplay();
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

  if (id === "player-count") {
    if (val < 3) val = 3;
    if (val > 12) val = 12;
    input.value = val;
    renderPlayerNameInputs();
    const maxImp = getMaxImposters(val);
    const impInput = $("imposter-count");
    if (impInput) {
      if (+impInput.value > maxImp) impInput.value = maxImp;
      syncStepperDisplay("imposter-count", "imposter-count-display");
    }
  } else if (id === "imposter-count") {
    const playerCount = +$("player-count").value;
    const maxImp = getMaxImposters(playerCount);
    if (val < 1) val = 1;
    if (val > maxImp) val = maxImp;
    input.value = val;
    syncStepperDisplay("imposter-count", "imposter-count-display");
  } else if (id === "round-count") {
    if (val < 1) val = 1;
    if (val > 10) val = 10;
    input.value = val;
    syncStepperDisplay("round-count", "round-count-display");
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

  if (currentIndex === -1) currentIndex = TIMER_OPTIONS.indexOf(5);

  let nextIndex = currentIndex + delta;

  if (nextIndex >= 0 && nextIndex < TIMER_OPTIONS.length) {
    state.discussionMinutes = TIMER_OPTIONS[nextIndex];

    const displayInput = $("timer-display") || $("timer-value");
    if (displayInput) {
      displayInput.value = state.discussionMinutes;
    }
    syncStepperDisplay("timer-display", "timer-display-value");
  }
}

export function toggleHintMode(checkbox) {
  state.hintMode = checkbox.checked;
}

export function initSetupUI() {
  updatePlayersDisplay();
  syncStepperDisplay("imposter-count", "imposter-count-display");
  syncStepperDisplay("round-count", "round-count-display");
  syncStepperDisplay("timer-display", "timer-display-value");
  updateCategoriesDisplay();
}

const promptUrl = "./SYSTEM-PROMPT.md";

const preview = document.querySelector("#prompt-preview code");
const status = document.querySelector("#prompt-status");
const fallback = document.querySelector("#prompt-fallback");
const copyButton = document.querySelector("#copy-prompt");
const downloadButton = document.querySelector("#download-prompt");

let promptText = "";

function setReady(text) {
  promptText = text;
  preview.textContent = text;
  const lineCount = text.split(/\r?\n/).length;
  status.textContent = `Complete Markdown source loaded: ${lineCount} lines, ready to copy.`;
  copyButton.disabled = false;
  downloadButton.disabled = false;
}

function setUnavailable(isDirectFile = false) {
  preview.textContent = [
    isDirectFile
      ? "Direct file viewing cannot load the canonical prompt into this panel."
      : "The canonical prompt could not be loaded by this browser.",
    "",
    "Open SYSTEM-PROMPT.md to read and copy the complete prompt manually,",
    "or serve this repository over HTTP to use the copy and download controls."
  ].join("\n");
  status.textContent = isDirectFile
    ? "Direct file view: automatic prompt loading is unavailable."
    : "Prompt preview unavailable in the current browsing context.";
  fallback.hidden = false;
}

async function loadPrompt() {
  if (window.location.protocol === "file:") {
    setUnavailable(true);
    return;
  }

  try {
    const response = await fetch(promptUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Prompt request returned ${response.status}`);
    }

    const text = await response.text();
    if (!text.trim()) {
      throw new Error("Prompt file is empty");
    }

    setReady(text);
  } catch (error) {
    console.info("Complete system prompt unavailable", error);
    setUnavailable();
  }
}

async function copyPrompt() {
  if (!promptText) {
    return;
  }

  try {
    await navigator.clipboard.writeText(promptText);
    copyButton.textContent = "Copied";
    status.textContent = "Complete system prompt copied to the clipboard.";
    window.setTimeout(() => {
      copyButton.textContent = "Copy prompt";
    }, 1800);
  } catch (error) {
    console.info("Clipboard write unavailable", error);
    status.textContent = "Clipboard access was blocked. Select the prompt text and copy it manually.";
    preview.parentElement.focus();
  }
}

function downloadPrompt() {
  if (!promptText) {
    return;
  }

  const blob = new Blob([promptText], { type: "text/markdown;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = "research-mission-control-system-prompt.md";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
  status.textContent = "Complete system prompt downloaded as a Markdown file.";
}

copyButton.addEventListener("click", copyPrompt);
downloadButton.addEventListener("click", downloadPrompt);

loadPrompt();

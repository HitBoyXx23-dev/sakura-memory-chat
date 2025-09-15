// ================== DOM Elements ==================
const chatBox = document.getElementById("chat");
const chatTitle = document.getElementById("chatTitle");
const userInput = document.getElementById("userInput");
const chatListDiv = document.getElementById("chatList");
const keywordListDiv = document.getElementById("keywordList");
const promptSelect = document.getElementById("promptSelect");
const promptInput = document.getElementById("promptInput");

// ================== State ==================
let chats = JSON.parse(localStorage.getItem("chats") || "[]");
let currentChatIndex = parseInt(localStorage.getItem("currentChatIndex") || -1, 10);
let botPrompt = localStorage.getItem("botPrompt") || "I am your Sakura AI 🌸.";

// ================== Rendering ==================
function renderChat() {
  chatBox.innerHTML = "";
  if (currentChatIndex === -1 || !chats[currentChatIndex]) return;

  chats[currentChatIndex].messages.forEach(msg => {
    const div = document.createElement("div");
    div.className = `msg ${msg.role}`;
    div.innerHTML = msg.text.replace(/\n/g, "<br>");
    chatBox.appendChild(div);
  });

  chatBox.scrollTop = chatBox.scrollHeight;
  renderKeywords();
}

function renderChatList() {
  chatListDiv.innerHTML = "";
  chats.forEach((chat, i) => {
    const div = document.createElement("div");
    div.className = `chatItem${i === currentChatIndex ? " active" : ""}`;
    div.textContent = chat.title || "Untitled Chat";
    div.onclick = () => loadChat(i);
    chatListDiv.appendChild(div);
  });
}

function renderKeywords() {
  keywordListDiv.innerHTML = "";
  if (currentChatIndex === -1) return;

  const chat = chats[currentChatIndex];
  chat.keywords ||= {};

  for (const key in chat.keywords) {
    const div = document.createElement("div");
    div.className = "keywordItem";
    div.innerHTML = `<strong>${key}</strong> → ${chat.keywords[key].replace(/\n/g, "<br>")}`;
    div.onclick = () => {
      userInput.value = key;
      sendMessage();
    };
    keywordListDiv.appendChild(div);
  }
}

// ================== Persistence ==================
function saveAll() {
  localStorage.setItem("chats", JSON.stringify(chats));
  localStorage.setItem("currentChatIndex", currentChatIndex);
  localStorage.setItem("botPrompt", botPrompt);
  renderChatList();
  renderKeywords();
}

// ================== Chat Management ==================
function newChat() {
  chats.push({ title: "New Chat", messages: [], keywords: {} });
  currentChatIndex = chats.length - 1;
  saveAll();
  renderChat();
  chatTitle.textContent = "New Chat";
}

function loadChat(index) {
  currentChatIndex = index;
  saveAll();
  renderChat();
  chatTitle.textContent = chats[index].title;
}

// ================== Messaging ==================
function sendMessage() {
  const text = userInput.value.trim();
  if (!text || currentChatIndex === -1) return;

  const chat = chats[currentChatIndex];
  chat.messages.push({ role: "user", text });

  if (tryTeachKeyword(text, chat)) {
    saveAll();
    renderChat();
    userInput.value = "";
    return;
  }

  const reply = getKeywordAnswer(text, chat);
  chat.messages.push({ role: "bot", text: reply });

  userInput.value = "";
  saveAll();
  renderChat();
}

// ================== Keyword Learning ==================
function tryTeachKeyword(text, chat) {
  const match = text.match(/^remember keyword\s+(.+?)\s*=\s*([\s\S]+)$/i);
  if (match) {
    const key = match[1].trim().toLowerCase();
    const answer = match[2].trim();
    chat.keywords[key] = answer;
    chat.messages.push({ role: "bot", text: `✅ Learned keyword:\n"${key}" → "${answer}"` });
    return true;
  }
  return false;
}

function getKeywordAnswer(text, chat) {
  const key = text.toLowerCase().trim();
  if (chat.keywords[key]) return `${botPrompt}\n${chat.keywords[key]}`;
  for (const k in chat.keywords) {
    if (key.includes(k)) return `${botPrompt}\n${chat.keywords[k]}`;
  }

  if (Object.keys(chat.keywords).length === 0) {
    return `${botPrompt}\nI don't know anything yet! 🌸\nYou can teach me using:\nremember keyword [your question] = [your answer]`;
  }
  return `${botPrompt}\nI don't know this yet. 🌸\nYou can teach me using:\nremember keyword [your question] = [your answer]`;
}

// ================== Prompt Settings ==================
function setPrompt() {
  const val = promptInput.value.trim();
  if (val) {
    botPrompt = val;
    localStorage.setItem("botPrompt", botPrompt);
    alert("Custom prompt saved!");
  }
}

function setPromptFromDropdown() {
  botPrompt = promptSelect.value;
  localStorage.setItem("botPrompt", botPrompt);
}

// ================== Memory Management ==================
function exportMemory() {
  const blob = new Blob([JSON.stringify({ chats, botPrompt }, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "sakura_chats.json";
  link.click();
}

function importMemory(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const data = JSON.parse(e.target.result);
    if (data.chats) chats = data.chats;
    if (data.botPrompt) botPrompt = data.botPrompt;
    currentChatIndex = chats.length ? 0 : -1;
    saveAll();
    renderChat();
  };
  reader.readAsText(file);
}

function deleteMemory() {
  const keyword = document.getElementById("deleteInput").value.trim();
  if (!keyword || currentChatIndex === -1) return;
  const chat = chats[currentChatIndex];

  if (chat.keywords[keyword.toLowerCase()]) {
    delete chat.keywords[keyword.toLowerCase()];
    saveAll();
    renderKeywords();
    alert(`Deleted keyword: "${keyword}"`);
    return;
  }

  const idx = chat.messages.findIndex(m => m.text.toLowerCase() === keyword.toLowerCase());
  if (idx !== -1) {
    chat.messages.splice(idx, 1);
    saveAll();
    renderChat();
    alert(`Deleted message: "${keyword}"`);
  } else {
    alert("No exact match found.");
  }
}

function clearAll() {
  if (confirm("Clear ALL chats?")) {
    chats = [];
    currentChatIndex = -1;
    saveAll();
    renderChat();
  }
}

function renameChat() {
  if (currentChatIndex === -1) return;
  const newName = prompt("Enter new chat name:", chats[currentChatIndex].title);
  if (newName && newName.trim() !== "") {
    chats[currentChatIndex].title = newName.trim();
    chatTitle.textContent = newName.trim();
    saveAll();
  }
}

function toggleTheme() {
  document.body.classList.toggle("light");
}

// ================== Search ==================
function searchMemory() {
  const query = document.getElementById("searchInput").value.toLowerCase();

  // Filter chats
  Array.from(chatListDiv.children).forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(query) ? "" : "none";
  });

  // Filter keywords
  Array.from(keywordListDiv.children).forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(query) ? "" : "none";
  });
}

// ================== Init ==================
if (chats.length === 0) {
  newChat();
} else {
  renderChatList();
  renderChat();
  loadChat(currentChatIndex);
}

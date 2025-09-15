let chatBox = document.getElementById("chat");
let chatTitle = document.getElementById("chatTitle");
let userInput = document.getElementById("userInput");
let chatListDiv = document.getElementById("chatList");
let contextMenu = document.getElementById("contextMenu");

let chats = JSON.parse(localStorage.getItem("chats") || "[]");
let currentChatIndex = parseInt(localStorage.getItem("currentChatIndex") || -1);
let contextChatIndex = null;
let botPrompt = localStorage.getItem("botPrompt") || "I am your Sakura AI 🌸.";

// Mini knowledge base
const knowledge = {
  "2+2": "4",
  "capital of france": "Paris",
  "capital of japan": "Tokyo",
  "hello": "Hello! 🌸",
  "who are you": "I am your Sakura AI, always here for you."
};

// ------------------- Chat Rendering -------------------
function renderChat() {
  chatBox.innerHTML = "";
  if (currentChatIndex == -1 || !chats[currentChatIndex]) return;
  let memory = chats[currentChatIndex].messages;
  memory.forEach(msg => {
    let div = document.createElement("div");
    div.className = "msg " + msg.role;
    div.textContent = msg.text;
    chatBox.appendChild(div);
  });
  chatBox.scrollTop = chatBox.scrollHeight;

  renderKeywords();
}

function renderChatList() {
  chatListDiv.innerHTML = "";
  chats.forEach((chat, i) => {
    let div = document.createElement("div");
    div.className = "chatItem" + (i == currentChatIndex ? " active" : "");
    div.textContent = chat.title || "Untitled Chat";
    div.onclick = () => loadChat(i);

    div.oncontextmenu = (e) => {
      e.preventDefault();
      contextChatIndex = i;
      showContextMenu(e.pageX, e.pageY);
    };

    chatListDiv.appendChild(div);
  });
}

function showContextMenu(x, y) {
  contextMenu.style.display = "block";
  contextMenu.style.left = x + "px";
  contextMenu.style.top = y + "px";
}

function hideContextMenu() {
  contextMenu.style.display = "none";
  contextChatIndex = null;
}

// ------------------- Keywords -------------------
function renderKeywords() {
  let keywordDiv = document.getElementById("keywordList");
  keywordDiv.innerHTML = "";

  if (currentChatIndex == -1) return;

  let chat = chats[currentChatIndex];
  if (!chat.keywords) chat.keywords = {};

  for (let key in chat.keywords) {
    let div = document.createElement("div");
    div.className = "keywordItem";
    div.textContent = `${key} → ${chat.keywords[key]}`;
    div.onclick = () => { userInput.value = key; sendMessage(); };
    keywordDiv.appendChild(div);
  }
}

// ------------------- Chat Functions -------------------
function saveAll() {
  localStorage.setItem("chats", JSON.stringify(chats));
  localStorage.setItem("currentChatIndex", currentChatIndex);
}

function newChat() {
  chats.push({ title: "New Chat", messages: [], keywords: {} });
  currentChatIndex = chats.length - 1;
  saveAll();
  renderChatList();
  renderChat();
  chatTitle.textContent = "New Chat";
}

function loadChat(index) {
  currentChatIndex = index;
  saveAll();
  renderChatList();
  renderChat();
  chatTitle.textContent = chats[index].title;
}

function sendMessage() {
  let text = userInput.value.trim();
  if (!text || currentChatIndex == -1) return;

  let chat = chats[currentChatIndex];
  chat.messages.push({ role: "user", text });

  if (chat.messages.length == 1 && chat.title === "New Chat") {
    chat.title = text.slice(0, 20);
    chatTitle.textContent = chat.title;
  }

  if (!tryTeach(text, chat)) {
    let reply = findAnswer(text, chat);
    chat.messages.push({ role: "bot", text: reply });
  }

  userInput.value = "";
  saveAll();
  renderChatList();
  renderChat();
}

// ------------------- Keyword Memory -------------------
function tryTeach(text, chat) {
  let teachMatch = text.match(/^remember (.+) = (.+)$/i);
  if (teachMatch) {
    let keyword = teachMatch[1].trim().toLowerCase();
    let response = teachMatch[2].trim();
    chat.keywords[keyword] = response;
    chat.messages.push({ role: "bot", text: `✅ I'll remember "${keyword}" as "${response}"` });
    saveAll();
    renderChat();
    return true;
  }
  return false;
}

function findAnswer(question, chat) {
  let q = question.toLowerCase();

  if (chat.keywords[q]) return chat.keywords[q];

  let found = chat.messages.find(m => m.role === "user" && m.text.toLowerCase() === q);
  if (found) {
    let idx = chat.messages.indexOf(found);
    if (idx !== -1 && chat.messages[idx+1] && chat.messages[idx+1].role === "bot") {
      return chat.messages[idx+1].text;
    }
  }

  for (let key in knowledge) {
    if (q.includes(key)) return knowledge[key];
  }

  return `${botPrompt} I don’t know that yet. Teach me with "remember X = Y".`;
}

// ------------------- Settings & Other -------------------
function setPrompt() {
  let val = document.getElementById("promptInput").value.trim();
  if (val) {
    botPrompt = val;
    localStorage.setItem("botPrompt", botPrompt);
    alert("Prompt saved!");
  }
}

function exportMemory() {
  let blob = new Blob([JSON.stringify({chats, botPrompt}, null, 2)], { type: "application/json" });
  let link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "sakura_chats.json";
  link.click();
}

function importMemory(event) {
  let file = event.target.files[0];
  if (!file) return;
  let reader = new FileReader();
  reader.onload = function(e) {
    let data = JSON.parse(e.target.result);
    if (data.chats) chats = data.chats;
    if (data.botPrompt) botPrompt = data.botPrompt;
    currentChatIndex = chats.length ? 0 : -1;
    saveAll();
    renderChatList();
    renderChat();
  };
  reader.readAsText(file);
}

function deleteMemory() {
  let keyword = document.getElementById("deleteInput").value.trim();
  if (!keyword || currentChatIndex == -1) return;
  let chat = chats[currentChatIndex];

  if (chat.keywords[keyword.toLowerCase()]) {
    delete chat.keywords[keyword.toLowerCase()];
    saveAll();
    renderKeywords();
    alert(`Deleted keyword: "${keyword}"`);
    return;
  }

  let idx = chat.messages.findIndex(m => m.text.toLowerCase() === keyword.toLowerCase());
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
    renderChatList();
    renderChat();
  }
}

function renameChat() {
  if (currentChatIndex == -1) return;
  let newName = prompt("Enter new chat name:", chats[currentChatIndex].title);
  if (newName && newName.trim() !== "") {
    chats[currentChatIndex].title = newName.trim();
    chatTitle.textContent = chats[currentChatIndex].title;
    saveAll();
    renderChatList();
  }
}

// ------------------- Context Menu -------------------
function contextRename() {
  if (contextChatIndex == null) return;
  let newName = prompt("Rename chat:", chats[contextChatIndex].title);
  if (newName && newName.trim() !== "") {
    chats[contextChatIndex].title = newName.trim();
    if (contextChatIndex === currentChatIndex) chatTitle.textContent = newName.trim();
    saveAll();
    renderChatList();
  }
  hideContextMenu();
}

function contextDelete() {
  if (contextChatIndex == null) return;
  if (confirm("Delete this chat?")) {
    chats.splice(contextChatIndex, 1);
    if (currentChatIndex == contextChatIndex) {
      currentChatIndex = chats.length ? 0 : -1;
    }
    saveAll();
    renderChatList();
    renderChat();
  }
  hideContextMenu();
}

function contextDuplicate() {
  if (contextChatIndex == null) return;
  let original = chats[contextChatIndex];
  let copy = {
    title: original.title + " (copy)",
    messages: JSON.parse(JSON.stringify(original.messages)),
    keywords: { ...original.keywords }
  };
  chats.push(copy);
  saveAll();
  renderChatList();
  hideContextMenu();
}

function toggleTheme() {
  document.body.classList.toggle("light");
}

// Init
if (chats.length === 0) newChat();
else { renderChatList(); renderChat(); loadChat(currentChatIndex); }

document.body.addEventListener("click", hideContextMenu);

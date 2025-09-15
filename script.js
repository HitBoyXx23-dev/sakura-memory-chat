let chatBox = document.getElementById("chat");
let chatTitle = document.getElementById("chatTitle");
let userInput = document.getElementById("userInput");
let chatListDiv = document.getElementById("chatList");
let contextMenu = document.getElementById("contextMenu");

let chats = JSON.parse(localStorage.getItem("chats") || "[]");
let currentChatIndex = parseInt(localStorage.getItem("currentChatIndex") || -1);
let contextChatIndex = null;
let botPrompt = localStorage.getItem("botPrompt") || "I am your Sakura AI 🌸.";

// ------------------- Rendering -------------------
function renderChat() {
    chatBox.innerHTML = "";
    if (currentChatIndex === -1 || !chats[currentChatIndex]) return;
    let memory = chats[currentChatIndex].messages;
    memory.forEach(msg => {
        let div = document.createElement("div");
        div.className = "msg " + msg.role;
        div.innerHTML = msg.text.replace(/\n/g, "<br>");
        chatBox.appendChild(div);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
    renderKeywords();
}

function renderChatList() {
    chatListDiv.innerHTML = "";
    chats.forEach((chat, i) => {
        let div = document.createElement("div");
        div.className = "chatItem" + (i === currentChatIndex ? " active" : "");
        div.textContent = chat.title || "Untitled Chat";
        div.onclick = () => loadChat(i);
        div.oncontextmenu = e => {
            e.preventDefault();
            contextChatIndex = i;
            showContextMenu(e.pageX, e.pageY);
        };
        chatListDiv.appendChild(div);
    });
}

// ------------------- Keywords -------------------
function renderKeywords() {
    let keywordDiv = document.getElementById("keywordList");
    keywordDiv.innerHTML = "";
    if (currentChatIndex === -1) return;
    let chat = chats[currentChatIndex];
    if (!chat.keywords) chat.keywords = {};
    for (let key in chat.keywords) {
        let div = document.createElement("div");
        div.className = "keywordItem";
        div.innerHTML = `<strong>${key}</strong> → ${chat.keywords[key].replace(/\n/g,"<br>")}`;
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

// ------------------- Send & Learn -------------------
function sendMessage() {
    let text = userInput.value.trim();
    if (!text || currentChatIndex === -1) return;
    let chat = chats[currentChatIndex];
    chat.messages.push({ role: "user", text });

    if (tryTeachKeyword(text, chat)) {
        saveAll(); renderChat(); userInput.value=""; return;
    }

    let reply = getKeywordAnswer(text, chat);
    chat.messages.push({ role: "bot", text: reply });

    userInput.value="";
    saveAll(); renderChat();
}

// ------------------- Keyword Learning -------------------
function tryTeachKeyword(text, chat) {
    let match = text.match(/^remember keyword\s+(.+?)\s*=\s*([\s\S]+)$/i);
    if (match) {
        let key = match[1].trim().toLowerCase();
        let answer = match[2].trim();
        if (!chat.keywords) chat.keywords = {};
        chat.keywords[key] = answer;
        chat.messages.push({ role: "bot", text: `✅ Learned keyword:\n"${key}" → "${answer}"` });
        return true;
    }
    return false;
}

function getKeywordAnswer(text, chat) {
    if (!chat.keywords) chat.keywords = {};
    let key = text.toLowerCase().trim();
    if (chat.keywords[key]) return chat.keywords[key];
    for (let k in chat.keywords) if (key.includes(k)) return chat.keywords[k];
    return `${botPrompt} I don't know that yet. Teach me with "remember keyword <keyword> = <answer>".`;
}

// ------------------- Settings -------------------
function setPrompt() {
    let val = document.getElementById("promptInput").value.trim();
    if (val) { botPrompt = val; localStorage.setItem("botPrompt", botPrompt); alert("Prompt saved!"); }
}

function exportMemory() {
    let blob = new Blob([JSON.stringify({chats, botPrompt}, null,2)], {type:"application/json"});
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "sakura_chats.json";
    link.click();
}

function importMemory(event) {
    let file = event.target.files[0]; if (!file) return;
    let reader = new FileReader();
    reader.onload = function(e) {
        let data = JSON.parse(e.target.result);
        if (data.chats) chats = data.chats;
        if (data.botPrompt) botPrompt = data.botPrompt;
        currentChatIndex = chats.length?0:-1;
        saveAll(); renderChatList(); renderChat();
    };
    reader.readAsText(file);
}

function deleteMemory() {
    let keyword = document.getElementById("deleteInput").value.trim();
    if (!keyword || currentChatIndex === -1) return;
    let chat = chats[currentChatIndex];
    if (chat.keywords[keyword.toLowerCase()]) { delete chat.keywords[keyword.toLowerCase()]; saveAll(); renderKeywords(); alert(`Deleted keyword: "${keyword}"`); return; }
    let idx = chat.messages.findIndex(m => m.text.toLowerCase() === keyword.toLowerCase());
    if (idx !== -1) { chat.messages.splice(idx,1); saveAll(); renderChat(); alert(`Deleted message: "${keyword}"`);} 
    else { alert("No exact match found."); }
}

function clearAll() { if (confirm("Clear ALL chats?")) { chats=[]; currentChatIndex=-1; saveAll(); renderChatList(); renderChat(); } }
function renameChat() { if (currentChatIndex===-1) return; let newName = prompt("Enter new chat name:", chats[currentChatIndex].title); if (newName && newName.trim()!=="") { chats[currentChatIndex].title=newName.trim(); chatTitle.textContent=newName.trim(); saveAll(); renderChatList(); } }
function toggleTheme() { document.body.classList.toggle("light"); }

// ------------------- Context Menu -------------------
function showContextMenu(x,y){ contextMenu.style.display="block"; contextMenu.style.left=x+"px"; contextMenu.style.top=y+"px"; }
function hideContextMenu(){ contextMenu.style.display="none"; contextChatIndex=null; }
function contextRename(){ if(contextChatIndex===null)return; let newName=prompt("Rename chat:", chats[contextChatIndex].title); if(newName&&newName.trim()!==""){ chats[contextChatIndex].title=newName.trim(); if(contextChatIndex===currentChatIndex)chatTitle.textContent=newName.trim(); saveAll(); renderChatList(); } hideContextMenu(); }
function contextDelete(){ if(contextChatIndex===null)return; if(confirm("Delete this chat?")){ chats.splice(contextChatIndex,1); if(currentChatIndex===contextChatIndex) currentChatIndex=chats.length?0:-1; saveAll(); renderChatList(); renderChat(); } hideContextMenu(); }
function contextDuplicate(){ if(contextChatIndex===null)return; let original=chats[contextChatIndex]; let copy={ title: original.title+" (copy)", messages: JSON.parse(JSON.stringify(original.messages)), keywords:{...original.keywords} }; chats.push(copy); saveAll(); renderChatList(); hideContextMenu(); }

// ------------------- Init -------------------
if(chats.length===0)newChat(); else { renderChatList(); renderChat(); loadChat(currentChatIndex); }
document.body.addEventListener("click", hideContextMenu);

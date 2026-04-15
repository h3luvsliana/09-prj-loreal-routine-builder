/* DOM ELEMENTS */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateBtn = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const productSearchInput = document.getElementById("productSearch");

const clearAllBtn = document.getElementById("clearAllSelected");
const rtlToggle = document.getElementById("rtlToggle");
const userInput = document.getElementById("userInput");

/* GLOBAL STATE */
let allProducts = [];
let selectedProducts = JSON.parse(localStorage.getItem("selectedProducts")) || [];
let lastRoutine = null;
let conversationHistory = [];

/* INITIAL PLACEHOLDER */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* ——————————————————————————————
   OPENAI VIA CLOUDFLARE WORKER
—————————————————————————————— */
async function askOpenAI(messages) {
  try {
    const response = await fetch("https://loreal-routine-worker.lianarenarocquel.workers.dev/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages })
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "<p>Sorry, I didn’t understand that.</p>";
  } catch (err) {
    console.error("Worker error:", err);
    return "<p>Sorry, something went wrong while generating a response.</p>";
  }
}

/* ——————————————————————————————
   LOAD PRODUCTS
—————————————————————————————— */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products;
  renderSelectedProducts();
}

/* ——————————————————————————————
   RENDER PRODUCT CARDS
—————————————————————————————— */
function displayProducts(products) {
  if (!products || products.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products match your filters.
      </div>
    `;
    return;
  }

  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedProducts.some((p) => p.id === product.id);

      return `
        <div class="product-card ${isSelected ? "selected" : ""}" data-id="${product.id}">
          <img src="${product.image}" alt="${product.name}">
          <div class="product-info">
            <h3>${product.name}</h3>
            <p>${product.brand}</p>
          </div>

          <div class="description-overlay">
            ${product.description}
          </div>
        </div>
      `;
    })
    .join("");

  attachCardListeners();
}

/* CLICK HANDLERS FOR PRODUCT CARDS */
function attachCardListeners() {
  document.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = parseInt(card.dataset.id);
      toggleProductSelection(id);
    });
  });
}

/* ADD/REMOVE PRODUCT FROM SELECTION */
function toggleProductSelection(id) {
  const product = allProducts.find((p) => p.id === id);
  if (!product) return;

  const exists = selectedProducts.some((p) => p.id === id);

  if (exists) {
    selectedProducts = selectedProducts.filter((p) => p.id !== id);
  } else {
    selectedProducts.push(product);
  }

  saveSelection();
  renderSelectedProducts();
  refreshVisibleProducts();
}

/* SAVE TO LOCALSTORAGE */
function saveSelection() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

/* RENDER SELECTED PRODUCTS LIST */
function renderSelectedProducts() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `<p>No products selected yet.</p>`;
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (p) => `
      <div class="selected-item">
        <span>${p.name}</span>
        <button class="remove-btn" data-id="${p.id}" aria-label="Remove ${p.name}">✕</button>
      </div>
    `
    )
    .join("");

  attachRemoveListeners();
}

/* REMOVE BUTTONS IN SELECTED LIST */
function attachRemoveListeners() {
  document.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.id);
      toggleProductSelection(id);
    });
  });
}

/* CLEAR ALL SELECTED */
if (clearAllBtn) {
  clearAllBtn.addEventListener("click", () => {
    selectedProducts = [];
    saveSelection();
    renderSelectedProducts();
    refreshVisibleProducts();
  });
}

/* ——————————————————————————————
   FILTERING
—————————————————————————————— */
function getFilteredProducts() {
  const selectedCategory = categoryFilter.value;
  const searchTerm = productSearchInput
    ? productSearchInput.value.trim().toLowerCase()
    : "";

  let filtered = allProducts;

  if (selectedCategory) {
    filtered = filtered.filter((p) => p.category === selectedCategory);
  }

  if (searchTerm) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm) ||
        p.brand.toLowerCase().includes(searchTerm) ||
        p.description.toLowerCase().includes(searchTerm)
    );
  }

  return filtered;
}

function refreshVisibleProducts() {
  const filtered = getFilteredProducts();
  displayProducts(filtered);
}

categoryFilter.addEventListener("change", refreshVisibleProducts);

if (productSearchInput) {
  productSearchInput.addEventListener("input", refreshVisibleProducts);
}

/* ——————————————————————————————
   RTL TOGGLE + AUTO-DETECT
—————————————————————————————— */
const htmlEl = document.documentElement;

if (rtlToggle) {
  rtlToggle.addEventListener("click", () => {
    htmlEl.dir = htmlEl.dir === "rtl" ? "ltr" : "rtl";
  });
}

if (userInput) {
  userInput.addEventListener("input", () => {
    const value = userInput.value.trim();
    const rtlPattern = /[\u0590-\u05FF\u0600-\u06FF]/; // Hebrew + Arabic

    htmlEl.dir = rtlPattern.test(value) ? "rtl" : "ltr";
  });
}

/* ——————————————————————————————
   CHAT HISTORY HELPER
—————————————————————————————— */
function addToHistory(role, content) {
  conversationHistory.push({ role, content });
}

/* ——————————————————————————————
   PREMIUM CHATBOX HELPERS
—————————————————————————————— */
function addBubble(content, sender = "assistant") {
  const bubble = document.createElement("div");
  bubble.classList.add(sender === "user" ? "user-msg" : "assistant-msg");
  bubble.innerHTML = content;
  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function showTyping() {
  const typing = document.createElement("div");
  typing.classList.add("assistant-msg", "typing-bubble");

  typing.innerHTML = `
    <p><strong>GlowUp inbound… ✨</strong></p>
    <div class="typing">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;

  chatWindow.appendChild(typing);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return typing;
}

/* ——————————————————————————————
   AI-POWERED ROUTINE GENERATION
—————————————————————————————— */
generateBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    addBubble("<p>Please select at least one product first.</p>");
    return;
  }

  addBubble("<p>Generate a routine with my selected products.</p>", "user");
  addToHistory("user", "Generate a routine with my selected products.");

  const productList = selectedProducts
    .map((p) => `${p.name} (${p.category})`)
    .join(", ");

  const routinePrompt = [
    {
      role: "system",
      content: `
You are a helpful L’Oréal beauty assistant.
You ONLY answer questions about:
- L’Oréal products
- Beauty routines
- Haircare, skincare, makeup
- Product recommendations

If a user asks anything unrelated, politely refuse and redirect to beauty topics.

Format ALL responses using clean HTML.
Use <p> for paragraphs.
Use <ul><li> for bullet points.
Use <strong> for product names.
Never include <html>, <body>, or any page-level tags.
      `
    },
    {
      role: "user",
      content: `Here are the products the user selected: ${productList}. Build a personalized routine using ONLY these products.`
    }
  ];

  const typing = showTyping();
  const routine = await askOpenAI(routinePrompt);
  typing.remove();

  lastRoutine = routine;
  addBubble(routine);
  addToHistory("assistant", routine);
});

/* ——————————————————————————————
   AI-POWERED CHAT
—————————————————————————————— */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = e.target.userInput.value.trim();
  if (!msg) return;

  addBubble(`<p>${msg}</p>`, "user");
  addToHistory("user", msg);

  const messages = [
    {
      role: "system",
      content: `
You are a helpful L’Oréal beauty assistant.
You ONLY answer questions about:
- L’Oréal products
- Beauty routines
- Haircare, skincare, makeup
- Product recommendations

If a user asks anything unrelated, politely refuse and redirect to beauty topics.

Format ALL responses using clean HTML.
Use <p> for paragraphs.
Use <ul><li> for bullet points.
Use <strong> for product names.
Never include <html>, <body>, or any page-level tags.
      `
    },
    ...conversationHistory,
    { role: "user", content: msg }
  ];

  if (!lastRoutine && /my routine|these products|my products|use them/i.test(msg)) {
    const warn = "<p>Generate a routine first so I know which products you're using.</p>";
    addBubble(warn);
    addToHistory("assistant", warn);
    e.target.reset();
    return;
  }

  if (lastRoutine) {
    messages.push({
      role: "system",
      content: `Here is the user's current routine: ${lastRoutine}`
    });
  }

  const typing = showTyping();
  const aiReply = await askOpenAI(messages);
  typing.remove();

  addBubble(aiReply);
  addToHistory("assistant", aiReply);

  e.target.reset();
});

/* INIT */
loadProducts();

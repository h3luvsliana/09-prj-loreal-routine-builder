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
   OPENAI HELPER
—————————————————————————————— */
async function askOpenAI(messages) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages
    })
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Sorry, I didn’t understand that.";
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
        <button class="remove-btn" data-id="${p.id}">✕</button>
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

/* RTL TOGGLE */
if (rtlToggle) {
  rtlToggle.addEventListener("click", () => {
    document.body.classList.toggle("rtl");
  });
}

/* ——————————————————————————————
   CHAT HELPERS
—————————————————————————————— */
function appendChat(role, text) {
  const label = role === "You" || role === "user" ? "You" : "AI";
  chatWindow.innerHTML += `<p class="chat-line chat-${label.toLowerCase()}"><strong>${label}:</strong> ${text}</p>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function addToHistory(role, content) {
  conversationHistory.push({ role, content });
}

/* ——————————————————————————————
   AI-POWERED ROUTINE GENERATION
—————————————————————————————— */
generateBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    appendChat("AI", "Please select at least one product first.");
    return;
  }

  appendChat("You", "Generate a routine with my selected products.");
  addToHistory("user", "Generate a routine with my selected products.");

  const productList = selectedProducts
    .map((p) => `${p.name} (${p.category})`)
    .join(", ");

  const routinePrompt = [
    {
      role: "system",
      content:
        "You are a professional skincare and beauty advisor. Create clear, structured routines using only the products the user selected."
    },
    {
      role: "user",
      content: `Here are the products the user selected: ${productList}. Build a personalized routine using ONLY these products.`
    }
  ];

  const routine = await askOpenAI(routinePrompt);

  lastRoutine = routine;
  appendChat("AI", routine);
  addToHistory("assistant", routine);
});

/* ——————————————————————————————
   AI-POWERED CHAT
—————————————————————————————— */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = e.target.userInput.value.trim();
  if (!msg) return;

  appendChat("You", msg);
  addToHistory("user", msg);

  const messages = [
    {
      role: "system",
      content:
        "You are a helpful beauty advisor. Answer questions clearly and naturally."
    },
    ...conversationHistory,
    { role: "user", content: msg }
  ];

  if (!lastRoutine && /my routine|these products|my products|use them/i.test(msg)) {
    const warn =
      "Generate a routine first so I know which products you're using.";
    appendChat("AI", warn);
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

  const aiReply = await askOpenAI(messages);

  appendChat("AI", aiReply);
  addToHistory("assistant", aiReply);

  e.target.reset();
});

/* INIT */
loadProducts();

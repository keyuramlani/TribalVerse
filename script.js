import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Supabase config
const SUPABASE_URL = "https://iesnempeybdjfrxdwsxu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imllc25lbXBleWJkamZyeGR3c3h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDAyNzYsImV4cCI6MjA3MzMxNjI3Nn0.a22zjKUjtw3hKlfqqC7NBJ05Qqlbc3rWlf-zlRpCL3s";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 🌍 Currency Conversion
let USD_TO_INR = 83; // fallback default (approx)

async function loadExchangeRate() {
  try {
    const res = await fetch("https://api.exchangerate.host/latest?base=USD&symbols=INR");
    const data = await res.json();
    USD_TO_INR = data.rates.INR;
    console.log("Live USD → INR rate loaded:", USD_TO_INR);
  } catch (err) {
    console.warn("Using fallback INR rate:", USD_TO_INR);
  }
}

// Global state
let products = [];
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let currentProduct = null;
let currentCategory = "all";

// DOM elements
const productsGrid = document.getElementById("productsGrid");
const cartBtn = document.getElementById("cartBtn");
const cartSidebar = document.getElementById("cartSidebar");
const closeCart = document.getElementById("closeCart");
const cartItems = document.getElementById("cartItems");
const cartCount = document.getElementById("cartCount");
const cartTotal = document.getElementById("cartTotal");
const productModal = document.getElementById("productModal");
const closeModal = document.getElementById("closeModal");
const searchInput = document.getElementById("searchInput");
const categoryBtns = document.querySelectorAll(".category-btn");
const addToCartBtn = document.getElementById("addToCartBtn");
const checkoutBtn = document.getElementById("checkoutBtn");

// Init
loadExchangeRate();
loadProducts();
updateCart();

// Load products from Supabase
async function loadProducts() {
  const { data, error } = await supabase.from("products1").select("*");
  if (error) {
    console.error("Error fetching products:", error);
    return;
  }
  products = data.map(p => ({ ...p, description: p.desc })); // map desc → description
  renderProducts();
}

// Render products
function renderProducts() {
  const filtered = currentCategory === "all" ? products : products.filter(p => p.category === currentCategory);
  productsGrid.innerHTML = filtered
    .map(p => `
      <div class="product-card p-4" data-id="${p.id}">
        <img src="${p.image}" class="w-full h-48 object-cover rounded mb-2" />
        <h3 class="font-semibold">${p.name}</h3>
        <p class="text-gray-500 text-sm">${p.origin}</p>
        <div class="flex justify-between items-center mt-2">
          <span class="font-bold text-green-700">₹${(p.price * USD_TO_INR).toFixed(2)}</span>
          <button class="addCartBtn bg-green-700 text-white px-3 py-1 rounded"><i class="fas fa-cart-plus"></i></button>
        </div>
      </div>
    `).join("");

  // Click handlers
  document.querySelectorAll(".product-card").forEach(card => {
    card.addEventListener("click", () => showProductDetail(parseInt(card.dataset.id)));
  });

  document.querySelectorAll(".addCartBtn").forEach((btn, idx) => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const productElement = e.target.closest('.product-card');
      const productId = parseInt(productElement.dataset.id);
      const product = products.find(p => p.id === productId);
      if (product) {
        addToCart(product);
      }
    });
  });
}

// Search filter
searchInput.addEventListener("input", e => {
  const term = e.target.value.toLowerCase();
  document.querySelectorAll(".product-card").forEach(card => {
    const name = card.querySelector("h3").textContent.toLowerCase();
    card.style.display = name.includes(term) ? "block" : "none";
  });
});

// Category filter
categoryBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    categoryBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentCategory = btn.dataset.category;
    renderProducts();
  });
});

// Cart sidebar
cartBtn.addEventListener("click", () => cartSidebar.classList.remove("translate-x-full"));
closeCart.addEventListener("click", () => cartSidebar.classList.add("translate-x-full"));

// Modal
function showProductDetail(id) {
  currentProduct = products.find(p => p.id === id);
  if (!currentProduct) return;

  document.getElementById("modalTitle").textContent = currentProduct.name;
  document.getElementById("modalImage").src = currentProduct.image;
  document.getElementById("modalDescription").textContent = currentProduct.description;
  document.getElementById("modalPrice").textContent = `₹${(currentProduct.price * USD_TO_INR).toFixed(2)}`;
  document.getElementById("modalOrigin").textContent = `Origin: ${currentProduct.origin}`;
  document.getElementById("modalQuantity").value = 1;

  productModal.classList.remove("hidden");
  productModal.classList.add("flex");
}
closeModal.addEventListener("click", () => productModal.classList.add("hidden"));

// Add to cart
addToCartBtn.addEventListener("click", () => {
  const qty = parseInt(document.getElementById("modalQuantity").value);
  addToCart(currentProduct, qty);
  productModal.classList.add("hidden");
});

function addToCart(product, qty = 1) {
  const item = cart.find(i => i.id === product.id);
  if (item) item.quantity += qty;
  else cart.push({ ...product, quantity: qty });
  saveCart();
  updateCart();
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  updateCart();
}
window.removeFromCart = removeFromCart;

function updateCart() {
  cartCount.textContent = cart.reduce((s, i) => s + i.quantity, 0);
  cartItems.innerHTML =
    cart.length === 0
      ? `<p class="text-gray-500">Cart is empty</p>`
      : cart.map(i => `
        <div class="flex justify-between items-center mb-2 border-b pb-2">
          <div>
            <h4 class="font-semibold">${i.name}</h4>
            <p>₹${(i.price * USD_TO_INR).toFixed(2)} × ${i.quantity}</p>
          </div>
          <button class="text-red-500" onclick="removeFromCart(${i.id})">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `).join("");
  cartTotal.textContent = `₹${(cart.reduce((s, i) => s + i.price * i.quantity, 0) * USD_TO_INR).toFixed(2)}`;
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

// Checkout
checkoutBtn.addEventListener("click", async () => {
  if (cart.length === 0) return alert("Cart is empty!");
  window.location.href = "checkout.html";
});

const products = document.querySelectorAll(".product");
const cartCount = document.getElementById("cart-count");
const cartItems = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");
const clearCartBtn = document.getElementById("clear-cart");

const cart = new Map();

const formatMoney = (value) => {
  return `$${value.toFixed(2)}`;
};

const renderCart = () => {
  cartItems.innerHTML = "";

  if (cart.size === 0) {
    const empty = document.createElement("p");
    empty.className = "cart-empty";
    empty.textContent = "Aún no agregas productos.";
    cartItems.appendChild(empty);
    cartCount.textContent = "0";
    cartTotal.textContent = "$0.00";
    return;
  }

  let totalItems = 0;
  let totalPrice = 0;

  cart.forEach((item) => {
    totalItems += item.quantity;
    totalPrice += item.price * item.quantity;

    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <strong>${item.name}</strong>
      <span>x${item.quantity} · ${formatMoney(item.price * item.quantity)}</span>
    `;
    cartItems.appendChild(row);
  });

  cartCount.textContent = String(totalItems);
  cartTotal.textContent = formatMoney(totalPrice);
};

const addToCart = (name, price) => {
  if (cart.has(name)) {
    const item = cart.get(name);
    item.quantity += 1;
    cart.set(name, item);
  } else {
    cart.set(name, { name, price, quantity: 1 });
  }
  renderCart();
};

products.forEach((product) => {
  const button = product.querySelector("button");
  button.addEventListener("click", () => {
    const name = product.dataset.name;
    const price = Number(product.dataset.price);
    addToCart(name, price);
  });
});

clearCartBtn.addEventListener("click", () => {
  cart.clear();
  renderCart();
});

renderCart();

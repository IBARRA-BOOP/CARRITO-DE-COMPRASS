const products = document.querySelectorAll(".product");
const mediaButtons = document.querySelectorAll(".media-button");
const currencyButtons = document.querySelectorAll(".currency-btn");

const cartCount = document.getElementById("cart-count");
const cartItems = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");
const checkoutTotal = document.getElementById("checkout-total");
const clearCartBtn = document.getElementById("clear-cart");
const payBtn = document.getElementById("pay-btn");
const paymentForm = document.getElementById("payment-form");
const paymentMessage = document.getElementById("payment-message");

const payerName = document.getElementById("payer-name");
const payerEmail = document.getElementById("payer-email");
const cardNumber = document.getElementById("card-number");
const cardExpiry = document.getElementById("card-expiry");
const cardCvv = document.getElementById("card-cvv");

const themeToggle = document.getElementById("theme-toggle");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightbox-image");
const lightboxClose = document.getElementById("lightbox-close");
const thankYou = document.getElementById("thank-you");

const cart = new Map();

const exchangeRate = 7.8;
let activeCurrency = "GTQ";
let thankYouTimer;
const emailSuffix = "@gmail.com";

const currencyFormatters = {
  GTQ: new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ" }),
  USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
};

const formatMoney = (value, currency = activeCurrency) => {
  return currencyFormatters[currency].format(value);
};

const convertFromGTQ = (value, currency = activeCurrency) => {
  if (currency === "USD") {
    return value / exchangeRate;
  }
  return value;
};

const getCartSummary = () => {
  let totalItems = 0;
  let totalPriceGtq = 0;
  const items = [];

  cart.forEach((item) => {
    totalItems += item.quantity;
    totalPriceGtq += item.priceGtq * item.quantity;
    items.push({
      name: item.name,
      quantity: item.quantity,
      priceGtq: item.priceGtq,
      subtotalGtq: item.priceGtq * item.quantity,
    });
  });

  return { totalItems, totalPriceGtq, items };
};

const setMessage = (text, type) => {
  paymentMessage.textContent = text;
  paymentMessage.classList.remove("error", "success");
  if (type) {
    paymentMessage.classList.add(type);
  }
};

const showThankYou = () => {
  clearTimeout(thankYouTimer);
  thankYou.classList.add("show");
  thankYou.setAttribute("aria-hidden", "false");
  thankYouTimer = setTimeout(() => {
    thankYou.classList.remove("show");
    thankYou.setAttribute("aria-hidden", "true");
  }, 2200);
};

const updateProductPrices = () => {
  products.forEach((product) => {
    const priceGtq = Number(product.dataset.priceGtq);
    const priceEl = product.querySelector("[data-role='price']");
    if (priceEl) {
      const converted = convertFromGTQ(priceGtq);
      priceEl.textContent = formatMoney(converted);
    }
  });
};

const renderCart = () => {
  cartItems.innerHTML = "";
  const { totalItems, totalPriceGtq, items } = getCartSummary();

  if (cart.size === 0) {
    const empty = document.createElement("p");
    empty.className = "cart-empty";
    empty.textContent = "Aun no agregas productos.";
    cartItems.appendChild(empty);
  } else {
    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML = `
        <strong>${item.name}</strong>
        <span>x${item.quantity} - ${formatMoney(convertFromGTQ(item.subtotalGtq))}</span>
      `;
      cartItems.appendChild(row);
    });
  }

  cartCount.textContent = String(totalItems);
  cartTotal.textContent = formatMoney(convertFromGTQ(totalPriceGtq));
  checkoutTotal.textContent = formatMoney(convertFromGTQ(totalPriceGtq));
  payBtn.disabled = cart.size === 0;
};

const addToCart = (name, priceGtq) => {
  if (cart.has(name)) {
    const item = cart.get(name);
    item.quantity += 1;
    cart.set(name, item);
  } else {
    cart.set(name, { name, priceGtq, quantity: 1 });
  }
  renderCart();
};

const setCurrency = (currency, persist = true) => {
  activeCurrency = currency;
  currencyButtons.forEach((button) => {
    const isActive = button.dataset.currency === currency;
    button.setAttribute("aria-pressed", String(isActive));
  });
  if (persist) {
    localStorage.setItem("currency", currency);
  }
  updateProductPrices();
  renderCart();
};

const normalizeDigits = (value) => value.replace(/\D/g, "");

const sanitizeName = (value) => {
  return value
    .normalize("NFD")
    .replace(/[^\p{L}\p{M}\s]/gu, "")
    .replace(/\s{2,}/g, " ");
};

const sanitizeEmailLocal = (value) => {
  return value.replace(/[^a-zA-Z0-9._-]/g, "");
};

const formatEmail = (value) => {
  const noSpaces = value.replace(/\s/g, "");
  const local = noSpaces.split("@")[0] || "";
  const safeLocal = sanitizeEmailLocal(local);
  return `${safeLocal}${emailSuffix}`;
};

const parseExpiry = (value) => {
  const cleaned = value.replace(/\s/g, "");
  const match = cleaned.match(/^(\d{2})[/-]?(\d{2}|\d{4})$/);
  if (!match) return null;
  const month = Number(match[1]);
  let year = Number(match[2]);
  if (year < 100) year += 2000;
  if (month < 1 || month > 12) return null;
  return { month, year };
};

const isExpiryValid = (value) => {
  const parsed = parseExpiry(value);
  if (!parsed) return false;
  const { month, year } = parsed;
  const now = new Date();
  const expiryDate = new Date(year, month);
  return expiryDate > now;
};

const validatePayment = () => {
  const nameValue = payerName.value.trim();
  if (nameValue.length < 3) {
    return "Ingresa tu nombre completo.";
  }

  const emailValue = payerEmail.value.trim();
  const localPart = emailValue.endsWith(emailSuffix)
    ? emailValue.slice(0, -emailSuffix.length)
    : "";
  if (localPart.length === 0 || !emailValue.endsWith(emailSuffix)) {
    return "Ingresa un correo valido.";
  }

  const cardValue = normalizeDigits(cardNumber.value);
  if (cardValue.length !== 16) {
    return "Numero de tarjeta invalido.";
  }

  if (!isExpiryValid(cardExpiry.value)) {
    return "Fecha de vencimiento invalida.";
  }

  const cvvValue = normalizeDigits(cardCvv.value);
  if (!/^\d{3}$/.test(cvvValue)) {
    return "CVV invalido.";
  }

  return "";
};

const generateReceipt = (summary) => {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    setMessage("No se pudo cargar el generador de PDF.", "error");
    return false;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const now = new Date();
  const dateLabel = now.toLocaleString("es-GT");
  const receiptId = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  const currencyLabel = activeCurrency === "USD" ? "USD" : "GTQ";
  const rateLabel = activeCurrency === "USD" ? `1 USD = ${exchangeRate} GTQ` : `1 USD = ${exchangeRate} GTQ`;

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  const accent = [23, 208, 196];
  const dark = [7, 27, 38];
  const soft = [120, 170, 184];

  doc.setFillColor(6, 33, 47);
  doc.rect(0, 0, pageWidth, 48, "F");
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(0, 44, pageWidth, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(245, 252, 255);
  doc.text("Recibo de compra", marginX, 22);
  doc.setFontSize(11);
  doc.setTextColor(197, 231, 238);
  doc.text(`No. ${receiptId}`, marginX, 32);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text(`Cliente: ${summary.name}`, marginX, 62);
  doc.text(`Correo: ${summary.email}`, marginX, 69);
  doc.text(`Fecha: ${dateLabel}`, marginX, 76);

  doc.setTextColor(soft[0], soft[1], soft[2]);
  doc.text(`Moneda: ${currencyLabel}`, pageWidth - marginX, 62, { align: "right" });
  doc.text(rateLabel, pageWidth - marginX, 69, { align: "right" });

  let y = 92;
  doc.setDrawColor(21, 86, 100);
  doc.setLineWidth(0.5);
  doc.line(marginX, y, marginX + contentWidth, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text("Producto", marginX, y);
  doc.text("Cant.", marginX + 104, y);
  doc.text("Precio", marginX + 128, y);
  doc.text("Subtotal", marginX + 162, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  summary.items.forEach((item) => {
    doc.text(item.name, marginX, y);
    doc.text(String(item.quantity), marginX + 108, y);
    doc.text(formatMoney(convertFromGTQ(item.priceGtq)), marginX + 128, y);
    doc.text(formatMoney(convertFromGTQ(item.subtotalGtq)), marginX + 162, y);
    y += 7;
  });

  y += 2;
  doc.setDrawColor(200, 216, 222);
  doc.line(marginX, y, marginX + contentWidth, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text("Total", marginX + 128, y);
  doc.text(formatMoney(convertFromGTQ(summary.totalPriceGtq)), marginX + 162, y);

  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 130, 140);
  doc.text("Gracias por tu compra.", marginX, y);

  const fileStamp = now.toISOString().slice(0, 10);
  doc.save(`recibo_${fileStamp}.pdf`);
  return true;
};

const initTheme = () => {
  const stored = localStorage.getItem("theme");
  if (stored) {
    document.body.dataset.theme = stored;
  } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
    document.body.dataset.theme = "light";
  } else {
    document.body.dataset.theme = "dark";
  }
  const isDark = document.body.dataset.theme === "dark";
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.textContent = isDark ? "Modo claro" : "Modo oscuro";
};

const initCurrency = () => {
  const stored = localStorage.getItem("currency");
  if (stored === "GTQ" || stored === "USD") {
    activeCurrency = stored;
  }
  setCurrency(activeCurrency, false);
};

const openLightbox = (src, alt) => {
  lightboxImage.src = src;
  lightboxImage.alt = alt || "Vista previa";
  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
};

const closeLightbox = () => {
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImage.src = "";
};

themeToggle.addEventListener("click", () => {
  const isDark = document.body.dataset.theme === "dark";
  const nextTheme = isDark ? "light" : "dark";
  document.body.dataset.theme = nextTheme;
  localStorage.setItem("theme", nextTheme);
  themeToggle.setAttribute("aria-pressed", String(!isDark));
  themeToggle.textContent = !isDark ? "Modo claro" : "Modo oscuro";
});

currencyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setCurrency(button.dataset.currency);
  });
});

cardNumber.addEventListener("input", () => {
  const digits = normalizeDigits(cardNumber.value).slice(0, 16);
  cardNumber.value = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
});

cardExpiry.addEventListener("input", () => {
  const digits = normalizeDigits(cardExpiry.value);
  if (digits.length <= 2) {
    cardExpiry.value = digits;
  } else {
    cardExpiry.value = `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
  }
});

cardCvv.addEventListener("input", () => {
  cardCvv.value = normalizeDigits(cardCvv.value).slice(0, 3);
});

payerName.addEventListener("input", () => {
  payerName.value = sanitizeName(payerName.value);
});

const ensureEmail = () => {
  if (!payerEmail.value || !payerEmail.value.includes("@")) {
    payerEmail.value = emailSuffix;
  } else if (!payerEmail.value.endsWith(emailSuffix)) {
    payerEmail.value = formatEmail(payerEmail.value);
  }
};

const moveEmailCaret = () => {
  const atIndex = payerEmail.value.indexOf("@");
  if (atIndex >= 0) {
    payerEmail.setSelectionRange(atIndex, atIndex);
  }
};

payerEmail.addEventListener("focus", () => {
  ensureEmail();
  moveEmailCaret();
});

payerEmail.addEventListener("click", () => {
  moveEmailCaret();
});

payerEmail.addEventListener("input", () => {
  payerEmail.value = formatEmail(payerEmail.value);
  moveEmailCaret();
});

products.forEach((product) => {
  const button = product.querySelector(".btn-primary");
  button.addEventListener("click", () => {
    const name = product.dataset.name;
    const priceGtq = Number(product.dataset.priceGtq);
    addToCart(name, priceGtq);
    setMessage("", "");
  });
});

mediaButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const img = button.querySelector("img");
    openLightbox(button.dataset.preview, img ? img.alt : "");
  });
});

lightboxClose.addEventListener("click", closeLightbox);

lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) {
    closeLightbox();
  }
});

thankYou.addEventListener("click", () => {
  clearTimeout(thankYouTimer);
  thankYou.classList.remove("show");
  thankYou.setAttribute("aria-hidden", "true");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && lightbox.classList.contains("open")) {
    closeLightbox();
  }
});

clearCartBtn.addEventListener("click", () => {
  cart.clear();
  renderCart();
  setMessage("Carrito vaciado.", "success");
});

paymentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (cart.size === 0) {
    setMessage("Agrega productos antes de pagar.", "error");
    return;
  }

  const error = validatePayment();
  if (error) {
    setMessage(error, "error");
    return;
  }

  const summary = getCartSummary();
  const receiptOk = generateReceipt({
    name: payerName.value.trim(),
    email: payerEmail.value.trim(),
    totalPriceGtq: summary.totalPriceGtq,
    items: summary.items,
  });
  if (!receiptOk) {
    return;
  }
  setMessage("Pago validado. Recibo PDF generado.", "success");
  showThankYou();
});

initTheme();
initCurrency();
renderCart();

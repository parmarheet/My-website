(function () {
  const STORAGE_KEYS = {
    cart: "luma_cart",
    user: "luma_user",
    users: "luma_users",
    orders: "luma_orders",
    products: "luma_products",
    lastOrder: "luma_last_order",
  };

  const seededProducts = mergeSeedProducts(
    readStorage(STORAGE_KEYS.products, []),
    window.LUMA_DATA.products,
  );

  const state = {
    cart: readStorage(STORAGE_KEYS.cart, []),
    user: readStorage(STORAGE_KEYS.user, null),
    users: readStorage(STORAGE_KEYS.users, window.LUMA_DATA.users),
    orders: readStorage(STORAGE_KEYS.orders, window.LUMA_DATA.orders),
    products: seededProducts,
  };

  writeStorage(STORAGE_KEYS.products, state.products);

  const page = document.body.dataset.page;

  syncSearchInputs();
  updateCartCount();
  initStickyNav();
  initAssistant();

  switch (page) {
    case "home":
      renderCategoryGrid();
      renderFeaturedProducts();
      break;
    case "catalog":
      initCatalogPage();
      break;
    case "product":
      renderProductPage();
      break;
    case "checkout":
      renderCheckout();
      break;
    case "account":
      renderAccountPage();
      break;
    case "admin":
      renderAdminPage();
      break;
    case "confirmation":
      renderConfirmationPage();
      break;
    default:
      break;
  }

  function readStorage(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function money(value) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function mergeSeedProducts(storedProducts, seeded) {
    const byId = new Map();
    seeded.forEach((product) => byId.set(product.id, product));
    storedProducts.forEach((product) => {
      if (!byId.has(product.id)) {
        byId.set(product.id, product);
      }
    });
    return Array.from(byId.values()).sort((a, b) => a.id - b.id);
  }

  function slugify(value) {
    return String(value).toLowerCase().replace(/\s+/g, "-");
  }

  function getQuery() {
    return new URLSearchParams(window.location.search);
  }

  function syncSearchInputs() {
    document.querySelectorAll("[data-search-input]").forEach((input) => {
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && input.value.trim()) {
          window.location.href = `catalog.html?search=${encodeURIComponent(input.value.trim())}`;
        }
      });
    });
  }

  function initStickyNav() {
    const nav = document.querySelector("[data-sticky-nav]");
    if (!nav) {
      return;
    }

    const updateState = () => {
      nav.classList.toggle("topbar--scrolled", window.scrollY > 10);
    };

    updateState();
    window.addEventListener("scroll", updateState, { passive: true });
  }

  function updateCartCount() {
    const count = state.cart.reduce((total, item) => total + item.quantity, 0);
    document.querySelectorAll("[data-cart-count]").forEach((node) => {
      node.textContent = count;
    });
  }

  function initAssistant() {
    const widget = document.querySelector("[data-assistant]");
    if (!widget) {
      return;
    }

    const toggle = widget.querySelector("[data-assistant-toggle]");
    const close = widget.querySelector("[data-assistant-close]");
    const panel = widget.querySelector(".assistant-panel");
    const messages = widget.querySelector("[data-assistant-messages]");
    const form = widget.querySelector("[data-assistant-form]");
    const promptButtons = widget.querySelectorAll("[data-assistant-prompt]");

    const seedMessage = assistantGreeting();
    appendAssistantMessage(messages, seedMessage, "bot");

    const openPanel = () => {
      panel.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
    };

    const closePanel = () => {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    };

    toggle.addEventListener("click", () => {
      if (panel.hidden) {
        openPanel();
      } else {
        closePanel();
      }
    });

    close.addEventListener("click", closePanel);

    promptButtons.forEach((button) => {
      button.addEventListener("click", () => handleAssistantPrompt(button.dataset.assistantPrompt));
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = form.elements.message;
      const value = input.value.trim();
      if (!value) {
        return;
      }
      handleAssistantPrompt(value);
      input.value = "";
    });

    function handleAssistantPrompt(prompt) {
      appendAssistantMessage(messages, prompt, "user");
      const reply = generateAssistantReply(prompt);
      window.setTimeout(() => {
        appendAssistantMessage(messages, reply, "bot");
      }, 260);
      openPanel();
    }
  }

  function assistantGreeting() {
    if (page === "product") {
      return "I can recommend matching products, gifting ideas, and quick details about this item.";
    }
    if (page === "checkout") {
      return "I can help with payment options, shipping guidance, and a quick cart review.";
    }
    if (page === "admin") {
      return "I can summarize performance, point out low stock, and highlight strong product categories.";
    }
    return "Ask me for product ideas, summer sale picks, accessories, or best sellers.";
  }

  function appendAssistantMessage(container, text, type) {
    const bubble = document.createElement("div");
    bubble.className = `assistant-message assistant-message--${type}`;
    bubble.textContent = text;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
  }

  function generateAssistantReply(prompt) {
    const text = prompt.toLowerCase();
    const featured = state.products.filter((product) => product.featured);
    const accessories = state.products.filter((product) => product.category === "Accessories");
    const lowStock = state.products.filter((product) => product.stock <= 10);
    const cartTotalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);

    if (text.includes("summer")) {
      return summarizeProducts(
        state.products.filter((product) =>
          ["Accessories", "Women", "Men"].includes(product.category) || product.badge.toLowerCase().includes("summer"),
        ),
        "Summer-ready picks",
      );
    }

    if (text.includes("accessor")) {
      return summarizeProducts(accessories, "Top accessories");
    }

    if (text.includes("audio") || text.includes("speaker") || text.includes("earbuds") || text.includes("headphone")) {
      return summarizeProducts(
        state.products.filter((product) =>
          ["Nova Studio Headphones", "Arc Desk Speaker", "Luxe Earbuds"].includes(product.name),
        ),
        "Audio favorites",
      );
    }

    if (text.includes("travel")) {
      return summarizeProducts(
        state.products.filter((product) =>
          ["Atlas Carry Pack", "North Weekender", "Aurelia Tote"].includes(product.name),
        ),
        "Travel-ready options",
      );
    }

    if (text.includes("best seller") || text.includes("best sellers") || text.includes("top rated")) {
      return summarizeProducts(
        [...featured].sort((a, b) => b.rating - a.rating),
        "Best sellers right now",
      );
    }

    if (text.includes("low stock")) {
      return lowStock.length
        ? `Low stock alert: ${lowStock.map((product) => `${product.name} (${product.stock} left)`).join(", ")}.`
        : "Everything currently has healthy inventory coverage.";
    }

    if (text.includes("sales") || text.includes("revenue")) {
      const revenue = state.orders.reduce((sum, order) => sum + order.total, 0);
      return `Current snapshot: ${state.orders.length} orders, ${state.users.length} users, and ${money(revenue)} in revenue. Accessories and featured electronics are performing strongly.`;
    }

    if (text.includes("payment")) {
      return "Checkout currently supports Stripe and Razorpay as the featured payment options. Express delivery and standard delivery are both available in the flow.";
    }

    if (text.includes("delivery") || text.includes("shipping")) {
      return "Express and standard delivery are both available. In the current demo flow, shipping is added clearly in the order summary before confirmation.";
    }

    if (text.includes("cart")) {
      return cartTotalItems
        ? `Your cart currently has ${cartTotalItems} item${cartTotalItems > 1 ? "s" : ""}. You can continue to checkout for a live subtotal, shipping, and tax summary.`
        : "Your cart is empty right now. I can help you find a few strong starter products if you'd like.";
    }

    if (text.includes("order")) {
      return state.orders.length
        ? `Latest order on file is ${state.orders[0].id} for ${money(state.orders[0].total)} with status ${state.orders[0].status}.`
        : "There are no orders yet in this session.";
    }

    if (text.includes("profile") || text.includes("account")) {
      return state.user
        ? `You’re signed in as ${state.user.name}. You can manage your profile and review order history from this page.`
        : "You can sign in with email or use the Google-style demo button to create an account instantly.";
    }

    if (text.includes("pair") || text.includes("similar") || text.includes("gift")) {
      const currentSlug = getQuery().get("slug");
      const current = state.products.find((product) => product.slug === currentSlug);
      if (current) {
        const matches = state.products.filter(
          (product) => product.category === current.category && product.id !== current.id,
        );
        return summarizeProducts(matches, `You might pair ${current.name} with`);
      }
    }

    return "I can help with summer sale picks, accessories, travel gear, audio products, checkout questions, and quick store insights.";
  }

  function summarizeProducts(products, label) {
    const picks = products.slice(0, 3);
    if (!picks.length) {
      return `${label}: I don’t have matching products yet, but I can help you browse the catalog.`;
    }
    return `${label}: ${picks.map((product) => `${product.name} at ${money(product.price)}`).join(", ")}.`;
  }

  function renderCategoryGrid() {
    const root = document.querySelector("[data-category-grid]");
    if (!root) {
      return;
    }

    root.innerHTML = window.LUMA_DATA.categories
      .map(
        (category) => `
          <a class="category-card" href="catalog.html?category=${encodeURIComponent(category.name)}">
            <img src="${category.image}" alt="${category.name}" loading="lazy" />
            <div class="category-card__overlay">
              <strong>${category.name}</strong>
              <span>${category.description}</span>
            </div>
          </a>
        `,
      )
      .join("");
  }

  function buildProductCard(product) {
    return `
      <article class="product-card" data-product-card>
        <a href="product.html?slug=${product.slug}" class="product-card__media">
          <img src="${product.gallery[0]}" alt="${product.name}" loading="lazy" />
          <span class="product-card__badge">${product.badge}</span>
        </a>
        <div class="product-card__body">
          <div class="product-card__copy">
            <span>${product.brand ? `${product.brand} / ${product.category}` : product.category}</span>
            <a href="product.html?slug=${product.slug}">${product.name}</a>
          </div>
          <div class="product-card__meta">
            <strong>${money(product.price)}</strong>
            <small>${product.rating} rating</small>
          </div>
          <button class="button button--ghost" data-add-to-cart="${product.id}">Add to cart</button>
        </div>
      </article>
    `;
  }

  function renderFeaturedProducts() {
    const root = document.querySelector("[data-featured-products]");
    if (!root) {
      return;
    }

    const featured = state.products.filter((product) => product.featured).slice(0, 4);
    root.innerHTML = featured.map(buildProductCard).join("");
    attachAddToCartHandlers(root);
  }

  function initCatalogPage() {
    const results = document.querySelector("[data-catalog-products]");
    const categoryFilter = document.querySelector("[data-category-filter]");
    const sortFilter = document.querySelector("[data-sort-filter]");
    const stockFilter = document.querySelector("[data-stock-filter]");
    const resultsTitle = document.querySelector("[data-results-title]");
    const resultsCount = document.querySelector("[data-results-count]");
    const query = getQuery();
    const initialCategory = query.get("category") || "All";
    const searchTerm = (query.get("search") || "").toLowerCase();

    if (!results || !categoryFilter || !sortFilter || !stockFilter) {
      return;
    }

    const categoryOptions = ["All", ...window.LUMA_DATA.categories.map((item) => item.name)];
    categoryFilter.innerHTML = categoryOptions
      .map((name) => `<option value="${name}">${name}</option>`)
      .join("");
    categoryFilter.value = categoryOptions.includes(initialCategory) ? initialCategory : "All";

    const applyFilters = () => {
      const category = categoryFilter.value;
      const stock = stockFilter.value;
      const sort = sortFilter.value;
      const filtered = [...state.products]
        .filter((product) => {
          const matchesCategory = category === "All" || product.category === category;
          const matchesSearch =
            !searchTerm ||
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm);
          const matchesStock =
            stock === "all" ||
            (stock === "in-stock" && product.stock > 10) ||
            (stock === "low-stock" && product.stock <= 10);
          return matchesCategory && matchesSearch && matchesStock;
        })
        .sort((a, b) => {
          if (sort === "price-asc") return a.price - b.price;
          if (sort === "price-desc") return b.price - a.price;
          if (sort === "rating") return b.rating - a.rating;
          return Number(b.featured) - Number(a.featured);
        });

      results.innerHTML = filtered.map(buildProductCard).join("");
      resultsTitle.textContent = category === "All" ? "All products" : category;
      resultsCount.textContent = `${filtered.length} products`;
      attachAddToCartHandlers(results);
    };

    categoryFilter.addEventListener("change", applyFilters);
    sortFilter.addEventListener("change", applyFilters);
    stockFilter.addEventListener("change", applyFilters);
    applyFilters();
  }

  function renderProductPage() {
    const root = document.querySelector("[data-product-page]");
    if (!root) {
      return;
    }

    const slug = getQuery().get("slug") || state.products[0].slug;
    const product = state.products.find((item) => item.slug === slug) || state.products[0];
    const sizes = product.variants.sizes
      .map((size, index) => `<button class="chip ${index === 0 ? "is-active" : ""}" data-variant-size>${size}</button>`)
      .join("");
    const colors = product.variants.colors
      .map((color, index) => `<button class="chip ${index === 0 ? "is-active" : ""}" data-variant-color>${color}</button>`)
      .join("");

    root.innerHTML = `
      <div class="product-layout">
        <section class="product-gallery">
          <div class="product-gallery__main">
            <img data-main-product-image src="${product.gallery[0]}" alt="${product.name}" />
          </div>
          <div class="product-gallery__thumbs">
            ${product.gallery
              .map(
                (image, index) => `
                  <button class="thumb ${index === 0 ? "is-active" : ""}" data-gallery-image="${image}">
                    <img src="${image}" alt="${product.name} view ${index + 1}" />
                  </button>
                `,
              )
              .join("")}
          </div>
        </section>
        <section class="product-details">
          <p class="eyebrow">${product.brand ? `${product.brand} / ${product.category}` : product.category}</p>
          <h1>${product.name}</h1>
          <div class="price-line">
            <strong>${money(product.price)}</strong>
            <span>${money(product.compareAt)}</span>
          </div>
          <p>${product.description}</p>
          <div class="stock-line">
            <span class="${product.stock <= 10 ? "stock-low" : "stock-ok"}"></span>
            ${product.stock <= 10 ? `Only ${product.stock} left` : `${product.stock} in stock`}
          </div>
          <div class="variant-group">
            <label>Size</label>
            <div class="chip-row">${sizes}</div>
          </div>
          <div class="variant-group">
            <label>Color</label>
            <div class="chip-row">${colors}</div>
          </div>
          <div class="action-row">
            <button class="button button--primary" data-add-to-cart="${product.id}">Add to cart</button>
            <button class="button button--secondary" data-buy-now="${product.id}">Buy now</button>
          </div>
        </section>
      </div>
    `;

    attachAddToCartHandlers(root);
    initProductGallery(root);

    const buyNow = root.querySelector("[data-buy-now]");
    if (buyNow) {
      buyNow.addEventListener("click", () => {
        addToCart(Number(buyNow.dataset.buyNow));
        window.location.href = "checkout.html";
      });
    }
  }

  function initProductGallery(root) {
    const main = root.querySelector("[data-main-product-image]");
    const thumbs = root.querySelectorAll("[data-gallery-image]");
    if (!main || !thumbs.length) {
      return;
    }

    thumbs.forEach((thumb) => {
      thumb.addEventListener("click", () => {
        main.src = thumb.dataset.galleryImage;
        thumbs.forEach((item) => item.classList.remove("is-active"));
        thumb.classList.add("is-active");
      });
    });

    let touchStartX = 0;
    root.querySelector(".product-gallery__main").addEventListener(
      "touchstart",
      (event) => {
        touchStartX = event.changedTouches[0].screenX;
      },
      { passive: true },
    );

    root.querySelector(".product-gallery__main").addEventListener(
      "touchend",
      (event) => {
        const delta = event.changedTouches[0].screenX - touchStartX;
        if (Math.abs(delta) < 30) {
          return;
        }

        const images = Array.from(thumbs);
        const currentIndex = images.findIndex((button) => button.classList.contains("is-active"));
        const nextIndex =
          delta < 0 ? (currentIndex + 1) % images.length : (currentIndex - 1 + images.length) % images.length;
        images[nextIndex].click();
      },
      { passive: true },
    );
  }

  function attachAddToCartHandlers(scope) {
    scope.querySelectorAll("[data-add-to-cart]").forEach((button) => {
      button.addEventListener("click", () => addToCart(Number(button.dataset.addToCart)));
    });
  }

  function addToCart(productId) {
    const product = state.products.find((item) => item.id === productId);
    if (!product) {
      return;
    }

    const existing = state.cart.find((item) => item.productId === productId);
    if (existing) {
      existing.quantity += 1;
    } else {
      state.cart.push({
        productId,
        quantity: 1,
        size: product.variants.sizes[0],
        color: product.variants.colors[0],
      });
    }

    writeStorage(STORAGE_KEYS.cart, state.cart);
    updateCartCount();
  }

  function renderCheckout() {
    const summary = document.querySelector("[data-order-summary]");
    const form = document.querySelector("[data-checkout-form]");
    if (!summary || !form) {
      return;
    }

    const items = state.cart.map((item) => {
      const product = state.products.find((entry) => entry.id === item.productId);
      return { ...item, product };
    });

    const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const shipping = items.length ? 18 : 0;
    const tax = Math.round(subtotal * 0.08);
    const total = subtotal + shipping + tax;

    summary.innerHTML = `
      <h2>Order summary</h2>
      <div class="summary-items">
        ${
          items.length
            ? items
                .map(
                  (item) => `
                    <article class="summary-item">
                      <img src="${item.product.gallery[0]}" alt="${item.product.name}" />
                      <div>
                        <strong>${item.product.name}</strong>
                        <span>${item.quantity} x ${money(item.product.price)}</span>
                      </div>
                    </article>
                  `,
                )
                .join("")
            : "<p>Your cart is empty. Add products to continue.</p>"
        }
      </div>
      <div class="summary-totals">
        <div><span>Subtotal</span><strong>${money(subtotal)}</strong></div>
        <div><span>Shipping</span><strong>${money(shipping)}</strong></div>
        <div><span>Tax</span><strong>${money(tax)}</strong></div>
        <div class="summary-total"><span>Total</span><strong>${money(total)}</strong></div>
      </div>
    `;

    summary.querySelectorAll(".summary-item").forEach((item, index) => {
      item.addEventListener("click", () => {
        const card = summary.querySelectorAll(".summary-item")[index];
        card.classList.toggle("is-highlighted");
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!items.length) {
        return;
      }

      const data = new FormData(form);
      const order = {
        id: `LU-${Math.floor(24020 + Math.random() * 100)}`,
        customer: data.get("name"),
        date: new Date().toISOString().slice(0, 10),
        total,
        status: "Confirmed",
        provider: data.get("provider"),
        items: items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
        })),
      };

      state.orders = [order, ...state.orders];
      writeStorage(STORAGE_KEYS.orders, state.orders);
      writeStorage(STORAGE_KEYS.lastOrder, order);
      state.cart = [];
      writeStorage(STORAGE_KEYS.cart, state.cart);
      updateCartCount();
      window.location.href = "order-confirmation.html";
    });
  }

  function renderAccountPage() {
    const authPanel = document.querySelector("[data-auth-panel]");
    const profilePanel = document.querySelector("[data-profile-panel]");
    const orderHistory = document.querySelector("[data-order-history]");
    if (!authPanel || !profilePanel || !orderHistory) {
      return;
    }

    authPanel.innerHTML = state.user
      ? `
        <p class="eyebrow">Signed in</p>
        <h2>${state.user.name}</h2>
        <p>${state.user.email}</p>
        <button class="button button--secondary" data-logout>Log out</button>
      `
      : `
        <p class="eyebrow">Account access</p>
        <h2>Sign up or login</h2>
        <form data-auth-form class="stack-form">
          <label>Name<input name="name" type="text" placeholder="Avery Morgan" required /></label>
          <label>Email<input name="email" type="email" placeholder="avery@example.com" required /></label>
          <button class="button button--primary" type="submit">Continue with email</button>
          <button class="button button--secondary" type="button" data-google-auth>Continue with Google</button>
        </form>
      `;

    profilePanel.innerHTML = `
      <p class="eyebrow">Profile</p>
      <h2>Manage your preferences</h2>
      <div class="profile-grid">
        <div><span>Status</span><strong>${state.user ? "Active member" : "Guest mode"}</strong></div>
        <div><span>Tier</span><strong>${state.user?.tier || "Core"}</strong></div>
        <div><span>Saved addresses</span><strong>${state.user ? "2 addresses" : "Sign in to save"}</strong></div>
      </div>
    `;

    const userOrders = state.orders.filter((order) =>
      state.user ? order.customer.toLowerCase() === state.user.name.toLowerCase() : true,
    );
    orderHistory.innerHTML = `
      <p class="eyebrow">Orders</p>
      <h2>Order history</h2>
      ${
        userOrders.length
          ? `<div class="table-list">
              ${userOrders
                .map(
                  (order) => `
                    <article class="table-row">
                      <strong>${order.id}</strong>
                      <span>${order.date}</span>
                      <span>${order.status}</span>
                      <strong>${money(order.total)}</strong>
                    </article>
                  `,
                )
                .join("")}
            </div>`
          : "<p>No orders yet.</p>"
      }
    `;

    const authForm = authPanel.querySelector("[data-auth-form]");
    if (authForm) {
      authForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = new FormData(authForm);
        const user = {
          id: Date.now(),
          name: data.get("name"),
          email: data.get("email"),
          tier: "Signature",
          joined: new Date().toISOString().slice(0, 10),
        };
        state.user = user;
        state.users = [user, ...state.users];
        writeStorage(STORAGE_KEYS.user, state.user);
        writeStorage(STORAGE_KEYS.users, state.users);
        window.location.reload();
      });
    }

    const googleButton = authPanel.querySelector("[data-google-auth]");
    if (googleButton) {
      googleButton.addEventListener("click", () => {
        const user = {
          id: Date.now(),
          name: "Google Shopper",
          email: "shopper@gmail.com",
          tier: "Signature",
          joined: new Date().toISOString().slice(0, 10),
        };
        state.user = user;
        state.users = [user, ...state.users];
        writeStorage(STORAGE_KEYS.user, state.user);
        writeStorage(STORAGE_KEYS.users, state.users);
        window.location.reload();
      });
    }

    const logout = authPanel.querySelector("[data-logout]");
    if (logout) {
      logout.addEventListener("click", () => {
        state.user = null;
        writeStorage(STORAGE_KEYS.user, null);
        window.location.reload();
      });
    }
  }

  function renderAdminPage() {
    const analyticsPanel = document.querySelector("[data-analytics-panel]");
    const productAdmin = document.querySelector("[data-product-admin]");
    const orderAdmin = document.querySelector("[data-order-admin]");
    const userAdmin = document.querySelector("[data-user-admin]");
    if (!analyticsPanel || !productAdmin || !orderAdmin || !userAdmin) {
      return;
    }

    const revenue = state.orders.reduce((sum, order) => sum + order.total, 0);
    analyticsPanel.innerHTML = `
      <p class="eyebrow">Overview</p>
      <h2>Analytics snapshot</h2>
      <div class="analytics-cards">
        <article><span>Revenue</span><strong>${money(revenue)}</strong></article>
        <article><span>Users</span><strong>${state.users.length}</strong></article>
        <article><span>Orders</span><strong>${state.orders.length}</strong></article>
      </div>
    `;

    productAdmin.innerHTML = `
      <div class="panel-head">
        <div>
          <p class="eyebrow">Catalog management</p>
          <h2>Add or update products</h2>
        </div>
      </div>
      <form data-product-form class="stack-form">
        <label>Product name<input required name="name" type="text" placeholder="Orbit Duffel" /></label>
        <label>Category
          <select name="category">
            ${window.LUMA_DATA.categories.map((category) => `<option>${category.name}</option>`).join("")}
          </select>
        </label>
        <label>Price<input required name="price" type="number" min="1" placeholder="240" /></label>
        <label>Image URL<input required name="image" type="url" placeholder="https://images.unsplash.com/..." /></label>
        <button class="button button--primary" type="submit">Save product</button>
      </form>
      <div class="table-list">
        ${state.products
          .map(
            (product) => `
              <article class="table-row">
                <strong>${product.name}</strong>
                <span>${product.brand ? `${product.brand} / ${product.category}` : product.category}</span>
                <span>${product.stock} in stock</span>
                <strong>${money(product.price)}</strong>
                <button class="button button--tiny" data-delete-product="${product.id}">Delete</button>
              </article>
            `,
          )
          .join("")}
      </div>
    `;

    orderAdmin.innerHTML = `
      <p class="eyebrow">Orders</p>
      <h2>Manage fulfillment</h2>
      <div class="table-list">
        ${state.orders
          .map(
            (order) => `
              <article class="table-row">
                <strong>${order.id}</strong>
                <span>${order.customer}</span>
                <span>${order.status}</span>
                <strong>${money(order.total)}</strong>
              </article>
            `,
          )
          .join("")}
      </div>
    `;

    userAdmin.innerHTML = `
      <p class="eyebrow">Users</p>
      <h2>Customer base</h2>
      <div class="table-list">
        ${state.users
          .map(
            (user) => `
              <article class="table-row">
                <strong>${user.name}</strong>
                <span>${user.email}</span>
                <span>${user.tier}</span>
                <strong>${user.joined}</strong>
              </article>
            `,
          )
          .join("")}
      </div>
    `;

    const form = productAdmin.querySelector("[data-product-form]");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const name = data.get("name");
      const product = {
        id: Date.now(),
        slug: slugify(name),
        name,
        category: data.get("category"),
        price: Number(data.get("price")),
        compareAt: Number(data.get("price")) + 40,
        rating: 4.8,
        stock: 12,
        featured: false,
        badge: "New",
        description: "Freshly added through the admin dashboard for rapid catalog expansion.",
        variants: {
          sizes: ["Standard"],
          colors: ["Black"],
        },
        gallery: [data.get("image"), data.get("image"), data.get("image")],
      };
      state.products = [product, ...state.products];
      writeStorage(STORAGE_KEYS.products, state.products);
      window.location.reload();
    });

    productAdmin.querySelectorAll("[data-delete-product]").forEach((button) => {
      button.addEventListener("click", () => {
        state.products = state.products.filter((product) => product.id !== Number(button.dataset.deleteProduct));
        writeStorage(STORAGE_KEYS.products, state.products);
        window.location.reload();
      });
    });
  }

  function renderConfirmationPage() {
    const root = document.querySelector("[data-confirmation-panel]");
    if (!root) {
      return;
    }

    const order = readStorage(STORAGE_KEYS.lastOrder, null);
    root.innerHTML = order
      ? `
        <p class="eyebrow">Order confirmed</p>
        <h1>Thanks, ${order.customer}.</h1>
        <p>Your order ${order.id} has been placed successfully via ${order.provider}.</p>
        <div class="confirmation-summary">
          <div><span>Total</span><strong>${money(order.total)}</strong></div>
          <div><span>Status</span><strong>${order.status}</strong></div>
          <div><span>Date</span><strong>${order.date}</strong></div>
        </div>
        <div class="hero__actions">
          <a class="button button--primary" href="catalog.html">Continue shopping</a>
          <a class="button button--secondary" href="account.html">View account</a>
        </div>
      `
      : `
        <p class="eyebrow">No recent order</p>
        <h1>Start with the storefront.</h1>
        <a class="button button--primary" href="catalog.html">Browse products</a>
      `;
  }
})();

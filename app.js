const SEED_ITEMS = [
  { id: "sku-104", name: "Eco-solvent ink, black 1L", sku: "SM-INK-BLK", category: "Ink", stock: 18, minimum: 8, location: "Ink room · Shelf A1", price: 32.5, updated: "2026-10-09" },
  { id: "sku-218", name: "Printable vinyl roll, 24 in", sku: "SM-VIN-24", category: "Print media", stock: 11, minimum: 6, location: "Media rack · Bay 02", price: 42, updated: "2026-10-08" },
  { id: "sku-302", name: "Banner flex roll, 10 ft", sku: "SM-FLX-10", category: "Print media", stock: 7, minimum: 10, location: "Media rack · Bay 01", price: 86, updated: "2026-10-09" },
  { id: "sku-417", name: "Clear acrylic sheet, 3 mm", sku: "SM-ACR-3C", category: "Sign materials", stock: 24, minimum: 8, location: "Sheet rack · Slot C3", price: 18, updated: "2026-10-07" },
  { id: "sku-523", name: "Application tape, 12 in", sku: "SM-TAPE-12", category: "Finishing", stock: 28, minimum: 10, location: "Finishing · Shelf B2", price: 14.75, updated: "2026-10-10" },
  { id: "sku-641", name: "CNC cutter blade set", sku: "SM-CNC-BLD", category: "Machine parts", stock: 4, minimum: 12, location: "Tool cabinet · Drawer 4", price: 27, updated: "2026-10-06" },
  { id: "sku-755", name: "Lamination film roll, 1.2 m", sku: "SM-LAM-12", category: "Finishing", stock: 15, minimum: 8, location: "Media rack · Bay 04", price: 54, updated: "2026-10-05" }
];

const SEED_LOGS = [
  { id: "log-1", time: "2026-10-10T09:42:00", actor: "Sample admin", action: "Received stock", item: "Eco-solvent ink, black 1L", detail: "+12 units · sample PO-2048", kind: "in" },
  { id: "log-2", time: "2026-10-10T09:16:00", actor: "Sample staff", action: "Adjusted stock", item: "Printable vinyl roll, 24 in", detail: "-3 units · sample order pick", kind: "out" },
  { id: "log-3", time: "2026-10-09T16:28:00", actor: "Sample admin", action: "Updated item", item: "Banner flex roll, 10 ft", detail: "Minimum quantity changed to 10", kind: "edit" },
  { id: "log-4", time: "2026-10-09T14:05:00", actor: "Sample staff", action: "Received stock", item: "Clear acrylic sheet, 3 mm", detail: "+24 units · sample PO-2041", kind: "in" },
  { id: "log-5", time: "2026-10-09T11:34:00", actor: "Sample admin", action: "Added item", item: "Lamination film roll, 1.2 m", detail: "SM-LAM-12 · Finishing", kind: "add" }
];

const readStore = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
};

let items = readStore("sign-media-stock-demo-items", SEED_ITEMS);
let logs = readStore("sign-media-stock-demo-logs", SEED_LOGS);
let currentUser = { name: "Demo visitor", role: "demo" };
let activeView = "inventory";
let searchQuery = "";
let categoryFilter = "all";
let dialogMode = "add";
let editingId = null;

const app = document.getElementById("app");
const dialog = document.getElementById("item-dialog");

localStorage.removeItem("northline-users");

function persist() {
  localStorage.setItem("sign-media-stock-demo-items", JSON.stringify(items));
  localStorage.setItem("sign-media-stock-demo-logs", JSON.stringify(logs));
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function initials(name) {
  return name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(dateString));
}

function formatTime(timeString) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(timeString));
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0);
}

function recordLog(action, item, detail, kind) {
  logs.unshift({
    id: `log-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    time: new Date().toISOString(),
    actor: currentUser.name,
    action,
    item,
    detail,
    kind
  });
  logs = logs.slice(0, 100);
  persist();
}

function showToast(message) {
  const region = document.getElementById("toast-region");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  region.append(toast);
  window.setTimeout(() => toast.remove(), 2800);
}

function getLowStock() {
  return items.filter(item => Number(item.stock) <= Number(item.minimum));
}

function renderApp() {
  const lowCount = getLowStock().length;
  const viewTitle = activeView === "audit" ? "Activity log" : activeView === "movements" ? "Movements" : "Inventory";
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand"><span class="brand-mark">S</span><span>Sign Media Stock</span></div>
        <p class="nav-label">Workspace</p>
        <nav class="nav-list" aria-label="Main navigation">
          <button class="nav-link ${activeView === "inventory" ? "active" : ""}" data-view="inventory"><span class="nav-glyph">▦</span>Inventory${lowCount ? `<span class="nav-count">${lowCount}</span>` : ""}</button>
          <button class="nav-link ${activeView === "movements" ? "active" : ""}" data-view="movements"><span class="nav-glyph">↕</span>Movements</button>
          <button class="nav-link ${activeView === "audit" ? "active" : ""}" data-view="audit"><span class="nav-glyph">≡</span>Activity log</button>
        </nav>
        <div class="sidebar-bottom">
          <div class="help-strip"><strong>Stockroom status</strong><p>${lowCount ? `${lowCount} items need a restock review.` : "All items are above their minimum level."}</p></div>
          <div class="user-chip"><span class="avatar">D</span><div class="user-meta"><strong>Demo visitor</strong><span>public demo</span></div></div>
        </div>
      </aside>
      <main class="main-area">
        <header class="topbar"><div class="breadcrumb">Sign Media Stock <span aria-hidden="true">/</span> <strong>${viewTitle}</strong></div><div class="topbar-right"><span class="today-label">${new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(new Date())}</span><span class="role-pill">Demo</span></div></header>
        <div class="demo-banner"><strong>Public demo</strong><span>Sample data only. Changes are saved only in this browser. Do not enter real or confidential information.</span></div>
        <div class="content">${activeView === "inventory" ? renderInventoryView() : renderLogView(activeView === "audit")}</div>
      </main>
    </div>`;

  document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => {
    activeView = button.dataset.view;
    renderApp();
  }));
  if (activeView === "inventory") bindInventoryActions();
  else bindLogActions();
}

function renderInventoryView() {
  const totalUnits = items.reduce((sum, item) => sum + Number(item.stock), 0);
  const totalValue = items.reduce((sum, item) => sum + Number(item.stock) * Number(item.price), 0);
  const categories = [...new Set(items.map(item => item.category))].sort((a, b) => a.localeCompare(b));
  return `
    <section class="showcase-hero" aria-label="Signmedia Enterprises">
      <div><p class="eyebrow">Signmedia Enterprises</p><h2>Sign Media Stock</h2><p>Track equipment, materials, and stock movements in one place.</p></div>
      <img src="assets/sign-media-machinery.png" alt="Signmedia Enterprises and KNT signage machinery">
    </section>
    <div class="page-heading"><div><h1>Inventory</h1><p>Your stock, across every shelf.</p></div><div class="heading-actions"><button class="button button-primary" data-action="add">＋ <span>Add item</span></button></div></div>
    <section class="metrics" aria-label="Inventory summary">
      <article class="metric"><div class="metric-label">Catalog items</div><div class="metric-value">${items.length}</div><div class="metric-note">Active SKUs in stockroom</div></article>
      <article class="metric"><div class="metric-label">Units on hand</div><div class="metric-value">${totalUnits.toLocaleString()}</div><div class="metric-note">Across all listed items</div></article>
      <article class="metric metric-alert"><div class="metric-label">Below minimum</div><div class="metric-value">${getLowStock().length}</div><div class="metric-note">Requires a restock review</div></article>
      <article class="metric"><div class="metric-label">Stock value</div><div class="metric-value">${formatMoney(totalValue)}</div><div class="metric-note">Based on item unit cost</div></article>
    </section>
    <section class="table-panel" aria-label="Inventory items">
      <div class="panel-head"><div><h2 class="panel-title">All items</h2><p class="panel-subtitle">Track quantities, locations, and reorder points.</p></div></div>
      <div class="toolbar"><input type="search" id="inventory-search" placeholder="Search item or SKU" aria-label="Search items"><select id="category-filter" aria-label="Filter by category"><option value="all">All categories</option>${categories.map(category => `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`).join("")}</select><select id="stock-filter" aria-label="Filter by stock status"><option value="all">All stock levels</option><option value="low">Below minimum</option><option value="healthy">Healthy stock</option></select></div>
      <div class="table-wrap"><table><thead><tr><th>Item</th><th>Category</th><th>On hand</th><th>Location</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody id="inventory-rows"></tbody></table></div>
      <div class="table-foot"><span id="item-count"></span><span>Quantities update as movements are recorded</span></div>
    </section>`;
}

function filteredItems() {
  const query = searchQuery.toLowerCase();
  return items.filter(item => {
    const matchesQuery = `${item.name} ${item.sku} ${item.location}`.toLowerCase().includes(query);
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const isLow = Number(item.stock) <= Number(item.minimum);
    const matchesStock = stockFilter === "all" || (stockFilter === "low" ? isLow : !isLow);
    return matchesQuery && matchesCategory && matchesStock;
  }).sort((a, b) => a.name.localeCompare(b.name));
}

let stockFilter = "all";

function renderInventoryRows() {
  const body = document.getElementById("inventory-rows");
  if (!body) return;
  const visibleItems = filteredItems();
  body.innerHTML = visibleItems.length ? visibleItems.map(item => {
    const low = Number(item.stock) <= Number(item.minimum);
    const fill = Math.min(100, Math.max(6, Math.round((Number(item.stock) / Math.max(Number(item.minimum) * 2, 1)) * 100)));
    return `<tr>
      <td><div class="product-cell"><span class="product-mark">${escapeHTML(item.name.slice(0, 1).toUpperCase())}</span><div><div class="product-name">${escapeHTML(item.name)}</div><div class="product-sku">${escapeHTML(item.sku)} · ${formatMoney(item.price)} / unit</div></div></div></td>
      <td><span class="category-tag">${escapeHTML(item.category)}</span></td>
      <td class="stock-cell"><span class="stock-number">${Number(item.stock)}</span><div class="stock-track"><div class="stock-fill ${low ? "low" : ""}" style="width:${fill}%"></div></div></td>
      <td>${escapeHTML(item.location)}</td><td><span class="status ${low ? "status-low" : "status-ok"}">${low ? "Restock" : "In stock"}</span></td><td>${formatDate(item.updated)}</td>
      <td><div class="row-actions"><button class="table-action" data-action="adjust" data-id="${escapeHTML(item.id)}">Adjust</button><button class="table-action" data-action="edit" data-id="${escapeHTML(item.id)}">Edit</button></div></td>
    </tr>`;
  }).join("") : `<tr><td colspan="7"><div class="empty-state">No items match these filters.</div></td></tr>`;
  document.getElementById("item-count").textContent = `Showing ${visibleItems.length} of ${items.length} items`;
  body.querySelectorAll("[data-action='adjust'], [data-action='edit']").forEach(button => button.addEventListener("click", () => openItemDialog(button.dataset.action, button.dataset.id)));
}

function bindInventoryActions() {
  document.querySelector('[data-action="add"]').addEventListener("click", () => openItemDialog("add"));
  document.getElementById("inventory-search").addEventListener("input", event => {
    searchQuery = event.currentTarget.value;
    renderInventoryRows();
  });
  document.getElementById("category-filter").addEventListener("change", event => {
    categoryFilter = event.currentTarget.value;
    renderInventoryRows();
  });
  document.getElementById("stock-filter").addEventListener("change", event => {
    stockFilter = event.currentTarget.value;
    renderInventoryRows();
  });
  renderInventoryRows();
}

function renderLogView(adminView) {
  const title = adminView ? "Sample activity log" : "Stock movements";
  const subtitle = adminView ? "Example inventory actions from the public demo. These are not real staff records." : "Example receipts, issues, and item changes.";
  const filteredLogs = adminView ? logs : logs.filter(log => ["in", "out"].includes(log.kind));
  return `<div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div></div>
    <section class="log-panel"><div class="panel-head"><div><h2 class="panel-title">${adminView ? "Example activity" : "Movement history"}</h2><p class="panel-subtitle">${adminView ? "Most recent sample actions appear first." : "Sample stock received and removed from the shelves."}</p></div></div>
      <div class="log-list">${filteredLogs.length ? filteredLogs.map(log => `<div class="log-row">
        <span class="log-symbol ${log.kind === "out" ? "warn" : ""}">${log.kind === "in" ? "＋" : log.kind === "out" ? "−" : log.kind === "login" ? "↗" : "·"}</span>
        <div class="log-message"><strong>${escapeHTML(log.actor)}</strong> ${escapeHTML(log.action.toLowerCase())} <strong>${escapeHTML(log.item)}</strong></div>
        <div class="log-detail">${escapeHTML(log.detail)}</div>
        <time class="log-time" datetime="${escapeHTML(log.time)}">${formatTime(log.time)}</time>
      </div>`).join("") : `<div class="empty-state">No activity recorded yet.</div>`}</div>
    </section>`;
}

function bindLogActions() { }

function openItemDialog(mode, id) {
  dialogMode = mode;
  editingId = id || null;
  const item = items.find(entry => entry.id === id);
  const titles = { add: ["Add an item", "Create a new SKU in your stockroom."], edit: ["Edit item details", "Update the item record and reorder point."], adjust: ["Adjust stock", "Record stock arriving or leaving the shelf."] };
  const [title, subtitle] = titles[mode];
  const content = mode === "adjust" ? `
    <div class="dialog-grid">
      <div class="field field-full"><label for="movement-type">Movement type</label><select id="movement-type" name="movementType"><option value="in">Receive stock</option><option value="out">Remove stock</option></select></div>
      <div class="field"><label for="quantity">Quantity</label><input id="quantity" name="quantity" type="number" min="1" step="1" required placeholder="0"></div>
      <div class="field"><label for="reference">Reference</label><input id="reference" name="reference" maxlength="40" placeholder="PO or order number"></div>
      <div class="field field-full"><label for="reason">Note</label><input id="reason" name="reason" maxlength="80" placeholder="Optional reason for this movement"></div>
    </div>` : `
    <div class="dialog-grid">
      <div class="field field-full"><label for="item-name">Item name</label><input id="item-name" name="name" maxlength="60" required value="${escapeHTML(item?.name || "")}" placeholder="e.g. Cotton apron"></div>
      <div class="field"><label for="item-sku">SKU</label><input id="item-sku" name="sku" maxlength="24" required value="${escapeHTML(item?.sku || "")}" placeholder="NL-801"></div>
      <div class="field"><label for="item-category">Category</label><input id="item-category" name="category" maxlength="30" required value="${escapeHTML(item?.category || "")}" placeholder="Home goods"></div>
      <div class="field"><label for="item-stock">Quantity on hand</label><input id="item-stock" name="stock" type="number" min="0" step="1" required value="${item ? Number(item.stock) : ""}" placeholder="0"></div>
      <div class="field"><label for="item-minimum">Minimum quantity</label><input id="item-minimum" name="minimum" type="number" min="0" step="1" required value="${item ? Number(item.minimum) : ""}" placeholder="0"></div>
      <div class="field field-full"><label for="item-location">Storage location</label><input id="item-location" name="location" maxlength="50" required value="${escapeHTML(item?.location || "")}" placeholder="Aisle 01 · Bin 01"></div>
      <div class="field"><label for="item-price">Unit cost (USD)</label><input id="item-price" name="price" type="number" min="0" step="0.01" required value="${item ? Number(item.price) : ""}" placeholder="0.00"></div>
    </div>`;
  dialog.innerHTML = `<form id="item-form"><div class="dialog-inner"><div class="dialog-head"><div><h2 id="dialog-title">${title}</h2><p>${subtitle}${mode === "adjust" && item ? ` · ${escapeHTML(item.name)} (${Number(item.stock)} on hand)` : ""}</p></div><button class="dialog-close" type="button" aria-label="Close dialog">×</button></div>${content}<div class="dialog-actions"><button class="button button-quiet" type="button" data-cancel>Cancel</button><button class="button button-primary" type="submit">${mode === "add" ? "Create item" : mode === "edit" ? "Save changes" : "Record movement"}</button></div></div></form>`;
  dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
  dialog.querySelector("[data-cancel]").addEventListener("click", () => dialog.close());
  dialog.querySelector("form").addEventListener("submit", saveDialogForm);
  dialog.showModal();
}

function saveDialogForm(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  if (dialogMode === "adjust") {
    const item = items.find(entry => entry.id === editingId);
    const quantity = Number(data.get("quantity"));
    const incoming = data.get("movementType") === "in";
    if (!item || !Number.isInteger(quantity) || quantity < 1) return;
    if (!incoming && quantity > Number(item.stock)) {
      showToast("There are not enough units on hand for that removal.");
      return;
    }
    item.stock = Number(item.stock) + (incoming ? quantity : -quantity);
    item.updated = new Date().toISOString().slice(0, 10);
    const reference = String(data.get("reference")).trim();
    const note = String(data.get("reason")).trim();
    const detail = `${incoming ? "+" : "−"}${quantity} units${reference ? ` · ${reference}` : ""}${note ? ` · ${note}` : ""}`;
    recordLog(incoming ? "Received stock" : "Adjusted stock", item.name, detail, incoming ? "in" : "out");
    dialog.close();
    renderApp();
    showToast(incoming ? "Stock receipt recorded." : "Stock adjustment recorded.");
    return;
  }

  const values = {
    name: String(data.get("name")).trim(), sku: String(data.get("sku")).trim().toUpperCase(),
    category: String(data.get("category")).trim(), stock: Number(data.get("stock")),
    minimum: Number(data.get("minimum")), location: String(data.get("location")).trim(),
    price: Number(data.get("price")), updated: new Date().toISOString().slice(0, 10)
  };
  const duplicate = items.some(entry => entry.sku.toLowerCase() === values.sku.toLowerCase() && entry.id !== editingId);
  if (duplicate) {
    showToast("That SKU is already in the catalog.");
    return;
  }
  if (dialogMode === "add") {
    const created = { ...values, id: `sku-${Date.now()}` };
    items.unshift(created);
    recordLog("Added item", created.name, `${created.sku} · ${created.category}`, "add");
  } else {
    const item = items.find(entry => entry.id === editingId);
    if (!item) return;
    Object.assign(item, values);
    recordLog("Updated item", item.name, `${item.sku} · item details changed`, "edit");
  }
  persist();
  dialog.close();
  searchQuery = "";
  categoryFilter = "all";
  stockFilter = "all";
  renderApp();
  showToast(dialogMode === "add" ? "Item added to inventory." : "Item details saved.");
}

renderApp();

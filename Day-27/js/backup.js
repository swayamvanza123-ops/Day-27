/* InventoryPro - Backup & Restore
   Backups are JSON downloads. The application stores history metadata only, not the downloaded file. */
(function () {
  "use strict";

  const FORMAT = "inventorypro-backup";
  const VERSION = 1;
  const HISTORY_KEY = "inventoryBackupHistory";
  const DATA_KEYS = ["products", "categories", "suppliers", "sales", "movements", "activity", "notifications"];
  const STORAGE_KEYS = {
    products: "products", categories: "categories", suppliers: "suppliers", sales: "sales",
    movements: "stockMovements", activity: "activityLog", notifications: "notifications"
  };
  let selectedFile = null;

  const byId = id => document.getElementById(id);
  const safeText = value => (window.Store && Store.escape) ? Store.escape(value) : String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const timeText = value => (window.Store && Store.dateTime) ? Store.dateTime(value) : new Date(value).toLocaleString();

  function readHistory() {
    try {
      const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (_) { return []; }
  }
  function writeHistory(items) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 100))); }
    catch (error) { console.error("Backup history could not be saved", error); }
    renderHistory();
  }
  function addHistory(filename, status, details, downloadCreated) {
    const items = readHistory();
    items.unshift({ id: "BKP-" + Date.now().toString(36).toUpperCase(), filename, date: new Date().toISOString(), status, details: details || "", downloadCreated: !!downloadCreated });
    writeHistory(items);
  }
  function logActivity(action, details) {
    try {
      if (typeof ActivityLog !== "undefined" && ActivityLog && typeof ActivityLog.add === "function") {
        ActivityLog.add(action, details);
        return;
      }
      const key = STORAGE_KEYS.activity;
      const logs = JSON.parse(localStorage.getItem(key) || "[]");
      logs.unshift({ id: "LOG-" + Date.now(), user: "System", action, details: String(details || ""), date: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(logs.slice(0, 500)));
    } catch (error) { console.warn("Could not write activity log", error); }
  }
  function getData(key) {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS[key]);
      if (raw !== null) {
        const value = JSON.parse(raw);
        return Array.isArray(value) ? value : [];
      }
    } catch (_) {}
    return (window.Store && typeof Store.get === "function") ? Store.get(key, []) : [];
  }
  function makeSnapshot() {
    const data = {};
    DATA_KEYS.forEach(key => { data[key] = getData(key); });
    return { format: FORMAT, version: VERSION, app: "InventoryPro", createdAt: new Date().toISOString(), data };
  }
  function createBackup() {
    const filename = "inventory-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    try {
      const snapshot = makeSnapshot();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      addHistory(filename, "Download triggered", "The browser download was triggered; the app does not retain a copy of the file.", true);
      logActivity("Inventory backup created", filename);
      if (window.Store) Store.toast("Backup download started.");
      setStatus("Backup download started: " + filename, "success");
    } catch (error) {
      addHistory(filename, "Failed", error.message || "Could not create the backup.", false);
      logActivity("Inventory backup failed", error.message || "Could not create backup");
      setStatus("Could not create backup: " + (error.message || "Unknown error"), "error");
      if (window.Store) Store.toast("Backup failed. Please try again.");
    }
  }
  function validateBackup(parsed) {
    const errors = [];
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return ["The file must contain a JSON object."];
    if (parsed.format !== FORMAT) errors.push("Unsupported backup format.");
    if (parsed.version !== VERSION) errors.push("Unsupported backup version. Expected version " + VERSION + ".");
    if (!parsed.createdAt || Number.isNaN(new Date(parsed.createdAt).getTime())) errors.push("A valid createdAt date is required.");
    if (!parsed.data || typeof parsed.data !== "object" || Array.isArray(parsed.data)) return errors.concat(["The required data section is missing."]);
    DATA_KEYS.forEach(key => {
      if (!Object.prototype.hasOwnProperty.call(parsed.data, key)) errors.push("Required section is missing: " + key + ".");
      else if (!Array.isArray(parsed.data[key])) errors.push("Section '" + key + "' must be an array.");
    });
    if (errors.length) return errors;

    const products = parsed.data.products;
    const ids = new Set();
    products.forEach((product, index) => {
      const label = "Product #" + (index + 1);
      if (!product || typeof product !== "object" || Array.isArray(product)) { errors.push(label + " must be an object."); return; }
      const id = product.id ?? product.productId;
      const name = product.name ?? product.productName;
      const price = Number(product.price ?? product.sellingPrice);
      const rawStock = product.stock ?? product.quantity ?? product.availableQuantity;
      const stock = Number(rawStock);
      if (id === undefined || id === null || String(id).trim() === "") errors.push(label + " is missing an ID.");
      else {
        const normalizedId = String(id).trim();
        if (ids.has(normalizedId)) errors.push("Duplicate product ID: " + normalizedId + ".");
        ids.add(normalizedId);
      }
      if (typeof name !== "string" || !name.trim()) errors.push(label + " is missing a valid name.");
      if (rawStock === undefined || rawStock === null || rawStock === "" || !Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) errors.push(label + " must have a non-negative whole-number stock quantity.");
      if (product.price === undefined && product.sellingPrice === undefined) errors.push(label + " is missing a price.");
      else if (!Number.isFinite(price) || price < 0) errors.push(label + " must have a valid non-negative price.");
    });
    parsed.data.categories.forEach((category, index) => {
      if (!(typeof category === "string" && category.trim()) && !(category && typeof category === "object" && typeof category.name === "string" && category.name.trim())) {
        errors.push("Category #" + (index + 1) + " must be a name string or an object with a name.");
      }
    });
    return errors;
  }
  function normalizeData(data) {
    const copy = JSON.parse(JSON.stringify(data));
    copy.products = copy.products.map(product => {
      const item = Object.assign({}, product);
      if (item.id === undefined) item.id = item.productId;
      if (item.name === undefined) item.name = item.productName;
      if (item.price === undefined) item.price = Number(item.sellingPrice);
      if (item.stock === undefined) item.stock = Number(item.quantity ?? item.availableQuantity);
      if (item.minimumStock === undefined) item.minimumStock = Number(item.minStock ?? 10);
      return item;
    });
    return copy;
  }
  function setStatus(message, kind) {
    const status = byId("restoreBackupStatus");
    if (!status) return;
    status.textContent = message;
    status.className = "backup-status" + (kind ? " " + kind : "");
  }
  function handleFileChange(event) {
    selectedFile = event.target.files && event.target.files[0] ? event.target.files[0] : null;
    const button = byId("restoreBackupBtn");
    if (button) button.disabled = !selectedFile;
    if (!selectedFile) { setStatus("No file selected.", ""); return; }
    if (!/\.json$/i.test(selectedFile.name) && selectedFile.type !== "application/json") {
      selectedFile = null;
      if (button) button.disabled = true;
      event.target.value = "";
      setStatus("Please select a .json backup file.", "error");
      return;
    }
    setStatus("Selected: " + selectedFile.name + " (" + Math.max(1, Math.round(selectedFile.size / 1024)) + " KB). Click Validate & Restore to continue.", "");
  }
  function refreshApp() {
    const calls = [
      ["Products", "refreshSelectors"], ["Products", "render"], ["Categories", "render"],
      ["Suppliers", "render"], ["Sales", "render"], ["StockManagement", "render"],
      ["Dashboard", "render"], ["InventoryCharts", "render"], ["Notifications", "render"], ["ActivityLog", "render"], ["Reports", "render"]
    ];
    calls.forEach(([name, method]) => {
      try { if (typeof window[name] !== "undefined" && window[name] && typeof window[name][method] === "function") window[name][method]();
        else if (name === "ActivityLog" && typeof ActivityLog !== "undefined" && typeof ActivityLog[method] === "function") ActivityLog[method]();
        else if (name === "Notifications" && typeof Notifications !== "undefined" && typeof Notifications[method] === "function") Notifications[method]();
        else if (name === "Products" && typeof Products !== "undefined" && typeof Products[method] === "function") Products[method]();
        else if (name === "Categories" && typeof Categories !== "undefined" && typeof Categories[method] === "function") Categories[method]();
        else if (name === "Suppliers" && typeof Suppliers !== "undefined" && typeof Suppliers[method] === "function") Suppliers[method]();
        else if (name === "Sales" && typeof Sales !== "undefined" && typeof Sales[method] === "function") Sales[method]();
        else if (name === "StockManagement" && typeof StockManagement !== "undefined" && typeof StockManagement[method] === "function") StockManagement[method]();
        else if (name === "Dashboard" && typeof Dashboard !== "undefined" && typeof Dashboard[method] === "function") Dashboard[method]();
        else if (name === "InventoryCharts" && typeof InventoryCharts !== "undefined" && typeof InventoryCharts[method] === "function") InventoryCharts[method]();
        else if (name === "Reports" && typeof Reports !== "undefined" && typeof Reports[method] === "function") Reports[method]();
      } catch (error) { console.warn("Could not refresh " + name + "." + method, error); }
    });
  }
  async function restoreSelected() {
    if (!selectedFile) { setStatus("Choose a JSON backup file first.", "warning"); return; }
    const file = selectedFile;
    logActivity("Inventory restore started", file.name);
    let parsed;
    try {
      const text = await file.text();
      parsed = JSON.parse(text);
    } catch (error) {
      const message = "The selected file is not valid JSON.";
      addHistory(file.name, "Failed", message, false);
      logActivity("Inventory restore failed", file.name + ": " + message);
      setStatus(message + " No data was changed.", "error");
      return;
    }
    const errors = validateBackup(parsed);
    if (errors.length) {
      const message = errors.slice(0, 5).join(" ") + (errors.length > 5 ? " (and " + (errors.length - 5) + " more issue(s))." : "");
      addHistory(file.name, "Failed", message, false);
      logActivity("Inventory restore failed", file.name + ": " + message);
      setStatus("Backup validation failed: " + message + " No data was changed.", "error");
      return;
    }
    const created = timeText(parsed.createdAt);
    if (!window.confirm("Restore backup created " + created + "?\n\nThis will replace the current products, categories, suppliers, sales, stock movements, activity logs, and notifications. This action cannot be automatically undone. Continue?")) {
      addHistory(file.name, "Cancelled", "Restore was cancelled by the user. Existing data was not changed.", false);
      setStatus("Restore cancelled. Existing data was not changed.", "warning");
      return;
    }

    const normalized = normalizeData(parsed.data);
    const previous = {};
    DATA_KEYS.forEach(key => { previous[STORAGE_KEYS[key]] = localStorage.getItem(STORAGE_KEYS[key]); });
    try {
      // Validate and serialize every replacement before writing anything.
      const serialized = {};
      DATA_KEYS.forEach(key => { serialized[STORAGE_KEYS[key]] = JSON.stringify(normalized[key]); });
      // Apply all storage changes without dispatching UI events mid-restore.
      Object.keys(serialized).forEach(key => localStorage.setItem(key, serialized[key]));
      DATA_KEYS.forEach(key => window.dispatchEvent(new CustomEvent("inventory:updated", { detail: { key } })));
      addHistory(file.name, "Restored successfully", "Restored from backup created " + created + ". The selected file remains on your device; the app does not store a copy.", false);
      logActivity("Inventory restore successful", "Restored data from " + file.name + " (created " + created + ")");
      refreshApp();
      setStatus("Restore successful. Inventory data and visible sections have been refreshed.", "success");
      if (window.Store) Store.toast("Inventory backup restored successfully.");
      const input = byId("restoreBackupFile");
      if (input) input.value = "";
      selectedFile = null;
      const button = byId("restoreBackupBtn");
      if (button) button.disabled = true;
    } catch (error) {
      // Roll back all keys if any write failed, preventing a partial restore.
      Object.keys(previous).forEach(key => {
        try { if (previous[key] === null) localStorage.removeItem(key); else localStorage.setItem(key, previous[key]); } catch (_) {}
      });
      DATA_KEYS.forEach(key => window.dispatchEvent(new CustomEvent("inventory:updated", { detail: { key } })));
      const message = error && error.message ? error.message : "Storage write failed.";
      addHistory(file.name, "Failed", "Restore failed and rollback was attempted: " + message, false);
      logActivity("Inventory restore failed", file.name + ": " + message + "; rollback attempted");
      refreshApp();
      setStatus("Restore failed. Existing data was preserved where browser storage allowed rollback. " + message, "error");
      if (window.Store) Store.toast("Restore failed. Please check browser storage space.");
    }
  }
  function renderHistory() {
    const body = byId("backupHistoryTable");
    if (!body) return;
    const rows = readHistory();
    body.innerHTML = rows.map(item => {
      const statusClass = /failed/i.test(item.status) ? "out" : (/success|triggered/i.test(item.status) ? "" : "low");
      const action = item.downloadCreated
        ? '<button class="btn btn-light" type="button" data-backup-info="' + safeText(item.id) + '">Details</button>'
        : '<span class="muted">—</span>';
      return '<tr><td>' + safeText(item.id) + '</td><td>' + safeText(item.filename) + '</td><td>' + safeText(timeText(item.date)) + '</td><td><span class="pill ' + statusClass + '">' + safeText(item.status) + '</span></td><td>' + action + '</td></tr>';
    }).join("") || '<tr><td colspan="5" class="empty-state">No backup or restore activity yet.</td></tr>';
    body.querySelectorAll("[data-backup-info]").forEach(button => button.addEventListener("click", () => {
      const item = readHistory().find(row => row.id === button.dataset.backupInfo);
      if (item) alert(item.filename + "\n\n" + item.details + "\n\nOnly history metadata is stored in this application; the JSON file is not retained here.");
    }));
  }
  function init() {
    byId("downloadBackupBtn")?.addEventListener("click", createBackup);
    byId("restoreBackupFile")?.addEventListener("change", handleFileChange);
    byId("restoreBackupBtn")?.addEventListener("click", restoreSelected);
    byId("refreshBackupHistory")?.addEventListener("click", renderHistory);
    renderHistory();
  }
  window.InventoryBackup = { init, createBackup, renderHistory };
})();

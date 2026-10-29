(function () {
  const KEYS = {
    products: "products", categories: "categories", suppliers: "suppliers",
    sales: "sales", movements: "stockMovements", notifications: "notifications",
    activity: "activityLog", session: "inventorySession"
  };
  const defaults = {
    categories: [
      {id:"CAT-1",name:"Electronics",description:"Electronic devices and equipment"},
      {id:"CAT-2",name:"Accessories",description:"Computer and device accessories"},
      {id:"CAT-3",name:"Furniture",description:"Office and store furniture"}
    ],
    products: [
      {id:"PRD-1001",name:"Laptop",category:"Electronics",price:50000,stock:20,minimumStock:5,supplierId:"",description:"Business laptop"},
      {id:"PRD-1002",name:"Wireless Mouse",category:"Accessories",price:800,stock:50,minimumStock:10,supplierId:"",description:"Wireless computer mouse"},
      {id:"PRD-1003",name:"Keyboard",category:"Accessories",price:1500,stock:35,minimumStock:8,supplierId:"",description:"USB keyboard"},
      {id:"PRD-1004",name:"Monitor",category:"Electronics",price:12000,stock:10,minimumStock:10,supplierId:"",description:"Full HD monitor"},
      {id:"PRD-1005",name:"Office Chair",category:"Furniture",price:6500,stock:0,minimumStock:3,supplierId:"",description:"Ergonomic office chair"}
    ],
    suppliers: [], sales: [], movements: [], notifications: [], activity: []
  };
  const read = key => {
    try {
      const raw = localStorage.getItem(KEYS[key] || key);
      return raw === null ? null : JSON.parse(raw);
    } catch (error) {
      console.warn("Could not read saved inventory data:", key, error);
      return null;
    }
  };
  const write = (key, value) => {
    localStorage.setItem(KEYS[key] || key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("inventory:updated", {detail:{key}}));
  };
  const Store = {
    keys: KEYS,
    get(key, fallback) {
      const value = read(key);
      if (value !== null) return value;
      if (Object.prototype.hasOwnProperty.call(defaults, key)) {
        const initial = defaults[key];
        write(key, initial);
        return JSON.parse(JSON.stringify(initial));
      }
      return fallback === undefined ? [] : fallback;
    },
    set: write,
    id(prefix) {
      return `${prefix || "ID"}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    },
    escape(value) {
      return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
      }[char]));
    },
    money(value) {
      return new Intl.NumberFormat("en-IN", {style:"currency",currency:"INR",maximumFractionDigits:2}).format(Number(value)||0);
    },
    dateTime(value) {
      const date = value ? new Date(value) : new Date();
      return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-IN");
    },
    toast(message) {
      const region = document.getElementById("toastRegion");
      if (!region) { console.log(message); return; }
      const item = document.createElement("div");
      item.className = "toast";
      item.textContent = message;
      region.appendChild(item);
      window.setTimeout(() => item.remove(), 3200);
    },
    currentUser() {
      try { return JSON.parse(sessionStorage.getItem(KEYS.session) || "null"); }
      catch (_) { return null; }
    }
  };
  window.Store = Store;
})();
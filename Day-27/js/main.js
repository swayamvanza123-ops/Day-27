document.addEventListener("DOMContentLoaded", () => {
  const user = Auth.requireLogin();
  if (!user) return;
  Auth.applyRole(user);
  document.getElementById("logoutBtn")?.addEventListener("click", () => Auth.logout());
  document.getElementById("todayLabel").textContent = new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"});

  const titles = {dashboard:"Dashboard",products:"Products",categories:"Categories",suppliers:"Suppliers",sales:"Sales","stock":"Stock Movement",notifications:"Notifications",activity:"Activity Log",backup:"Backup & Restore"};
  function navigate() {
    let id = (location.hash || "#dashboard").slice(1);
    if (!document.getElementById(id) || !document.getElementById(id).classList.contains("app-section")) id="dashboard";
    if (user.role !== "Admin" && ["suppliers","activity","backup"].includes(id)) id="dashboard";
    document.querySelectorAll(".app-section").forEach(section => section.classList.toggle("active",section.id===id));
    document.querySelectorAll(".nav-link[data-section]").forEach(link => link.classList.toggle("active",link.dataset.section===id));
    document.getElementById("pageTitle").textContent=titles[id]||"Dashboard";
    if(id==="dashboard"){Dashboard.render();InventoryCharts.render();}
    if(id==="products")Products.render();
    if(id==="categories")Categories.render();
    if(id==="suppliers")Suppliers.render();
    if(id==="sales")Sales.render();
    if(id==="stock"){StockManagement.render();StockMovementHistory.render();}
    if(id==="notifications")Notifications.render();
    if(id==="activity")ActivityLog.render();
    if(id==="backup")InventoryBackup.renderHistory();
    
  }
  InventoryBackup.init();
  StockMovementHistory.init();
  Categories.init();
  Products.init();
  Suppliers.init();
  Sales.init();
  StockManagement.init();
  ActivityLog.init();
  Notifications.init();
  window.addEventListener("hashchange",navigate);
  window.addEventListener("inventory:updated",event=>{
    if(["products","categories","suppliers","sales","movements","notifications","activity"].includes(event.detail?.key)){
      Products.refreshSelectors();
      Dashboard.render();
      InventoryCharts.render();
      Notifications.render();
      ActivityLog.render();
      Sales.render();
      StockManagement.render();
      StockMovementHistory.render();
    }
  });
  navigate();
});

if (page === "suppliers") {
  html += `
    <div class="panel">
      <h2>Add Supplier</h2>
      <form id="supplierForm" class="form-grid">
        ${field("Supplier name", "sName")}
        ${field("Company", "sCompany")}
        ${field("Phone", "sPhone", "tel")}
        ${field("Email", "sEmail", "email")}
        ${field("Address", "sAddress")}
        <div>
          <label>&nbsp;</label>
          <button class="primary" type="submit">Save Supplier</button>
        </div>
      </form>
    </div>
    <div class="toolbar">
      <input id="supplierSearch"
        placeholder="Search supplier or product..."
        style="max-width:320px">
    </div>
  `;

  const supplierRows = Suppliers.all().map(supplier => {
    const suppliedProducts = Suppliers.products(supplier);
    const totalStock = Suppliers.getStock(supplier);

    return `
      <tr>
        <td><strong>${esc(supplier.name)}</strong></td>
        <td>${esc(supplier.company || "—")}</td>
        <td>${esc(supplier.phone || "—")}</td>
        <td>${esc(supplier.email || "—")}</td>
        <td>
          ${
            suppliedProducts.length
              ? suppliedProducts.map(product => `
                  <div class="supplier-product">
                    <span>${esc(product.name)}</span>
                    <span class="tag">
                      Stock: ${Number(product.stock) || 0}
                    </span>
                  </div>
                `).join("")
              : '<span class="muted">No products assigned</span>'
          }
        </td>
        <td>
          <strong class="stock-total">${totalStock} units</strong>
        </td>
        <td>
          ${button("Delete", "deleteSupplier", supplier.id)}
        </td>
      </tr>
    `;
  }).join("");

  html += table(
    [
      "Supplier",
      "Company",
      "Phone",
      "Email",
      "Products Supplied",
      "Total Stock",
      "Actions"
    ],
    supplierRows
  );
}

const Products = {
  init() {
    document.getElementById("productForm")?.addEventListener("submit", event => {
      event.preventDefault();
      const id = document.getElementById("productId").value;
      const name = document.getElementById("productName").value.trim();
      const category = document.getElementById("productCategory").value;
      const price = Number(document.getElementById("productPrice").value);
      const stock = Number(document.getElementById("productStock").value);
      const minimumStock = Number(document.getElementById("productMinimum").value);
      const supplierId = document.getElementById("productSupplier").value;
      const description = document.getElementById("productDescription").value.trim();
      if (name.length < 2 || !category || !(price > 0) || stock < 0 || minimumStock < 0 || !Number.isInteger(stock) || !Number.isInteger(minimumStock)) {
        Store.toast("Check the product name, category, price, and stock values."); return;
      }
      let rows = Store.get("products", []);
      const existing = rows.find(row => row.id === id);
      const product = {id:id || Store.id("PRD"),name,category,price,stock,minimumStock,supplierId,description,createdAt:existing?.createdAt || new Date().toISOString(),updatedAt:new Date().toISOString()};
      if (id) {
        rows = rows.map(row => row.id === id ? product : row);
        ActivityLog.add("Product updated", name); Notifications.add(`Product "${name}" was updated.`);
      } else {
        rows.unshift(product);
        ActivityLog.add("Product added", name); Notifications.add(`New product "${name}" was added.`);
      }
      Store.set("products", rows);
      this.clearForm(); this.render(); this.refreshSelectors(); Dashboard.render(); InventoryCharts?.render();
      if (stock === 0) Notifications.add(`"${name}" is out of stock.`, "critical");
      else if (stock < minimumStock) Notifications.add(`"${name}" is below its minimum stock level.`, "warning");
      Store.toast(id ? "Product updated." : "Product added.");
    });
    document.getElementById("cancelProductEdit")?.addEventListener("click", () => this.clearForm());
    document.getElementById("productSearch")?.addEventListener("input", () => this.render());
    document.getElementById("productStatusFilter")?.addEventListener("change", () => this.render());
    this.refreshSelectors(); this.render();
  },
  clearForm() {
    document.getElementById("productForm")?.reset();
    document.getElementById("productId").value="";
    document.getElementById("productMinimum").value="10";
    document.getElementById("productFormTitle").textContent="Add Product";
  },
  status(product) {
    const stock = Number(product.stock) || 0;
    if (stock <= 0) return "Out of Stock";
    if (stock < Number(product.minimumStock ?? 10)) return "Low Stock";
    return "In Stock";
  },
  refreshSelectors() {
    const categories = Store.get("categories", []);
    const suppliers = Store.get("suppliers", []);
    const categorySelect = document.getElementById("productCategory");
    if (categorySelect) {
      const current = categorySelect.value;
      categorySelect.innerHTML = categories.map(item => `<option value="${Store.escape(item.name)}">${Store.escape(item.name)}</option>`).join("");
      if (categories.some(item => item.name === current)) categorySelect.value=current;
    }
    const supplierSelect = document.getElementById("productSupplier");
    if (supplierSelect) {
      const current=supplierSelect.value;
      supplierSelect.innerHTML='<option value="">No supplier</option>'+suppliers.map(item=>`<option value="${Store.escape(item.id)}">${Store.escape(item.name)}</option>`).join("");
      supplierSelect.value=current;
    }
    const productOptions = Store.get("products", []).map(item => `<option value="${Store.escape(item.id)}">${Store.escape(item.name)} (stock: ${Number(item.stock)||0})</option>`).join("");
    ["saleProduct","movementProduct"].forEach(id => { const el=document.getElementById(id); if(el){const current=el.value;el.innerHTML=productOptions; if([...el.options].some(o=>o.value===current))el.value=current;} });
  },
  render() {
    const body=document.getElementById("productsTable"); if(!body)return;
    const search=(document.getElementById("productSearch")?.value||"").toLowerCase();
    const filter=document.getElementById("productStatusFilter")?.value||"all";
    const all=Store.get("products",[]);
    const suppliers=Store.get("suppliers",[]);
    const supplierNameFor=product => {
      const supplier=suppliers.find(item => String(item.id)===String(product.supplierId));
      return supplier?.name || product.supplierName || "No supplier";
    };
    const rows=all.filter(product => `${product.name} ${product.category} ${product.id} ${supplierNameFor(product)}`.toLowerCase().includes(search) && (filter==="all"||this.status(product)===filter));
    body.innerHTML=rows.map(product=>`<tr><td>${Store.escape(product.id)}</td><td><strong>${Store.escape(product.name)}</strong><br><span class="muted">${Store.escape(product.description||"")}</span></td><td>${Store.escape(product.category)}</td><td>${supplierNameFor(product)==="No supplier"?'<span class="muted">No supplier</span>':`<strong>${Store.escape(supplierNameFor(product))}</strong>`}</td><td>${Store.money(product.price)}</td><td>${Number(product.stock)||0}</td><td><span class="pill ${this.status(product)==="Low Stock"?"low":this.status(product)==="Out of Stock"?"out":""}">${this.status(product)}</span></td><td><div class="table-actions"><button class="btn btn-light" data-edit-product="${Store.escape(product.id)}">Edit</button><button class="btn btn-danger" data-delete-product="${Store.escape(product.id)}">Delete</button></div></td></tr>`).join("")||`<tr><td colspan="8" class="empty-state">No matching products found.</td></tr>`;
    body.querySelectorAll("[data-edit-product]").forEach(button=>button.addEventListener("click",()=>this.edit(button.dataset.editProduct)));
    body.querySelectorAll("[data-delete-product]").forEach(button=>button.addEventListener("click",()=>this.remove(button.dataset.deleteProduct)));
    const low=all.filter(p=>this.status(p)==="Low Stock").length, out=all.filter(p=>this.status(p)==="Out of Stock").length;
    const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val;};
    set("productCount",all.length);set("productLowCount",low);set("productOutCount",out);
  },
  edit(id) {
    const p=Store.get("products",[]).find(item=>item.id===id);if(!p)return;
    document.getElementById("productId").value=p.id;document.getElementById("productName").value=p.name;document.getElementById("productCategory").value=p.category;document.getElementById("productPrice").value=p.price;document.getElementById("productStock").value=p.stock;document.getElementById("productMinimum").value=p.minimumStock??10;document.getElementById("productSupplier").value=p.supplierId||"";document.getElementById("productDescription").value=p.description||"";document.getElementById("productFormTitle").textContent="Edit Product";
    location.hash="products";document.getElementById("productForm").scrollIntoView({behavior:"smooth",block:"center"});
  },
  remove(id) {
    const p=Store.get("products",[]).find(item=>item.id===id);if(!p||!confirm(`Delete "${p.name}"?`))return;
    Store.set("products",Store.get("products",[]).filter(item=>item.id!==id));
    ActivityLog.add("Product deleted",p.name);Notifications.add(`Product "${p.name}" was deleted.`);
    this.render();this.refreshSelectors();Dashboard.render();InventoryCharts?.render();Store.toast("Product deleted.");
  }
};
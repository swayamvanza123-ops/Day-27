const Categories = {
  init() {
    document.getElementById("categoryForm")?.addEventListener("submit", event => {
      event.preventDefault();
      const id = document.getElementById("categoryId").value;
      const name = document.getElementById("categoryName").value.trim();
      const description = document.getElementById("categoryDescription").value.trim();
      if (!name) return;
      let rows = Store.get("categories", []);
      if (rows.some(row => row.name.toLowerCase() === name.toLowerCase() && row.id !== id)) { Store.toast("That category already exists."); return; }
      if (id) {
        rows = rows.map(row => row.id === id ? {...row,name,description} : row);
        ActivityLog.add("Category updated", name);
        Notifications.add(`Category "${name}" was updated.`);
      } else {
        rows.push({id:Store.id("CAT"),name,description});
        ActivityLog.add("Category added", name);
        Notifications.add(`Category "${name}" was added.`);
      }
      Store.set("categories", rows);
      this.clearForm(); this.render(); Products.refreshSelectors(); InventoryCharts?.render();
      Store.toast("Category saved.");
    });
    document.getElementById("cancelCategoryEdit")?.addEventListener("click", () => this.clearForm());
    this.render();
  },
  clearForm() { document.getElementById("categoryForm")?.reset(); document.getElementById("categoryId").value=""; },
  render() {
    const body = document.getElementById("categoriesTable");
    if (!body) return;
    const products = Store.get("products", []);
    body.innerHTML = Store.get("categories", []).map(row => {
      const count = products.filter(product => product.category === row.name).length;
      return `<tr><td>${Store.escape(row.id)}</td><td>${Store.escape(row.name)}</td><td>${Store.escape(row.description || "—")}</td><td>${count}</td><td><div class="table-actions"><button class="btn btn-light" data-edit-category="${Store.escape(row.id)}">Edit</button><button class="btn btn-danger" data-delete-category="${Store.escape(row.id)}">Delete</button></div></td></tr>`;
    }).join("") || `<tr><td colspan="5" class="empty-state">No categories yet.</td></tr>`;
    body.querySelectorAll("[data-edit-category]").forEach(button => button.addEventListener("click", () => {
      const row = Store.get("categories", []).find(item => item.id === button.dataset.editCategory); if (!row) return;
      document.getElementById("categoryId").value=row.id; document.getElementById("categoryName").value=row.name; document.getElementById("categoryDescription").value=row.description || "";
      document.getElementById("categoryForm").scrollIntoView({behavior:"smooth",block:"center"});
    }));
    body.querySelectorAll("[data-delete-category]").forEach(button => button.addEventListener("click", () => {
      const row = Store.get("categories", []).find(item => item.id === button.dataset.deleteCategory); if (!row) return;
      if (products.some(product => product.category === row.name)) { Store.toast("You cannot delete a category assigned to products."); return; }
      if (!confirm(`Delete category "${row.name}"?`)) return;
      Store.set("categories", Store.get("categories", []).filter(item => item.id !== row.id));
      ActivityLog.add("Category deleted", row.name); this.render(); Products.refreshSelectors(); InventoryCharts?.render();
    }));
  }
};

const Suppliers = {
    getAll() {
        return Store.get("suppliers", []);
    },

    getProductsForSupplier(supplier) {
        const products = Store.get("products", []);

        return products.filter(product => {
            const productSupplierId = String(
                product.supplierId ?? product.supplier ?? ""
            ).trim();

            const productSupplierName = String(
                product.supplierName ?? ""
            ).trim().toLowerCase();

            return (
                (productSupplierId !== "" &&
                    productSupplierId === String(supplier.id ?? "").trim()) ||
                (productSupplierName !== "" &&
                    productSupplierName ===
                    String(supplier.name ?? "").trim().toLowerCase())
            );
        });
    },

    getStock(product) {
        return Math.max(
            0,
            Number(
                product.stock ??
                product.quantity ??
                product.availableQuantity ??
                0
            ) || 0
        );
    },

    getTotalStock(supplier) {
        return this.getProductsForSupplier(supplier).reduce(
            (total, product) => total + this.getStock(product),
            0
        );
    },

    init() {
        const form = document.getElementById("supplierForm");

        if (form && !form.dataset.bound) {
            form.dataset.bound = "true";

            form.addEventListener("submit", event => {
                event.preventDefault();
                this.save();
            });
        }

        const search = document.getElementById("supplierSearch");

        if (search && !search.dataset.bound) {
            search.dataset.bound = "true";
            search.addEventListener("input", () => this.render());
        }

        this.render();
    },

    render() {
        const tbody = document.getElementById("suppliersTable");
        if (!tbody) return;

        const search = (
            document.getElementById("supplierSearch")?.value || ""
        ).trim().toLowerCase();

        const suppliers = this.getAll().filter(supplier => {
            const products = this.getProductsForSupplier(supplier);

            const searchableText = [
                supplier.id,
                supplier.name,
                supplier.company,
                supplier.phone,
                supplier.email,
                ...products.map(product => product.name)
            ].join(" ").toLowerCase();

            return searchableText.includes(search);
        });

        if (suppliers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        No suppliers found.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = suppliers.map(supplier => {
            const products = this.getProductsForSupplier(supplier);
            const totalStock = this.getTotalStock(supplier);

            // Show product names only, without quantities.
            const productNames = products.length
                ? products.map(product => `
                    <div class="supplier-product-row">
                        <span class="supplier-product-name">
                            ${this.escapeHTML(product.name || "Unnamed product")}
                        </span>
                    </div>
                `).join("")
                : `<span class="no-products">No products assigned</span>`;

            return `
                <tr>
                    <td>${this.escapeHTML(supplier.id ?? "")}</td>
                    <td>${this.escapeHTML(supplier.name ?? "")}</td>
                    <td>${this.escapeHTML(supplier.company || "-")}</td>
                    <td>${this.escapeHTML(supplier.phone || "-")}</td>
                    <td>${this.escapeHTML(supplier.email || "-")}</td>

                    <td>
                        <div class="supplier-products-list">
                            ${productNames}
                        </div>
                    </td>

                    <td>
                        <span class="supplier-total-stock">
                            ${totalStock} units
                        </span>
                    </td>

                    <td>
                        <button
                            type="button"
                            class="btn btn-edit"
                            onclick="Suppliers.edit('${this.escapeJS(supplier.id)}')">
                            Edit
                        </button>

                        <button
                            type="button"
                            class="btn btn-delete"
                            onclick="Suppliers.remove('${this.escapeJS(supplier.id)}')">
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    },

    save() {
        const name = document.getElementById("supplierName")?.value.trim();
        const company = document.getElementById("supplierCompany")?.value.trim() || "";
        const phone = document.getElementById("supplierPhone")?.value.trim() || "";
        const email = document.getElementById("supplierEmail")?.value.trim() || "";
        const address = document.getElementById("supplierAddress")?.value.trim() || "";
        const idInput = document.getElementById("supplierId");
        const id = idInput?.value || "";

        if (!name || name.length < 2) {
            alert("Please enter a supplier name with at least 2 characters.");
            return;
        }

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert("Please enter a valid email address.");
            return;
        }

        const suppliers = this.getAll();

        const duplicate = suppliers.some(supplier =>
            supplier.name?.trim().toLowerCase() === name.toLowerCase() &&
            String(supplier.id) !== String(id)
        );

        if (duplicate) {
            alert("A supplier with this name already exists.");
            return;
        }

        const editing = Boolean(id);

        const newSupplier = {
            id: editing ? id : String(Date.now()),
            name,
            company,
            phone,
            email,
            address
        };

        const updatedSuppliers = editing
            ? suppliers.map(supplier =>
                String(supplier.id) === String(id)
                    ? newSupplier
                    : supplier
            )
            : [...suppliers, newSupplier];

        Store.set("suppliers", updatedSuppliers);

        document.getElementById("supplierForm")?.reset();

        if (idInput) {
            idInput.value = "";
        }

        this.render();

        if (typeof Products !== "undefined" && Products.render) {
            Products.render();
        }

        if (typeof Dashboard !== "undefined" && Dashboard.render) {
            Dashboard.render();
        }

        if (typeof ActivityLog !== "undefined" && ActivityLog.add) {
            ActivityLog.add(
                `${editing ? "Supplier updated: " : "Supplier added: "}${name}`
            );
        }

        alert(editing
            ? "Supplier updated successfully!"
            : "Supplier added successfully!"
        );
    },

    edit(id) {
        const supplier = this.getAll().find(
            item => String(item.id) === String(id)
        );

        if (!supplier) return;

        document.getElementById("supplierId").value = supplier.id;
        document.getElementById("supplierName").value = supplier.name || "";
        document.getElementById("supplierCompany").value = supplier.company || "";
        document.getElementById("supplierPhone").value = supplier.phone || "";
        document.getElementById("supplierEmail").value = supplier.email || "";
        document.getElementById("supplierAddress").value = supplier.address || "";

        document.getElementById("supplierForm")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    },

    remove(id) {
        const supplier = this.getAll().find(
            item => String(item.id) === String(id)
        );

        if (!supplier) return;

        const linkedProducts = this.getProductsForSupplier(supplier);

        if (linkedProducts.length > 0) {
            alert(
                "This supplier has products assigned. " +
                "Reassign or remove those products first."
            );
            return;
        }

        if (!confirm(`Are you sure you want to delete ${supplier.name}?`)) {
            return;
        }

        Store.set(
            "suppliers",
            this.getAll().filter(
                item => String(item.id) !== String(id)
            )
        );

        this.render();

        if (typeof ActivityLog !== "undefined" && ActivityLog.add) {
            ActivityLog.add("Supplier deleted: " + supplier.name);
        }
    },

    escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    },

    escapeJS(value) {
        return String(value ?? "")
            .replace(/\\/g, "\\\\")
            .replace(/'/g, "\\'")
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r");
    }
};

document.addEventListener("DOMContentLoaded", () => {
    Suppliers.init();
});

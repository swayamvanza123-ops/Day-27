const Dashboard = {
  getStock(p){return Math.max(0,Number(p.stock??p.quantity??p.availableQuantity??0)||0);},
  getMinimumStock(p){return Number(p.minimumStock??p.minStock??p.reorderLevel??10);},
  getStatus(p){const stock=this.getStock(p);if(stock===0)return "Out of Stock";if(stock<this.getMinimumStock(p))return "Low Stock";return "In Stock";},
  getFilteredProducts(){const products=Store.get("products",[]),category=document.getElementById("chartCategory")?.value||"all";return category==="all"?products:products.filter(p=>String(p.category||"Uncategorized")===category);},
  render(){
    const products=this.getFilteredProducts(),totalStock=products.reduce((sum,p)=>sum+this.getStock(p),0),low=products.filter(p=>this.getStatus(p)==="Low Stock").length,out=products.filter(p=>this.getStatus(p)==="Out of Stock").length,value=products.reduce((sum,p)=>sum+(Number(p.price)||0)*this.getStock(p),0);
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    set("chartTotalProducts",products.length);set("chartTotalStock",totalStock.toLocaleString("en-IN"));set("chartLowStock",low);set("chartOutOfStock",out);set("chartInventoryValue",Store.money(value));
    set("dashProducts",Store.get("products",[]).length);set("dashStock",Store.get("products",[]).reduce((s,p)=>s+this.getStock(p),0));set("dashLow",Store.get("products",[]).filter(p=>this.getStatus(p)==="Low Stock").length);
    const body=document.getElementById("dashboardTable");if(!body)return;
    body.innerHTML=products.map(p=>{const status=this.getStatus(p),cls=status==="Low Stock"?"low":status==="Out of Stock"?"out":"";return `<tr><td>${Store.escape(p.id)}</td><td>${Store.escape(p.name)}</td><td>${Store.escape(p.category)}</td><td>${Store.money(p.price)}</td><td>${this.getStock(p)}</td><td><span class="pill ${cls}">${status}</span></td></tr>`;}).join("")||`<tr><td colspan="6" class="empty-state">No products found for this category.</td></tr>`;
  }
};
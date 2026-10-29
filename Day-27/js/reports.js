const Reports = {
  exportCSV(filename,headers,rows) {
    const escape = value => `"${String(value ?? "").replace(/"/g,'""')}"`;
    const csv=[headers,...rows].map(row=>row.map(escape).join(",")).join("\r\n");
    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
  },
  productRows() {
    return Store.get("products",[]).map(p=>[p.id,p.name,p.category,p.price,p.stock,p.minimumStock,p.stock===0?"Out of Stock":p.stock<p.minimumStock?"Low Stock":"In Stock",p.description]);
  },
  salesRows() { return Store.get("sales",[]).map(s=>[s.invoice,s.customer,s.phone,s.productName,s.quantity,s.date,s.subtotal,s.discount,s.total]); },
  movementRows() { return Store.get("movements",[]).map(m=>[m.date,m.productName,m.type,m.quantity,m.previous,m.updated,m.reason]); },
  categoryRows() {
    const products=Store.get("products",[]);
    return Store.get("categories",[]).map(c=>[c.name,c.description,products.filter(p=>p.category===c.name).length,products.filter(p=>p.category===c.name).reduce((sum,p)=>sum+(Number(p.price)||0)*(Number(p.stock)||0),0)]);
  },
  init() {
    document.getElementById("exportProducts")?.addEventListener("click",()=>this.exportCSV("products-report.csv",["ID","Product","Category","Price","Stock","Minimum Stock","Status","Description"],this.productRows()));
    document.getElementById("exportSales")?.addEventListener("click",()=>this.exportCSV("sales-report.csv",["Invoice","Customer","Phone","Product","Quantity","Date","Subtotal","Discount","Total"],this.salesRows()));
    document.getElementById("exportStock")?.addEventListener("click",()=>this.exportCSV("stock-movements.csv",["Date","Product","Movement","Quantity","Previous Stock","Updated Stock","Reason"],this.movementRows()));
    document.getElementById("exportCategories")?.addEventListener("click",()=>this.exportCSV("categories-report.csv",["Category","Description","Product Count","Inventory Value"],this.categoryRows()));
    this.render();
  },
  render() {
    const products=Store.get("products",[]),sales=Store.get("sales",[]);
    const totalValue=products.reduce((sum,p)=>sum+(Number(p.price)||0)*(Number(p.stock)||0),0);
    const revenue=sales.reduce((sum,s)=>sum+(Number(s.total)||0),0);
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    set("reportProducts",products.length);set("reportValue",Store.money(totalValue));set("reportSales",sales.length);set("reportRevenue",Store.money(revenue));
    const body=document.getElementById("reportProductsTable");
    if(body)body.innerHTML=products.map(p=>`<tr><td>${Store.escape(p.id)}</td><td>${Store.escape(p.name)}</td><td>${Store.escape(p.category)}</td><td>${Store.money(p.price)}</td><td>${Number(p.stock)||0}</td></tr>`).join("")||`<tr><td colspan="5" class="empty-state">No products saved.</td></tr>`;
  }
};
document.addEventListener("DOMContentLoaded",()=>{if(document.getElementById("reportsPage")){const user=Store.currentUser();if(!user){location.replace("login.html");return;}if(user.role!=="Admin"){location.replace("index.html");return;}document.getElementById("reportUser").textContent=user.name;Auth.applyRole(user);Reports.init();document.getElementById("reportLogout")?.addEventListener("click",()=>Auth.logout());}});

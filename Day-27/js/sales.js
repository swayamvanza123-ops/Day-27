const Sales = {
  init() {
    const date=document.getElementById("saleDate");if(date&&!date.value)date.value=new Date().toISOString().slice(0,10);
    ["saleProduct","saleQuantity","saleDiscount"].forEach(id=>document.getElementById(id)?.addEventListener("change",()=>this.calculateTotal()));
    document.getElementById("saleForm")?.addEventListener("submit",event=>{
      event.preventDefault();
      const customer=document.getElementById("saleCustomer").value.trim(),phone=document.getElementById("salePhone").value.trim(),productId=document.getElementById("saleProduct").value,quantity=Number(document.getElementById("saleQuantity").value),discount=Number(document.getElementById("saleDiscount").value)||0,date=document.getElementById("saleDate").value;
      const products=Store.get("products",[]),product=products.find(p=>p.id===productId);
      if(!product||!Number.isInteger(quantity)||quantity<1||quantity>Number(product.stock)){Store.toast("Choose a product with enough stock.");return;}
      const subtotal=Number(product.price)*quantity;if(discount<0||discount>subtotal){Store.toast("Discount must be between zero and the subtotal.");return;}
      const sale={id:Store.id("INV"),invoice:"INV-"+Date.now().toString().slice(-7),customer,phone,productId,productName:product.name,quantity,unitPrice:Number(product.price),subtotal,discount,total:subtotal-discount,date,createdAt:new Date().toISOString()};
      Store.set("sales",[sale,...Store.get("sales",[])]);
      Store.set("products",products.map(p=>p.id===productId?{...p,stock:Number(p.stock)-quantity,updatedAt:new Date().toISOString()}:p));
      recordStockMovement({productId,productName:product.name,movementType:"sale",previousStock:Number(product.stock),newStock:Number(product.stock)-quantity,reason:`Sale ${sale.invoice}`});
      ActivityLog.add("Sale completed",`${sale.invoice} — ${customer} — ${product.name} × ${quantity}`);
      Notifications.add(`Sale ${sale.invoice} completed for ${Store.money(sale.total)}.`);
      const updated=Number(product.stock)-quantity;
      document.getElementById("saleForm").reset();document.getElementById("saleDate").value=new Date().toISOString().slice(0,10);this.calculateTotal();
      Products.refreshSelectors();Products.render();this.render();Dashboard.render();InventoryCharts?.render();Notifications.render();StockMovementHistory.render();Store.toast("Sale completed and stock updated.");
    });
    this.calculateTotal();this.render();
  },
  calculateTotal(){
    const p=Store.get("products",[]).find(item=>item.id===document.getElementById("saleProduct")?.value);
    const q=Number(document.getElementById("saleQuantity")?.value)||0,d=Number(document.getElementById("saleDiscount")?.value)||0;
    const total=Math.max(0,(Number(p?.price)||0)*q-d);const field=document.getElementById("saleTotal");if(field)field.value=total.toFixed(2);
  },
  render(){
    const body=document.getElementById("salesTable");if(!body)return;
    body.innerHTML=Store.get("sales",[]).map(s=>`<tr><td>${Store.escape(s.invoice)}</td><td>${Store.escape(s.customer)}</td><td>${Store.escape(s.productName)}</td><td>${s.quantity}</td><td>${Store.escape(s.date)}</td><td>${Store.money(s.total)}</td></tr>`).join("")||`<tr><td colspan="6" class="empty-state">No sales recorded yet.</td></tr>`;
  }
};
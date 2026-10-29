const InventoryCharts = {
  instances:{},
  products(){return Store.get("products",[]);},
  stock(p){return Math.max(0,Number(p.stock??p.quantity??p.availableQuantity??0)||0);},
  minimum(p){return Number(p.minimumStock??p.minStock??p.reorderLevel??10);},
  category(p){return String(p.category||"Uncategorized");},
  status(p){const n=this.stock(p);return n===0?"Out of Stock":n<this.minimum(p)?"Low Stock":"In Stock";},
  money(n){return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(Number(n)||0);},
  categories(){
    const saved=Store.get("categories",[]).map(c=>typeof c==="string"?c:c.name).filter(Boolean);
    return [...new Set([...saved,...this.products().map(p=>this.category(p))])].sort((a,b)=>a.localeCompare(b));
  },
  updateCategoryFilter(){
    const select=document.getElementById("chartCategory");if(!select)return;
    const previous=select.value||"all";
    select.innerHTML='<option value="all">All Categories</option>'+this.categories().map(c=>`<option value="${Store.escape(c)}">${Store.escape(c)}</option>`).join("");
    select.value=previous==="all"||this.categories().includes(previous)?previous:"all";
  },
  filtered(){
    const all=this.products(),category=document.getElementById("chartCategory")?.value||"all";
    return category==="all"?all:all.filter(p=>this.category(p)===category);
  },
  categoryCounts(products){
    const selected=document.getElementById("chartCategory")?.value||"all",labels=selected==="all"?this.categories():[selected];
    return {labels,values:labels.map(c=>products.filter(p=>this.category(p)===c).length)};
  },
  categoryValues(products){
    const selected=document.getElementById("chartCategory")?.value||"all",labels=selected==="all"?this.categories():[selected];
    return {labels,values:labels.map(c=>products.filter(p=>this.category(p)===c).reduce((sum,p)=>sum+(Number(p.price)||0)*this.stock(p),0))};
  },
  stockStatus(products){
    const labels=["In Stock","Low Stock","Out of Stock"];
    return {labels,values:labels.map(s=>products.filter(p=>this.status(p)===s).length)};
  },
  productStock(products){return {labels:products.map(p=>String(p.name||"Unnamed")),values:products.map(p=>this.stock(p))};},
  draw(id,type,data,opts){
    const canvas=document.getElementById(id);if(!canvas||typeof Chart==="undefined")return;
    let chart=this.instances[id]||(Chart.getChart?Chart.getChart(canvas):null);
    if(chart){
      chart.data.labels=data.labels;chart.data.datasets[0].data=data.values;chart.data.datasets[0].backgroundColor=opts.colors;chart.data.datasets[0].label=opts.label;chart.update();this.instances[id]=chart;return;
    }
    chart=new Chart(canvas,{type,data:{labels:data.labels,datasets:[{label:opts.label,data:data.values,backgroundColor:opts.colors,borderColor:type==="doughnut"?"#fff":opts.colors,borderWidth:type==="doughnut"?3:1,borderRadius:type==="bar"?6:0,hoverOffset:type==="doughnut"?8:0,maxBarThickness:48}]},options:{
      responsive:true,maintainAspectRatio:false,animation:{duration:250},
      plugins:{legend:{display:type==="doughnut",position:"bottom",labels:{usePointStyle:true,padding:18}},tooltip:{callbacks:{label:ctx=>opts.currency?`${ctx.label}: ${this.money(ctx.raw)}`:`${ctx.label}: ${Number(ctx.raw||0).toLocaleString("en-IN")} ${opts.unit}`}}},
      scales:type==="bar"?{x:{grid:{display:false},ticks:{autoSkip:false,maxRotation:45,minRotation:0}},y:{beginAtZero:true,ticks:{callback:v=>opts.currency?this.money(v):v}}}:{}
    }});
    this.instances[id]=chart;
  },
  render(){
    if(typeof Chart==="undefined"){console.error("Chart.js did not load. Check your internet connection.");return;}
    this.updateCategoryFilter();
    const products=this.filtered();
    const summary=products.reduce((s,p)=>{s.stock+=this.stock(p);s.value+=(Number(p.price)||0)*this.stock(p);if(this.status(p)==="Low Stock")s.low++;if(this.status(p)==="Out of Stock")s.out++;return s;},{stock:0,value:0,low:0,out:0});
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    set("chartTotalProducts",products.length);set("chartTotalStock",summary.stock.toLocaleString("en-IN"));set("chartLowStock",summary.low);set("chartOutOfStock",summary.out);set("chartInventoryValue",this.money(summary.value));
    const status=this.stockStatus(products),cats=this.categoryCounts(products),values=this.categoryValues(products),stock=this.productStock(products);
    this.draw("stockStatusChart","doughnut",status,{label:"Products",unit:"products",colors:["#6558d3","#f0b44d","#df5368"]});
    this.draw("categoryProductsChart","bar",cats,{label:"Product Count",unit:"products",colors:"#8275e8"});
    this.draw("inventoryValueChart","bar",values,{label:"Inventory Value",currency:true,colors:"#35a981"});
    this.draw("productStockChart","bar",stock,{label:"Stock Quantity",unit:"units",colors:"#6a9fe8"});
    Dashboard.render();
  },
  init(){
    const select=document.getElementById("chartCategory");if(!select)return;
    select.addEventListener("change",()=>this.render());
    document.getElementById("clearChartFilters")?.addEventListener("click",()=>{select.value="all";this.render();});
    document.getElementById("refreshCharts")?.addEventListener("click",()=>this.render());
    window.addEventListener("inventory:updated",e=>{if(["products","categories"].includes(e.detail?.key))this.render();});
    window.addEventListener("storage",e=>{if(["products","categories"].includes(e.key))this.render();});
    this.render();
  }
};

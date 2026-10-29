const ActivityLog = {
  add(action, details) {
    const user = Store.currentUser();
    const logs = Store.get("activity", []);
    logs.unshift({id:Store.id("LOG"),user:user?.name || "System",action,details:String(details || ""),date:new Date().toISOString()});
    Store.set("activity", logs.slice(0,500));
    this.render();
  },
  render() {
    const body = document.getElementById("activityTable");
    if (!body) return;
    const rows = Store.get("activity", []);
    body.innerHTML = rows.map(row => `<tr><td>${Store.escape(Store.dateTime(row.date))}</td><td>${Store.escape(row.user)}</td><td>${Store.escape(row.action)}</td><td>${Store.escape(row.details)}</td></tr>`).join("") || `<tr><td colspan="4" class="empty-state">No activity recorded yet.</td></tr>`;
  },
  init() {
    document.getElementById("clearActivity")?.addEventListener("click", () => {
      if (!confirm("Clear all activity logs?")) return;
      Store.set("activity", []);
      this.render();
      Store.toast("Activity log cleared.");
    });
    this.render();
  }
};
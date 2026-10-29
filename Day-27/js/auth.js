const Auth = {
  demoUsers: [
    {email:"admin@demo.com",password:"admin123",name:"Admin User",role:"Admin"},
    {email:"staff@demo.com",password:"staff123",name:"Staff User",role:"Staff"}
  ],
  initLogin() {
    if (Store.currentUser()) { window.location.href = "index.html"; return; }
    const form = document.getElementById("loginForm");
    document.getElementById("togglePassword")?.addEventListener("click", () => {
      const input = document.getElementById("loginPassword");
      const button = document.getElementById("togglePassword");
      input.type = input.type === "password" ? "text" : "password";
      button.textContent = input.type === "password" ? "Show" : "Hide";
    });
    form?.addEventListener("submit", event => {
      event.preventDefault();
      const email = document.getElementById("loginEmail").value.trim().toLowerCase();
      const password = document.getElementById("loginPassword").value;
      const user = this.demoUsers.find(item => item.email === email && item.password === password);
      const error = document.getElementById("loginError");
      if (!user) { error.textContent = "Incorrect email or password. Try one of the demo accounts."; return; }
      sessionStorage.setItem("inventorySession", JSON.stringify({email:user.email,name:user.name,role:user.role,loggedAt:new Date().toISOString()}));
      window.location.href = "index.html";
    });
  },
  requireLogin() {
    const user = Store.currentUser();
    if (!user) { window.location.replace("login.html"); return null; }
    return user;
  },
  applyRole(user) {
    document.querySelectorAll(".admin-only,.admin-only-section").forEach(el => {
      el.style.display = user.role === "Admin" ? "" : "none";
    });
    document.getElementById("sidebarUser").textContent = user.name;
    document.getElementById("sidebarRole").textContent = user.role === "Admin" ? "Administrator" : "Staff";
    document.getElementById("userAvatar").textContent = user.name.charAt(0).toUpperCase();
  },
  logout() {
    sessionStorage.removeItem("inventorySession");
    window.location.replace("login.html");
  }
};

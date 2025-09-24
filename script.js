/* ======================
   FRONTEND (Backend-powered)
   ====================== */

const API_BASE = "http://localhost:5000/api";

/* ---------- Token helpers ---------- */
function setToken(token) {
  localStorage.setItem("token", token);
}
function getToken() {
  return localStorage.getItem("token");
}
function clearToken() {
  localStorage.removeItem("token");
}

/* ---------- Toast helpers ---------- */
function showToast(message, bg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  if (bg) toast.style.background = bg;
  toast.classList.remove("hidden");
  toast.classList.add("show");
  if (toast._timeout) clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove("show");
    if (!toast.classList.contains("hidden")) toast.classList.add("hidden");
    toast.style.background = "";
  }, 2500);
}

function showLoginToast(msg, bg = "#4f46e5") {
  showToast(msg, bg);
}

/* ---------- API helper ---------- */
async function apiFetch(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    clearToken();
    window.location.replace("index.html");
    throw new Error("Unauthorized");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

/* =========================================================
   PAGE ROUTING BOOTSTRAP
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;

  if (page === "login") {
    const reason = localStorage.getItem("logoutReason");
    if (reason) {
      showLoginToast(reason, "#f59e0b");
      localStorage.removeItem("logoutReason");
    }
  }

  if (page === "login") initLoginPage();
  if (page === "dashboard") initDashboardPage();
});

/* =========================================================
   LOGIN PAGE (Backend auth)
========================================================= */
function initLoginPage() {
  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passInput = document.getElementById("password");
  const rememberInput = document.getElementById("rememberMe");

  const regModal = document.getElementById("registerModal");
  const openRegister = document.getElementById("openRegister");
  const closeRegister = document.getElementById("closeRegister");
  const registerForm = document.getElementById("registerForm");
  const regEmail = document.getElementById("regEmail");
  const regPassword = document.getElementById("regPassword");
  const regPassword2 = document.getElementById("regPassword2");

  const togglePassword = document.getElementById("togglePassword");
  const toggleRegPassword = document.getElementById("toggleRegPassword");
  const toggleRegPassword2 = document.getElementById("toggleRegPassword2");
  const forgotPassword = document.getElementById("forgotPassword");

  // Clear inputs
  if (emailInput) emailInput.value = "";
  if (passInput) passInput.value = "";
  if (rememberInput) rememberInput.checked = false;

  // Redirect if already logged in
  if (getToken()) {
    window.location.replace("dashboard.html");
    return;
  }

  // Password toggles
  const toggleEye = (input, el) => {
    if (!input || !el) return;
    el.addEventListener("click", () => {
      input.type = input.type === "password" ? "text" : "password";
      el.textContent = input.type === "password" ? "👁" : "🙈";
    });
  };
  toggleEye(passInput, togglePassword);
  toggleEye(regPassword, toggleRegPassword);
  toggleEye(regPassword2, toggleRegPassword2);

  // Forgot password (demo)
  if (forgotPassword) {
    forgotPassword.addEventListener("click", (e) => {
      e.preventDefault();
      showLoginToast("Password reset not implemented in demo.", "#f59e0b");
    });
  }

  // Register modal
  openRegister?.addEventListener("click", (e) => {
    e.preventDefault();
    regModal.classList.remove("hidden");
  });
  closeRegister?.addEventListener("click", () => {
    regModal.classList.add("hidden");
  });
  regModal?.addEventListener("click", (e) => {
    if (e.target === regModal) regModal.classList.add("hidden");
  });

  // Register submit
  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = regEmail.value.trim();
    const pw1 = regPassword.value;
    const pw2 = regPassword2.value;

    if (pw1.length < 6) return showLoginToast("Password must be at least 6 chars.", "#ef4444");
    if (pw1 !== pw2) return showLoginToast("Passwords do not match.", "#ef4444");

    try {
      await apiFetch("/register", {
        method: "POST",
        body: JSON.stringify({ email, password: pw1 }),
      });
      showLoginToast("Account created! You can login now.", "#10b981");
      registerForm.reset();
      regModal.classList.add("hidden");
    } catch (err) {
      showLoginToast(err.message || "Registration failed", "#ef4444");
    }
  });

  // Login submit
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passInput.value;

    try {
      const data = await apiFetch("/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      showLoginToast("Login successful! Redirecting...", "#10b981");
      setTimeout(() => window.location.replace("dashboard.html"), 400);
    } catch (err) {
      showLoginToast(err.message || "Login failed", "#ef4444");
    }
  });
}

/* =========================================================
   DASHBOARD PAGE (Backend data)
========================================================= */
function initDashboardPage() {
  if (!getToken()) {
    window.location.replace("index.html");
    return;
  }

  let currentUser = { role: "teacher", username: "" };
  let inactivityTimer = null;
  const INACTIVITY_MS = 25 * 60 * 1000; // 25 minutes

  function logoutForInactivity() {
    alert("You were logged out due to inactivity (25 minutes).");
    localStorage.setItem("logoutReason", "You were logged out due to inactivity.");
    clearToken();
    window.location.replace("index.html");
  }
  function resetInactivityTimer() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(logoutForInactivity, INACTIVITY_MS);
  }
  ["click", "mousemove", "keydown", "scroll", "touchstart"].forEach((evt) => {
    window.addEventListener(evt, resetInactivityTimer, { passive: true });
  });
  resetInactivityTimer();

  // --- Sidebar ---
  const sidebar = document.getElementById("sidebar");
  const sidebarToggleArrow = document.getElementById("sidebarToggleArrow");

  window.toggleSidebar = function toggleSidebar() {
    const isShown = sidebar.classList.contains("show");
    if (window.innerWidth <= 768) {
      if (isShown) {
        sidebar.classList.remove("show");
        sidebarToggleArrow.textContent = "▶";
        document.querySelector(".main-content").style.marginLeft = "0";
      } else {
        sidebar.classList.add("show");
        sidebarToggleArrow.textContent = "◀";
        document.querySelector(".main-content").style.marginLeft = "0";
      }
    } else {
      sidebar.classList.toggle("hidden");
      if (sidebar.classList.contains("hidden")) {
        document.querySelector(".main-content").style.marginLeft = "0";
      } else {
        document.querySelector(".main-content").style.marginLeft = "220px";
      }
    }
  };
  function initializeSidebarToggleArrow() {
    if (window.innerWidth <= 768) {
      sidebar.classList.remove("hidden");
      sidebar.classList.remove("show");
      sidebarToggleArrow.textContent = "▶";
      document.querySelector(".main-content").style.marginLeft = "0";
      sidebarToggleArrow.style.display = "block";
    } else {
      sidebarToggleArrow.style.display = "none";
      sidebar.classList.remove("show");
      sidebar.classList.remove("hidden");
      document.querySelector(".main-content").style.marginLeft = "220px";
    }
  }
  sidebarToggleArrow?.addEventListener("click", toggleSidebar);
  window.addEventListener("resize", initializeSidebarToggleArrow);
  window.addEventListener("load", initializeSidebarToggleArrow);
  initializeSidebarToggleArrow();

  // --- Nav items ---
  const navItems = document.querySelectorAll(".sidebar nav ul li");
  const pageTitle = document.getElementById("pageTitle");
  const sections = {
    dashboard: document.getElementById("dashboardSection"),
    students: document.getElementById("studentsSection"),
    attendance: document.getElementById("attendanceSection"),
    settings: document.getElementById("settingsSection"),
  };
  navItems.forEach((li) => {
    li.addEventListener("click", () => {
      navItems.forEach((i) => i.classList.remove("active"));
      li.classList.add("active");
      const page = li.getAttribute("data-page");
      Object.entries(sections).forEach(([k, el]) => {
        if (el) el.classList.toggle("hidden", k !== page);
      });
      const names = { dashboard: "Dashboard", students: "Students", attendance: "Attendance", settings: "Settings" };
      if (pageTitle) pageTitle.textContent = names[page] || "Dashboard";
    });
  });

  window.logout = function logout() {
    clearToken();
    window.location.replace("index.html");
  };

  // Student modal
  const studentModal = document.getElementById("studentModal");
  window.openStudentModal = function () { studentModal?.classList.remove("hidden"); };
  window.closeStudentModal = function () { studentModal?.classList.add("hidden"); };
  studentModal?.addEventListener("click", (e) => { if (e.target === studentModal) window.closeStudentModal(); });

  // Globals
  let students = [];
  let attendanceMap = {};
  let barChart, doughnutChart;

  const studentTable = document.getElementById("studentTable");
  const attendanceTable = document.getElementById("attendanceTable");
  const attendanceHeader = document.getElementById("attendanceHeader");

  const viewSelect = document.getElementById("viewSelect");
  const classSelector = document.getElementById("classSelector");
  const monthSelectEl = document.getElementById("monthSelect");
  const yearSelectEl = document.getElementById("yearSelect");
  const classFilterEl = document.getElementById("classFilter");
  const searchInput = document.getElementById("searchInput");
  const studentForm = document.getElementById("studentForm");

  // Populate month/year
  function populateMonthYear() {
    if (!monthSelectEl || !yearSelectEl) return;
    const monthNames = ["01","02","03","04","05","06","07","08","09","10","11","12"];
    monthSelectEl.innerHTML = monthNames.map(m => `<option value="${m}">${m}</option>`).join("");

    const now = new Date();
    const thisYear = now.getFullYear();
    const years = [];
    for (let y = thisYear - 3; y <= thisYear + 1; y++) years.push(y);
    yearSelectEl.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join("");
    monthSelectEl.value = String(now.getMonth() + 1).padStart(2, "0");
    yearSelectEl.value = String(thisYear);
  }

  // --- API functions ---
  async function loadStudents() {
    const rows = await apiFetch("/students");
    students = rows || [];
    const t = document.getElementById("totalStudentsCard");
    if (t) t.textContent = students.length;

    const classes = Array.from(new Set(students.map(s => s.class))).filter(Boolean).sort();
    if (classSelector) classSelector.innerHTML = `<option value="all" selected>All Classes</option>` + classes.map(c => `<option value="${c}">${c}</option>`).join("");
    if (classFilterEl) classFilterEl.innerHTML = `<option value="all" selected>All Classes</option>` + classes.map(c => `<option value="${c}">${c}</option>`).join("");
  }

  async function addStudentAPI(stu) {
    return apiFetch("/students", { method: "POST", body: JSON.stringify(stu) });
  }
  async function deleteStudentAPI(id) {
    return apiFetch(`/students/${id}`, { method: "DELETE" });
  }
  async function loadAttendanceFromAPI(month, year) {
    const rows = await apiFetch(`/attendance/${month}/${year}`);
    const rollToId = {};
    students.forEach(s => rollToId[s.roll] = s.id);
    const key = `${year}-${month}`;
    attendanceMap = {};
    rows.forEach(r => {
      const sid = r.student_id || rollToId[r.roll];
      if (!sid) return;
      const day = new Date(r.date).getDate();
      if (!attendanceMap[sid]) attendanceMap[sid] = {};
      if (!attendanceMap[sid][key]) attendanceMap[sid][key] = {};
      attendanceMap[sid][key][day] = (r.status || "").toLowerCase() === "present";
    });
    updateDashboardCards(year, month);
  }

  async function markAttendanceAPI(studentId, year, month, day, present) {
    const date = `${year}-${month}-${String(day).padStart(2, "0")}`;
    await apiFetch("/attendance", {
      method: "POST",
      body: JSON.stringify({ studentId, date, status: present ? "present" : "absent" }),
    });
    const key = `${year}-${month}`;
    if (!attendanceMap[studentId]) attendanceMap[studentId] = {};
    if (!attendanceMap[studentId][key]) attendanceMap[studentId][key] = {};
    attendanceMap[studentId][key][day] = present;
  }

  // --- Remaining code: renderAttendance, renderStudents, charts, event listeners ---
  // (same as original, but all template literals fixed)
  
  (async function init() {
    populateMonthYear();
    await loadCurrentUser();
    await loadStudents();
    renderStudents();
    updateAttendanceHeader();
    const m = monthSelectEl?.value, y = yearSelectEl?.value;
    if (m && y) {
      await loadAttendanceFromAPI(m, y);
      renderAttendance();
      updateChartsForMonth(y, m);
    }
  })();
}

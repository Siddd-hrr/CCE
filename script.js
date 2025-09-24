//script.js


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
// Reuse the same toast for login page messages
function showLoginToast(msg, bg = "#4f46e5") {
  showToast(msg, bg);
}

/* ---------- API helper ---------- */
async function apiFetch(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(getToken() ? { Authorization: Bearer ${getToken()} } : {}),
    ...options.headers,
  };
  const res = await fetch(${API_BASE}${endpoint}, { ...options, headers });
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

  // show login-timeout message if redirected
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

  // 🔹 Ensure inputs are empty when page loads (no autofill)
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

  // Register submit -> backend
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

  // Login submit -> backend
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
  // Ensure token
  if (!getToken()) {
    window.location.replace("index.html");
    return;
  }

  let currentUser = { role: "teacher", username: "" }; // default until fetched
  let inactivityTimer = null;
  const INACTIVITY_MS = 25 * 60 * 1000; // 25 minutes

  // --- Inactivity control
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

  // --- Sidebar + responsive ---
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

  // --- Nav items -> switch sections & title
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
        el.classList.toggle("hidden", k !== page && !(page === "dashboard" && k === "dashboard"));
      });
      const names = { dashboard: "Dashboard", students: "Students", attendance: "Attendance", settings: "Settings" };
      pageTitle.textContent = names[page] || "Dashboard";
    });
  });

  // --- Logout function (HTML calls logout())
  window.logout = function logout() {
    clearToken();
    window.location.replace("index.html");
  };

  // --- Student modal controls (HTML calls openStudentModal/closeStudentModal)
  const studentModal = document.getElementById("studentModal");
  window.openStudentModal = function openStudentModal() {
    studentModal?.classList.remove("hidden");
  };
  window.closeStudentModal = function closeStudentModal() {
    studentModal?.classList.add("hidden");
  };
  studentModal?.addEventListener("click", (e) => {
    if (e.target === studentModal) window.closeStudentModal();
  });

  // --- Globals / DOM refs ---
  let students = [];
  let attendanceMap = {}; // { [studentId]: { [YYYY-MM]: { [day]: true|false } } }
  let barChart, doughnutChart;

  const studentTable = document.getElementById("studentTable");
  const attendanceTable = document.getElementById("attendanceTable");
  const attendanceHeader = document.getElementById("attendanceHeader");

  const viewSelect = document.getElementById("viewSelect"); // 30/7/1 days for charts
  const classSelector = document.getElementById("classSelector");

  const monthSelectEl = document.getElementById("monthSelect");
  const yearSelectEl = document.getElementById("yearSelect");
  const classFilterEl = document.getElementById("classFilter");

  const searchInput = document.getElementById("searchInput");
  const studentForm = document.getElementById("studentForm");

  // --- Utility: populate months & years selects
  function populateMonthYear() {
    if (!monthSelectEl || !yearSelectEl) return;
    const monthNames = [
      "01","02","03","04","05","06",
      "07","08","09","10","11","12"
    ];
    monthSelectEl.innerHTML = monthNames.map((m) => <option value="${m}">${m}</option>).join("");

    const now = new Date();
    const thisYear = now.getFullYear();
    const years = [];
    for (let y = thisYear - 3; y <= thisYear + 1; y++) years.push(y);
    yearSelectEl.innerHTML = years.map((y) => <option value="${y}">${y}</option>).join("");
    // set current month/year as default
    monthSelectEl.value = String(now.getMonth() + 1).padStart(2, "0");
    yearSelectEl.value = String(thisYear);
  }

  // --- API functions ---
  async function loadStudents() {
    const rows = await apiFetch("/students");
    students = rows || [];
    const t = document.getElementById("totalStudentsCard");
    if (t) t.textContent = students.length;

    // Fill class dropdowns based on current students
    const classes = Array.from(new Set(students.map((s) => s.class))).filter(Boolean).sort();
    // dashboard header classSelector
    if (classSelector) {
      classSelector.innerHTML = <option value="all" selected>All Classes</option> +
        classes.map((c) => <option value="${c}">${c}</option>).join("");
    }
    // attendance filter
    if (classFilterEl) {
      classFilterEl.innerHTML = <option value="all" selected>All Classes</option> +
        classes.map((c) => <option value="${c}">${c}</option>).join("");
    }
  }

  async function addStudentAPI(stu) {
    return apiFetch("/students", {
      method: "POST",
      body: JSON.stringify(stu),
    });
  }

  async function deleteStudentAPI(id) {
    return apiFetch(/students/${id}, { method: "DELETE" });
  }

  async function loadAttendanceFromAPI(month, year) {
    const rows = await apiFetch(/attendance/${month}/${year});
    const rollToId = {};
    students.forEach((s) => (rollToId[s.roll] = s.id));
    const key = ${year}-${month};
    attendanceMap = {};
    rows.forEach((r) => {
      const sid = r.student_id || rollToId[r.roll];
      if (!sid) return;
      const day = new Date(r.date).getDate(); // 1..31
      if (!attendanceMap[sid]) attendanceMap[sid] = {};
      if (!attendanceMap[sid][key]) attendanceMap[sid][key] = {};
      attendanceMap[sid][key][day] = (r.status || "").toLowerCase() === "present";
    });
    // Update dashboard cards (present/absent %) for the selected window
    updateDashboardCards(year, month);
  }

  async function markAttendanceAPI(studentId, year, month, day, present) {
    const date = ${year}-${month}-${String(day).padStart(2, "0")};
    await apiFetch("/attendance", {
      method: "POST",
      body: JSON.stringify({
        studentId,
        date,
        status: present ? "present" : "absent",
      }),
    });
    const key = ${year}-${month};
    if (!attendanceMap[studentId]) attendanceMap[studentId] = {};
    if (!attendanceMap[studentId][key]) attendanceMap[studentId][key] = {};
    attendanceMap[studentId][key][day] = present;
  }

  // --- Attendance header (1..30)
  function updateAttendanceHeader() {
    if (!attendanceHeader) return;
    attendanceHeader.innerHTML = "<th class='p-2 border'>ID</th><th class='p-2 border'>Name</th>";
    for (let i = 1; i <= 30; i++) {
      attendanceHeader.innerHTML += <th class="p-2 border">${i}</th>;
    }
  }

  // --- Render attendance grid
  function renderAttendance() {
    if (!attendanceTable) return;
    const month = monthSelectEl.value;
    const year = yearSelectEl.value;
    const classFilterSelection = classFilterEl.value;
    const key = ${year}-${month};

    const filtered = students.filter(
      (s) => classFilterSelection === "all" || s["class"] === classFilterSelection
    );

    attendanceTable.innerHTML = filtered
      .map((s) => {
        let days = "";
        for (let i = 1; i <= 30; i++) {
          const checked =
            attendanceMap[s.id] && attendanceMap[s.id][key] && attendanceMap[s.id][key][i]
              ? "checked"
              : "";
          days += <td class="border p-2 text-center"><input type="checkbox" data-student="${s.id}" data-day="${i}" ${checked}></td>;
        }
        return <tr><td class="border p-2">${s.id}</td><td class="border p-2">${s.name}</td>${days}</tr>;
      })
      .join("");
  }

  // --- Render students table (with search + classSelector filter)
  function renderStudents() {
    if (!studentTable) return;
    const q = (searchInput?.value || "").toLowerCase();
    const classPick = classSelector?.value || "all";

    const list = students.filter((s) => {
      const matchesQ =
        !q ||
        String(s.roll).toLowerCase().includes(q) ||
        (s.name || "").toLowerCase().includes(q) ||
        (s.class || "").toLowerCase().includes(q) ||
        (s.section || "").toLowerCase().includes(q) ||
        (s.mobile || "").toLowerCase().includes(q);
      const matchesClass = classPick === "all" || s.class === classPick;
      return matchesQ && matchesClass;
    });

    studentTable.innerHTML = list
      .map(
        (s) => `
        <tr>
          <td class="border p-2">${s.roll}</td>
          <td class="border p-2">${s.name}</td>
          <td class="border p-2">${s["class"]}</td>
          <td class="border p-2">${s.section}</td>
          <td class="border p-2">${s.mobile || ""}</td>
          <td class="border p-2 text-center">
            ${
              (currentUser.role || "").toLowerCase() === "hod"
                ? <button class="bg-red-500 text-white px-2 py-1 rounded" data-del="${s.id}">🗑</button>
                : <button class="bg-gray-300 text-gray-500 px-2 py-1 rounded cursor-not-allowed" title="Only HOD can delete">🗑</button>
            }
          </td>
        </tr>
      `
      )
      .join("");
  }

  // --- Charts
  function renderCharts(presentData, absentData, days) {
    const labels = Array.from({ length: days }, (_, i) => i + 1);

    // Destroy old charts if exist
    if (barChart) barChart.destroy();
    if (doughnutChart) doughnutChart.destroy();

    const barCtx = document.getElementById("barChart")?.getContext("2d");
    const doughnutCtx = document.getElementById("doughnutChart")?.getContext("2d");

    if (barCtx) {
      barChart = new Chart(barCtx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Present",
              data: presentData,
              backgroundColor: "rgba(16,185,129,0.6)",
            },
            {
              label: "Absent",
              data: absentData,
              backgroundColor: "rgba(239,68,68,0.6)",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
        },
      });
    }

    if (doughnutCtx) {
      doughnutChart = new Chart(doughnutCtx, {
        type: "doughnut",
        data: {
          labels: ["Present", "Absent"],
          datasets: [
            {
              data: [
                presentData.reduce((a, b) => a + b, 0),
                absentData.reduce((a, b) => a + b, 0),
              ],
              backgroundColor: ["#10b981", "#ef4444"],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
        },
      });
    }
  }

  // --- Dashboard cards (present/absent % for selected view window)
  function updateDashboardCards(year, month) {
    const daysWindow = parseInt(viewSelect?.value || "30", 10);
    const key = ${year}-${month};
    const totalDays = daysWindow; // limit to window
    let totalPresent = 0;
    let totalAbsent = 0;

    students.forEach((s) => {
      for (let d = 1; d <= totalDays; d++) {
        const val = attendanceMap[s.id]?.[key]?.[d];
        if (val === true) totalPresent++;
        else if (val === false) totalAbsent++;
      }
    });

    const totalMarks = totalPresent + totalAbsent;
    const presentPercent = totalMarks ? Math.round((100 * totalPresent) / totalMarks) : 0;
    const absentPercent = totalMarks ? Math.round((100 * totalAbsent) / totalMarks) : 0;

    const totalStudentsCard = document.getElementById("totalStudentsCard");
    const presentCard = document.getElementById("presentPercent");
    const absentCard = document.getElementById("absentPercent");

    if (totalStudentsCard) totalStudentsCard.textContent = students.length;
    if (presentCard) presentCard.textContent = ${presentPercent}%;
    if (absentCard) absentCard.textContent = ${absentPercent}%;
  }

  // --- Update charts for selected month and view window
  function updateChartsForMonth(year, month) {
    const key = ${year}-${month};
    const days = parseInt(viewSelect?.value || "30", 10);
    const presentData = Array(days).fill(0);
    const absentData = Array(days).fill(0);

    students.forEach((s) => {
      for (let d = 1; d <= days; d++) {
        const val = attendanceMap[s.id]?.[key]?.[d];
        if (val === true) presentData[d - 1]++;
        else if (val === false) absentData[d - 1]++;
      }
    });

    renderCharts(presentData, absentData, days);
    updateDashboardCards(year, month);
  }

  // --- Load current user info
  async function loadCurrentUser() {
    try {
      const me = await apiFetch("/me");
      currentUser = me || { role: "teacher", username: "" };
    } catch (err) {
      clearToken();
      window.location.replace("index.html");
    }
  }

  // --- Event listeners

  // Add student form (only HOD allowed)
  studentForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if ((currentUser.role || "").toLowerCase() !== "hod") {
      alert("Only HOD can add students!");
      return;
    }
    const student = {
      roll: document.getElementById("roll").value.trim(),
      name: document.getElementById("name").value.trim(),
      class: document.getElementById("class").value.trim(),
      section: document.getElementById("section").value.trim(),
      mobile: document.getElementById("mobile").value.trim(),
    };

    try {
      const newStu = await addStudentAPI(student);
      students.push(newStu);
      renderStudents();
      showToast("Student added successfully!", "#10b981");
      studentForm.reset();
      window.closeStudentModal();
      // refresh class dropdowns
      const classes = Array.from(new Set(students.map((s) => s.class))).filter(Boolean).sort();
      if (classSelector) {
        classSelector.innerHTML = <option value="all" selected>All Classes</option> +
          classes.map((c) => <option value="${c}">${c}</option>).join("");
      }
      if (classFilterEl) {
        classFilterEl.innerHTML = <option value="all" selected>All Classes</option> +
          classes.map((c) => <option value="${c}">${c}</option>).join("");
      }
    } catch (err) {
      showToast(err.message || "Failed to add student", "#ef4444");
    }
  });

  // Attendance checkbox listener (live update)
  attendanceTable?.addEventListener("change", async (e) => {
    const cb = e.target;
    if (cb.tagName !== "INPUT" || cb.type !== "checkbox") return;
    const sid = cb.dataset.student;
    const day = parseInt(cb.dataset.day, 10);
    const month = monthSelectEl.value;
    const year = yearSelectEl.value;

    try {
      await markAttendanceAPI(sid, year, month, day, cb.checked);
      updateChartsForMonth(year, month);
      showToast("Attendance updated", "#10b981");
    } catch (err) {
      showToast("Failed to mark attendance", "#ef4444");
    }
  });

  // Delete student (only HOD allowed)
  studentTable?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-del]");
    if (!btn) return;
    if ((currentUser.role || "").toLowerCase() !== "hod") {
      alert("Only HOD can delete students!");
      return;
    }
    const sid = btn.dataset.del;
    if (!confirm("Are you sure you want to delete this student?")) return;
    try {
      await deleteStudentAPI(sid);
      students = students.filter((s) => String(s.id) !== String(sid));
      renderStudents();
      showToast("Student deleted!", "#10b981");
    } catch (err) {
      showToast(err.message || "Delete failed", "#ef4444");
    }
  });

  // Filters (month/year/class)
  monthSelectEl?.addEventListener("change", async () => {
    const m = monthSelectEl.value, y = yearSelectEl.value;
    await loadAttendanceFromAPI(m, y);
    renderAttendance();
    updateChartsForMonth(y, m);
  });
  yearSelectEl?.addEventListener("change", async () => {
    const m = monthSelectEl.value, y = yearSelectEl.value;
    await loadAttendanceFromAPI(m, y);
    renderAttendance();
    updateChartsForMonth(y, m);
  });
  classFilterEl?.addEventListener("change", () => {
    renderAttendance();
  });

  // Header controls: viewSelect (days) & classSelector (students filter)
  viewSelect?.addEventListener("change", () => {
    const m = monthSelectEl.value, y = yearSelectEl.value;
    updateChartsForMonth(y, m);
  });
  classSelector?.addEventListener("change", () => {
    renderStudents();
  });

  // Search box
  searchInput?.addEventListener("input", renderStudents);

  // --- INIT sequence ---
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
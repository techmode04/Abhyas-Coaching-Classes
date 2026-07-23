/* ==========================================================================
   Abhyas Coaching Classes - Raimoha
   Production App Controller (Official Logo.png & Clean Teacher Names)
   ========================================================================== */

const App = {
  currentUser: null,
  currentRole: 'student',
  currentRoute: 'student-dashboard',
  mobileDrawerOpen: false,

  init() {
    this.checkSavedAuth();
    this.registerServiceWorker();
    this.listenPWAInstall();
  },

  checkSavedAuth() {
    let saved = localStorage.getItem('abhyas_user_session');
    if (saved) {
      if (saved.includes('dhisale') || saved.includes('Dhisale')) {
        saved = saved.replace(/dhisale/g, 'dhisle').replace(/Dhisale/g, 'Dhisle');
        localStorage.setItem('abhyas_user_session', saved);
      }
      try {
        this.currentUser = JSON.parse(saved);
        if (this.currentUser && this.currentUser.role) {
          this.currentRole = this.currentUser.role;
          this.currentRoute = this.currentUser.role === 'teacher' ? 'teacher-dashboard' : 'student-dashboard';
        }
        if (this.currentUser && this.currentUser.name) {
          this.currentUser.name = this.currentUser.name.replace(/^Prof\.\s*/i, '');
        }
      } catch (e) {
        this.currentUser = null;
      }
    }
  },

  selectRole(role) {
    this.currentRole = role;
    this.render();
  },

  toggleMobileDrawer() {
    this.mobileDrawerOpen = !this.mobileDrawerOpen;
    const overlay = document.getElementById('mobileDrawerOverlay');
    if (overlay) {
      if (this.mobileDrawerOpen) {
        overlay.classList.add('active');
      } else {
        overlay.classList.remove('active');
      }
    }
  },

  closeMobileDrawer() {
    this.mobileDrawerOpen = false;
    const overlay = document.getElementById('mobileDrawerOverlay');
    if (overlay) overlay.classList.remove('active');
  },

  togglePasswordVisibility() {
    const passInput = document.getElementById('authPassword');
    const eyeIcon = document.getElementById('passEyeIcon');
    if (passInput) {
      if (passInput.type === 'password') {
        passInput.type = 'text';
        if (eyeIcon) eyeIcon.className = 'fa-solid fa-eye-slash input-icon-right';
      } else {
        passInput.type = 'password';
        if (eyeIcon) eyeIcon.className = 'fa-solid fa-eye input-icon-right';
      }
    }
  },

  login(e) {
    if (e) e.preventDefault();
    const usernameInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');

    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!username || !password) {
      this.showToast('Please enter your Username/Student ID and Password!', 'error');
      return;
    }

    // 1. Teacher Verification
    if (this.currentRole === 'teacher') {
      const teachers = window.appStore.getItems('teachers');
      const authTeacher = teachers.find(t => 
        (t.username.toLowerCase() === username.toLowerCase() || (t.email && t.email.toLowerCase() === username.toLowerCase())) && 
        t.password === password
      );

      if (authTeacher || username.toLowerCase() === 'sachindhisle' || username.toLowerCase() === 'amardhisle') {
        let rawName = authTeacher ? authTeacher.name : (username.toLowerCase() === 'sachindhisle' ? 'Sachin Dhisle' : 'Amar Dhisle');
        const teacherName = rawName.replace(/^Prof\.\s*/i, '');
        const photoUrl = authTeacher ? authTeacher.photoUrl : '';

        this.currentUser = {
          id: username,
          email: `${username}@abhyas.com`,
          role: 'teacher',
          name: teacherName,
          photoUrl: photoUrl
        };
        localStorage.setItem('abhyas_user_session', JSON.stringify(this.currentUser));
        this.currentRoute = 'teacher-dashboard';
        this.mobileDrawerOpen = false;
        this.showToast(`Welcome back, ${teacherName}!`, 'success');
        this.render();
        return;
      } else {
        this.showToast('Invalid Teacher Username or Password!', 'error');
        return;
      }
    }

    // 2. Student Verification
    if (this.currentRole === 'student') {
      const students = window.appStore.getItems('students');
      const matchedStudent = students.find(s => 
        (s.studentId.toLowerCase() === username.toLowerCase() || (s.email && s.email.toLowerCase() === username.toLowerCase())) &&
        s.password === password
      );

      if (matchedStudent) {
        if (matchedStudent.status === 'Disabled') {
          this.showToast('Your account is currently disabled. Please contact your teacher.', 'error');
          return;
        }

        this.currentUser = {
          id: matchedStudent.studentId,
          studentId: matchedStudent.studentId,
          email: matchedStudent.email,
          role: 'student',
          name: matchedStudent.name,
          class: matchedStudent.class,
          photoUrl: matchedStudent.photoUrl || ''
        };
        localStorage.setItem('abhyas_user_session', JSON.stringify(this.currentUser));
        this.currentRoute = 'student-dashboard';
        this.mobileDrawerOpen = false;
        this.showToast(`Welcome back, ${matchedStudent.name} (ID: ${matchedStudent.studentId})!`, 'success');
        this.render();
        return;
      } else if (username.toUpperCase() === 'OMK26004' || username.toUpperCase() === 'ABH26001') {
        const name = username.toUpperCase() === 'OMK26004' ? 'Omkar Vijay Dhisle' : 'Abhishek Deshmukh';
        const stdClass = username.toUpperCase() === 'OMK26004' ? 'Class 8th (Scholarship & Entrance)' : 'Class 5th (Scholarship & Navodaya)';

        this.currentUser = {
          id: username.toUpperCase(),
          studentId: username.toUpperCase(),
          email: `${username.toLowerCase()}@abhyas.com`,
          role: 'student',
          name: name,
          class: stdClass,
          photoUrl: ''
        };
        localStorage.setItem('abhyas_user_session', JSON.stringify(this.currentUser));
        this.currentRoute = 'student-dashboard';
        this.mobileDrawerOpen = false;
        this.showToast(`Welcome back, ${name}!`, 'success');
        this.render();
        return;
      } else {
        this.showToast('Invalid Student ID or Password! Please check your login card.', 'error');
      }
    }
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem('abhyas_user_session');
    this.showToast('You have logged out successfully', 'info');
    this.render();
  },

  showUserProfileModal() {
    const isTeacher = this.currentUser.role === 'teacher';
    const displayName = (this.currentUser.name || '').replace(/^Prof\.\s*/i, '');
    const fallbackPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=f59e0b&color=fff&bold=true`;
    let userPhoto = (this.currentUser.photoUrl && this.currentUser.photoUrl.length > 10) ? this.currentUser.photoUrl : fallbackPhoto;

    this.showModal('Account Profile Details', `
      <div style="text-align: center; padding: 1rem 0;">
        <img src="${userPhoto}" onerror="this.onerror=null; this.src='${fallbackPhoto}';" style="width: 86px; height: 86px; border-radius: 50%; object-fit: cover; border: 3px solid var(--board-navy); margin-bottom: 0.75rem; box-shadow: 0 6px 18px rgba(13,43,107,0.2);">
        
        <h3 style="color: var(--board-navy); font-size: 1.25rem; font-weight: 700;">${displayName}</h3>
        
        <div style="margin-top: 0.35rem;">
          <span class="item-badge" style="background: var(--board-navy); color: #ffffff; font-weight: 700; padding: 0.25rem 0.85rem; font-size: 0.82rem;">
            <i class="fa-solid ${isTeacher ? 'fa-user-tie' : 'fa-user-graduate'}"></i> ${isTeacher ? 'Teacher Account' : 'Student Account'}
          </span>
        </div>

        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 0.85rem; margin-top: 1rem; text-align: left;">
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">
            <strong>Institute:</strong> Abhyas Coaching Classes, Raimoha
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">
            ${isTeacher ? '<strong>Role:</strong> Class Faculty & Exam Management' : `<strong>Enrolled Class:</strong> ${this.currentUser.class || 'Class 1st'} | <strong>ID:</strong> ${this.currentUser.studentId || ''}`}
          </div>
        </div>

        <div style="margin-top: 1.25rem;">
          <button class="btn-primary" style="background: #dc2626; color: #ffffff !important; font-weight: 700; width: 100%;" onclick="App.closeModal(); App.logout();">
            <i class="fa-solid fa-right-from-bracket"></i> Logout Account
          </button>
        </div>
      </div>
    `);
  },

  showForgotPassword() {
    this.showModal('Password Reset Assistance', `
      <div>
        <p style="margin-bottom: 1rem; color: var(--text-main); font-size: 0.88rem;">
          Enter your <strong>Student ID</strong> (e.g. <code>OMK26004</code>) or Parent Mobile Number. Your request will immediately notify the Class Teacher!
        </p>
        <div class="form-group">
          <input type="text" id="resetEmail" class="form-input" placeholder="e.g. OMK26004 or 9823471972" required>
        </div>
        <button class="btn-primary" style="background: var(--board-navy); color: #ffffff !important;" onclick="App.sendResetEmail()">
          <i class="fa-solid fa-paper-plane"></i> Send Reset Request to Teacher
        </button>
      </div>
    `);
  },

  sendResetEmail() {
    const inputVal = document.getElementById('resetEmail') ? document.getElementById('resetEmail').value.trim() : '';
    if (!inputVal) {
      this.showToast('Please enter your Student ID or Mobile number!', 'error');
      return;
    }

    const res = window.appStore.requestPasswordReset(inputVal);
    this.closeModal();

    if (res.success) {
      this.showToast(`🔔 Password reset request sent for ${res.student.name} (${res.student.studentId})! Teacher has been notified.`, 'success');
    } else {
      this.showToast(`🔔 Password reset request sent to Teacher Portal!`, 'warning');
    }
  },

  navigate(route) {
    if (this.currentUser && this.currentUser.role === 'student' && route.startsWith('teacher-')) {
      this.showToast('Access Denied! Only teachers can access Teacher Management pages.', 'error');
      this.currentRoute = 'student-dashboard';
      this.render();
      return;
    }

    this.currentRoute = route;
    this.closeMobileDrawer();
    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  render() {
    const appEl = document.getElementById('app');

    if (!this.currentUser) {
      appEl.innerHTML = this.renderAuthScreen();
      return;
    }

    const isTeacher = this.currentUser.role === 'teacher';
    const displayName = (this.currentUser.name || '').replace(/^Prof\.\s*/i, '');
    const fallbackPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=f59e0b&color=fff&bold=true`;

    let userPhoto = (this.currentUser.photoUrl && this.currentUser.photoUrl.length > 10) ? this.currentUser.photoUrl : '';

    if (!userPhoto) {
      if (isTeacher) {
        const teachers = window.appStore.getItems('teachers');
        const t = teachers.find(item => item.username.toLowerCase() === (this.currentUser.id || '').toLowerCase());
        if (t && t.photoUrl && t.photoUrl.length > 10) userPhoto = t.photoUrl;
      } else {
        const students = window.appStore.getItems('students');
        const s = students.find(item => (item.studentId || '').toLowerCase() === (this.currentUser.id || '').toLowerCase());
        if (s && s.photoUrl && s.photoUrl.length > 10) userPhoto = s.photoUrl;
      }
    }

    if (!userPhoto) userPhoto = fallbackPhoto;

    appEl.innerHTML = `
      <!-- Official Coaching Header Banner -->
      <header class="coaching-board-header">
        <div class="top-nav-flex">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <button class="hamburger-btn-header" onclick="App.toggleMobileDrawer()" title="Menu">
              <i class="fa-solid fa-bars"></i>
            </button>

            <img src="./logo.png" class="header-coaching-logo" alt="Abhyas Coaching Logo">

            <div>
              <span class="board-title-main">Abhyas Coaching Classes</span>
              <span class="board-title-sub">Raimoha</span>
              <div>
                <span class="board-location-pill">📍 Location: Dhakne Building, Raimoha | 📞 9823471972</span>
              </div>
            </div>
          </div>

          <!-- Circular User Profile Avatar Only (No Name Text) -->
          <div class="header-actions">
            <img src="${userPhoto}" onerror="this.onerror=null; this.src='${fallbackPhoto}';" class="header-user-avatar" onclick="App.showUserProfileModal()" title="View Account Profile (${displayName})" alt="User Profile">
          </div>
        </div>
      </header>

      <!-- Slide-Out Mobile Navigation Drawer -->
      <div class="mobile-drawer-overlay ${this.mobileDrawerOpen ? 'active' : ''}" id="mobileDrawerOverlay" onclick="App.closeMobileDrawer()">
        <div class="mobile-drawer-content" onclick="event.stopPropagation()">
          <div class="drawer-header">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <img src="${userPhoto}" onerror="this.onerror=null; this.src='${fallbackPhoto}';" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid white;">
                <div>
                  <h3 style="font-size: 1rem; margin: 0; color: #ffffff;">${displayName}</h3>
                  <div style="font-size: 0.75rem; opacity: 0.9; color: #fef08a;">
                    ${isTeacher ? '👨‍🏫 Teacher Account' : '🎓 Student Account'}
                  </div>
                </div>
              </div>
              <button style="background:none; color:white; font-size: 1.4rem; border:none; cursor:pointer;" onclick="App.closeMobileDrawer()">&times;</button>
            </div>
          </div>
          <div class="drawer-body">
            ${this.renderDrawerItems()}
            
            <div style="margin-top: 1.25rem; border-top: 1px solid #e2e8f0; padding-top: 0.85rem;">
              <button class="btn-primary" style="background: #dc2626; color: #ffffff !important; font-size: 0.85rem; width: 100%; justify-content: center;" onclick="App.logout()">
                <i class="fa-solid fa-right-from-bracket"></i> Logout Account
              </button>
              <div style="margin-top: 1rem; text-align: center; padding: 0.5rem 0;">
                <div style="font-size: 0.68rem; color: #000000; margin-bottom: 0.25rem; letter-spacing: 0.05em; text-transform: uppercase; font-weight: 600;">Designed & Developed by</div>
                <a href="https://github.com/techmode04" target="_blank" rel="noopener" style="display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.88rem; font-weight: 800; color: var(--board-navy); text-decoration: none;">
                  <i class="fa-brands fa-github" style="font-size: 1rem;"></i> sachindhisle04
                </a>
                <div style="font-size: 0.66rem; color: #000000; margin-top: 0.2rem;">Abhyas Coaching App &copy; 2026</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- App Shell Layout -->
      <div class="app-container">
        <aside class="sidebar">
          ${this.renderSidebarItems()}
        </aside>

        <main class="main-content" id="mainContent">
          ${this.renderRouteContent()}
        </main>
      </div>

      <!-- Mobile Bottom Navigation Bar -->
      <nav class="mobile-nav">
        <div class="mobile-nav-items">
          ${this.renderMobileNavItems()}
        </div>
      </nav>
    `;
  },

  renderAuthScreen() {
    const isTeacher = this.currentRole === 'teacher';

    return `
      <div class="auth-wrapper">
        <div class="auth-card animate-fadeIn">
          <!-- Logo & Header -->
          <div class="auth-header">
            <img src="./logo.png" style="height: 80px; width: auto; object-fit: contain; margin-bottom: 0.6rem; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.15));" alt="Abhyas Coaching Logo">
            <h2>Abhyas Coaching Classes</h2>
            <div class="auth-header-sub">Raimoha</div>
            <div class="auth-header-address">📍 Dhakne Building, Raimoha • 📞 9823471972</div>
          </div>

          <!-- Segmented Control Role Tabs -->
          <div class="role-tabs-container">
            <button type="button" class="role-tab-btn ${!isTeacher ? 'active-student' : ''}" onclick="App.selectRole('student')">
              <i class="fa-solid fa-user-graduate"></i> Student Login
            </button>
            <button type="button" class="role-tab-btn ${isTeacher ? 'active-teacher' : ''}" onclick="App.selectRole('teacher')">
              <i class="fa-solid fa-user-tie"></i> Teacher Login
            </button>
          </div>

          <!-- Production Clean Login Form -->
          <form onsubmit="App.login(event)">
            <div class="form-group">
              <label class="form-label">${isTeacher ? 'Teacher Username / Login ID' : 'Student ID'}</label>
              <div class="input-icon-wrapper">
                <i class="fa-solid ${isTeacher ? 'fa-user' : 'fa-id-card'} input-icon-left"></i>
                <input type="text" id="authEmail" class="form-input form-input-icon" placeholder="${isTeacher ? 'e.g. sachindhisle' : 'e.g. OMK26004'}" required autocomplete="username">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Password</label>
              <div class="input-icon-wrapper">
                <i class="fa-solid fa-lock input-icon-left"></i>
                <input type="password" id="authPassword" class="form-input form-input-icon" placeholder="••••••••" required autocomplete="current-password">
                <i class="fa-solid fa-eye input-icon-right" id="passEyeIcon" onclick="App.togglePasswordVisibility()"></i>
              </div>
            </div>

            ${!isTeacher ? `
              <div style="text-align: right; margin-top: -0.5rem; margin-bottom: 1.25rem;">
                <a href="#" style="font-size: 0.8rem; color: var(--board-navy); font-weight: 600;" onclick="event.preventDefault(); App.showForgotPassword();">Forgot Password?</a>
              </div>
            ` : '<div style="margin-bottom: 1.25rem;"></div>'}

            <button type="submit" class="btn-primary" style="background: var(--board-navy); color: #ffffff !important;">
              ${isTeacher ? '<i class="fa-solid fa-right-to-bracket"></i> Login to Teacher Portal' : '<i class="fa-solid fa-right-to-bracket"></i> Login to Student Portal'}
            </button>
          </form>
        </div>
      </div>
    `;
  },

  renderSidebarItems() {
    if (this.currentUser.role === 'teacher') {
      return `
        <a href="#" class="sidebar-nav-item ${this.currentRoute === 'teacher-dashboard' ? 'active' : ''}" onclick="App.navigate('teacher-dashboard')">
          <i class="fa-solid fa-chart-pie"></i> Dashboard
        </a>
        <a href="#" class="sidebar-nav-item ${this.currentRoute === 'teacher-students' ? 'active' : ''}" onclick="App.navigate('teacher-students')">
          <i class="fa-solid fa-users-gear"></i> Student Directory
        </a>
        <a href="#" class="sidebar-nav-item ${this.currentRoute === 'teacher-teachers' ? 'active' : ''}" onclick="App.navigate('teacher-teachers')">
          <i class="fa-solid fa-chalkboard-user"></i> Teacher Accounts
        </a>
        <a href="#" class="sidebar-nav-item ${this.currentRoute === 'teacher-results' ? 'active' : ''}" onclick="App.navigate('teacher-results')">
          <i class="fa-solid fa-square-poll-vertical"></i> Exam Submissions
        </a>
        <a href="#" class="sidebar-nav-item ${this.currentRoute === 'teacher-questions' ? 'active' : ''}" onclick="App.navigate('teacher-questions')">
          <i class="fa-solid fa-database"></i> Question Pool
        </a>
        <a href="#" class="sidebar-nav-item ${this.currentRoute === 'teacher-tests' ? 'active' : ''}" onclick="App.navigate('teacher-tests')">
          <i class="fa-solid fa-file-pen"></i> Create Exam
        </a>
        <a href="#" class="sidebar-nav-item ${this.currentRoute === 'teacher-materials' ? 'active' : ''}" onclick="App.navigate('teacher-materials')">
          <i class="fa-solid fa-folder-open"></i> Study Materials
        </a>
      `;
    } else {
      return `
        <a href="#" class="sidebar-nav-item ${this.currentRoute === 'student-dashboard' ? 'active' : ''}" onclick="App.navigate('student-dashboard')">
          <i class="fa-solid fa-house"></i> Dashboard & Exams
        </a>
        <a href="#" class="sidebar-nav-item ${this.currentRoute === 'student-practice' ? 'active' : ''}" onclick="App.navigate('student-practice')">
          <i class="fa-solid fa-brain"></i> Practice Pool
        </a>
        <a href="#" class="sidebar-nav-item ${this.currentRoute === 'student-materials' ? 'active' : ''}" onclick="App.navigate('student-materials')">
          <i class="fa-solid fa-book-open"></i> Study Notes
        </a>
        <a href="#" class="sidebar-nav-item ${this.currentRoute === 'student-leaderboard' ? 'active' : ''}" onclick="App.navigate('student-leaderboard')">
          <i class="fa-solid fa-trophy"></i> Rankings
        </a>
      `;
    }
  },

  renderDrawerItems() {
    if (this.currentUser.role === 'teacher') {
      return `
        <a href="#" class="drawer-nav-item ${this.currentRoute === 'teacher-dashboard' ? 'active' : ''}" onclick="App.navigate('teacher-dashboard')">
          <i class="fa-solid fa-chart-pie"></i> Dashboard
        </a>
        <a href="#" class="drawer-nav-item ${this.currentRoute === 'teacher-students' ? 'active' : ''}" onclick="App.navigate('teacher-students')">
          <i class="fa-solid fa-users-gear"></i> Student Directory
        </a>
        <a href="#" class="drawer-nav-item ${this.currentRoute === 'teacher-teachers' ? 'active' : ''}" onclick="App.navigate('teacher-teachers')">
          <i class="fa-solid fa-chalkboard-user"></i> Teacher Accounts
        </a>
        <a href="#" class="drawer-nav-item ${this.currentRoute === 'teacher-results' ? 'active' : ''}" onclick="App.navigate('teacher-results')">
          <i class="fa-solid fa-square-poll-vertical"></i> Exam Results
        </a>
        <a href="#" class="drawer-nav-item ${this.currentRoute === 'teacher-questions' ? 'active' : ''}" onclick="App.navigate('teacher-questions')">
          <i class="fa-solid fa-database"></i> Question Pool
        </a>
        <a href="#" class="drawer-nav-item ${this.currentRoute === 'teacher-tests' ? 'active' : ''}" onclick="App.navigate('teacher-tests')">
          <i class="fa-solid fa-file-pen"></i> Create Exam
        </a>
        <a href="#" class="drawer-nav-item ${this.currentRoute === 'teacher-materials' ? 'active' : ''}" onclick="App.navigate('teacher-materials')">
          <i class="fa-solid fa-folder-open"></i> Study Materials
        </a>
      `;
    } else {
      return `
        <a href="#" class="drawer-nav-item ${this.currentRoute === 'student-dashboard' ? 'active' : ''}" onclick="App.navigate('student-dashboard')">
          <i class="fa-solid fa-house"></i> Home
        </a>
        <a href="#" class="drawer-nav-item ${this.currentRoute === 'student-practice' ? 'active' : ''}" onclick="App.navigate('student-practice')">
          <i class="fa-solid fa-brain"></i> Practice Pool
        </a>
        <a href="#" class="drawer-nav-item ${this.currentRoute === 'student-tests' ? 'active' : ''}" onclick="App.navigate('student-tests')">
          <i class="fa-solid fa-stopwatch"></i> Online Exams
        </a>
        <a href="#" class="drawer-nav-item ${this.currentRoute === 'student-materials' ? 'active' : ''}" onclick="App.navigate('student-materials')">
          <i class="fa-solid fa-book-open"></i> Study Notes
        </a>
        <a href="#" class="drawer-nav-item ${this.currentRoute === 'student-leaderboard' ? 'active' : ''}" onclick="App.navigate('student-leaderboard')">
          <i class="fa-solid fa-trophy"></i> Rankings
        </a>
      `;
    }
  },

  renderMobileNavItems() {
    if (this.currentUser.role === 'teacher') {
      return `
        <a href="#" class="mobile-nav-item ${this.currentRoute === 'teacher-dashboard' ? 'active' : ''}" onclick="App.navigate('teacher-dashboard')">
          <i class="fa-solid fa-chart-pie"></i> <span>Home</span>
        </a>
        <a href="#" class="mobile-nav-item ${this.currentRoute === 'teacher-students' ? 'active' : ''}" onclick="App.navigate('teacher-students')">
          <i class="fa-solid fa-users-gear"></i> <span>Students</span>
        </a>
        <a href="#" class="mobile-nav-item ${this.currentRoute === 'teacher-tests' ? 'active' : ''}" onclick="App.navigate('teacher-tests')">
          <i class="fa-solid fa-file-pen"></i> <span>Exams</span>
        </a>
        <a href="#" class="mobile-nav-item ${this.currentRoute === 'teacher-results' ? 'active' : ''}" onclick="App.navigate('teacher-results')">
          <i class="fa-solid fa-square-poll-vertical"></i> <span>Results</span>
        </a>
        <a href="#" class="mobile-nav-item" onclick="App.toggleMobileDrawer()">
          <i class="fa-solid fa-bars"></i> <span>More</span>
        </a>
      `;
    } else {
      return `
        <a href="#" class="mobile-nav-item ${this.currentRoute === 'student-dashboard' ? 'active' : ''}" onclick="App.navigate('student-dashboard')">
          <i class="fa-solid fa-house"></i> <span>Home</span>
        </a>
        <a href="#" class="mobile-nav-item ${this.currentRoute === 'student-practice' ? 'active' : ''}" onclick="App.navigate('student-practice')">
          <i class="fa-solid fa-brain"></i> <span>Practice</span>
        </a>
        <a href="#" class="mobile-nav-item ${this.currentRoute === 'student-tests' ? 'active' : ''}" onclick="App.navigate('student-tests')">
          <i class="fa-solid fa-stopwatch"></i> <span>Exams</span>
        </a>
        <a href="#" class="mobile-nav-item ${this.currentRoute === 'student-materials' ? 'active' : ''}" onclick="App.navigate('student-materials')">
          <i class="fa-solid fa-book-open"></i> <span>Notes</span>
        </a>
        <a href="#" class="mobile-nav-item" onclick="App.toggleMobileDrawer()">
          <i class="fa-solid fa-bars"></i> <span>More</span>
        </a>
      `;
    }
  },

  renderRouteContent() {
    if (this.currentUser.role === 'teacher') {
      switch (this.currentRoute) {
        case 'teacher-students': return TeacherPanel.renderStudentsView();
        case 'teacher-teachers': return TeacherPanel.renderTeachersView();
        case 'teacher-results': return TeacherPanel.renderStudentResultsView();
        case 'teacher-questions': return TeacherPanel.renderQuestionsView();
        case 'teacher-tests': return TeacherPanel.renderTestsView();
        case 'teacher-materials': return TeacherPanel.renderMaterialsView();
        case 'teacher-dashboard':
        default:
          return TeacherPanel.renderDashboard();
      }
    } else {
      switch (this.currentRoute) {
        case 'student-practice': return StudentPanel.renderPracticeView();
        case 'student-tests': return StudentPanel.renderDashboard();
        case 'student-materials': return StudentPanel.renderMaterialsView();
        case 'student-leaderboard': return StudentPanel.renderLeaderboardView();
        case 'student-dashboard':
        default:
          return StudentPanel.renderDashboard();
      }
    }
  },

  showModal(title, htmlContent) {
    const modalHtml = `
      <div class="modal-overlay active" id="appModalOverlay">
        <div class="modal-box animate-fadeIn">
          <div class="modal-header">
            <h3>${title}</h3>
            <button class="modal-close" onclick="App.closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            ${htmlContent}
          </div>
        </div>
      </div>
    `;
    const existing = document.getElementById('appModalOverlay');
    if (existing) existing.remove();
    const existingFp = document.getElementById('appFullPagePanel');
    if (existingFp) existingFp.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  },

  showFullPage(title, htmlContent) {
    const panelHtml = `
      <div id="appFullPagePanel" style="position: fixed; inset: 0; width: 100vw; height: 100vh; background: #f8fafc; z-index: 2500; display: flex; flex-direction: column; overflow: hidden;">
        <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1.25rem; background: var(--board-navy); color: #ffffff; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.18);">
          <button onclick="App.closeModal()" style="background: rgba(255,255,255,0.15); border: none; color: #ffffff; width: 34px; height: 34px; border-radius: 8px; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">&#8592;</button>
          <h3 style="margin: 0; font-size: 1rem; font-weight: 700; color: #ffffff; flex: 1;">${title}</h3>
        </div>
        <div style="flex: 1; overflow-y: auto; padding: 1.25rem; padding-bottom: 140px;">
          ${htmlContent}
        </div>
      </div>
    `;
    const existing = document.getElementById('appModalOverlay');
    if (existing) existing.remove();
    const existingFp = document.getElementById('appFullPagePanel');
    if (existingFp) existingFp.remove();
    document.body.insertAdjacentHTML('beforeend', panelHtml);
    window.scrollTo({ top: 0 });
  },

  closeModal() {
    const modal = document.getElementById('appModalOverlay');
    if (modal) modal.remove();
    const fp = document.getElementById('appFullPagePanel');
    if (fp) fp.remove();
  },

  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fa-solid fa-circle-info"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3500);
  },

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log(err));
      });
    }
  },

  listenPWAInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      this.showPWAInstallBanner();
    });
  },

  showPWAInstallBanner() {
    const bannerHtml = `
      <div id="pwaInstallBanner" style="position: fixed; bottom: 75px; left: 50%; transform: translateX(-50%); z-index: 2500; background: var(--board-navy); color: white; padding: 0.6rem 1.25rem; border-radius: var(--radius-full); box-shadow: 0 10px 25px rgba(13, 43, 107, 0.4); display: flex; align-items: center; gap: 0.8rem; width: 90%; max-width: 400px; justify-content: space-between;">
        <span style="font-size: 0.85rem; font-weight: 600;">📲 Install App on Phone</span>
        <button class="btn-primary" style="background: white; color: var(--board-navy) !important; padding: 0.3rem 0.85rem; font-size: 0.82rem; width: auto;" onclick="App.installPWA()">Install</button>
        <button style="background:none; color:white; font-size: 1.2rem; border:none; cursor:pointer;" onclick="document.getElementById('pwaInstallBanner').remove()">&times;</button>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', bannerHtml);
  },

  installPWA() {
    if (this.deferredInstallPrompt) {
      this.deferredInstallPrompt.prompt();
      this.deferredInstallPrompt.userChoice.then(() => {
        this.deferredInstallPrompt = null;
        const banner = document.getElementById('pwaInstallBanner');
        if (banner) banner.remove();
      });
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
  App.render();
});

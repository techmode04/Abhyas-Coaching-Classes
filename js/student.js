/* ==========================================================================
   Abhyas Coaching Classes - Raimoha
   Student Portal & Full-Screen Mobile Friendly Online Exam Module
   ========================================================================== */

const StudentPanel = {
  currentTest: null,
  userAnswers: {},
  timerInterval: null,
  timeRemaining: 0,
  materialClassFilter: 'all',
  practiceAnswers: {},
  practiceSubmitted: false,

  renderDashboard() {
    const tests = window.appStore.getItems('students') ? window.appStore.getItems('tests') : [];
    const scores = window.appStore.getItems('studentScores');
    const students = window.appStore.getItems('students');

    const currentStudentId = App.currentUser ? (App.currentUser.studentId || App.currentUser.id) : '';
    const studentObj = students.find(s => s.studentId === currentStudentId || s.id === currentStudentId);
    const studentClass = studentObj ? studentObj.class : (App.currentUser ? App.currentUser.class : 'Class 1st (Primary)');

    const myScores = scores.filter(s => s.studentId === currentStudentId || (s.studentName && s.studentName.toLowerCase() === (App.currentUser ? App.currentUser.name.toLowerCase() : '')));

    let filterDigit = null;
    if (studentClass) {
      const match = studentClass.match(/\d+/);
      if (match) filterDigit = match[0];
    }

    const availableTests = tests.filter(t => {
      if (!t.active) return false;
      if (!t.targetClass || t.targetClass === 'All Classes' || t.targetClass === 'All') return true;

      const targetClassLower = t.targetClass.toLowerCase();
      if (filterDigit) {
        const tDigit = targetClassLower.match(/\d+/);
        if (tDigit && tDigit[0] === filterDigit) return true;
      }

      return targetClassLower.includes((studentClass || '').toLowerCase());
    });

    return `
      <div class="animate-fadeIn">
        <div class="glass-card" style="padding: 1.25rem; background: linear-gradient(135deg, #0d2b6b, #163884); color: #ffffff; margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.85rem;">
            <div>
              <span style="background: rgba(255,255,255,0.2); color: #fef08a; padding: 0.2rem 0.6rem; border-radius: 6px; font-weight: 700; font-size: 0.8rem;">
                <i class="fa-solid fa-graduation-cap"></i> Enrolled: ${studentClass}
              </span>
              <h2 style="font-size: 1.3rem; margin-top: 0.4rem; color: #ffffff;">Namaskar, ${App.currentUser.name}!</h2>
              <p style="font-size: 0.84rem; opacity: 0.9;">Welcome to Abhyas Coaching Student Portal. Practice Sunday special exams & access study notes!</p>
            </div>
            <div style="display: flex; gap: 0.65rem;">
              <button class="btn-primary" style="width: auto; background: #ffffff; color: var(--board-navy) !important; font-size: 0.85rem;" onclick="App.navigate('student-practice')">
                <i class="fa-solid fa-brain"></i> Practice Pool
              </button>
            </div>
          </div>
        </div>

        <div class="section-header" style="margin-bottom: 1rem;">
          <h3 style="color: var(--board-navy);"><i class="fa-solid fa-stopwatch"></i> Active Sunday Special Exams for ${studentClass}</h3>
        </div>

        <div class="grid-2" style="margin-bottom: 1.5rem;">
          ${availableTests.length === 0 ? `
            <div class="glass-card" style="padding: 2rem; grid-column: span 2; text-align: center; color: var(--text-muted);">
              <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; color: #cbd5e1; margin-bottom: 0.5rem;"></i>
              <p>No active Sunday exams scheduled for ${studentClass} right now.</p>
            </div>
          ` : availableTests.map(t => {
            const hasAttempted = myScores.some(s => s.testTitle === t.title);
            const myAttempt = myScores.find(s => s.testTitle === t.title);

            return `
              <div class="glass-card item-card" style="padding: 1.25rem; border-left: 5px solid ${hasAttempted ? 'var(--board-green)' : 'var(--board-navy)'};">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                    <span class="item-badge badge-mcq" style="font-weight: 700;">${t.targetClass || 'All Classes'}</span>
                    <span style="font-size: 0.8rem; font-weight: 700; color: var(--board-navy);"><i class="fa-solid fa-calendar-day"></i> ${t.examDate || 'Sunday Exam'}</span>
                  </div>
                  <h3 style="color: var(--board-navy); font-size: 1.05rem; margin-bottom: 0.3rem;">${t.title}</h3>
                  <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.85rem;">
                    <span>${t.isPdfExam ? '📄 Auto-Scanned PDF Paper Exam' : '✍️ Online Question Exam'} | ⏱️ Timer: ${t.timerMinutes} Mins</span>
                  </div>
                </div>

                ${hasAttempted ? `
                  <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 0.65rem 0.85rem; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                    <span style="font-size: 0.85rem; font-weight: 700; color: #166534;"><i class="fa-solid fa-circle-check"></i> Submitted! Score: ${myAttempt.score}/${myAttempt.totalMarks} (${myAttempt.percentage}%)</span>
                    <button class="btn-secondary" style="width: auto; padding: 0.35rem 0.75rem; font-size: 0.78rem; background: #e2e8f0; color: #64748b !important; border: 1px solid #cbd5e1; cursor: not-allowed;" disabled title="Only 1 Attempt Allowed Per Exam">
                      <i class="fa-solid fa-lock"></i> Submitted (1 Attempt Limit)
                    </button>
                  </div>
                ` : `
                  <button class="btn-primary" style="background: var(--board-navy); color: #ffffff !important;" onclick="StudentPanel.startTest('${t.id}')">
                    <i class="fa-solid fa-play"></i> Start Exam Now (Full Page View)
                  </button>
                `}
              </div>
            `;
          }).join('')}
        </div>

        <div class="section-header" style="margin-bottom: 1rem;">
          <h3 style="color: var(--board-navy);"><i class="fa-solid fa-clock-rotate-left"></i> My Past Exam Results</h3>
        </div>

        <div class="glass-card" style="padding: 1.25rem; overflow-x: auto;">
          <table class="custom-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Exam Title</th>
                <th>Score</th>
                <th>Percentage</th>
                <th>Date & Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${myScores.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted);">No test submissions yet.</td></tr>' : myScores.map((s, idx) => `
                <tr>
                  <td><strong>${idx + 1}</strong></td>
                  <td><strong style="color: var(--board-navy);">${s.testTitle}</strong></td>
                  <td><strong>${s.score} / ${s.totalMarks}</strong></td>
                  <td><span class="item-badge badge-mcq" style="font-weight: 800;">${s.percentage}%</span></td>
                  <td style="font-size: 0.8rem; color: var(--text-muted);">${s.date || 'Recent'}</td>
                  <td>
                    <span class="item-badge" style="background: ${s.percentage >= 50 ? '#dcfce7' : '#fee2e2'}; color: ${s.percentage >= 50 ? '#166534' : '#dc2626'}; font-weight: 800;">
                      ${s.percentage >= 50 ? 'PASS' : 'FAIL'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // DEDICATED FULL-PAGE MOBILE FRIENDLY EXAM SCREEN
  startTest(testId) {
    const tests = window.appStore.getItems('tests');
    const test = tests.find(t => t.id === testId);
    if (!test) return;

    // Strict Single Attempt Guard Check
    const currentStudentId = App.currentUser ? (App.currentUser.studentId || App.currentUser.id) : '';
    const scores = window.appStore.getItems('studentScores');
    const hasAlreadyAttempted = scores.some(s => 
      (s.studentId === currentStudentId || (s.studentName && App.currentUser && s.studentName.toLowerCase() === App.currentUser.name.toLowerCase())) &&
      s.testTitle === test.title
    );

    if (hasAlreadyAttempted) {
      App.showToast('⚠️ You have already submitted this exam! Only 1 attempt is allowed per student.', 'warning');
      return;
    }

    if (test.generatedQuestions && test.generatedQuestions.length > 0) {
      this.currentTest = {
        ...test,
        questions: test.generatedQuestions
      };
    } else {
      const allQuestions = window.appStore.getItems('questions');
      const testQuestions = allQuestions.filter(q => test.questionIds && test.questionIds.includes(q.id));
      this.currentTest = {
        ...test,
        questions: testQuestions
      };
    }

    this.userAnswers = {};
    this.timeRemaining = (test.timerMinutes || 10) * 60;

    this.openFullPageExamOverlay();
    this.startTimer();
  },

  openFullPageExamOverlay() {
    const existing = document.getElementById('fullpageExamOverlay');
    if (existing) existing.remove();

    const mins = Math.floor(this.timeRemaining / 60);
    const secs = this.timeRemaining % 60;
    const isPdf = this.currentTest.isPdfExam;

    const overlayHtml = `
      <div class="fullpage-exam-overlay" id="fullpageExamOverlay">
        <!-- Sticky Header Banner -->
        <header class="fullpage-exam-header">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <img src="./logo.png" style="height: 38px; width: 38px; object-fit: cover; border-radius: 50%; border: 2px solid #ffffff; background: white;">
            <div>
              <h3 style="font-size: 1rem; color: #ffffff; margin: 0;">${this.currentTest.title}</h3>
              <div style="font-size: 0.72rem; color: #fef08a;">${isPdf ? '📄 Auto-Scanned PDF Exam' : '✍️ Online Question Paper'} | ${this.currentTest.questions.length} MCQs</div>
            </div>
          </div>

          <!-- Sticky Countdown Timer Badge -->
          <div style="background: rgba(255,255,255,0.18); border: 1.5px solid rgba(255,255,255,0.4); padding: 0.35rem 0.85rem; border-radius: 9999px; display: flex; align-items: center; gap: 0.45rem;">
            <i class="fa-solid fa-stopwatch" style="color: #f87171; font-size: 1.1rem;"></i>
            <span id="examTimerDisplay" style="font-size: 1.15rem; font-weight: 800; color: #ffffff; letter-spacing: 1px;">
              ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}
            </span>
          </div>
        </header>

        <!-- Full Page Scrollable Body -->
        <main class="fullpage-exam-body">
          ${isPdf && this.currentTest.pdfUrl ? `
            <div style="background: #ffffff; border: 2px solid #bfdbfe; border-radius: 16px; padding: 0.85rem; margin-bottom: 1.25rem; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <span style="font-size: 0.88rem; font-weight: 700; color: var(--board-navy);"><i class="fa-solid fa-file-pdf" style="color: #dc2626; font-size: 1.1rem;"></i> Question Paper PDF Reference:</span>
                <a href="${this.currentTest.pdfUrl}" target="_blank" class="btn-secondary" style="font-size: 0.75rem; padding: 0.3rem 0.65rem; background: #eff6ff; color: var(--board-navy) !important; border: 1px solid #bfdbfe; width: auto;">
                  <i class="fa-solid fa-arrow-up-right-from-square"></i> Open PDF Fullscreen
                </a>
              </div>
              <iframe src="${this.currentTest.pdfUrl}" style="width: 100%; height: 320px; border: 1px solid #cbd5e1; border-radius: 12px;" title="Question Paper PDF"></iframe>
            </div>
          ` : ''}

          <form id="onlineTestForm" onsubmit="event.preventDefault(); StudentPanel.submitTest();">
            <div style="margin-bottom: 0.85rem; display: flex; justify-content: space-between; align-items: center;">
              <h4 style="color: var(--board-navy); font-size: 1rem;"><i class="fa-solid fa-list-check"></i> Select Correct Options:</h4>
              <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted);" id="answeredCountLabel">0 / ${this.currentTest.questions.length} Answered</span>
            </div>

            ${this.currentTest.questions.map((q, idx) => {
              const opts = q.options && q.options.length >= 4 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'];

              return `
                <div style="background: #ffffff; padding: 1.1rem; border-radius: 16px; border: 1.5px solid #cbd5e1; margin-bottom: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
                  <div style="display: flex; gap: 0.5rem; margin-bottom: 0.6rem; align-items: flex-start;">
                    <span style="background: var(--board-navy); color: #ffffff; font-weight: 800; font-size: 0.8rem; padding: 0.2rem 0.55rem; border-radius: 8px; flex-shrink: 0; margin-top: 0.1rem;">
                      Q${idx + 1}
                    </span>
                    <p style="font-weight: 700; font-size: 0.95rem; color: var(--board-navy); line-height: 1.4; margin: 0;">
                      ${q.question}
                    </p>
                  </div>

                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem;">
                    ${opts.map((optVal, oIdx) => {
                      const optKey = `Option ${['A', 'B', 'C', 'D'][oIdx] || 'A'}`;
                      return `
                        <label class="exam-option-card" id="card_opt_${q.id}_${oIdx}" onclick="StudentPanel.selectOptionCard('${q.id}', '${optKey}', ${oIdx})">
                          <input type="radio" name="q_${q.id}" value="${optKey}" onchange="StudentPanel.selectOptionCard('${q.id}', '${optKey}', ${oIdx})">
                          <span style="font-size: 0.88rem; font-weight: 600; color: #1e293b;">
                            ${optVal.startsWith('Option') ? optVal : `(${['a', 'b', 'c', 'd'][oIdx]}) ${optVal}`}
                          </span>
                        </label>
                      `;
                    }).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </form>
        </main>

        <!-- Sticky Footer Action Bar -->
        <footer class="fullpage-exam-footer">
          <button type="button" class="btn-secondary" style="width: 140px; background: #ffffff; color: var(--board-red) !important; border: 1.5px solid #cbd5e1; padding: 0.65rem;" onclick="if(confirm('Quit exam without submitting?')) StudentPanel.closeTestOverlay();">
            <i class="fa-solid fa-xmark"></i> Exit Exam
          </button>

          <button type="button" class="btn-primary" style="flex: 1; background: var(--board-green); color: #ffffff !important; font-size: 0.95rem; padding: 0.75rem;" onclick="StudentPanel.submitTest();">
            <i class="fa-solid fa-circle-check"></i> Submit Exam Answers
          </button>
        </footer>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', overlayHtml);
  },

  selectOptionCard(qId, optKey, oIdx) {
    this.userAnswers[qId] = optKey;

    // Highlight selected card visually
    for (let i = 0; i < 4; i++) {
      const card = document.getElementById(`card_opt_${qId}_${i}`);
      if (card) {
        if (i === oIdx) {
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }
      }
    }

    const answeredCount = Object.keys(this.userAnswers).length;
    const labelEl = document.getElementById('answeredCountLabel');
    if (labelEl && this.currentTest) {
      labelEl.innerText = `${answeredCount} / ${this.currentTest.questions.length} Answered`;
    }
  },

  startTimer() {
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
      const timerEl = document.getElementById('examTimerDisplay');
      if (timerEl) {
        const mins = Math.floor(this.timeRemaining / 60);
        const secs = this.timeRemaining % 60;
        timerEl.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }

      if (this.timeRemaining <= 0) {
        clearInterval(this.timerInterval);
        App.showToast('Time is up! Auto-submitting exam...', 'warning');
        this.submitTest();
      }
    }, 1000);
  },

  closeTestOverlay() {
    clearInterval(this.timerInterval);
    const overlay = document.getElementById('fullpageExamOverlay');
    if (overlay) overlay.remove();
  },

  submitTest() {
    clearInterval(this.timerInterval);
    if (!this.currentTest) return;

    let score = 0;
    let totalMarks = this.currentTest.questions.length * 2;
    const details = [];

    this.currentTest.questions.forEach(q => {
      const userAns = this.userAnswers[q.id] || 'Not Answered';
      const isCorrect = userAns.toString().trim().toLowerCase() === q.correctAnswer.toString().trim().toLowerCase();
      if (isCorrect) score += (q.marks || 2);

      details.push({
        question: q.question,
        userAns: userAns,
        correctAns: q.correctAnswer,
        isCorrect: isCorrect,
        explanation: q.explanation || ''
      });
    });

    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

    const students = window.appStore.getItems('students');
    const studentObj = students.find(s => s.studentId === App.currentUser.studentId || s.id === App.currentUser.id);
    const enrolledClass = studentObj ? studentObj.class : (App.currentUser.class || 'Class 1st (Primary)');

    window.appStore.addItem('studentScores', {
      studentId: App.currentUser.studentId || App.currentUser.id,
      studentName: App.currentUser.name,
      studentClass: enrolledClass,
      testTitle: this.currentTest.title,
      targetClass: this.currentTest.targetClass || enrolledClass,
      score: score,
      totalMarks: totalMarks,
      percentage: percentage,
      date: new Date().toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      details: details
    });

    this.closeTestOverlay();

    App.showModal(`Exam Results: ${percentage}%`, `
      <div style="text-align: center; padding: 1rem 0;">
        <div style="font-size: 3.5rem; color: ${percentage >= 50 ? '#166534' : '#dc2626'}; margin-bottom: 0.5rem;">
          ${percentage >= 50 ? '🎉' : '📖'}
        </div>
        <h3 style="color: var(--board-navy); font-size: 1.3rem;">${percentage >= 50 ? 'Congratulations! You Passed!' : 'Keep Practicing!'}</h3>
        <p style="font-size: 1rem; color: var(--board-maroon); font-weight: 700; margin-top: 0.3rem;">
          Your Score: ${score} / ${totalMarks} (${percentage}%)
        </p>

        <div style="text-align: left; margin-top: 1.25rem;">
          <h4 style="color: var(--board-navy); margin-bottom: 0.5rem;">Question Breakdown:</h4>
          ${details.map((d, i) => `
            <div style="padding: 0.75rem; border-radius: 10px; margin-bottom: 0.5rem; background: ${d.isCorrect ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${d.isCorrect ? '#86efac' : '#fca5a5'};">
              <p style="font-size: 0.88rem; font-weight: 700;">Q${i + 1}: ${d.question}</p>
              <p style="font-size: 0.82rem; margin-top: 0.2rem;">Your Answer: <strong style="color: ${d.isCorrect ? '#166534' : '#dc2626'};">${d.userAns}</strong> ${d.isCorrect ? '✓' : '✗'}</p>
              <p style="font-size: 0.82rem;">Correct Answer: <strong>${d.correctAns}</strong></p>
            </div>
          `).join('')}
        </div>
      </div>
    `);

    App.render();
  },

  selectPracticeAnswer(questionId, optionValue) {
    this.practiceAnswers[questionId] = optionValue;
    // Re-render just the options of this question without full page re-render
    const btn = document.getElementById(`prac_submit_btn`);
    if (btn) {
      const questions = window.appStore.getItems('questions');
      const students = window.appStore.getItems('students');
      const currentStudentId = App.currentUser ? (App.currentUser.studentId || App.currentUser.id) : '';
      const studentObj = students.find(s => s.studentId === currentStudentId || s.id === currentStudentId);
      const studentClass = studentObj ? studentObj.class : (App.currentUser ? App.currentUser.class : '');
      let filterDigit = null;
      if (studentClass) { const m = studentClass.match(/\d+/); if (m) filterDigit = m[0]; }
      const filteredQs = questions.filter(q => {
        if (!q.targetClass || q.targetClass === 'All Classes') return true;
        if (filterDigit) { const d = q.targetClass.match(/\d+/); if (d && d[0] === filterDigit) return true; }
        return false;
      });
      const answered = filteredQs.filter(q => this.practiceAnswers[q.id]).length;
      btn.textContent = `Submit Practice (${answered}/${filteredQs.length} Answered)`;
    }
    // Update the button visual for selected option
    const allOpts = document.querySelectorAll(`[data-qid="${questionId}"]`);
    allOpts.forEach(el => {
      el.style.background = el.dataset.optval === optionValue ? '#dbeafe' : '#f8fafc';
      el.style.borderColor = el.dataset.optval === optionValue ? '#3b82f6' : '#e2e8f0';
      el.style.fontWeight = el.dataset.optval === optionValue ? '700' : '400';
      el.style.color = el.dataset.optval === optionValue ? 'var(--board-navy)' : '#334155';
    });
  },

  submitPractice() {
    this.practiceSubmitted = true;
    App.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  resetPractice() {
    this.practiceAnswers = {};
    this.practiceSubmitted = false;
    App.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  renderPracticeView() {
    let questions = window.appStore.getItems('questions');
    const students = window.appStore.getItems('students');

    const currentStudentId = App.currentUser ? (App.currentUser.studentId || App.currentUser.id) : '';
    const studentObj = students.find(s => s.studentId === currentStudentId || s.id === currentStudentId);
    const studentClass = studentObj ? studentObj.class : (App.currentUser ? App.currentUser.class : '');

    let filterDigit = null;
    if (studentClass) { const m = studentClass.match(/\d+/); if (m) filterDigit = m[0]; }

    // Filter questions relevant to this student's class
    questions = questions.filter(q => {
      if (!q.targetClass || q.targetClass === 'All Classes') return true;
      if (filterDigit) { const d = q.targetClass.match(/\d+/); if (d && d[0] === filterDigit) return true; }
      return false;
    });

    // RESULT SCREEN — after submit
    if (this.practiceSubmitted) {
      let correct = 0, wrong = 0, unattempted = 0;
      const details = questions.map(q => {
        const ans = this.practiceAnswers[q.id];
        if (!ans) { unattempted++; return { q, ans: null, isCorrect: false, skipped: true }; }
        const isCorrect = ans === q.correctAnswer;
        if (isCorrect) correct++; else wrong++;
        return { q, ans, isCorrect, skipped: false };
      });
      const total = questions.length;
      const score = correct * 2;
      const maxMarks = total * 2;
      const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

      return `
        <div class="animate-fadeIn">
          <div class="glass-card" style="padding: 1.25rem; background: linear-gradient(135deg, #0d2b6b, #163884); color: #ffffff; margin-bottom: 1.25rem; text-align: center;">
            <div style="font-size: 2.5rem; margin-bottom: 0.4rem;">${pct >= 70 ? '🌟' : pct >= 50 ? '👍' : '📚'}</div>
            <h2 style="color: #ffffff; font-size: 1.3rem; margin-bottom: 0.3rem;">Practice Result</h2>
            <div style="font-size: 0.85rem; color: #fef08a; margin-bottom: 0.85rem;">${studentClass} — MCQ Pool Quiz</div>
            <div style="font-size: 2rem; font-weight: 800; color: #ffffff;">${score} / ${maxMarks}</div>
            <div style="font-size: 0.9rem; color: #e0f2fe; margin-top: 0.2rem;">(${pct}% Score)</div>
          </div>

          <div class="stats-grid" style="margin-bottom: 1.25rem;">
            <div class="glass-card stat-card">
              <div class="stat-icon" style="background: #dcfce7; color: #166534;"><i class="fa-solid fa-circle-check"></i></div>
              <div class="stat-info"><h4>Correct</h4><div class="stat-number" style="color: #166534;">${correct}</div></div>
            </div>
            <div class="glass-card stat-card">
              <div class="stat-icon" style="background: #fee2e2; color: #dc2626;"><i class="fa-solid fa-circle-xmark"></i></div>
              <div class="stat-info"><h4>Wrong</h4><div class="stat-number" style="color: #dc2626;">${wrong}</div></div>
            </div>
            <div class="glass-card stat-card">
              <div class="stat-icon" style="background: #fef3c7; color: #b45309;"><i class="fa-solid fa-circle-minus"></i></div>
              <div class="stat-info"><h4>Skipped</h4><div class="stat-number" style="color: #b45309;">${unattempted}</div></div>
            </div>
            <div class="glass-card stat-card">
              <div class="stat-icon" style="background: #dbeafe; color: var(--board-navy);"><i class="fa-solid fa-percent"></i></div>
              <div class="stat-info"><h4>Accuracy</h4><div class="stat-number">${pct}%</div></div>
            </div>
          </div>

          <div style="display: flex; gap: 0.65rem; margin-bottom: 1.25rem;">
            <button class="btn-primary" style="flex: 1; background: var(--board-navy); color: #ffffff !important;" onclick="StudentPanel.resetPractice()">
              <i class="fa-solid fa-rotate-left"></i> Retry Practice
            </button>
          </div>

          <h3 style="color: var(--board-navy); margin-bottom: 0.85rem; font-size: 1rem;"><i class="fa-solid fa-list-check"></i> Answer Breakdown:</h3>

          <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            ${details.map((d, i) => `
              <div class="glass-card" style="padding: 1rem; border-left: 5px solid ${d.skipped ? '#f59e0b' : d.isCorrect ? '#166534' : '#dc2626'};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                  <strong style="color: var(--board-navy); font-size: 0.95rem;">Q${i + 1}. ${d.q.question}</strong>
                  <span class="item-badge" style="background: ${d.skipped ? '#fef3c7' : d.isCorrect ? '#dcfce7' : '#fee2e2'}; color: ${d.skipped ? '#b45309' : d.isCorrect ? '#166534' : '#dc2626'}; font-weight: 700; margin-left: 0.5rem; flex-shrink: 0;">
                    ${d.skipped ? 'Skipped' : d.isCorrect ? '✓ Correct' : '✗ Wrong'}
                  </span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.3rem; margin-bottom: 0.5rem;">
                  ${(d.q.options || ['Option A','Option B','Option C','Option D']).map((opt, oi) => {
                    const isCorrectOpt = opt === d.q.correctAnswer || ['Option A','Option B','Option C','Option D'][oi] === d.q.correctAnswer;
                    const isUserAns = opt === d.ans || ['Option A','Option B','Option C','Option D'][oi] === d.ans;
                    let bg = '#f8fafc', border = '#e2e8f0', color = '#334155', fw = '400';
                    if (isCorrectOpt) { bg = '#f0fdf4'; border = '#86efac'; color = '#166534'; fw = '700'; }
                    if (isUserAns && !isCorrectOpt) { bg = '#fef2f2'; border = '#fca5a5'; color = '#dc2626'; fw = '700'; }
                    return `<div style="font-size: 0.8rem; background: ${bg}; padding: 0.3rem 0.55rem; border-radius: 8px; border: 1px solid ${border}; color: ${color}; font-weight: ${fw};">${['a','b','c','d'][oi]}) ${opt}${isCorrectOpt ? ' ✓' : ''}${isUserAns && !isCorrectOpt ? ' ✗' : ''}</div>`;
                  }).join('')}
                </div>
                ${d.ans ? `<p style="font-size: 0.82rem;">Your Answer: <strong style="color: ${d.isCorrect ? '#166534' : '#dc2626'};">${d.ans}</strong> &nbsp;|&nbsp; Correct: <strong style="color: #166534;">${d.q.correctAnswer}</strong></p>` : `<p style="font-size: 0.82rem; color: #b45309;">Not Attempted — Correct Answer: <strong style="color: #166534;">${d.q.correctAnswer}</strong></p>`}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // QUIZ SCREEN — before submit
    return `
      <div class="animate-fadeIn">
        <div class="section-header" style="margin-bottom: 1rem;">
          <h2 class="section-title" style="color: var(--board-navy);"><i class="fa-solid fa-brain"></i> MCQ Practice Pool</h2>
          <span class="item-badge badge-mcq" style="font-weight: 700; font-size: 0.85rem;">${studentClass} — ${questions.length} Questions</span>
        </div>

        ${questions.length === 0 ? `
          <div class="glass-card" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">
            <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; color: #cbd5e1; margin-bottom: 0.75rem;"></i>
            <p>No practice questions available for ${studentClass} yet.</p>
            <p style="font-size: 0.82rem; margin-top: 0.5rem;">Ask your teacher to add questions to the pool!</p>
          </div>
        ` : `
          <div class="glass-card" style="padding: 0.85rem 1.1rem; margin-bottom: 1.25rem; background: #eff6ff; border: 1.5px solid #bfdbfe;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.65rem;">
              <div style="font-size: 0.88rem; color: var(--board-navy); font-weight: 600;">
                <i class="fa-solid fa-circle-info"></i> Select your answer for each question, then press Submit.
              </div>
              <span style="font-size: 0.82rem; color: var(--text-muted);">${Object.keys(this.practiceAnswers).length} / ${questions.length} answered</span>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.25rem;">
            ${questions.map((q, i) => {
              const selected = this.practiceAnswers[q.id];
              return `
                <div class="glass-card" style="padding: 1rem;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.65rem;">
                    <strong style="color: var(--board-navy); font-size: 0.95rem; flex: 1;">Q${i + 1}. ${q.question}</strong>
                    <span class="item-badge badge-mcq" style="margin-left: 0.5rem; flex-shrink: 0; font-size: 0.75rem;">${q.targetClass || 'All'}</span>
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem;">
                    ${(q.options || ['Option A','Option B','Option C','Option D']).map((opt, oi) => {
                      const optKey = ['Option A','Option B','Option C','Option D'][oi];
                      const isSelected = selected === optKey;
                      return `
                        <div
                          data-qid="${q.id}"
                          data-optval="${optKey}"
                          onclick="StudentPanel.selectPracticeAnswer('${q.id}', '${optKey}')"
                          style="font-size: 0.85rem; background: ${isSelected ? '#dbeafe' : '#f8fafc'}; padding: 0.5rem 0.75rem; border-radius: 10px; border: 1.5px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}; color: ${isSelected ? 'var(--board-navy)' : '#334155'}; font-weight: ${isSelected ? '700' : '400'}; cursor: pointer; transition: all 0.15s;">
                          ${['a','b','c','d'][oi]}) ${opt}
                        </div>`;
                    }).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <button id="prac_submit_btn" class="btn-primary" style="width: 100%; background: var(--board-navy); color: #ffffff !important; padding: 0.85rem; font-size: 1rem; font-weight: 700;" onclick="StudentPanel.submitPractice()">
            <i class="fa-solid fa-paper-plane"></i> Submit Practice (${Object.keys(this.practiceAnswers).length}/${questions.length} Answered)
          </button>
        `}
      </div>
    `;
  },

  renderMaterialsView() {
    let materials = window.appStore.getItems('materials');
    const classes = window.appStore.getItems('classes');
    const students = window.appStore.getItems('students');

    const currentStudentId = App.currentUser ? (App.currentUser.studentId || App.currentUser.id) : '';
    const studentObj = students.find(s => s.studentId === currentStudentId || s.id === currentStudentId);
    const studentClass = studentObj ? studentObj.class : (App.currentUser ? App.currentUser.class : 'Class 1st (Primary)');

    let filterDigit = null;
    if (studentClass) {
      const match = studentClass.match(/\d+/);
      if (match) filterDigit = match[0];
    }

    materials = materials.filter(m => {
      if (!m.targetClass || m.targetClass === 'All Classes' || m.targetClass === 'All') return true;
      const targetClassLower = m.targetClass.toLowerCase();

      if (filterDigit) {
        const mDigit = targetClassLower.match(/\d+/);
        if (mDigit && mDigit[0] === filterDigit) return true;
      }

      return targetClassLower.includes((studentClass || '').toLowerCase());
    });

    return `
      <div class="animate-fadeIn">
        <div class="section-header" style="margin-bottom: 1rem;">
          <h2 class="section-title" style="color: var(--board-navy);"><i class="fa-solid fa-book-open"></i> Class Notes & Study Materials (${studentClass})</h2>
        </div>

        <div class="grid-3">
          ${materials.length === 0 ? '<p style="color: var(--text-muted); grid-column: span 3; text-align:center; padding: 2rem;">No study materials published for your class yet.</p>' : materials.map(m => `
            <div class="glass-card item-card" style="padding: 1.25rem; border-top: 4px solid var(--board-navy);">
              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
                  <span class="item-badge badge-${m.type}">${m.type.toUpperCase()}</span>
                  <span class="item-badge badge-mcq">${m.targetClass || 'All'}</span>
                </div>
                <h4 style="margin-top: 0.4rem; font-size: 0.98rem; color: var(--board-navy);">${m.title}</h4>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.85rem;">${m.description || ''}</p>
              </div>
              <a href="${m.url}" target="_blank" class="btn-primary" style="font-size: 0.82rem; background: var(--board-navy); color: #ffffff !important;">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> Open Notes
              </a>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  renderLeaderboardView() {
    const scores = window.appStore.getItems('studentScores');
    scores.sort((a, b) => b.percentage - a.percentage);

    return `
      <div class="animate-fadeIn">
        <div class="section-header" style="margin-bottom: 1rem;">
          <h2 class="section-title" style="color: var(--board-navy);"><i class="fa-solid fa-trophy"></i> Sunday Exam Student Rankings</h2>
        </div>

        <!-- DESKTOP TABULAR VIEW -->
        <div class="glass-card desktop-only" style="padding: 1.25rem; overflow-x: auto;">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Student Name</th>
                <th>Standard</th>
                <th>Exam Title</th>
                <th>Percentage</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${scores.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted);">No student rankings available yet.</td></tr>' : scores.slice(0, 10).map((s, idx) => `
                <tr style="${idx === 0 ? 'background: #fffdf5;' : ''}">
                  <td>
                    <strong style="font-size: 1.1rem; color: ${idx === 0 ? '#b45309' : idx === 1 ? '#475569' : idx === 2 ? '#92400e' : 'var(--board-navy)'};">
                      ${idx === 0 ? '🥇 1st' : idx === 1 ? '🥈 2nd' : idx === 2 ? '🥉 3rd' : `#${idx + 1}`}
                    </strong>
                  </td>
                  <td><strong>${s.studentName}</strong></td>
                  <td><span class="item-badge badge-mcq">${s.studentClass || 'Class 1st'}</span></td>
                  <td>${s.testTitle}</td>
                  <td><span class="item-badge badge-mcq" style="font-weight: 800;">${s.percentage}%</span></td>
                  <td>
                    <span class="item-badge" style="background: ${s.percentage >= 50 ? '#dcfce7' : '#fee2e2'}; color: ${s.percentage >= 50 ? '#166534' : '#dc2626'}; font-weight: 800;">
                      ${s.percentage >= 50 ? 'PASS' : 'FAIL'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- MOBILE USER FRIENDLY LEADERBOARD CARDS VIEW -->
        <div class="mobile-only" style="flex-direction: column; gap: 0.85rem;">
          ${scores.length === 0 ? `
            <div class="glass-card" style="padding: 2rem; text-align: center; color: var(--text-muted);">
              <i class="fa-solid fa-trophy" style="font-size: 2.5rem; color: #cbd5e1; margin-bottom: 0.5rem;"></i>
              <p>No Sunday exam rankings available yet.</p>
            </div>
          ` : scores.slice(0, 10).map((s, idx) => `
            <div class="glass-card" style="padding: 1rem; border-left: 5px solid ${idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#d97706' : 'var(--board-navy)'}; background: ${idx === 0 ? '#fffdf5' : '#ffffff'};">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <span style="font-size: 1.15rem; font-weight: 800; color: ${idx === 0 ? '#b45309' : idx === 1 ? '#475569' : idx === 2 ? '#92400e' : 'var(--board-navy)'};">
                  ${idx === 0 ? '🥇 1st Rank' : idx === 1 ? '🥈 2nd Rank' : idx === 2 ? '🥉 3rd Rank' : `#${idx + 1} Rank`}
                </span>
                <span class="item-badge" style="background: ${s.percentage >= 50 ? '#dcfce7' : '#fee2e2'}; color: ${s.percentage >= 50 ? '#166534' : '#dc2626'}; font-weight: 800;">
                  ${s.percentage >= 50 ? 'PASS' : 'FAIL'}
                </span>
              </div>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.75rem 0.85rem; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="color: var(--board-navy); font-size: 1rem; display: block; margin-bottom: 0.2rem;">${s.studentName}</strong>
                  <span class="item-badge badge-mcq" style="font-weight: 700;">${s.studentClass || 'Class 1st'}</span>
                  <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 0.25rem;">Exam: ${s.testTitle}</div>
                </div>

                <div style="text-align: right;">
                  <div style="font-size: 0.72rem; color: var(--text-muted);">Score</div>
                  <div style="font-size: 1.25rem; font-weight: 800; color: var(--board-navy);">${s.percentage}%</div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
};

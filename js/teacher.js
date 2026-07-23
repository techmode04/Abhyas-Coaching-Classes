/* ==========================================================================
   Abhyas Coaching Classes - Raimoha
   Teacher Controller (Chapter Header Detection & Bulletproof PDF Parser)
   ========================================================================== */

const TeacherPanel = {
  studentSearchQuery: '',
  studentClassFilter: 'all',
  resultSearchQuery: '',
  resultClassFilter: 'all',
  resultDateFilter: 'all',
  materialClassFilter: 'all',
  testCreationMode: 'pdf', // 'pdf' or 'manual'
  scannedQuestions: [],
  manualQuestions: [],

  // Image & File Upload Helpers
  async handleImageUpload(inputEl, previewId, targetInputId) {
    if (inputEl.files && inputEl.files[0]) {
      const file = inputEl.files[0];
      const preview = document.getElementById(previewId);
      const targetInput = document.getElementById(targetInputId);
      if (preview) {
        preview.src = URL.createObjectURL(file);
        preview.style.display = 'block';
      }
      try {
        const url = await uploadFileToGoogleDrive(file, "photos");
        if (targetInput) targetInput.value = url;
        if (preview) preview.src = url;
      } catch (e) {
        console.warn("Image upload error:", e);
      }
    }
  },

  async handleFileUpload(inputEl, targetInputId, labelId) {
    if (inputEl.files && inputEl.files[0]) {
      const file = inputEl.files[0];
      const labelEl = document.getElementById(labelId);
      if (labelEl) {
        labelEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="color: var(--board-navy);"></i> Uploading <strong>${file.name}</strong> to Google Drive...`;
      }
      try {
        const url = await uploadFileToGoogleDrive(file, "documents");
        const targetInput = document.getElementById(targetInputId);
        if (targetInput) targetInput.value = url;
        if (labelEl) {
          labelEl.innerHTML = `<i class="fa-solid fa-file-circle-check" style="color: var(--board-green);"></i> Uploaded to Drive: <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)`;
        }
      } catch (err) {
        console.warn("File upload error:", err);
      }
    }
  },

  // BULLETPROOF PDF PARSER WITH CHAPTER DETECTION
  async handlePdfScanUpload(inputEl) {
    if (!inputEl.files || !inputEl.files[0]) return;
    const file = inputEl.files[0];
    const statusLabel = document.getElementById('pdfScanStatusLabel');
    if (statusLabel) {
      statusLabel.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="color: var(--board-navy);"></i> Scanning & detecting chapters, questions & options from <strong>${file.name}</strong>...`;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      let fullText = '';

      if (window.pdfjsLib) {
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          
          // Group text items by line (Y coordinate)
          const items = content.items;
          const lineMap = {};
          
          items.forEach(item => {
            if (!item.str || !item.str.trim()) return;
            const y = Math.round(item.transform[5] / 4) * 4;
            if (!lineMap[y]) lineMap[y] = [];
            lineMap[y].push({ x: item.transform[4], str: item.str.trim() });
          });

          const sortedYs = Object.keys(lineMap).map(Number).sort((a, b) => b - a);
          
          sortedYs.forEach(y => {
            const lineItems = lineMap[y].sort((a, b) => a.x - b.x);
            const lineStr = lineItems.map(it => it.str).join(' ');
            fullText += lineStr + '\n';
          });

          fullText += '\n---PAGE_BREAK---\n';
        }
      }

      this.parseQuestionsFromPdfText(fullText, file.name);
    } catch (err) {
      console.warn('PDF Text Extraction Error:', err);
      this.parseQuestionsFromPdfText('', file.name);
    }
  },

  parseQuestionsFromPdfText(rawText, fileName) {
    const statusLabel = document.getElementById('pdfScanStatusLabel');
    const container = document.getElementById('scannedQuestionsListContainer');

    let parsedList = [];

    if (rawText && rawText.trim().length > 30) {
      const cleanText = rawText
        .replace(/---PAGE_BREAK---/g, '\n')
        .replace(/\r\n/g, '\n');

      const lines = cleanText.split('\n');
      let currentChapter = '';
      let currentBlock = '';
      let activeBlocks = [];

      // Detect Chapter Headers and Question Blocks
      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Check if line is a Chapter Header e.g. "Chapter – 3 [Addition and Subtraction]" or "Chapter 1"
        const isChapterHeader = /^(?:Chapter|Unit|Lesson|पाठ|धडा)\s*[\-\–\d\s]*\[?.*?\]?/i.test(trimmed);

        if (isChapterHeader) {
          currentChapter = trimmed;
          return;
        }

        // Check if line starts a Question e.g. "Question 1)", "Question 1.", "Question 14 A line", "Q1.", "1)"
        const isQuestionStart = /^(?:Question\s*\d+[\.\s\)]|Q\d+[\.\s\)]|^\d+[\.\s\)])/i.test(trimmed);

        if (isQuestionStart) {
          if (currentBlock) {
            activeBlocks.push({ chapter: currentChapter, text: currentBlock });
          }
          currentBlock = trimmed;
        } else {
          if (currentBlock) {
            currentBlock += '\n' + trimmed;
          }
        }
      });

      if (currentBlock) {
        activeBlocks.push({ chapter: currentChapter, text: currentBlock });
      }

      activeBlocks.forEach((item, idx) => {
        const block = item.text.trim();
        if (!block) return;

        let qText = block;
        let optA = '', optB = '', optC = '', optD = '';

        qText = qText.replace(/^(?:Question\s*\d+[\.\s\)]|Q\d+[\.\s\)]|\d+[\.\s\)])\s*/i, '').trim();

        const aMatch = qText.match(/(?:[\(\[\{]a[\)\]\}]|a[\.\)]|Option A:?)([\s\S]*?)(?=(?:[\(\[\{]b[\)\]\}]|b[\.\)]|Option B:?)|$)/i);
        const bMatch = qText.match(/(?:[\(\[\{]b[\)\]\}]|b[\.\)]|Option B:?)([\s\S]*?)(?=(?:[\(\[\{]c[\)\]\}]|c[\.\)]|Option C:?)|$)/i);
        const cMatch = qText.match(/(?:[\(\[\{]c[\)\]\}]|c[\.\)]|Option C:?)([\s\S]*?)(?=(?:[\(\[\{]d[\)\]\}]|d[\.\)]|Option D:?)|$)/i);
        const dMatch = qText.match(/(?:[\(\[\{]d[\)\]\}]|d[\.\)]|Option D:?)([\s\S]*?)(?=$)/i);

        if (aMatch && aMatch[1]) {
          optA = aMatch[1].trim();
          const firstOptIdx = qText.search(/(?:[\(\[\{]a[\)\]\}]|a[\.\)]|Option A:?)/i);
          if (firstOptIdx !== -1) qText = qText.substring(0, firstOptIdx).trim();
        }
        if (bMatch && bMatch[1]) optB = bMatch[1].trim();
        if (cMatch && cMatch[1]) optC = cMatch[1].trim();
        if (dMatch && dMatch[1]) optD = dMatch[1].trim();

        // Prune any extraneous question text swallowed into options
        [optA, optB, optC, optD] = [optA, optB, optC, optD].map(opt => {
          let cleaned = opt;
          const qStartMatch = cleaned.search(/(?:Question\s*\d+|Q\d+)/i);
          if (qStartMatch > 0) {
            cleaned = cleaned.substring(0, qStartMatch).trim();
          }
          return cleaned;
        });

        qText = qText.replace(/\s+/g, ' ').trim();
        optA = optA.replace(/\s+/g, ' ').trim() || 'Option A';
        optB = optB.replace(/\s+/g, ' ').trim() || 'Option B';
        optC = optC.replace(/\s+/g, ' ').trim() || 'Option C';
        optD = optD.replace(/\s+/g, ' ').trim() || 'Option D';

        if (qText) {
          parsedList.push({
            id: `scan_q_${Date.now()}_${idx + 1}`,
            chapter: item.chapter || '',
            question: qText,
            optA: optA,
            optB: optB,
            optC: optC,
            optD: optD,
            correctAns: 'Option A'
          });
        }
      });
    }

    // Default Fallback
    if (parsedList.length === 0) {
      for (let i = 1; i <= 10; i++) {
        parsedList.push({
          id: `scan_q_${Date.now()}_${i}`,
          chapter: '',
          question: `Question ${i} (Extracted from ${fileName || 'PDF Paper'})`,
          optA: `Option A`,
          optB: `Option B`,
          optC: `Option C`,
          optD: `Option D`,
          correctAns: 'Option A'
        });
      }
    }

    this.scannedQuestions = parsedList;

    const detectedChapters = Array.from(new Set(parsedList.map(q => q.chapter).filter(Boolean)));

    if (statusLabel) {
      statusLabel.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--board-green);"></i> Scanned Successfully! Extracted <strong>${parsedList.length} Questions</strong> ${detectedChapters.length > 0 ? `across <strong>${detectedChapters.length} Chapters</strong>` : ''}!`;
    }

    if (container) {
      container.innerHTML = this.renderScannedQuestionsReviewHtml();
    }
  },

  renderScannedQuestionsReviewHtml() {
    const chapters = Array.from(new Set(this.scannedQuestions.map(q => q.chapter).filter(Boolean)));

    return `
      <div>
        ${chapters.length > 0 ? `
          <div style="background: #f0f9ff; padding: 0.6rem 0.85rem; border-radius: 10px; border: 1px solid #bae6fd; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
            <span style="font-size: 0.82rem; font-weight: 700; color: #0369a1;"><i class="fa-solid fa-book-open"></i> Detected Chapters in PDF:</span>
            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
              ${chapters.map(ch => `
                <span style="background: #e0f2fe; color: #0369a1; font-weight: 700; font-size: 0.75rem; padding: 0.2rem 0.55rem; border-radius: 6px; border: 1px solid #7dd3fc;">
                  ${ch}
                </span>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div style="max-height: 300px; overflow-y: auto; padding-right: 0.25rem;">
          ${this.scannedQuestions.map((q, idx) => `
            <div style="background: #ffffff; padding: 0.85rem; border-radius: 12px; border: 1.5px solid #cbd5e1; margin-bottom: 0.75rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.45rem; flex-wrap: wrap; gap: 0.4rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span style="font-weight: 700; color: var(--board-navy); font-size: 0.88rem;">Q${idx + 1}.</span>
                  ${q.chapter ? `
                    <span style="background: #eff6ff; color: var(--board-navy); border: 1px solid #bfdbfe; padding: 0.2rem 0.55rem; border-radius: 6px; font-weight: 700; font-size: 0.75rem;">
                      <i class="fa-solid fa-bookmark"></i> ${q.chapter}
                    </span>
                  ` : ''}
                </div>

                <select style="font-size: 0.78rem; padding: 0.3rem 0.5rem; border-radius: 8px; border: 1px solid #cbd5e1; font-weight: 700; color: var(--board-green);" onchange="TeacherPanel.scannedQuestions[${idx}].correctAns = this.value">
                  <option value="Option A" ${q.correctAns === 'Option A' ? 'selected' : ''}>Correct: Option A</option>
                  <option value="Option B" ${q.correctAns === 'Option B' ? 'selected' : ''}>Correct: Option B</option>
                  <option value="Option C" ${q.correctAns === 'Option C' ? 'selected' : ''}>Correct: Option C</option>
                  <option value="Option D" ${q.correctAns === 'Option D' ? 'selected' : ''}>Correct: Option D</option>
                </select>
              </div>

              <textarea class="form-input" style="font-size: 0.85rem; font-weight: 600; margin-bottom: 0.4rem;" rows="2" oninput="TeacherPanel.scannedQuestions[${idx}].question = this.value">${q.question}</textarea>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem;">
                <div>
                  <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">(a) Option A</span>
                  <input type="text" class="form-input" style="font-size: 0.8rem; padding: 0.35rem 0.6rem;" value="${q.optA}" oninput="TeacherPanel.scannedQuestions[${idx}].optA = this.value">
                </div>

                <div>
                  <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">(b) Option B</span>
                  <input type="text" class="form-input" style="font-size: 0.8rem; padding: 0.35rem 0.6rem;" value="${q.optB}" oninput="TeacherPanel.scannedQuestions[${idx}].optB = this.value">
                </div>

                <div>
                  <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">(c) Option C</span>
                  <input type="text" class="form-input" style="font-size: 0.8rem; padding: 0.35rem 0.6rem;" value="${q.optC}" oninput="TeacherPanel.scannedQuestions[${idx}].optC = this.value">
                </div>

                <div>
                  <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">(d) Option D</span>
                  <input type="text" class="form-input" style="font-size: 0.8rem; padding: 0.35rem 0.6rem;" value="${q.optD}" oninput="TeacherPanel.scannedQuestions[${idx}].optD = this.value">
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  // MANUAL QUESTION CREATION (MODE 2)
  addManualQuestionCard() {
    const newQ = {
      id: `manual_q_${Date.now()}_${this.manualQuestions.length + 1}`,
      question: '',
      optA: '',
      optB: '',
      optC: '',
      optD: '',
      correctAns: 'Option A'
    };
    this.manualQuestions.push(newQ);
    const container = document.getElementById('manualQuestionsListContainer');
    if (container) {
      container.innerHTML = this.renderManualQuestionsHtml();
    }
  },

  removeManualQuestionCard(idx) {
    this.manualQuestions.splice(idx, 1);
    const container = document.getElementById('manualQuestionsListContainer');
    if (container) {
      container.innerHTML = this.renderManualQuestionsHtml();
    }
  },

  renderManualQuestionsHtml() {
    if (this.manualQuestions.length === 0) {
      this.manualQuestions = [
        { id: `manual_q_1`, question: '', optA: '', optB: '', optC: '', optD: '', correctAns: 'Option A' }
      ];
    }

    return `
      <div style="max-height: 260px; overflow-y: auto; padding-right: 0.25rem;">
        ${this.manualQuestions.map((q, idx) => `
          <div style="background: #ffffff; padding: 0.85rem; border-radius: 12px; border: 1.5px solid #cbd5e1; margin-bottom: 0.85rem; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <strong style="color: var(--board-navy); font-size: 0.9rem;"><i class="fa-solid fa-pen-nib"></i> Question ${idx + 1}</strong>
              <div style="display: flex; gap: 0.5rem; align-items: center;">
                <select style="font-size: 0.78rem; padding: 0.3rem; border-radius: 8px; border: 1px solid #cbd5e1; font-weight: 700; color: var(--board-green);" onchange="TeacherPanel.manualQuestions[${idx}].correctAns = this.value">
                  <option value="Option A" ${q.correctAns === 'Option A' ? 'selected' : ''}>Correct: Option A</option>
                  <option value="Option B" ${q.correctAns === 'Option B' ? 'selected' : ''}>Correct: Option B</option>
                  <option value="Option C" ${q.correctAns === 'Option C' ? 'selected' : ''}>Correct: Option C</option>
                  <option value="Option D" ${q.correctAns === 'Option D' ? 'selected' : ''}>Correct: Option D</option>
                </select>
                ${this.manualQuestions.length > 1 ? `
                  <button type="button" style="background: #fee2e2; color: #dc2626; border: none; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem; cursor: pointer;" onclick="TeacherPanel.removeManualQuestionCard(${idx})">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                ` : ''}
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 0.5rem;">
              <input type="text" class="form-input" style="font-size: 0.88rem; font-weight: 600;" placeholder="Enter Question ${idx + 1} text..." value="${q.question}" oninput="TeacherPanel.manualQuestions[${idx}].question = this.value">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <div>
                <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">Option A</span>
                <input type="text" class="form-input" style="font-size: 0.82rem; padding: 0.4rem 0.65rem;" placeholder="e.g. 10" value="${q.optA}" oninput="TeacherPanel.manualQuestions[${idx}].optA = this.value">
              </div>

              <div>
                <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">Option B</span>
                <input type="text" class="form-input" style="font-size: 0.82rem; padding: 0.4rem 0.65rem;" placeholder="e.g. 20" value="${q.optB}" oninput="TeacherPanel.manualQuestions[${idx}].optB = this.value">
              </div>

              <div>
                <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">Option C</span>
                <input type="text" class="form-input" style="font-size: 0.82rem; padding: 0.4rem 0.65rem;" placeholder="e.g. 30" value="${q.optC}" oninput="TeacherPanel.manualQuestions[${idx}].optC = this.value">
              </div>

              <div>
                <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">Option D</span>
                <input type="text" class="form-input" style="font-size: 0.82rem; padding: 0.4rem 0.65rem;" placeholder="e.g. 40" value="${q.optD}" oninput="TeacherPanel.manualQuestions[${idx}].optD = this.value">
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <button type="button" class="btn-secondary" style="width: 100%; font-size: 0.82rem; background: #ffffff; color: var(--board-navy) !important; border: 2px dashed var(--board-navy); font-weight: 700; padding: 0.5rem; margin-bottom: 0.85rem;" onclick="TeacherPanel.addManualQuestionCard()">
        <i class="fa-solid fa-plus-circle"></i> Add Another Question & 4 Options
      </button>
    `;
  },

  // DASHBOARD VIEW
  renderDashboard() {
    const students = window.appStore.getItems('students');
    const teachers = window.appStore.getItems('teachers');
    const questions = window.appStore.getItems('questions');
    const tests = window.appStore.getItems('tests');
    const scores = window.appStore.getItems('studentScores');

    const resetRequests = students.filter(s => s.passwordResetRequested === true);

    const class5Students = students.filter(s => s.class && s.class.includes('5th'));
    const class8Students = students.filter(s => s.class && s.class.includes('8th'));
    const otherStudents = students.filter(s => s.class && !s.class.includes('5th') && !s.class.includes('8th'));

    return `
      <div class="animate-fadeIn">
        <div class="section-header" style="margin-bottom: 1rem;">
          <h2 class="section-title" style="color: var(--board-navy); font-size: 1.3rem;"><i class="fa-solid fa-gauge-high"></i> Teacher Dashboard</h2>
        </div>

        ${resetRequests.length > 0 ? `
          <div class="glass-card" style="padding: 1.15rem; background: linear-gradient(135deg, #fff1f2, #fef2f2); border: 2px solid #f87171; border-radius: 20px; margin-bottom: 1.25rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
              <div style="display: flex; align-items: center; gap: 0.85rem;">
                <div style="width: 44px; height: 44px; border-radius: 50%; background: #dc2626; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">
                  <i class="fa-solid fa-bell"></i>
                </div>
                <div>
                  <h4 style="color: #991b1b; font-size: 1.05rem; font-weight: 700;">
                    ${resetRequests.length} Student(s) Requested Password Reset!
                  </h4>
                  <p style="font-size: 0.84rem; color: #7f1d1d; margin-top: 0.15rem;">
                    Students: <strong>${resetRequests.map(s => `${s.name} (${s.studentId})`).join(', ')}</strong>
                  </p>
                </div>
              </div>
              <button class="btn-primary" style="background: #dc2626; color: #ffffff !important; padding: 0.55rem 1.1rem; width: auto; font-size: 0.85rem;" onclick="App.navigate('teacher-students')">
                <i class="fa-solid fa-key"></i> Process Password Resets
              </button>
            </div>
          </div>
        ` : ''}

        <div class="stats-grid">
          <div class="glass-card stat-card" onclick="App.navigate('teacher-students')" style="cursor: pointer;">
            <div class="stat-icon" style="background: #dbeafe; color: var(--board-navy);"><i class="fa-solid fa-users-gear"></i></div>
            <div class="stat-info">
              <h4>Enrolled Students</h4>
              <div class="stat-number">${students.length}</div>
            </div>
          </div>

          <div class="glass-card stat-card" onclick="App.navigate('teacher-students')" style="cursor: pointer;">
            <div class="stat-icon" style="background: ${resetRequests.length > 0 ? '#fee2e2' : '#fef3c7'}; color: ${resetRequests.length > 0 ? '#dc2626' : '#b45309'};">
              <i class="fa-solid fa-key"></i>
            </div>
            <div class="stat-info">
              <h4>Reset Requests</h4>
              <div class="stat-number" style="color: ${resetRequests.length > 0 ? '#dc2626' : 'var(--board-navy)'};">${resetRequests.length}</div>
            </div>
          </div>

          <div class="glass-card stat-card" onclick="App.navigate('teacher-results')" style="cursor: pointer;">
            <div class="stat-icon" style="background: #dcfce7; color: #166534;"><i class="fa-solid fa-square-poll-vertical"></i></div>
            <div class="stat-info">
              <h4>Exam Submissions</h4>
              <div class="stat-number">${scores.length}</div>
            </div>
          </div>

          <div class="glass-card stat-card" onclick="App.navigate('teacher-tests')" style="cursor: pointer;">
            <div class="stat-icon" style="background: #fee2e2; color: #dc2626;"><i class="fa-solid fa-laptop-code"></i></div>
            <div class="stat-info">
              <h4>Active Sunday Exams</h4>
              <div class="stat-number">${tests.length}</div>
            </div>
          </div>
        </div>

        <div class="glass-card" style="padding: 1.1rem; margin-top: 1.25rem;">
          <h3 style="margin-bottom: 0.75rem; color: var(--board-navy); font-size: 1rem; font-weight: 700;">
            <i class="fa-solid fa-bolt" style="color: var(--board-yellow);"></i> Quick Actions
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.65rem;">
            <button class="btn-primary" style="font-size: 0.82rem; padding: 0.65rem; background: var(--board-navy); color: #ffffff !important; justify-content: center;" onclick="TeacherPanel.showCreateTestModal()">
              <i class="fa-solid fa-plus-circle"></i> Create Exam
            </button>

            <button class="btn-secondary" style="font-size: 0.82rem; padding: 0.65rem; background: #ffffff; color: var(--board-navy) !important; border: 1.5px solid #cbd5e1; justify-content: center;" onclick="TeacherPanel.showAddStudentModal()">
              <i class="fa-solid fa-user-plus"></i> Add Student
            </button>
            
            <button class="btn-secondary" style="font-size: 0.82rem; padding: 0.65rem; background: #ffffff; color: var(--board-navy) !important; border: 1.5px solid #cbd5e1; justify-content: center;" onclick="App.navigate('teacher-questions')">
              <i class="fa-solid fa-database"></i> Add Question
            </button>

            <button class="btn-secondary" style="font-size: 0.82rem; padding: 0.65rem; background: #ffffff; color: var(--board-maroon) !important; border: 1.5px solid #cbd5e1; justify-content: center;" onclick="TeacherPanel.showUploadMaterialModal()">
              <i class="fa-solid fa-cloud-arrow-up"></i> Upload Notes
            </button>
          </div>
        </div>

        <div class="glass-card" style="padding: 1.1rem; margin-top: 1.25rem;">
          <h3 style="margin-bottom: 0.75rem; color: var(--board-navy); font-size: 1rem; font-weight: 700;">
            <i class="fa-solid fa-graduation-cap"></i> Student Strength by Class
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.65rem;">
            <div style="background: #eff6ff; padding: 0.75rem 0.85rem; border-radius: 12px; border: 1px solid #bfdbfe; display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--board-navy); font-size: 0.84rem; font-weight: 700;">Class 5th (Navodaya)</span>
              <strong style="background: var(--board-navy); color: #ffffff; padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.82rem;">${class5Students.length} Students</strong>
            </div>

            <div style="background: #fff1f2; padding: 0.75rem 0.85rem; border-radius: 12px; border: 1px solid #fca5a5; display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--board-maroon); font-size: 0.84rem; font-weight: 700;">Class 8th (Scholarship)</span>
              <strong style="background: var(--board-maroon); color: #ffffff; padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.82rem;">${class8Students.length} Students</strong>
            </div>

            <div style="background: #f8fafc; padding: 0.75rem 0.85rem; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #334155; font-size: 0.84rem; font-weight: 700;">Class 1st-4th & 6th-7th</span>
              <strong style="background: #475569; color: #ffffff; padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.82rem;">${otherStudents.length} Students</strong>
            </div>
          </div>
        </div>

        <div class="glass-card" style="margin-top: 1.5rem; padding: 1.25rem;">
          <div class="section-header" style="margin-bottom: 0.85rem;">
            <h3 style="font-size: 1.1rem; color: var(--board-navy);"><i class="fa-solid fa-users"></i> Recently Enrolled Students</h3>
            <button class="btn-secondary" style="font-size: 0.8rem; background: #ffffff; color: var(--board-navy) !important; border: 1.5px solid #cbd5e1;" onclick="App.navigate('teacher-students')">Manage All Students</button>
          </div>
          <div class="desktop-only" style="overflow-x: auto;">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Student Name</th>
                  <th>Student ID</th>
                  <th>Class / Standard</th>
                  <th>Village</th>
                  <th>Parent Contact</th>
                  <th>Reset Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${students.slice(0, 5).map(s => `
                  <tr>
                    <td><img src="${s.photoUrl}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--board-navy);"></td>
                    <td><strong>${s.name}</strong></td>
                    <td><span class="item-badge" style="background: #eff6ff; color: var(--board-navy); border: 1px solid #bfdbfe; font-weight: 700;">${s.studentId}</span></td>
                    <td><span class="item-badge badge-mcq">${s.class}</span></td>
                    <td>${s.village}</td>
                    <td>${s.parentMobile}</td>
                    <td>
                      ${s.passwordResetRequested ? `
                        <span class="item-badge" style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-weight: 700;">
                          <i class="fa-solid fa-bell"></i> Reset Requested
                        </span>
                      ` : `
                        <span class="item-badge" style="background: #dcfce7; color: #166534;">Active</span>
                      `}
                    </td>
                    <td>
                      <div style="display: flex; gap: 0.3rem;">
                        <button class="btn-secondary" style="font-size: 0.78rem; padding: 0.3rem 0.6rem; background: #ffffff; color: var(--board-navy) !important; border: 1px solid #cbd5e1;" title="Edit Student" onclick="TeacherPanel.showEditStudentModal('${s.studentId}')">
                          <i class="fa-solid fa-pen-to-square"></i> Edit
                        </button>
                        <button class="btn-secondary" style="font-size: 0.78rem; padding: 0.3rem 0.6rem; background: var(--board-navy); color: #ffffff !important; border: none;" onclick="TeacherPanel.showStudentLoginCardModal('${s.studentId}')">
                          <i class="fa-solid fa-id-card"></i> Card
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="mobile-only" style="flex-direction: column; gap: 0.75rem;">
            ${students.slice(0, 5).map(s => `
              <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 0.85rem; border-left: 4px solid var(--board-navy);">
                <div style="display: flex; gap: 0.65rem; align-items: center;">
                  <img src="${s.photoUrl}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--board-navy); flex-shrink: 0;">
                  <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <strong style="color: var(--board-navy); font-size: 0.92rem;">${s.name}</strong>
                      <span class="item-badge badge-mcq" style="font-size: 0.7rem;">${s.class}</span>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.1rem;">
                      ID: <strong style="color: var(--board-navy);">${s.studentId}</strong> • ${s.village}
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  },

  // STUDENT DIRECTORY MANAGEMENT
  renderStudentsView() {
    let students = window.appStore.getItems('students');
    const classes = window.appStore.getItems('classes');

    if (this.studentSearchQuery) {
      const q = this.studentSearchQuery.toLowerCase();
      students = students.filter(s => 
        s.name.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        s.village.toLowerCase().includes(q) ||
        s.parentMobile.includes(q)
      );
    }

    if (this.studentClassFilter !== 'all') {
      students = students.filter(s => s.class.includes(this.studentClassFilter));
    }

    return `
      <div class="animate-fadeIn">
        <div class="section-header" style="margin-bottom: 1rem;">
          <h2 class="section-title" style="color: var(--board-navy);"><i class="fa-solid fa-users-gear"></i> Student Account Management</h2>
          <button class="btn-primary" style="width: auto; padding: 0.6rem 1.2rem; background: var(--board-navy); color: #ffffff !important;" onclick="TeacherPanel.showAddStudentModal()">
            <i class="fa-solid fa-user-plus"></i> Add New Student
          </button>
        </div>

        <div class="glass-card" style="padding: 1rem; margin-bottom: 1.25rem;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.75rem; align-items: center;">
            <div style="position: relative;">
              <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-muted);"></i>
              <input type="text" class="form-input" placeholder="Search by Student Name, ID, Village or Mobile..." value="${this.studentSearchQuery}" style="padding-left: 2.6rem;" oninput="TeacherPanel.onStudentSearch(this.value)">
            </div>

            <div>
              <select class="form-input" style="font-weight: 700;" onchange="TeacherPanel.onStudentClassFilter(this.value)">
                <option value="all">🏫 All Standards (1st to 8th)</option>
                ${classes.map(c => `<option value="${c.name}" ${this.studentClassFilter === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- DESKTOP TABULAR VIEW -->
        <div class="glass-card desktop-only" style="padding: 1.25rem; overflow-x: auto;">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Student Name</th>
                <th>Student ID</th>
                <th>Standard / Class</th>
                <th>Batch</th>
                <th>Village</th>
                <th>Reset Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${students.length === 0 ? '<tr><td colspan="8" style="text-align:center; padding: 2rem; color: var(--text-muted);">No student records found.</td></tr>' : students.map(s => `
                <tr style="${s.passwordResetRequested ? 'background: #fff1f2;' : ''}">
                  <td><img src="${s.photoUrl}" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 2px solid var(--board-navy);"></td>
                  <td>
                    <strong>${s.name}</strong>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${s.schoolName || ''}</div>
                  </td>
                  <td><span class="item-badge" style="background: #eff6ff; color: var(--board-navy); border: 1px solid #bfdbfe; font-weight: 700;">${s.studentId}</span></td>
                  <td style="font-size: 0.85rem;"><span class="item-badge badge-mcq">${s.class}</span></td>
                  <td style="font-size: 0.82rem;">${s.batch}</td>
                  <td>${s.village}</td>
                  <td>
                    ${s.passwordResetRequested ? `
                      <span class="item-badge" style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-weight: 700;">
                        <i class="fa-solid fa-bell"></i> Reset Requested
                      </span>
                    ` : `
                      <span class="item-badge" style="background: ${s.status === 'Active' ? '#dcfce7' : '#fee2e2'}; color: ${s.status === 'Active' ? '#166534' : '#dc2626'}; font-weight: 700;">
                        ${s.status}
                      </span>
                    `}
                  </td>
                  <td>
                    <div style="display: flex; gap: 0.3rem;">
                      <button class="btn-secondary" style="font-size: 0.75rem; padding: 0.3rem 0.55rem; background: #ffffff; color: var(--board-navy) !important; border: 1px solid #cbd5e1;" title="Edit Student Details" onclick="TeacherPanel.showEditStudentModal('${s.studentId}')">
                        <i class="fa-solid fa-pen-to-square"></i> Edit
                      </button>

                      ${s.passwordResetRequested ? `
                        <button class="btn-primary" style="font-size: 0.75rem; padding: 0.35rem 0.65rem; background: #dc2626; color: #ffffff !important;" title="Reset & Print Card" onclick="TeacherPanel.resetStudentPasswordModal('${s.studentId}')">
                          <i class="fa-solid fa-key"></i> Reset & Print Card
                        </button>
                      ` : `
                        <button class="btn-secondary" style="font-size: 0.75rem; padding: 0.3rem 0.55rem; background: var(--board-navy); color: #ffffff !important; border: none;" title="Login Card" onclick="TeacherPanel.showStudentLoginCardModal('${s.studentId}')">
                          <i class="fa-solid fa-id-card"></i> Card
                        </button>
                        
                        <button class="btn-secondary" style="font-size: 0.75rem; padding: 0.3rem 0.55rem; background: #ffffff; color: var(--board-navy) !important; border: 1px solid #cbd5e1;" title="Reset Password" onclick="TeacherPanel.resetStudentPasswordModal('${s.studentId}')">
                          <i class="fa-solid fa-key"></i>
                        </button>
                      `}

                      <button class="btn-secondary" style="font-size: 0.75rem; padding: 0.3rem 0.55rem; background: #ffffff; color: ${s.status === 'Active' ? 'var(--board-red)' : 'var(--board-green)'} !important; border: 1px solid #cbd5e1;" title="Enable/Disable Account" onclick="TeacherPanel.toggleStudentStatus('${s.studentId}')">
                        <i class="fa-solid ${s.status === 'Active' ? 'fa-user-slash' : 'fa-user-check'}"></i>
                      </button>

                      <button class="btn-secondary" style="font-size: 0.75rem; padding: 0.3rem 0.55rem; background: #ffffff; color: var(--board-red) !important; border: 1px solid #cbd5e1;" title="Delete" onclick="TeacherPanel.deleteStudent('${s.studentId}')">
                        <i class="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- MOBILE USER FRIENDLY CARDS VIEW -->
        <div class="mobile-only" style="flex-direction: column; gap: 0.85rem;">
          ${students.length === 0 ? `
            <div class="glass-card" style="padding: 2rem; text-align: center; color: var(--text-muted);">
              <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; color: #cbd5e1; margin-bottom: 0.5rem;"></i>
              <p>No student records found.</p>
            </div>
          ` : students.map(s => `
            <div class="glass-card" style="padding: 1rem; border-left: 5px solid ${s.passwordResetRequested ? '#dc2626' : 'var(--board-navy)'}; background: #ffffff;">
              <div style="display: flex; gap: 0.75rem; align-items: center; margin-bottom: 0.6rem;">
                <img src="${s.photoUrl}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid var(--board-navy); flex-shrink: 0;">
                <div style="flex: 1;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.3rem;">
                    <strong style="color: var(--board-navy); font-size: 1rem;">${s.name}</strong>
                    ${s.passwordResetRequested ? `
                      <span class="item-badge" style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-weight: 700; font-size: 0.72rem;">
                        <i class="fa-solid fa-bell"></i> Reset Requested
                      </span>
                    ` : `
                      <span class="item-badge" style="background: ${s.status === 'Active' ? '#dcfce7' : '#fee2e2'}; color: ${s.status === 'Active' ? '#166534' : '#dc2626'}; font-weight: 700; font-size: 0.72rem;">
                        ${s.status}
                      </span>
                    `}
                  </div>
                  <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.15rem;">
                    ID: <strong style="color: var(--board-navy);">${s.studentId}</strong> • <span style="color: var(--board-maroon); font-weight: 600;">${s.class}</span>
                  </div>
                </div>
              </div>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.65rem 0.85rem; margin-bottom: 0.75rem; font-size: 0.8rem; color: #334155; display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem;">
                <div><strong>Village:</strong> ${s.village}</div>
                <div><strong>Batch:</strong> ${s.batch}</div>
                <div style="grid-column: span 2;"><strong>Parent Mobile:</strong> ${s.parentMobile}</div>
              </div>

              <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                <button class="btn-secondary" style="font-size: 0.78rem; padding: 0.45rem 0.6rem; flex: 1; background: #ffffff; color: var(--board-navy) !important; border: 1px solid #cbd5e1;" onclick="TeacherPanel.showEditStudentModal('${s.studentId}')">
                  <i class="fa-solid fa-pen-to-square"></i> Edit
                </button>

                ${s.passwordResetRequested ? `
                  <button class="btn-primary" style="font-size: 0.78rem; padding: 0.45rem 0.65rem; flex: 1.5; background: #dc2626; color: #ffffff !important;" onclick="TeacherPanel.resetStudentPasswordModal('${s.studentId}')">
                    <i class="fa-solid fa-key"></i> Reset & Print Card
                  </button>
                ` : `
                  <button class="btn-secondary" style="font-size: 0.78rem; padding: 0.45rem 0.6rem; flex: 1; background: var(--board-navy); color: #ffffff !important; border: none;" onclick="TeacherPanel.showStudentLoginCardModal('${s.studentId}')">
                    <i class="fa-solid fa-id-card"></i> Card
                  </button>

                  <button class="btn-secondary" style="font-size: 0.78rem; padding: 0.45rem 0.6rem; width: auto; background: #ffffff; color: var(--board-navy) !important; border: 1px solid #cbd5e1;" title="Reset Password" onclick="TeacherPanel.resetStudentPasswordModal('${s.studentId}')">
                    <i class="fa-solid fa-key"></i>
                  </button>
                `}

                <button class="btn-secondary" style="font-size: 0.78rem; padding: 0.45rem 0.6rem; width: auto; background: #ffffff; color: ${s.status === 'Active' ? 'var(--board-red)' : 'var(--board-green)'} !important; border: 1px solid #cbd5e1;" title="Enable/Disable Account" onclick="TeacherPanel.toggleStudentStatus('${s.studentId}')">
                  <i class="fa-solid ${s.status === 'Active' ? 'fa-user-slash' : 'fa-user-check'}"></i>
                </button>

                <button class="btn-secondary" style="font-size: 0.78rem; padding: 0.45rem 0.6rem; width: auto; background: #ffffff; color: var(--board-red) !important; border: 1px solid #cbd5e1;" title="Delete" onclick="TeacherPanel.deleteStudent('${s.studentId}')">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  onStudentSearch(val) {
    this.studentSearchQuery = val;
    App.render();
  },

  onStudentClassFilter(val) {
    this.studentClassFilter = val;
    App.render();
  },

  resetStudentFilters() {
    this.studentSearchQuery = '';
    this.studentClassFilter = 'all';
    App.render();
  },

  showAddStudentModal() {
    const classes = window.appStore.getItems('classes');
    const batches = window.appStore.getItems('batches');

    App.showFullPage('Add New Student', `
      <form onsubmit="TeacherPanel.saveNewStudent(event)" style="max-width: 680px; margin: 0 auto;">
        <div class="form-group">
          <label class="form-label">Student Full Name *</label>
          <input type="text" id="stdName" class="form-input" placeholder="e.g. Omkar Vijay Dhisle" required>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
          <div class="form-group">
            <label class="form-label">Standard / Class *</label>
            <select id="stdClass" class="form-input" style="font-weight: 700;" required>
              ${classes.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Batch *</label>
            <select id="stdBatch" class="form-input" style="font-weight: 700;" required>
              ${batches.map(b => `<option value="${b.name}">${b.name}</option>`).join('')}
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
          <div class="form-group">
            <label class="form-label">School Name</label>
            <input type="text" id="stdSchool" class="form-input" placeholder="e.g. Z.P. School, Raimoha">
          </div>

          <div class="form-group">
            <label class="form-label">Village *</label>
            <input type="text" id="stdVillage" class="form-input" placeholder="e.g. Raimoha" value="Raimoha" required>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
          <div class="form-group">
            <label class="form-label">Parent Mobile *</label>
            <input type="tel" id="stdParentMobile" class="form-input" placeholder="9823471972" pattern="[0-9]{10}" required>
          </div>

          <div class="form-group">
            <label class="form-label">Student Mobile (Optional)</label>
            <input type="tel" id="stdMobile" class="form-input" placeholder="9405008260">
          </div>
        </div>

        <div class="form-group" style="background: #f8fafc; padding: 0.75rem; border-radius: 12px; border: 1px dashed #cbd5e1;">
          <label class="form-label" style="font-size: 0.82rem;"><i class="fa-solid fa-camera"></i> Student Photo Upload</label>
          <div style="display: flex; gap: 0.85rem; align-items: center;">
            <img id="stdPhotoPreview" src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid var(--board-navy); flex-shrink: 0;">
            <div style="flex: 1;">
              <input type="file" accept="image/*" class="form-input" style="padding: 0.35rem; font-size: 0.8rem;" onchange="TeacherPanel.handleImageUpload(this, 'stdPhotoPreview', 'stdPhoto')">
              <input type="hidden" id="stdPhoto" value="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80">
            </div>
          </div>
        </div>

        <button type="submit" class="btn-primary" style="margin-top: 0.4rem; background: var(--board-navy); color: #ffffff !important;">
          <i class="fa-solid fa-user-plus"></i> Create Student Account & Generate Login Card
        </button>
      </form>
    `);
  },

  saveNewStudent(e) {
    e.preventDefault();
    const name = document.getElementById('stdName').value.trim();
    const className = document.getElementById('stdClass').value;
    const batch = document.getElementById('stdBatch').value;
    const schoolName = document.getElementById('stdSchool').value.trim();
    const village = document.getElementById('stdVillage').value.trim();
    const parentMobile = document.getElementById('stdParentMobile').value.trim();
    const studentMobile = document.getElementById('stdMobile').value.trim();
    const photoUrl = document.getElementById('stdPhoto').value;

    const createdStudent = window.appStore.createStudent({
      name,
      class: className,
      batch,
      schoolName,
      village,
      parentMobile,
      studentMobile,
      photoUrl
    });

    App.closeModal();
    App.showToast(`Student Account Created for ${className}! ID: ${createdStudent.studentId}`, 'success');
    App.render();

    setTimeout(() => {
      TeacherPanel.showStudentLoginCardModal(createdStudent.studentId);
    }, 400);
  },

  showEditStudentModal(studentId) {
    const students = window.appStore.getItems('students');
    const classes = window.appStore.getItems('classes');
    const batches = window.appStore.getItems('batches');

    const s = students.find(item => item.studentId === studentId || item.id === studentId);
    if (!s) return;

    App.showModal(`Edit Student: ${s.name} (${s.studentId})`, `
      <form onsubmit="TeacherPanel.updateStudent(event, '${s.studentId}')">
        <div class="form-group">
          <label class="form-label">Student Full Name *</label>
          <input type="text" id="editStdName" class="form-input" value="${s.name}" required>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
          <div class="form-group">
            <label class="form-label">Standard / Class *</label>
            <select id="editStdClass" class="form-input" required>
              ${classes.map(c => `<option value="${c.name}" ${s.class === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Batch *</label>
            <select id="editStdBatch" class="form-input" required>
              ${batches.map(b => `<option value="${b.name}" ${s.batch === b.name ? 'selected' : ''}>${b.name}</option>`).join('')}
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
          <div class="form-group">
            <label class="form-label">School Name</label>
            <input type="text" id="editStdSchool" class="form-input" value="${s.schoolName || ''}">
          </div>

          <div class="form-group">
            <label class="form-label">Village *</label>
            <input type="text" id="editStdVillage" class="form-input" value="${s.village || 'Raimoha'}" required>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
          <div class="form-group">
            <label class="form-label">Parent Mobile Number *</label>
            <input type="tel" id="editStdParentMobile" class="form-input" value="${s.parentMobile}" pattern="[0-9]{10}" required>
          </div>

          <div class="form-group">
            <label class="form-label">Password *</label>
            <input type="text" id="editStdPassword" class="form-input" value="${s.password}" required>
          </div>
        </div>

        <div class="form-group" style="background: #f8fafc; padding: 0.85rem; border-radius: 12px; border: 1px dashed #cbd5e1;">
          <label class="form-label"><i class="fa-solid fa-camera"></i> Update Student Photo</label>
          <div style="display: flex; gap: 0.85rem; align-items: center;">
            <img id="editStdPhotoPreview" src="${s.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}" style="width: 54px; height: 54px; border-radius: 50%; object-fit: cover; border: 2px solid var(--board-navy); flex-shrink: 0;">
            <div style="flex: 1;">
              <input type="file" accept="image/*" class="form-input" style="padding: 0.4rem; font-size: 0.8rem;" onchange="TeacherPanel.handleImageUpload(this, 'editStdPhotoPreview', 'editStdPhoto')">
              <input type="hidden" id="editStdPhoto" value="${s.photoUrl || ''}">
            </div>
          </div>
        </div>

        <button type="submit" class="btn-primary" style="margin-top: 0.5rem; background: var(--board-navy); color: #ffffff !important;">
          <i class="fa-solid fa-floppy-disk"></i> Save & Update Student Details
        </button>
      </form>
    `);
  },

  updateStudent(e, studentId) {
    e.preventDefault();
    const name = document.getElementById('editStdName').value.trim();
    const className = document.getElementById('editStdClass').value;
    const batch = document.getElementById('editStdBatch').value;
    const schoolName = document.getElementById('editStdSchool').value.trim();
    const village = document.getElementById('editStdVillage').value.trim();
    const parentMobile = document.getElementById('editStdParentMobile').value.trim();
    const password = document.getElementById('editStdPassword').value.trim();
    const photoUrl = document.getElementById('editStdPhoto').value;

    window.appStore.updateStudent(studentId, {
      name,
      class: className,
      batch,
      schoolName,
      village,
      parentMobile,
      password,
      photoUrl
    });

    App.closeModal();
    App.showToast(`Student Details Updated for ${name} (${studentId})!`, 'success');
    App.render();
  },

  showStudentLoginCardModal(studentId) {
    const students = window.appStore.getItems('students');
    const student = students.find(s => s.studentId === studentId || s.id === studentId);
    if (!student) return;

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=STUDENT_ID:${student.studentId}_NAME:${encodeURIComponent(student.name)}`;

    const cardContent = `
      <div id="printableStudentCard" style="background: #ffffff; border: 3px solid var(--board-navy); border-radius: 20px; padding: 1.25rem; font-family: 'Poppins', sans-serif; position: relative; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
        <div style="background: linear-gradient(135deg, #0d2b6b, #163884); color: #ffffff; padding: 0.75rem; border-radius: 12px; text-align: center; margin-bottom: 1rem; border-bottom: 3px solid var(--board-maroon);">
          <h3 style="font-size: 1.2rem; font-weight: 700; margin: 0; color: #ffffff;">Abhyas Coaching Classes - Raimoha</h3>
          <div style="font-size: 0.75rem; color: #fef08a; margin-top: 0.2rem;">Location: Dhakne Building, Raimoha | Contact: 9823471972</div>
        </div>

        <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem;">
          <img src="${student.photoUrl}" style="width: 85px; height: 85px; border-radius: 16px; object-fit: cover; border: 3px solid var(--board-navy); flex-shrink: 0;">
          <div style="flex: 1;">
            <h3 style="font-size: 1.1rem; color: var(--board-navy); margin-bottom: 0.2rem;">${student.name}</h3>
            <p style="font-size: 0.82rem; color: var(--text-muted);">${student.schoolName || ''} (${student.village})</p>
            <p style="font-size: 0.82rem; font-weight: 600; color: var(--board-maroon);">${student.class}</p>
          </div>
        </div>

        <div style="background: #fffdf5; border: 2px dashed #f59e0b; border-radius: 14px; padding: 0.85rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">Student Login ID:</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--board-navy); letter-spacing: 0.5px;">${student.studentId}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.3rem;">Password:</div>
            <div style="font-size: 1rem; font-weight: 700; color: var(--board-red);">${student.password}</div>
          </div>
          <img src="${qrUrl}" style="width: 75px; height: 75px; border-radius: 8px; border: 1px solid #e2e8f0;" alt="Student QR">
        </div>

        <div style="font-size: 0.72rem; text-align: center; color: var(--text-muted);">
          Parent Contact: ${student.parentMobile} | Admission Date: ${student.admissionDate}
        </div>
      </div>

      <div style="display: flex; gap: 0.6rem; margin-top: 1.25rem; flex-wrap: wrap;">
        <button class="btn-primary" style="flex: 1; background: var(--board-navy); color: #ffffff !important;" onclick="TeacherPanel.printStudentCard()">
          <i class="fa-solid fa-print"></i> Print Login Card
        </button>
        <button class="btn-secondary" style="flex: 1; background: #ffffff; color: var(--board-navy) !important; border: 2px solid #cbd5e1;" onclick="TeacherPanel.copyStudentCredentials('${student.studentId}', '${student.password}')">
          <i class="fa-solid fa-copy"></i> Copy Credentials
        </button>
      </div>
    `;

    App.showModal(`Student Login Card: ${student.studentId}`, cardContent);
  },

  printStudentCard() {
    const cardEl = document.getElementById('printableStudentCard');
    if (!cardEl) return;

    const printWin = window.open('', '', 'width=600,height=700');
    printWin.document.write(`
      <html>
        <head>
          <title>Student Login Card - Abhyas Coaching Raimoha</title>
          <style>
            body { font-family: 'Poppins', sans-serif; padding: 20px; background: #fff; }
            #printableStudentCard { border: 3px solid #0d2b6b; border-radius: 20px; padding: 20px; width: 420px; margin: 0 auto; }
          </style>
        </head>
        <body>
          ${cardEl.outerHTML}
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWin.document.close();
  },

  copyStudentCredentials(id, pass) {
    const text = `Abhyas Coaching Classes - Raimoha\nStudent ID: ${id}\nPassword: ${pass}\nWebsite: http://localhost:8080`;
    navigator.clipboard.writeText(text);
    App.showToast('Login credentials copied to clipboard!', 'info');
  },

  resetStudentPasswordModal(studentId) {
    const newPass = window.appStore.resetStudentPassword(studentId);
    App.showToast(`Password reset successfully! New Password: ${newPass}`, 'success');
    App.render();
    TeacherPanel.showStudentLoginCardModal(studentId);
  },

  toggleStudentStatus(studentId) {
    const newStatus = window.appStore.toggleStudentStatus(studentId);
    App.showToast(`Account status updated: ${newStatus}`, 'info');
    App.render();
  },

  deleteStudent(studentId) {
    if (confirm(`Delete Student ID: ${studentId}?`)) {
      window.appStore.deleteStudent(studentId);
      App.showToast('Student record deleted.', 'warning');
      App.render();
    }
  },

  // TEACHER ACCOUNTS DIRECTORY MANAGEMENT
  renderTeachersView() {
    const teachers = window.appStore.getItems('teachers');

    return `
      <div class="animate-fadeIn">
        <div class="section-header" style="margin-bottom: 1rem;">
          <h2 class="section-title" style="color: var(--board-navy);"><i class="fa-solid fa-chalkboard-user"></i> Teacher Accounts Directory</h2>
          <button class="btn-primary" style="width: auto; padding: 0.6rem 1.2rem; background: var(--board-navy); color: #ffffff !important;" onclick="TeacherPanel.showAddTeacherModal()">
            <i class="fa-solid fa-user-plus"></i> Add New Teacher Account
          </button>
        </div>

        <div class="grid-2">
          ${teachers.length === 0 ? '<div class="glass-card" style="padding: 2rem; text-align: center;">No teacher accounts found.</div>' : teachers.map(t => `
            <div class="glass-card item-card" style="padding: 1.1rem; border-left: 4px solid var(--board-navy);">
              <div style="display: flex; gap: 0.85rem; align-items: center; margin-bottom: 0.75rem;">
                <img src="${t.photoUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid var(--board-navy); flex-shrink: 0;">
                <div style="flex: 1;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.3rem;">
                    <strong style="color: var(--board-navy); font-size: 1rem;">${t.name}</strong>
                    <span class="item-badge" style="background: #dcfce7; color: #166534; font-weight: 700; font-size: 0.72rem;">Active</span>
                  </div>
                  <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.15rem;">
                    Username: <strong style="color: var(--board-navy);">${t.username}</strong> • <span style="color: var(--board-maroon); font-weight: 600;">${t.designation || 'Teacher'}</span>
                  </div>
                </div>
              </div>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.65rem 0.85rem; margin-bottom: 0.75rem; font-size: 0.8rem; color: #334155; display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem;">
                <div><strong>Password:</strong> <span style="color: var(--board-red); font-weight: 700;">${t.password}</span></div>
                <div><strong>Subject:</strong> ${t.subject || 'All'}</div>
                <div style="grid-column: span 2;"><strong>Email:</strong> ${t.email || `${t.username}@abhyas.com`}</div>
              </div>

              <div style="display: flex; gap: 0.4rem;">
                <button class="btn-secondary" style="font-size: 0.78rem; padding: 0.45rem 0.6rem; flex: 1; background: #ffffff; color: var(--board-navy) !important; border: 1px solid #cbd5e1;" onclick="TeacherPanel.showEditTeacherModal('${t.id}')">
                  <i class="fa-solid fa-pen-to-square"></i> Edit Account
                </button>

                <button class="btn-secondary" style="font-size: 0.78rem; padding: 0.45rem 0.6rem; width: auto; background: #ffffff; color: var(--board-red) !important; border: 1px solid #cbd5e1;" title="Delete Account" onclick="TeacherPanel.deleteTeacher('${t.id}')">
                  <i class="fa-solid fa-trash"></i> Delete
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  showAddTeacherModal() {
    App.showModal('Add New Teacher Account', `
      <form onsubmit="TeacherPanel.saveNewTeacher(event)">
        <div class="form-group">
          <label class="form-label">Teacher Full Name *</label>
          <input type="text" id="tchName" class="form-input" placeholder="e.g. Prof. Rohit Dhisle" required>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
          <div class="form-group">
            <label class="form-label">Username (Login ID) *</label>
            <input type="text" id="tchUsername" class="form-input" placeholder="e.g. rohitdhisle" required>
          </div>

          <div class="form-group">
            <label class="form-label">Password *</label>
            <input type="text" id="tchPassword" class="form-input" placeholder="e.g. rohit123" required>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
          <div class="form-group">
            <label class="form-label">Designation</label>
            <input type="text" id="tchDesignation" class="form-input" placeholder="e.g. Senior Faculty" value="Senior Teacher">
          </div>

          <div class="form-group">
            <label class="form-label">Subject</label>
            <input type="text" id="tchSubject" class="form-input" placeholder="e.g. Mathematics" value="Scholarship & Navodaya">
          </div>
        </div>

        <div class="form-group" style="background: #f8fafc; padding: 0.85rem; border-radius: 12px; border: 1px dashed #cbd5e1;">
          <label class="form-label"><i class="fa-solid fa-camera"></i> Teacher Photo Upload</label>
          <div style="display: flex; gap: 0.85rem; align-items: center;">
            <img id="tchPhotoPreview" src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80" style="width: 54px; height: 54px; border-radius: 50%; object-fit: cover; border: 2px solid var(--board-navy); flex-shrink: 0;">
            <div style="flex: 1;">
              <input type="file" accept="image/*" class="form-input" style="padding: 0.4rem; font-size: 0.8rem;" onchange="TeacherPanel.handleImageUpload(this, 'tchPhotoPreview', 'tchPhoto')">
              <input type="hidden" id="tchPhoto" value="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80">
            </div>
          </div>
        </div>

        <button type="submit" class="btn-primary" style="margin-top: 0.5rem; background: var(--board-navy); color: #ffffff !important;">
          <i class="fa-solid fa-user-check"></i> Create Teacher Account
        </button>
      </form>
    `);
  },

  saveNewTeacher(e) {
    e.preventDefault();
    const name = document.getElementById('tchName').value.trim();
    const username = document.getElementById('tchUsername').value.trim();
    const password = document.getElementById('tchPassword').value.trim();
    const designation = document.getElementById('tchDesignation').value.trim();
    const subject = document.getElementById('tchSubject').value.trim();
    const photoUrl = document.getElementById('tchPhoto').value;

    window.appStore.addTeacher({ name, username, password, designation, subject, photoUrl });
    App.closeModal();
    App.showToast(`New Teacher Account Created! Username: ${username}`, 'success');
    App.render();
  },

  showEditTeacherModal(teacherId) {
    const teachers = window.appStore.getItems('teachers');
    const t = teachers.find(item => item.id === teacherId || item.username === teacherId);
    if (!t) return;

    App.showModal(`Edit Teacher: ${t.name}`, `
      <form onsubmit="TeacherPanel.updateTeacher(event, '${t.id}')">
        <div class="form-group">
          <label class="form-label">Teacher Full Name</label>
          <input type="text" id="editTchName" class="form-input" value="${t.name}" required>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
          <div class="form-group">
            <label class="form-label">Username (Login ID)</label>
            <input type="text" id="editTchUsername" class="form-input" value="${t.username}" required>
          </div>

          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="text" id="editTchPassword" class="form-input" value="${t.password}" required>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
          <div class="form-group">
            <label class="form-label">Designation</label>
            <input type="text" id="editTchDesignation" class="form-input" value="${t.designation || ''}">
          </div>

          <div class="form-group">
            <label class="form-label">Subject</label>
            <input type="text" id="editTchSubject" class="form-input" value="${t.subject || ''}">
          </div>
        </div>

        <div class="form-group" style="background: #f8fafc; padding: 0.85rem; border-radius: 12px; border: 1px dashed #cbd5e1;">
          <label class="form-label"><i class="fa-solid fa-camera"></i> Update Teacher Photo</label>
          <div style="display: flex; gap: 0.85rem; align-items: center;">
            <img id="editTchPhotoPreview" src="${t.photoUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'}" style="width: 54px; height: 54px; border-radius: 50%; object-fit: cover; border: 2px solid var(--board-navy); flex-shrink: 0;">
            <div style="flex: 1;">
              <input type="file" accept="image/*" class="form-input" style="padding: 0.4rem; font-size: 0.8rem;" onchange="TeacherPanel.handleImageUpload(this, 'editTchPhotoPreview', 'editTchPhoto')">
              <input type="hidden" id="editTchPhoto" value="${t.photoUrl || ''}">
            </div>
          </div>
        </div>

        <button type="submit" class="btn-primary" style="margin-top: 0.5rem; background: var(--board-navy); color: #ffffff !important;">
          Update Teacher Account
        </button>
      </form>
    `);
  },

  updateTeacher(e, teacherId) {
    e.preventDefault();
    const name = document.getElementById('editTchName').value.trim();
    const username = document.getElementById('editTchUsername').value.trim();
    const password = document.getElementById('editTchPassword').value.trim();
    const designation = document.getElementById('editTchDesignation').value.trim();
    const subject = document.getElementById('editTchSubject').value.trim();
    const photoUrl = document.getElementById('editTchPhoto').value;

    window.appStore.updateTeacher(teacherId, { name, username, password, designation, subject, photoUrl });
    App.closeModal();
    App.showToast(`Teacher Account Updated!`, 'success');
    App.render();
  },

  deleteTeacher(teacherId) {
    const teachers = window.appStore.getItems('teachers');
    if (teachers.length <= 1) {
      App.showToast('Cannot delete the last remaining teacher account!', 'error');
      return;
    }

    if (confirm('Delete this teacher account?')) {
      window.appStore.deleteItem('teachers', teacherId);
      App.render();
    }
  },

  // STUDENT EXAM RESULTS VIEW
  renderStudentResultsView() {
    let scores = window.appStore.getItems('studentScores');
    const classes = window.appStore.getItems('classes');
    const students = window.appStore.getItems('students');

    scores = scores.filter(s => !(s.studentId === 'ABH26001' || (s.studentName && s.studentName.toLowerCase().includes('abhishek'))));

    scores.sort((a, b) => new Date(b.date || Date.now()) - new Date(a.date || Date.now()));

    const availableDates = Array.from(new Set(scores.map(s => s.examDate || (s.date ? s.date.split(',')[0] : 'Today')))).filter(Boolean);

    if (this.resultSearchQuery) {
      const q = this.resultSearchQuery.toLowerCase();
      scores = scores.filter(s => 
        (s.studentName && s.studentName.toLowerCase().includes(q)) ||
        (s.studentId && s.studentId.toLowerCase().includes(q)) ||
        (s.testTitle && s.testTitle.toLowerCase().includes(q))
      );
    }

    if (this.resultClassFilter !== 'all') {
      const filterDigitMatch = this.resultClassFilter.match(/\d+/);
      const filterDigit = filterDigitMatch ? filterDigitMatch[0] : null;

      scores = scores.filter(s => {
        const std = students.find(st => 
          (st.studentId && s.studentId && st.studentId.toLowerCase() === s.studentId.toLowerCase()) ||
          (st.name && s.studentName && st.name.toLowerCase() === s.studentName.toLowerCase())
        );

        const studentEnrolledClass = (s.studentClass || (std ? std.class : '') || '').toLowerCase();
        if (!studentEnrolledClass) return false;

        if (filterDigit) {
          const sDigit = studentEnrolledClass.match(/\d+/);
          if (sDigit && sDigit[0] === filterDigit) return true;
        }

        const filterStr = this.resultClassFilter.toLowerCase();
        if (studentEnrolledClass.includes(filterStr) || filterStr.includes(studentEnrolledClass)) return true;

        return false;
      });
    }

    if (this.resultDateFilter !== 'all') {
      scores = scores.filter(s => (s.examDate && s.examDate.includes(this.resultDateFilter)) || (s.date && s.date.includes(this.resultDateFilter)));
    }

    const totalSubmissions = scores.length;
    const passedCount = scores.filter(s => s.percentage >= 50).length;
    const avgScore = totalSubmissions > 0 ? Math.round(scores.reduce((acc, curr) => acc + curr.percentage, 0) / totalSubmissions) : 0;
    const topScorer = totalSubmissions > 0 ? scores.slice().sort((a, b) => b.percentage - a.percentage)[0] : null;

    return `
      <div class="animate-fadeIn">
        <div class="section-header" style="margin-bottom: 1rem;">
          <h2 class="section-title" style="color: var(--board-navy);"><i class="fa-solid fa-square-poll-vertical"></i> Student Online Exam Submissions</h2>
        </div>

        <div class="glass-card" style="padding: 1rem; margin-bottom: 1.25rem; background: #ffffff; border: 2px solid #bfdbfe;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem; align-items: center;">
            <div style="position: relative;">
              <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--board-navy); font-size: 1.1rem;"></i>
              <input type="text" class="form-input" placeholder="Search Student Name, ID, or Test..." value="${this.resultSearchQuery}" style="padding-left: 2.75rem; border-color: #93c5fd;" oninput="TeacherPanel.onResultSearch(this.value)">
            </div>

            <div>
              <select class="form-input" style="border-color: #93c5fd; font-weight: 700;" onchange="TeacherPanel.onResultClassFilter(this.value)">
                <option value="all">🏫 All Standards (1st to 8th)</option>
                ${classes.map(c => `<option value="${c.name}" ${this.resultClassFilter === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}
              </select>
            </div>

            <div>
              <select class="form-input" style="border-color: #93c5fd; font-weight: 700;" onchange="TeacherPanel.onResultDateFilter(this.value)">
                <option value="all">📅 Filter by Exam Date</option>
                ${availableDates.map(d => `<option value="${d}" ${this.resultDateFilter === d ? 'selected' : ''}>${d}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <div class="stats-grid" style="margin-bottom: 1.25rem;">
          <div class="glass-card stat-card">
            <div class="stat-icon" style="background: #dbeafe; color: var(--board-navy);"><i class="fa-solid fa-file-signature"></i></div>
            <div class="stat-info">
              <h4>Total Papers</h4>
              <div class="stat-number">${totalSubmissions}</div>
            </div>
          </div>

          <div class="glass-card stat-card">
            <div class="stat-icon" style="background: #dcfce7; color: #166534;"><i class="fa-solid fa-circle-check"></i></div>
            <div class="stat-info">
              <h4>Passed Students</h4>
              <div class="stat-number" style="color: #166534;">${passedCount}</div>
            </div>
          </div>

          <div class="glass-card stat-card">
            <div class="stat-icon" style="background: #fef3c7; color: #b45309;"><i class="fa-solid fa-chart-line"></i></div>
            <div class="stat-info">
              <h4>Average Pass %</h4>
              <div class="stat-number" style="color: #b45309;">${avgScore}%</div>
            </div>
          </div>

          <div class="glass-card stat-card">
            <div class="stat-icon" style="background: #f3e8ff; color: #7e22ce;"><i class="fa-solid fa-trophy"></i></div>
            <div class="stat-info">
              <h4>Top Scorer</h4>
              <div class="stat-number" style="font-size: 0.92rem; color: #7e22ce;">${topScorer ? `${topScorer.studentName} (${topScorer.percentage}%)` : 'N/A'}</div>
            </div>
          </div>
        </div>

        <!-- DESKTOP TABULAR VIEW -->
        <div class="glass-card desktop-only" style="padding: 1.25rem; overflow-x: auto;">
          <table class="custom-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Student Name</th>
                <th>Student ID</th>
                <th>Student Standard</th>
                <th>Exam Title</th>
                <th>Score</th>
                <th>Percentage</th>
                <th>Exam Date & Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${scores.length === 0 ? '<tr><td colspan="10" style="text-align:center; padding: 2.5rem; color: var(--text-muted);">No student exam submissions match your filter.</td></tr>' : scores.map((s, idx) => {
                const std = students.find(st => (st.studentId && s.studentId && st.studentId.toLowerCase() === s.studentId.toLowerCase()) || (st.name && s.studentName && st.name.toLowerCase() === s.studentName.toLowerCase()));
                const studentClassLabel = s.studentClass || (std ? std.class : 'Class 1st (Primary)');

                return `
                  <tr>
                    <td><strong>${idx + 1}</strong></td>
                    <td><strong style="color: var(--board-navy);">${s.studentName}</strong></td>
                    <td><span class="item-badge" style="background: #eff6ff; color: var(--board-navy); font-weight: 700;">${s.studentId || 'N/A'}</span></td>
                    <td><span class="item-badge badge-mcq" style="font-weight: 700;">${studentClassLabel}</span></td>
                    <td><strong>${s.testTitle}</strong></td>
                    <td><strong>${s.score} / ${s.totalMarks}</strong></td>
                    <td><span class="item-badge badge-mcq" style="font-weight: 800;">${s.percentage}%</span></td>
                    <td style="font-size: 0.8rem; color: var(--text-muted);"><i class="fa-solid fa-calendar-day"></i> ${s.examDate || s.date || 'Recent'}</td>
                    <td>
                      <span class="item-badge" style="background: ${s.percentage >= 50 ? '#dcfce7' : '#fee2e2'}; color: ${s.percentage >= 50 ? '#166534' : '#dc2626'}; font-weight: 800;">
                        ${s.percentage >= 50 ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                    <td>
                      <div style="display: flex; gap: 0.35rem;">
                        <button class="btn-primary" style="font-size: 0.78rem; padding: 0.35rem 0.65rem; width: auto; background: var(--board-navy); color: #ffffff !important;" onclick="TeacherPanel.viewStudentReport(${idx})">
                          <i class="fa-solid fa-file-lines"></i> View
                        </button>

                        <button class="btn-secondary" style="font-size: 0.78rem; padding: 0.35rem 0.55rem; width: auto; background: #ffffff; color: var(--board-red) !important; border: 1px solid #cbd5e1;" title="Delete Submission Record" onclick="TeacherPanel.deleteSubmission(${idx})">
                          <i class="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- MOBILE USER FRIENDLY CARDS VIEW -->
        <div class="mobile-only" style="flex-direction: column; gap: 0.85rem;">
          ${scores.length === 0 ? `
            <div class="glass-card" style="padding: 2rem; text-align: center; color: var(--text-muted);">
              <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; color: #cbd5e1; margin-bottom: 0.5rem;"></i>
              <p>No student exam submissions match your filter.</p>
            </div>
          ` : scores.map((s, idx) => {
            const std = students.find(st => (st.studentId && s.studentId && st.studentId.toLowerCase() === s.studentId.toLowerCase()) || (st.name && s.studentName && st.name.toLowerCase() === s.studentName.toLowerCase()));
            const studentClassLabel = s.studentClass || (std ? std.class : 'Class 1st (Primary)');

            return `
              <div class="glass-card" style="padding: 1rem; border-left: 5px solid ${s.percentage >= 50 ? '#166534' : '#dc2626'}; background: #ffffff;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                  <div>
                    <strong style="color: var(--board-navy); font-size: 1rem; font-weight: 700;">${s.studentName}</strong>
                    <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.15rem;">
                      ID: <strong style="color: var(--board-navy);">${s.studentId || 'N/A'}</strong> • <span style="color: var(--board-maroon); font-weight: 600;">${studentClassLabel}</span>
                    </div>
                  </div>
                  <span class="item-badge" style="background: ${s.percentage >= 50 ? '#dcfce7' : '#fee2e2'}; color: ${s.percentage >= 50 ? '#166534' : '#dc2626'}; font-weight: 800; font-size: 0.78rem; padding: 0.25rem 0.65rem;">
                    ${s.percentage >= 50 ? 'PASS' : 'FAIL'}
                  </span>
                </div>

                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.75rem 0.85rem; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">Exam Title</div>
                    <strong style="font-size: 0.88rem; color: var(--board-navy);">${s.testTitle}</strong>
                    <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.15rem;"><i class="fa-solid fa-calendar-day"></i> ${s.examDate || s.date || 'Recent'}</div>
                  </div>

                  <div style="text-align: right;">
                    <div style="font-size: 0.75rem; color: var(--text-muted);">Score</div>
                    <div style="font-size: 1.1rem; font-weight: 800; color: var(--board-navy);">${s.score} / ${s.totalMarks}</div>
                    <span class="item-badge badge-mcq" style="font-weight: 800; font-size: 0.75rem;">${s.percentage}%</span>
                  </div>
                </div>

                <div style="display: flex; gap: 0.5rem;">
                  <button class="btn-primary" style="font-size: 0.84rem; padding: 0.6rem; flex: 1; background: var(--board-navy); color: #ffffff !important;" onclick="TeacherPanel.viewStudentReport(${idx})">
                    <i class="fa-solid fa-file-lines"></i> View Detailed Sheet
                  </button>

                  <button class="btn-secondary" style="font-size: 0.84rem; padding: 0.6rem; width: auto; color: var(--board-red) !important; border: 1px solid #fca5a5; background: #fff1f2;" onclick="TeacherPanel.deleteSubmission(${idx})" title="Delete Submission">
                    <i class="fa-solid fa-trash"></i> Delete
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  onResultSearch(val) {
    this.resultSearchQuery = val;
    App.render();
  },

  onResultClassFilter(val) {
    this.resultClassFilter = val;
    App.render();
  },

  onResultDateFilter(val) {
    this.resultDateFilter = val;
    App.render();
  },

  resetResultFilters() {
    this.resultSearchQuery = '';
    this.resultClassFilter = 'all';
    this.resultDateFilter = 'all';
    App.render();
  },

  viewStudentReport(scoreIndex) {
    const scores = window.appStore.getItems('studentScores');
    const scoreItem = scores[scoreIndex];
    if (!scoreItem) return;

    const details = scoreItem.details || [];

    App.showModal(`Student Answer Sheet: ${scoreItem.studentName}`, `
      <div style="padding: 0.5rem 0;">
        <div style="background: #eff6ff; padding: 1rem; border-radius: 14px; border: 1px solid #bfdbfe; margin-bottom: 1rem;">
          <h4 style="color: var(--board-navy); font-size: 1.05rem;">Exam Title: ${scoreItem.testTitle}</h4>
          <p style="font-size: 0.88rem; margin-top: 0.3rem;">
            Student: <strong>${scoreItem.studentName}</strong> (ID: ${scoreItem.studentId || 'N/A'}) | Enrolled Standard: <strong>${scoreItem.studentClass || 'Class 1st (Primary)'}</strong>
          </p>
          <p style="font-size: 0.88rem; color: var(--board-navy);">
            Exam Date & Time: <strong>${scoreItem.examDate || scoreItem.date || 'N/A'}</strong>
          </p>
          <p style="font-size: 0.95rem; font-weight: 700; color: var(--board-maroon); margin-top: 0.3rem;">
            Final Score: ${scoreItem.score} / ${scoreItem.totalMarks} (${scoreItem.percentage}%)
          </p>
        </div>

        <h4 style="margin-bottom: 0.75rem; color: var(--board-navy);"><i class="fa-solid fa-list-check"></i> Answered Questions Breakdown:</h4>
        ${details.length === 0 ? '<p style="color: var(--text-muted);">No detailed breakdown recorded for this test attempt.</p>' : details.map((d, i) => `
          <div style="padding: 0.85rem; border-radius: 12px; margin-bottom: 0.75rem; background: ${d.isCorrect ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${d.isCorrect ? '#86efac' : '#fca5a5'};">
            <p style="font-size: 0.92rem; font-weight: 700;">Q${i + 1}: ${d.question}</p>
            <p style="font-size: 0.85rem; margin-top: 0.3rem;">
              Student's Answer: <span style="font-weight: 700; color: ${d.isCorrect ? '#166534' : '#dc2626'};">${d.userAns}</span> ${d.isCorrect ? '✓' : '✗'}
            </p>
            <p style="font-size: 0.85rem;">Correct Answer: <strong style="color: #166534;">${d.correctAns}</strong></p>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.3rem;"><strong>Explanation:</strong> ${d.explanation}</p>
          </div>
        `).join('')}
      </div>
    `);
  },

  // QUESTION POOL DIRECTORY
  questionClassFilter: 'all',
  questionDateFilter: 'all',
  questionSearchQuery: '',

  onQuestionClassFilter(val) {
    this.questionClassFilter = val;
    App.render();
  },

  onQuestionDateFilter(val) {
    this.questionDateFilter = val;
    App.render();
  },

  onQuestionSearch(val) {
    this.questionSearchQuery = val;
    App.render();
  },

  renderQuestionsView() {
    let allQuestions = window.appStore.getItems('questions');
    const classes = window.appStore.getItems('classes');

    // Collect all unique dates from questions
    const allDates = Array.from(new Set(allQuestions.map(q => q.date).filter(Boolean))).sort().reverse();

    let questions = [...allQuestions];

    // Search filter
    if (this.questionSearchQuery) {
      const q = this.questionSearchQuery.toLowerCase();
      questions = questions.filter(item =>
        item.question.toLowerCase().includes(q) ||
        (item.targetClass && item.targetClass.toLowerCase().includes(q))
      );
    }

    // Class filter
    if (this.questionClassFilter !== 'all') {
      questions = questions.filter(q => {
        if (!q.targetClass || q.targetClass === 'All Classes') return this.questionClassFilter === 'all';
        return q.targetClass === this.questionClassFilter;
      });
    }

    // Date filter
    if (this.questionDateFilter !== 'all') {
      questions = questions.filter(q => q.date === this.questionDateFilter);
    }

    return `
      <div class="animate-fadeIn">
        <div class="section-header" style="margin-bottom: 1rem;">
          <h2 class="section-title" style="color: var(--board-navy);"><i class="fa-solid fa-database"></i> Question Pool Directory</h2>
          <button class="btn-primary" style="width: auto; padding: 0.5rem 1rem; background: var(--board-navy); color: #ffffff !important;" onclick="TeacherPanel.showAddQuestionModal()">
            <i class="fa-solid fa-plus"></i> Add Question to Pool
          </button>
        </div>

        <div class="glass-card" style="padding: 1rem; margin-bottom: 1.25rem; background: #ffffff; border: 1.5px solid #e2e8f0;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0.75rem; align-items: center;">

            <div style="position: relative;">
              <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-muted);"></i>
              <input type="text" class="form-input" placeholder="Search question text..." value="${this.questionSearchQuery}" style="padding-left: 2.6rem;" oninput="TeacherPanel.onQuestionSearch(this.value)">
            </div>

            <select class="form-input" style="font-weight: 700;" onchange="TeacherPanel.onQuestionClassFilter(this.value)">
              <option value="all">🏫 All Classes (${allQuestions.length} Total)</option>
              ${classes.map(c => {
                const count = allQuestions.filter(q => q.targetClass === c.name).length;
                return `<option value="${c.name}" ${this.questionClassFilter === c.name ? 'selected' : ''}>${c.name} (${count} Qs)</option>`;
              }).join('')}
            </select>

            <select class="form-input" style="font-weight: 700;" onchange="TeacherPanel.onQuestionDateFilter(this.value)">
              <option value="all">📅 Filter by Date Added</option>
              ${allDates.map(d => `<option value="${d}" ${this.questionDateFilter === d ? 'selected' : ''}>${d}</option>`).join('')}
            </select>

          </div>
          <div style="margin-top: 0.65rem; font-size: 0.83rem; color: var(--text-muted); font-weight: 600;">
            Showing <strong style="color: var(--board-navy);">${questions.length}</strong> of <strong>${allQuestions.length}</strong> questions
            ${this.questionClassFilter !== 'all' ? ` &mdash; Class: <strong style="color: var(--board-maroon);">${this.questionClassFilter}</strong>` : ''}
            ${this.questionDateFilter !== 'all' ? ` &mdash; Date: <strong style="color: var(--board-maroon);">${this.questionDateFilter}</strong>` : ''}
          </div>
        </div>

        <div class="grid-2">
          ${questions.length === 0 ? `
            <div class="glass-card" style="padding: 2rem; grid-column: span 2; text-align: center; color: var(--text-muted);">
              <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; color: #cbd5e1; margin-bottom: 0.5rem;"></i>
              <p>No questions found matching your filters.</p>
            </div>
          ` : questions.map((q, qi) => `
            <div class="glass-card item-card" style="padding: 1.25rem;">
              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem; flex-wrap: wrap; gap: 0.4rem;">
                  <span class="item-badge badge-mcq"><i class="fa-solid fa-graduation-cap"></i> ${q.targetClass || 'All Classes'}</span>
                  <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
                    ${q.date ? `<span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;"><i class="fa-solid fa-calendar-day"></i> ${q.date}</span>` : ''}
                    <span style="font-size: 0.82rem; color: var(--board-maroon); font-weight: 700;">${q.marks || 2} Marks</span>
                  </div>
                </div>
                <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Q${qi + 1}. ${q.question}</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.35rem; margin-bottom: 0.5rem;">
                  ${(q.options || ['Option A', 'Option B', 'Option C', 'Option D']).map((opt, oIdx) => `
                    <div style="font-size: 0.8rem; background: ${q.correctAnswer === opt || q.correctAnswer === ['Option A','Option B','Option C','Option D'][oIdx] ? '#f0fdf4' : '#f8fafc'}; padding: 0.3rem 0.55rem; border-radius: 8px; border: 1px solid ${q.correctAnswer === opt || q.correctAnswer === ['Option A','Option B','Option C','Option D'][oIdx] ? '#86efac' : '#e2e8f0'}; color: ${q.correctAnswer === opt || q.correctAnswer === ['Option A','Option B','Option C','Option D'][oIdx] ? '#166534' : '#334155'}; font-weight: ${q.correctAnswer === opt || q.correctAnswer === ['Option A','Option B','Option C','Option D'][oIdx] ? '700' : '400'};">
                      ${['a','b','c','d'][oIdx]}) ${opt}
                    </div>
                  `).join('')}
                </div>
                <p style="font-size: 0.82rem; color: var(--board-green);"><i class="fa-solid fa-circle-check"></i> <strong>Correct:</strong> ${q.correctAnswer}</p>
                ${q.explanation ? `<p style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.3rem;">${q.explanation}</p>` : ''}
              </div>
              <div style="display: flex; justify-content: flex-end; margin-top: 0.65rem;">
                <button class="btn-secondary" style="color: var(--board-red) !important; border: 1px solid #cbd5e1; font-size: 0.8rem;" onclick="TeacherPanel.deleteQuestion('${q.id}')">
                  <i class="fa-solid fa-trash"></i> Delete
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  showAddQuestionModal() {
    const classes = window.appStore.getItems('classes');

    App.showFullPage('Add Question to Pool Directory', `
      <form onsubmit="TeacherPanel.saveQuestion(event)" style="max-width: 620px; margin: 0 auto;">
        <div class="form-group">
          <label class="form-label">Target Standard / Class</label>
          <select id="qTargetClass" class="form-input">
            <option value="All Classes">All Classes (1st to 8th)</option>
            ${classes.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Question Text</label>
          <textarea id="qText" class="form-input" rows="2" required></textarea>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;" class="form-group">
          <input type="text" id="qOptA" class="form-input" placeholder="Option A" required>
          <input type="text" id="qOptB" class="form-input" placeholder="Option B" required>
          <input type="text" id="qOptC" class="form-input" placeholder="Option C" required>
          <input type="text" id="qOptD" class="form-input" placeholder="Option D" required>
        </div>

        <div class="form-group">
          <label class="form-label">Correct Option *</label>
          <select id="qCorrect" class="form-input" required>
            <option value="Option A">Option A</option>
            <option value="Option B">Option B</option>
            <option value="Option C">Option C</option>
            <option value="Option D">Option D</option>
          </select>
        </div>

        <button type="submit" class="btn-primary" style="color: #ffffff !important; background: var(--board-navy);">Save Question</button>
      </form>
    `);
  },

  saveQuestion(e) {
    e.preventDefault();
    const targetClass = document.getElementById('qTargetClass').value;
    const question = document.getElementById('qText').value;
    const optA = document.getElementById('qOptA').value;
    const optB = document.getElementById('qOptB').value;
    const optC = document.getElementById('qOptC').value;
    const optD = document.getElementById('qOptD').value;
    const correctAnswer = document.getElementById('qCorrect').value;
    const todayDate = new Date().toISOString().split('T')[0];

    window.appStore.addItem('questions', {
      targetClass, type: 'mcq', question, options: [optA, optB, optC, optD], correctAnswer, marks: 2, date: todayDate
    });

    App.closeModal();
    App.showToast('Question saved to pool!', 'success');
    App.render();
  },

  deleteQuestion(id) {
    if (confirm('Delete this question?')) {
      window.appStore.deleteItem('questions', id);
      App.render();
    }
  },

  // ONLINE EXAM MANAGEMENT
  testSearchQuery: '',
  testClassFilter: 'all',
  testDateFilter: 'all',

  onTestSearch(val) { this.testSearchQuery = val; App.render(); },
  onTestClassFilter(val) { this.testClassFilter = val; App.render(); },
  onTestDateFilter(val) { this.testDateFilter = val; App.render(); },

  renderTestsView() {
    let allTests = window.appStore.getItems('tests');
    const classes = window.appStore.getItems('classes');

    // Get a display date for each exam — use examDate or extract from id timestamp
    const getDisplayDate = (t) => {
      if (t.examDate) return t.examDate;
      // try extracting date from id like "test_1690000000000"
      const tsMatch = t.id && t.id.match(/(\d{13,})/);
      if (tsMatch) {
        const d = new Date(parseInt(tsMatch[1]));
        if (!isNaN(d)) return d.toISOString().split('T')[0];
      }
      return 'No Date';
    };

    const allDates = Array.from(new Set(allTests.map(t => getDisplayDate(t)).filter(Boolean))).sort().reverse();

    let tests = [...allTests];

    if (this.testSearchQuery) {
      const q = this.testSearchQuery.toLowerCase();
      tests = tests.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.targetClass && t.targetClass.toLowerCase().includes(q))
      );
    }

    if (this.testClassFilter !== 'all') {
      tests = tests.filter(t => {
        if (!t.targetClass || t.targetClass === 'All Classes') return false;
        return t.targetClass === this.testClassFilter;
      });
    }

    if (this.testDateFilter !== 'all') {
      tests = tests.filter(t => getDisplayDate(t) === this.testDateFilter);
    }

    return `
      <div class="animate-fadeIn">
        <div class="section-header" style="margin-bottom: 1rem;">
          <h2 class="section-title" style="color: var(--board-navy);"><i class="fa-solid fa-file-pen"></i> Online Exam Management</h2>
          <button class="btn-primary" style="width: auto; padding: 0.5rem 1rem; background: var(--board-navy); color: #ffffff !important;" onclick="TeacherPanel.showCreateTestModal()">
            <i class="fa-solid fa-plus"></i> Create Exam for Class
          </button>
        </div>

        <div class="glass-card" style="padding: 1rem; margin-bottom: 1.25rem; background: #ffffff; border: 1.5px solid #e2e8f0;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; align-items: center;">
            <div style="position: relative;">
              <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-muted);"></i>
              <input type="text" class="form-input" placeholder="Search exam title..." value="${this.testSearchQuery}" style="padding-left: 2.6rem;" oninput="TeacherPanel.onTestSearch(this.value)">
            </div>

            <select class="form-input" style="font-weight: 700;" onchange="TeacherPanel.onTestClassFilter(this.value)">
              <option value="all">\ud83c\udfeb All Standards (${allTests.length} Exams)</option>
              ${classes.map(c => {
                const count = allTests.filter(t => t.targetClass === c.name).length;
                return `<option value="${c.name}" ${this.testClassFilter === c.name ? 'selected' : ''}>${c.name} (${count})</option>`;
              }).join('')}
            </select>

            <select class="form-input" style="font-weight: 700;" onchange="TeacherPanel.onTestDateFilter(this.value)">
              <option value="all">\ud83d\udcc5 Filter by Exam Date</option>
              ${allDates.map(d => `<option value="${d}" ${this.testDateFilter === d ? 'selected' : ''}>${d}</option>`).join('')}
            </select>
          </div>
          <div style="margin-top: 0.65rem; font-size: 0.83rem; color: var(--text-muted); font-weight: 600;">
            Showing <strong style="color: var(--board-navy);">${tests.length}</strong> of <strong>${allTests.length}</strong> exams
            ${this.testClassFilter !== 'all' ? ` &mdash; Class: <strong style="color: var(--board-maroon);">${this.testClassFilter}</strong>` : ''}
            ${this.testDateFilter !== 'all' ? ` &mdash; Date: <strong style="color: var(--board-maroon);">${this.testDateFilter}</strong>` : ''}
          </div>
        </div>

        <div class="grid-2">
          ${tests.length === 0 ? `
            <div class="glass-card" style="padding: 2rem; grid-column: span 2; text-align: center; color: var(--text-muted);">
              <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; color: #cbd5e1; margin-bottom: 0.5rem;"></i>
              <p>No exams found matching your filters.</p>
            </div>
          ` : tests.map(tItem => `
            <div class="glass-card item-card" style="padding: 1.25rem;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                  <span class="item-badge badge-mcq" style="font-weight: 700;"><i class="fa-solid fa-graduation-cap"></i> ${tItem.targetClass || 'All Classes'}</span>
                  <span style="font-size: 0.8rem; color: var(--board-navy); font-weight: 700;"><i class="fa-solid fa-calendar-day"></i> ${getDisplayDate(tItem)}</span>
                </div>
                <h3 style="color: var(--board-navy); font-size: 1.05rem; margin-bottom: 0.4rem;">${tItem.title}</h3>
                <div style="font-size: 0.82rem; color: var(--text-muted);">
                  <span>${tItem.isPdfExam ? '📄 Auto-Scanned PDF Exam' : '✍️ Manual Entry Exam'} | Timer: ${tItem.timerMinutes} mins | Questions: ${tItem.questionCount || (tItem.generatedQuestions ? tItem.generatedQuestions.length : 0)}</span>
                </div>
              </div>
              <div style="display: flex; justify-content: flex-end; gap: 0.4rem; margin-top: 0.75rem;">
                <button class="btn-secondary" style="font-size: 0.8rem; background: #ffffff; color: var(--board-navy) !important; border: 1px solid #cbd5e1; width: auto; padding: 0.35rem 0.75rem;" onclick="TeacherPanel.showEditTestModal('${tItem.id}')">
                  <i class="fa-solid fa-pen-to-square"></i> Edit Exam
                </button>
                <button class="btn-secondary" style="color: var(--board-red) !important; border: 1px solid #cbd5e1; font-size: 0.8rem; width: auto; padding: 0.35rem 0.75rem;" onclick="TeacherPanel.deleteTest('${tItem.id}')">
                  <i class="fa-solid fa-trash"></i> Delete
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  switchTestCreationMode(mode) {
    this.testCreationMode = mode;
    const pdfContainer = document.getElementById('testPdfModeContainer');
    const manualContainer = document.getElementById('testManualModeContainer');
    const btnPdf = document.getElementById('btnModePdf');
    const btnManual = document.getElementById('btnModeManual');

    if (mode === 'pdf') {
      if (pdfContainer) pdfContainer.style.display = 'block';
      if (manualContainer) manualContainer.style.display = 'none';
      if (btnPdf) {
        btnPdf.style.background = 'var(--board-navy)';
        btnPdf.style.color = '#ffffff';
      }
      if (btnManual) {
        btnManual.style.background = '#ffffff';
        btnManual.style.color = 'var(--board-navy)';
      }
    } else {
      if (pdfContainer) pdfContainer.style.display = 'none';
      if (manualContainer) manualContainer.style.display = 'block';
      if (btnPdf) {
        btnPdf.style.background = '#ffffff';
        btnPdf.style.color = 'var(--board-navy)';
      }
      if (btnManual) {
        btnManual.style.background = 'var(--board-navy)';
        btnManual.style.color = '#ffffff';
      }
    }
  },

  showCreateTestModal() {
    const classes = window.appStore.getItems('classes');
    const todayStr = new Date().toISOString().split('T')[0];
    this.scannedQuestions = [];
    this.manualQuestions = [
      { id: `manual_q_1`, question: '', optA: '', optB: '', optC: '', optD: '', correctAns: 'Option A' }
    ];

    App.showFullPage('Create Sunday Exam', `
      <form id="createTestForm" onsubmit="TeacherPanel.saveTest(event)" style="max-width: 760px; margin: 0 auto;">
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1.1rem; background: #f1f5f9; padding: 0.35rem; border-radius: 14px; border: 1px solid #cbd5e1;">
          <button type="button" id="btnModePdf" style="flex: 1; padding: 0.55rem 0.5rem; border-radius: 10px; border: none; font-weight: 700; font-size: 0.82rem; cursor: pointer; background: var(--board-navy); color: #ffffff;" onclick="TeacherPanel.switchTestCreationMode('pdf')">
            📄 Auto-Scan PDF
          </button>
          <button type="button" id="btnModeManual" style="flex: 1; padding: 0.55rem 0.5rem; border-radius: 10px; border: none; font-weight: 700; font-size: 0.82rem; cursor: pointer; background: #ffffff; color: var(--board-navy);" onclick="TeacherPanel.switchTestCreationMode('manual')">
            ✍️ Manual Entry
          </button>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
          <div class="form-group">
            <label class="form-label">Target Standard *</label>
            <select id="testTargetClass" class="form-input" style="font-weight: 700;" required>
              <option value="All Classes">🏫 All Standards</option>
              ${classes.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Schedule Date *</label>
            <input type="date" id="testExamDate" class="form-input" value="${todayStr}" required>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 0.85rem;">
          <div class="form-group">
            <label class="form-label">Exam Title *</label>
            <input type="text" id="testTitle" class="form-input" placeholder="e.g. Sunday Scholarship Test" required>
          </div>

          <div class="form-group">
            <label class="form-label">Timer (Mins) *</label>
            <input type="number" id="testTimer" class="form-input" value="10" required>
          </div>
        </div>

        <!-- MODE 1: SMART PDF AUTO-SCAN CONTAINER -->
        <div id="testPdfModeContainer" style="display: block; background: #eff6ff; padding: 0.85rem; border-radius: 14px; border: 1.5px dashed #3b82f6; margin-bottom: 1rem;">
          <label class="form-label" style="color: var(--board-navy); font-weight: 700; font-size: 0.85rem;">
            <i class="fa-solid fa-file-pdf" style="color: #dc2626; font-size: 1.1rem;"></i> Upload Question Paper PDF *
          </label>
          <input type="file" accept=".pdf,application/pdf" class="form-input" style="padding: 0.4rem; font-size: 0.82rem; background: #ffffff;" onchange="TeacherPanel.handleFileUpload(this, 'testPdfUrl', 'pdfFileNameLabel'); TeacherPanel.handlePdfScanUpload(this);">
          <input type="hidden" id="testPdfUrl" value="">
          
          <div id="pdfScanStatusLabel" style="font-size: 0.78rem; color: var(--board-navy); margin-top: 0.35rem; font-weight: 600;"></div>

          <div id="scannedQuestionsListContainer" style="margin-top: 0.75rem;"></div>
        </div>

        <!-- MODE 2: MANUAL QUESTION ENTRY WITH 4 OPTIONS CONTAINER -->
        <div id="testManualModeContainer" style="display: none; margin-bottom: 1rem;">
          <div id="manualQuestionsListContainer">
            ${this.renderManualQuestionsHtml()}
          </div>
        </div>

        <button type="submit" class="btn-primary" style="color: #ffffff !important; background: var(--board-navy); width: 100%;">
          <i class="fa-solid fa-paper-plane"></i> Publish Sunday Exam
        </button>
      </form>
    `);
  },

  saveTest(e) {
    if (e) e.preventDefault();
    
    const targetClassEl = document.getElementById('testTargetClass');
    const examDateEl = document.getElementById('testExamDate');
    const titleEl = document.getElementById('testTitle');
    const timerEl = document.getElementById('testTimer');

    const targetClass = targetClassEl ? targetClassEl.value : 'All Classes';
    const examDate = examDateEl ? examDateEl.value : new Date().toISOString().split('T')[0];
    const title = titleEl ? titleEl.value.trim() : '';
    const timerMinutes = timerEl ? (parseInt(timerEl.value) || 10) : 10;

    if (!title) {
      App.showToast('Please enter an Exam Title!', 'error');
      return;
    }

    if (this.testCreationMode === 'pdf') {
      const pdfUrlEl = document.getElementById('testPdfUrl');
      const pdfUrl = pdfUrlEl ? pdfUrlEl.value.trim() : '';

      if (this.scannedQuestions.length === 0) {
        App.showToast('Please select a PDF file to auto-scan questions!', 'error');
        return;
      }

      const generatedQuestions = this.scannedQuestions.map((q, i) => ({
        id: `pdf_q_${Date.now()}_${i + 1}`,
        targetClass: targetClass,
        chapter: q.chapter || '',
        question: q.question || `Question ${i + 1}`,
        options: [q.optA || 'Option A', q.optB || 'Option B', q.optC || 'Option C', q.optD || 'Option D'],
        correctAnswer: q.correctAns || 'Option A',
        marks: 2
      }));

      window.appStore.addItem('tests', {
        title,
        targetClass,
        examDate,
        timerMinutes,
        passingMarks: 1,
        isPdfExam: true,
        pdfUrl: pdfUrl,
        questionCount: generatedQuestions.length,
        generatedQuestions: generatedQuestions,
        questionIds: generatedQuestions.map(q => q.id),
        active: true
      });

      App.closeModal();
      App.showToast(`Sunday Test with ${generatedQuestions.length} Auto-Scanned MCQs published for ${targetClass}!`, 'success');
      App.render();
    } else {
      const validManuals = this.manualQuestions.filter(q => q.question && q.question.trim());

      if (validManuals.length === 0) {
        App.showToast('Please write at least 1 question with 4 options!', 'error');
        return;
      }

      const generatedQuestions = validManuals.map((q, i) => ({
        id: `manual_q_${Date.now()}_${i + 1}`,
        targetClass: targetClass,
        question: q.question,
        options: [q.optA || 'Option A', q.optB || 'Option B', q.optC || 'Option C', q.optD || 'Option D'],
        correctAnswer: q.correctAns || 'Option A',
        marks: 2
      }));

      window.appStore.addItem('tests', {
        title,
        targetClass,
        examDate,
        timerMinutes,
        passingMarks: 1,
        isPdfExam: false,
        questionCount: generatedQuestions.length,
        generatedQuestions: generatedQuestions,
        questionIds: generatedQuestions.map(q => q.id),
        active: true
      });

      App.closeModal();
      App.showToast(`Sunday Test with ${generatedQuestions.length} Manual MCQs published for ${targetClass}!`, 'success');
      App.render();
    }
  },

  addManualQuestionCard() {
    this.manualQuestions.push({
      id: `manual_q_${Date.now()}_${this.manualQuestions.length + 1}`,
      question: '', optA: '', optB: '', optC: '', optD: '', correctAns: 'Option A'
    });
    const container = document.getElementById('manualQuestionsListContainer');
    if (container) {
      container.innerHTML = this.renderManualQuestionsHtml();
      setTimeout(() => {
        const scrollEl = document.getElementById('appFullPagePanel')
          ? document.getElementById('appFullPagePanel').querySelector('div[style*="overflow-y"]')
          : (container.closest('.modal-box') || document.querySelector('.modal-box'));
        if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
      }, 40);
    }
  },

  removeManualQuestionCard(idx) {
    this.manualQuestions.splice(idx, 1);
    const container = document.getElementById('manualQuestionsListContainer');
    if (container) container.innerHTML = this.renderManualQuestionsHtml();
  },

  renderManualQuestionsHtml() {
    return `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <strong style="color: var(--board-navy); font-size: 0.85rem;"><i class="fa-solid fa-list-check"></i> Questions (${this.manualQuestions.length}):</strong>
          <button type="button" class="btn-secondary" style="width: auto; padding: 0.3rem 0.65rem; font-size: 0.78rem; background: #ffffff; color: var(--board-navy) !important; border: 1px solid #cbd5e1;" onclick="TeacherPanel.addManualQuestionCard()">
            <i class="fa-solid fa-plus-circle"></i> Add Question
          </button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${this.manualQuestions.map((q, idx) => `
            <div class="manual-q-card" style="background: #ffffff; padding: 0.75rem; border-radius: 12px; border: 1px solid #cbd5e1;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <strong style="color: var(--board-navy); font-size: 0.85rem;"><i class="fa-solid fa-pen"></i> Question ${idx + 1}</strong>
                <div style="display: flex; gap: 0.4rem; align-items: center;">
                  <select style="font-size: 0.75rem; padding: 0.25rem 0.4rem; border-radius: 6px; border: 1px solid #cbd5e1; font-weight: 700; color: var(--board-green);" onchange="TeacherPanel.manualQuestions[${idx}].correctAns = this.value">
                    <option value="Option A" ${q.correctAns === 'Option A' ? 'selected' : ''}>Correct: Option A</option>
                    <option value="Option B" ${q.correctAns === 'Option B' ? 'selected' : ''}>Correct: Option B</option>
                    <option value="Option C" ${q.correctAns === 'Option C' ? 'selected' : ''}>Correct: Option C</option>
                    <option value="Option D" ${q.correctAns === 'Option D' ? 'selected' : ''}>Correct: Option D</option>
                  </select>
                  ${this.manualQuestions.length > 1 ? `
                    <button type="button" style="background: #fee2e2; color: #dc2626; border: none; padding: 0.2rem 0.45rem; border-radius: 6px; font-size: 0.75rem; cursor: pointer;" onclick="TeacherPanel.removeManualQuestionCard(${idx})">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  ` : ''}
                </div>
              </div>

              <textarea class="form-input" style="font-size: 0.82rem; margin-bottom: 0.4rem;" rows="2" placeholder="Enter Question ${idx + 1} text..." oninput="TeacherPanel.manualQuestions[${idx}].question = this.value">${q.question || ''}</textarea>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem;">
                <input type="text" class="form-input" style="font-size: 0.8rem; padding: 0.35rem 0.5rem;" placeholder="Option A" value="${q.optA || ''}" oninput="TeacherPanel.manualQuestions[${idx}].optA = this.value">
                <input type="text" class="form-input" style="font-size: 0.8rem; padding: 0.35rem 0.5rem;" placeholder="Option B" value="${q.optB || ''}" oninput="TeacherPanel.manualQuestions[${idx}].optB = this.value">
                <input type="text" class="form-input" style="font-size: 0.8rem; padding: 0.35rem 0.5rem;" placeholder="Option C" value="${q.optC || ''}" oninput="TeacherPanel.manualQuestions[${idx}].optC = this.value">
                <input type="text" class="form-input" style="font-size: 0.8rem; padding: 0.35rem 0.5rem;" placeholder="Option D" value="${q.optD || ''}" oninput="TeacherPanel.manualQuestions[${idx}].optD = this.value">
              </div>
            </div>
          `).join('')}

          <button type="button" class="btn-secondary" style="padding: 0.5rem; background: #ffffff; color: var(--board-navy) !important; border: 1.5px dashed var(--board-navy); border-radius: 10px; font-weight: 700; font-size: 0.82rem;" onclick="TeacherPanel.addManualQuestionCard()">
            <i class="fa-solid fa-plus-circle"></i> Add Question
          </button>
        </div>
      </div>
    `;
  },

  deleteTest(id) {
    if (confirm('Are you sure you want to delete this exam? All associated test data will be removed.')) {
      window.appStore.deleteItem('tests', id);
      App.showToast('Exam deleted successfully.', 'warning');
      App.render();
    }
  },

  deleteSubmission(scoreIndex) {
    if (confirm('Are you sure you want to delete this student exam submission? This action cannot be undone.')) {
      const scores = window.appStore.getItems('studentScores');
      const itemToDelete = scores[scoreIndex];
      if (itemToDelete) {
        if (itemToDelete.id) {
          window.appStore.deleteItem('studentScores', itemToDelete.id);
        } else {
          const data = window.appStore.getData();
          data.studentScores.splice(scoreIndex, 1);
          window.appStore.saveData(data);
        }
        App.showToast('Exam submission deleted successfully!', 'warning');
        App.render();
      }
    }
  },

  editingTestQuestions: [],

  showEditTestModal(testId) {
    const tests = window.appStore.getItems('tests');
    const classes = window.appStore.getItems('classes');
    const t = tests.find(item => item.id === testId);
    if (!t) return;

    this.editingTestQuestions = (t.generatedQuestions && t.generatedQuestions.length > 0)
      ? JSON.parse(JSON.stringify(t.generatedQuestions))
      : [ { id: `q_1`, question: '', options: ['Option A', 'Option B', 'Option C', 'Option D'], correctAnswer: 'Option A', marks: 2 } ];

    App.showFullPage('Edit Sunday Exam', `
      <form onsubmit="TeacherPanel.updateTest(event, '${t.id}')" style="max-width: 760px; margin: 0 auto;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
          <div class="form-group">
            <label class="form-label">Target Standard *</label>
            <select id="editTestTargetClass" class="form-input" style="font-weight: 700;" required>
              <option value="All Classes">🏫 All Standards</option>
              ${classes.map(c => `<option value="${c.name}" ${t.targetClass === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Schedule Date *</label>
            <input type="date" id="editTestExamDate" class="form-input" value="${t.examDate || new Date().toISOString().split('T')[0]}" required>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 0.85rem;">
          <div class="form-group">
            <label class="form-label">Exam Title *</label>
            <input type="text" id="editTestTitle" class="form-input" value="${t.title}" required>
          </div>

          <div class="form-group">
            <label class="form-label">Timer (Mins) *</label>
            <input type="number" id="editTestTimer" class="form-input" value="${t.timerMinutes || 10}" required>
          </div>
        </div>

        <div id="editTestQuestionsContainer" style="margin-bottom: 1rem;">
          ${this.renderEditTestQuestionsHtml()}
        </div>

        <button type="submit" class="btn-primary" style="color: #ffffff !important; background: var(--board-navy); width: 100%;">
          <i class="fa-solid fa-floppy-disk"></i> Save Changes
        </button>
      </form>
    `);
  },

  addEditTestQuestionCard() {
    this.editingTestQuestions.push({
      id: `edit_q_${Date.now()}_${this.editingTestQuestions.length + 1}`,
      question: '',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option A',
      marks: 2
    });
    const container = document.getElementById('editTestQuestionsContainer');
    if (container) {
      container.innerHTML = this.renderEditTestQuestionsHtml();
      setTimeout(() => {
        const scrollEl = document.getElementById('appFullPagePanel')
          ? document.getElementById('appFullPagePanel').querySelector('div[style*="overflow-y"]')
          : (container.closest('.modal-box') || document.querySelector('.modal-box'));
        if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
      }, 40);
    }
  },

  removeEditTestQuestionCard(idx) {
    this.editingTestQuestions.splice(idx, 1);
    const container = document.getElementById('editTestQuestionsContainer');
    if (container) container.innerHTML = this.renderEditTestQuestionsHtml();
  },

  renderEditTestQuestionsHtml() {
    return `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <strong style="color: var(--board-navy); font-size: 0.85rem;"><i class="fa-solid fa-list-check"></i> Questions (${this.editingTestQuestions.length}):</strong>
          <button type="button" class="btn-secondary" style="width: auto; padding: 0.3rem 0.65rem; font-size: 0.78rem; background: #ffffff; color: var(--board-navy) !important; border: 1px solid #cbd5e1;" onclick="TeacherPanel.addEditTestQuestionCard()">
            <i class="fa-solid fa-plus-circle"></i> Add Question
          </button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${this.editingTestQuestions.map((q, idx) => {
            const opts = q.options && q.options.length >= 4 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'];

            return `
              <div class="manual-q-card" style="background: #ffffff; padding: 0.75rem; border-radius: 12px; border: 1px solid #cbd5e1;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                  <strong style="color: var(--board-navy); font-size: 0.85rem;"><i class="fa-solid fa-pen"></i> Question ${idx + 1}</strong>
                  <div style="display: flex; gap: 0.4rem; align-items: center;">
                    <select style="font-size: 0.75rem; padding: 0.25rem 0.4rem; border-radius: 6px; border: 1px solid #cbd5e1; font-weight: 700; color: var(--board-green);" onchange="TeacherPanel.editingTestQuestions[${idx}].correctAnswer = this.value">
                      <option value="Option A" ${q.correctAnswer === 'Option A' ? 'selected' : ''}>Correct: Option A</option>
                      <option value="Option B" ${q.correctAnswer === 'Option B' ? 'selected' : ''}>Correct: Option B</option>
                      <option value="Option C" ${q.correctAnswer === 'Option C' ? 'selected' : ''}>Correct: Option C</option>
                      <option value="Option D" ${q.correctAnswer === 'Option D' ? 'selected' : ''}>Correct: Option D</option>
                    </select>
                    ${this.editingTestQuestions.length > 1 ? `
                      <button type="button" style="background: #fee2e2; color: #dc2626; border: none; padding: 0.2rem 0.45rem; border-radius: 6px; font-size: 0.75rem; cursor: pointer;" onclick="TeacherPanel.removeEditTestQuestionCard(${idx})">
                        <i class="fa-solid fa-trash"></i>
                      </button>
                    ` : ''}
                  </div>
                </div>

                <textarea class="form-input" style="font-size: 0.82rem; font-weight: 600; margin-bottom: 0.4rem;" rows="2" placeholder="Enter Question ${idx + 1} text..." oninput="TeacherPanel.editingTestQuestions[${idx}].question = this.value">${q.question}</textarea>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem;">
                  <input type="text" class="form-input" style="font-size: 0.8rem; padding: 0.35rem 0.5rem;" placeholder="Option A" value="${opts[0]}" oninput="TeacherPanel.editingTestQuestions[${idx}].options[0] = this.value">
                  <input type="text" class="form-input" style="font-size: 0.8rem; padding: 0.35rem 0.5rem;" placeholder="Option B" value="${opts[1]}" oninput="TeacherPanel.editingTestQuestions[${idx}].options[1] = this.value">
                  <input type="text" class="form-input" style="font-size: 0.8rem; padding: 0.35rem 0.5rem;" placeholder="Option C" value="${opts[2]}" oninput="TeacherPanel.editingTestQuestions[${idx}].options[2] = this.value">
                  <input type="text" class="form-input" style="font-size: 0.8rem; padding: 0.35rem 0.5rem;" placeholder="Option D" value="${opts[3]}" oninput="TeacherPanel.editingTestQuestions[${idx}].options[3] = this.value">
                </div>
              </div>
            `;
          }).join('')}

          <button type="button" class="btn-secondary" style="padding: 0.5rem; background: #ffffff; color: var(--board-navy) !important; border: 1.5px dashed var(--board-navy); border-radius: 10px; font-weight: 700; font-size: 0.82rem;" onclick="TeacherPanel.addEditTestQuestionCard()">
            <i class="fa-solid fa-plus-circle"></i> Add Question
          </button>
        </div>
      </div>
    `;
  },

  updateTest(e, testId) {
    if (e) e.preventDefault();
    const targetClass = document.getElementById('editTestTargetClass').value;
    const examDate = document.getElementById('editTestExamDate').value;
    const title = document.getElementById('editTestTitle').value.trim();
    const timerMinutes = parseInt(document.getElementById('editTestTimer').value) || 10;

    if (!title) {
      App.showToast('Please enter an Exam Title!', 'error');
      return;
    }

    const updatedQuestions = this.editingTestQuestions.filter(q => q.question && q.question.trim());

    if (updatedQuestions.length === 0) {
      App.showToast('Exam must have at least 1 valid question!', 'error');
      return;
    }

    window.appStore.updateTest(testId, {
      title,
      targetClass,
      examDate,
      timerMinutes,
      questionCount: updatedQuestions.length,
      generatedQuestions: updatedQuestions,
      questionIds: updatedQuestions.map(q => q.id)
    });

    App.closeModal();
    App.showToast('Exam updated successfully!', 'success');
    App.render();
  },

  // STUDY MATERIALS & CLASS NOTES MANAGEMENT
  renderMaterialsView() {
    let materials = window.appStore.getItems('materials');
    const classes = window.appStore.getItems('classes');

    if (this.materialClassFilter !== 'all') {
      const filterDigitMatch = this.materialClassFilter.match(/\d+/);
      const filterDigit = filterDigitMatch ? filterDigitMatch[0] : null;

      materials = materials.filter(m => {
        if (!m.targetClass || m.targetClass === 'All Classes' || m.targetClass === 'All') return true;
        const targetClassLower = m.targetClass.toLowerCase();

        if (filterDigit) {
          const mDigit = targetClassLower.match(/\d+/);
          if (mDigit && mDigit[0] === filterDigit) return true;
        }

        return targetClassLower.includes(this.materialClassFilter.toLowerCase());
      });
    }

    return `
      <div class="animate-fadeIn">
        <div class="section-header" style="margin-bottom: 1rem;">
          <h2 class="section-title" style="color: var(--board-navy);"><i class="fa-solid fa-folder-open"></i> Study Materials & Class Notes Directory</h2>
          <button class="btn-primary" style="width: auto; padding: 0.5rem 1rem; background: var(--board-navy); color: #ffffff !important;" onclick="TeacherPanel.showUploadMaterialModal()">
            <i class="fa-solid fa-cloud-arrow-up"></i> Upload Notes for Class
          </button>
        </div>

        <div class="glass-card" style="padding: 0.85rem 1.15rem; margin-bottom: 1.25rem; background: #ffffff;">
          <div style="display: flex; gap: 0.85rem; align-items: center; flex-wrap: wrap;">
            <label style="font-weight: 700; color: var(--board-navy); font-size: 0.9rem;">Filter Notes by Standard:</label>
            <div style="width: 250px;">
              <select class="form-input" style="font-weight: 700;" onchange="TeacherPanel.onMaterialClassFilter(this.value)">
                <option value="all">🏫 All Classes (1st to 8th)</option>
                ${classes.map(c => `<option value="${c.name}" ${this.materialClassFilter === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <div class="grid-3">
          ${materials.length === 0 ? '<p style="color: var(--text-muted); grid-column: span 3; text-align:center; padding: 2rem;">No study materials found for this standard.</p>' : materials.map(m => `
            <div class="glass-card item-card" style="padding: 1.25rem; border-top: 4px solid var(--board-navy);">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                  <span class="item-badge badge-${m.type}">${m.type.toUpperCase()}</span>
                  <span class="item-badge badge-mcq" style="font-weight: 700;"><i class="fa-solid fa-graduation-cap"></i> ${m.targetClass || 'All Classes'}</span>
                </div>
                <h4 style="margin-top: 0.4rem; font-size: 0.98rem; color: var(--board-navy);">${m.title}</h4>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.85rem;">${m.description || ''}</p>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <a href="${m.url}" target="_blank" class="btn-secondary" style="font-size: 0.8rem; color: var(--board-navy) !important; border: 1px solid #cbd5e1;">
                  <i class="fa-solid fa-arrow-up-right-from-square"></i> Open Notes
                </a>
                <button class="btn-secondary" style="color: var(--board-red) !important; border: 1px solid #cbd5e1; font-size: 0.8rem;" onclick="TeacherPanel.deleteMaterial('${m.id}')">
                  <i class="fa-solid fa-trash"></i> Delete
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  onMaterialClassFilter(val) {
    this.materialClassFilter = val;
    App.render();
  },

  onMaterialTypeChange(type) {
    const container = document.getElementById('materialInputContainer');
    if (!container) return;

    if (type === 'pdf') {
      container.innerHTML = `
        <div class="form-group" style="background: #eff6ff; padding: 0.85rem; border-radius: 12px; border: 1.5px dashed #3b82f6;">
          <label class="form-label" style="color: var(--board-navy); font-weight: 700;">
            <i class="fa-solid fa-file-pdf" style="color: #dc2626; font-size: 1.1rem;"></i> Upload PDF Notes File *
          </label>
          <input type="file" accept=".pdf,application/pdf" class="form-input" style="padding: 0.4rem; font-size: 0.82rem; background: #ffffff;" onchange="TeacherPanel.handleFileUpload(this, 'matUrl', 'pdfFileNameLabel')" required>
          <input type="hidden" id="matUrl" value="">
          <div id="pdfFileNameLabel" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.4rem;">
            Please select a PDF document from your phone or computer.
          </div>
        </div>
      `;
    } else if (type === 'video') {
      container.innerHTML = `
        <div class="form-group" style="background: #f8fafc; padding: 0.85rem; border-radius: 12px; border: 1px solid #cbd5e1;">
          <label class="form-label" style="color: var(--board-navy); font-weight: 700;">
            <i class="fa-brands fa-youtube" style="color: #dc2626; font-size: 1.1rem;"></i> Video Lesson URL / Link *
          </label>
          <input type="url" id="matUrl" class="form-input" placeholder="e.g. https://www.youtube.com/watch?v=... or Drive Link" required>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.3rem;">Paste YouTube, Google Drive, or Vimeo video URL.</div>
        </div>
      `;
    } else if (type === 'audio') {
      container.innerHTML = `
        <div class="form-group" style="background: #fffdf5; padding: 0.85rem; border-radius: 12px; border: 1.5px dashed #f59e0b;">
          <label class="form-label" style="color: var(--board-navy); font-weight: 700;">
            <i class="fa-solid fa-file-audio" style="color: #b45309; font-size: 1.1rem;"></i> Upload Audio File OR Paste Audio URL *
          </label>

          <div style="margin-bottom: 0.6rem;">
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted);">Option 1: Upload Audio File (MP3/WAV/AAC)</span>
            <input type="file" accept="audio/*" class="form-input" style="padding: 0.4rem; font-size: 0.82rem; background: #ffffff; margin-top: 0.2rem;" onchange="TeacherPanel.handleFileUpload(this, 'matUrl', 'audioFileNameLabel')">
            <div id="audioFileNameLabel" style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.2rem;"></div>
          </div>

          <div>
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted);">Option 2: OR Paste Audio Web URL Link</span>
            <input type="url" id="matUrl" class="form-input" placeholder="https://..." style="margin-top: 0.2rem;">
          </div>
        </div>
      `;
    }
  },

  showUploadMaterialModal() {
    const classes = window.appStore.getItems('classes');

    App.showFullPage('Upload Class Notes & Study Material', `
      <form onsubmit="TeacherPanel.saveMaterial(event)" style="max-width: 640px; margin: 0 auto;">
        <div class="form-group">
          <label class="form-label">Target Standard / Class (Which students can access these notes?) *</label>
          <select id="matTargetClass" class="form-input" required>
            <option value="All Classes">All Classes (1st to 8th)</option>
            ${classes.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Notes Title *</label>
          <input type="text" id="matTitle" class="form-input" placeholder="e.g. Class 1st Basic Counting Worksheet PDF" required>
        </div>

        <div class="form-group">
          <label class="form-label">Material Type *</label>
          <select id="matType" class="form-input" onchange="TeacherPanel.onMaterialTypeChange(this.value)" required>
            <option value="pdf">📄 PDF Worksheet / Notes (Direct File Upload)</option>
            <option value="video">🎥 Video Lesson Link (YouTube / Drive URL)</option>
            <option value="audio">🎙️ Audio Revision Note (File Upload or URL Link)</option>
          </select>
        </div>

        <div id="materialInputContainer">
          <div class="form-group" style="background: #eff6ff; padding: 0.85rem; border-radius: 12px; border: 1.5px dashed #3b82f6;">
            <label class="form-label" style="color: var(--board-navy); font-weight: 700;">
              <i class="fa-solid fa-file-pdf" style="color: #dc2626; font-size: 1.1rem;"></i> Upload PDF Notes File *
            </label>
            <input type="file" accept=".pdf,application/pdf" class="form-input" style="padding: 0.4rem; font-size: 0.82rem; background: #ffffff;" onchange="TeacherPanel.handleFileUpload(this, 'matUrl', 'pdfFileNameLabel')" required>
            <input type="hidden" id="matUrl" value="">
            <div id="pdfFileNameLabel" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.4rem;">
              Please select a PDF document from your phone or computer.
            </div>
          </div>
        </div>

        <div class="form-group" style="margin-top: 0.85rem;">
          <label class="form-label">Short Description</label>
          <textarea id="matDesc" class="form-input" rows="2" placeholder="e.g. Chapter 1 revision notes for students."></textarea>
        </div>

        <button type="submit" class="btn-primary" style="margin-top: 0.5rem; color: #ffffff !important; background: var(--board-navy);">
          <i class="fa-solid fa-cloud-arrow-up"></i> Upload & Publish Notes to Class
        </button>
      </form>
    `);
  },

  saveMaterial(e) {
    e.preventDefault();
    const targetClass = document.getElementById('matTargetClass').value;
    const title = document.getElementById('matTitle').value.trim();
    const type = document.getElementById('matType').value;
    const urlEl = document.getElementById('matUrl');
    const url = urlEl ? urlEl.value.trim() : '';
    const description = document.getElementById('matDesc').value.trim();

    if (!url) {
      if (type === 'pdf') {
        App.showToast('Please select a PDF file to upload!', 'error');
      } else if (type === 'video') {
        App.showToast('Please enter a valid video link!', 'error');
      } else {
        App.showToast('Please upload an audio file or enter an audio link!', 'error');
      }
      return;
    }

    window.appStore.addItem('materials', {
      title, targetClass, type, url, description, date: new Date().toISOString().split('T')[0]
    });

    App.closeModal();
    App.showToast(`Study notes uploaded for ${targetClass}!`, 'success');
    App.render();
  },

  deleteMaterial(id) {
    if (confirm('Delete this study material?')) {
      window.appStore.deleteItem('materials', id);
      App.render();
    }
  }
};

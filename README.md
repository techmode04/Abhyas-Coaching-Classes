# 🏫 Abhyas Coaching Classes - Raimoha (Web App & PWA)

A modern, responsive, and mobile-friendly **Coaching Institute Management & Online Examination Platform** built for **Abhyas Coaching Classes, Raimoha**.

![Abhyas Coaching Banner](./logo.png)

---

## 🌟 Key Features

### 👨‍🏫 Teacher Management Portal
- **Student Directory & Login Cards**: Add, edit, manage student records, generate QR login cards, and reset credentials.
- **Online Exam Management**: Create Sunday Special exams (MCQ and PDF auto-scanned papers) with timers and standard target filtering.
- **Question Pool Directory**: Add questions to class-wise question banks with instant search, standard filters, and date tracking.
- **Study Notes & Materials**: Upload PDF worksheets, practice materials, and chapter notes directly stored in **Google Drive**.
- **Exam Results & Reports**: View live student submissions, percentage scores, pass/fail badges, and detailed answer breakdowns.

### 🎓 Student Learning Portal
- **Interactive Practice Pool**: Attempt class-specific MCQ quizzes with real-time answer selection, accuracy percentages, and correct/wrong breakdown.
- **Sunday Special Exams**: Take scheduled online exams with timer countdowns and single-attempt enforcement.
- **My Results**: Track historical performance, marks scored, and pass/fail statuses.
- **Study Materials**: Download class worksheets and notes.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom Glassmorphism Board Theme), JavaScript (ES6+)
- **Progressive Web App (PWA)**: Mobile installable with offline support (`manifest.webmanifest`, Service Worker)
- **Backend & Database**: **Google Sheets API** (via **Google Apps Script `Code.gs`**)
- **File & Photo Storage**: **Google Drive** (`Abhyas Coaching Uploads` folder)
- **PDF Processing**: PDF.js for automatic PDF question scanning

---

## ⚙️ Google Sheets & Apps Script Setup

1. Create a blank Google Sheet named **"Abhyas Coaching Database"**.
2. Go to **Extensions ➔ Apps Script** and paste the code from [`Code.gs`](./Code.gs).
3. Click **Deploy ➔ New deployment ➔ Web app**:
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
4. Copy the Web App URL and set `GOOGLE_SHEET_SCRIPT_URL` in [`js/google-sheet-config.js`](./js/google-sheet-config.js).

---

## 👤 Developer & Maintainer

Designed & Developed by **[sachindhisle04](https://github.com/techmode04)**

© 2026 Abhyas Coaching Classes, Raimoha. All Rights Reserved.

/* ==========================================================================
   Abhyas Coaching Classes - Raimoha
   Google Sheets & Google Drive Backend Storage Engine
   ========================================================================== */

// --------------------------------------------------------------------------
// 📌 GOOGLE APPS SCRIPT WEB APP URL (Paste your Web App URL here after deploying)
// --------------------------------------------------------------------------
const GOOGLE_SHEET_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzR_GHZkxY4lkKrGQNqUHxgk0XGVMNpWyWyBZoILjbCoQlXPJ6ZH7BjywaATN-BYTol-Q/exec";

const COACHING_INFO = {
  name: "Abhyas Coaching Classes - Raimoha",
  tagline: "Secure Your Child's Bright Future Today!",
  address: "Location: Dhakne Building, Raimoha",
  contacts: ["9823471972", "9405008260"]
};

const HARDCODED_TEACHERS = [
  {
    id: "tch_101",
    username: "sachindhisle",
    email: "sachindhisle@abhyas.com",
    password: "sachin123",
    name: "Sachin Dhisle",
    designation: "Head Teacher",
    subject: "Mathematics & Reasoning",
    photoUrl: "https://ui-avatars.com/api/?name=Sachin+Dhisle&background=0d2b6b&color=fff&bold=true",
    role: "teacher"
  },
  {
    id: "tch_102",
    username: "amardhisle",
    email: "amardhisle@abhyas.com",
    password: "amar123",
    name: "Amar Dhisle",
    designation: "Senior Teacher",
    subject: "Science & English",
    photoUrl: "https://ui-avatars.com/api/?name=Amar+Dhisle&background=0d2b6b&color=fff&bold=true",
    role: "teacher"
  }
];

const DEFAULT_CLASSES = [
  { id: "c1", name: "Class 1st" },
  { id: "c2", name: "Class 2nd" },
  { id: "c3", name: "Class 3rd" },
  { id: "c4", name: "Class 4th" },
  { id: "c5", name: "Class 5th" },
  { id: "c6", name: "Class 6th" },
  { id: "c7", name: "Class 7th" },
  { id: "c8", name: "Class 8th" }
];

const DEFAULT_STUDENTS = [];

const DEFAULT_INITIAL_DATA = {
  teachers: HARDCODED_TEACHERS,
  students: [],
  studentCounter: 0,
  classes: DEFAULT_CLASSES,
  batches: [
    { id: "b1", name: "Morning Batch" },
    { id: "b2", name: "Evening Batch" },
    { id: "b3", name: "Afternoon Batch" }
  ],
  questions: [],
  materials: [],
  tests: [],
  studentScores: [],
  attendance: [],
  announcements: []
};

// --------------------------------------------------------------------------
// GOOGLE DRIVE FILE UPLOADER & DELETER HELPERS
// --------------------------------------------------------------------------
async function uploadFileToGoogleDrive(file, folderType = "photos", targetClass = "") {
  if (!file) return Promise.reject("No file provided");

  if (GOOGLE_SHEET_SCRIPT_URL && GOOGLE_SHEET_SCRIPT_URL !== "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL") {
    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      const payload = {
        action: "uploadFileDrive",
        fileName: file.name,
        mimeType: file.type,
        fileData: base64Data,
        category: folderType,
        targetClass: targetClass
      };

      const response = await fetch(GOOGLE_SHEET_SCRIPT_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });

      const resJson = await response.json();
      if (resJson.success && resJson.url) {
        console.log("✅ File uploaded to Google Drive:", resJson.url);
        return resJson.url;
      }
    } catch (err) {
      console.warn("⚠️ Google Drive Upload failed, using DataURL fallback:", err);
    }
  }

  // Fallback DataURL reader
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

async function deleteFileFromGoogleDrive(fileUrlOrId) {
  if (!fileUrlOrId || !GOOGLE_SHEET_SCRIPT_URL || GOOGLE_SHEET_SCRIPT_URL === "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL") return;
  try {
    fetch(GOOGLE_SHEET_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "deleteFileDrive", fileUrl: fileUrlOrId })
    });
    console.log("🗑️ Delete request sent to Drive for file:", fileUrlOrId);
  } catch (e) {
    console.warn("⚠️ Error deleting file from Drive:", e);
  }
}

window.uploadFileToGoogleDrive = uploadFileToGoogleDrive;
window.deleteFileFromGoogleDrive = deleteFileFromGoogleDrive;

// --------------------------------------------------------------------------
// GOOGLE SHEETS STORE ENGINE CLASS
// --------------------------------------------------------------------------
class StoreEngine {
  constructor() {
    this.key = 'abhyas_raimoha_db';
    // Clear any stale legacy localStorage database
    try {
      localStorage.removeItem(this.key);
    } catch(e) {}

    this.memoryData = JSON.parse(JSON.stringify(DEFAULT_INITIAL_DATA));
    this.cleanUnsplashUrls();
    this.initStore();
  }

  cleanUnsplashUrls() {
    ['teachers', 'students'].forEach(coll => {
      if (this.memoryData[coll] && Array.isArray(this.memoryData[coll])) {
        this.memoryData[coll].forEach(item => {
          if (item.photoUrl && item.photoUrl.includes('unsplash')) {
            item.photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'User')}&background=0d2b6b&color=fff&bold=true`;
          }
        });
      }
    });
  }

  async initStore() {
    if (GOOGLE_SHEET_SCRIPT_URL && GOOGLE_SHEET_SCRIPT_URL !== "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL") {
      try {
        // Cache-busting URL parameter to guarantee 100% fresh live data from Google Sheets
        const response = await fetch(`${GOOGLE_SHEET_SCRIPT_URL}?action=getInitialData&t=${Date.now()}`);
        const resJson = await response.json();
        if (resJson && resJson.success) {
          this.memoryData.teachers = (resJson.teachers && resJson.teachers.length > 0) ? resJson.teachers : HARDCODED_TEACHERS;
          this.memoryData.students = resJson.students || [];
          this.memoryData.questions = resJson.questions || [];
          this.memoryData.materials = resJson.materials || [];
          this.memoryData.tests = resJson.tests || [];
          this.memoryData.studentScores = resJson.studentScores || [];
          
          this.cleanUnsplashUrls();

          if (window.App && typeof window.App.render === 'function') {
            window.App.render();
          }
        }
      } catch (e) {
        console.warn("⚠️ Google Sheet API fetch error:", e);
      }
    }
  }

  getData() {
    return this.memoryData;
  }

  saveData(data) {
    this.memoryData = data;

    if (GOOGLE_SHEET_SCRIPT_URL && GOOGLE_SHEET_SCRIPT_URL !== "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL") {
      try {
        const payloadStr = JSON.stringify({ action: "saveFullState", data: data });
        fetch(GOOGLE_SHEET_SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: payloadStr
        }).catch(e => {
          // Backup GET sync
          const getUrl = `${GOOGLE_SHEET_SCRIPT_URL}?action=saveFullState&data=${encodeURIComponent(payloadStr)}`;
          fetch(getUrl, { mode: "no-cors" });
        });
      } catch (e) {
        console.warn("⚠️ Google Sheet Save State Error:", e);
      }
    }
  }

  getItems(collection) {
    return this.memoryData[collection] || [];
  }

  addItem(collection, item) {
    if (!this.memoryData[collection]) this.memoryData[collection] = [];
    item.id = item.id || 'id_' + Date.now();
    this.memoryData[collection].push(item);
    this.saveData(this.memoryData);
    return item;
  }

  deleteItem(collection, id) {
    if (!this.memoryData[collection]) return;
    const item = this.memoryData[collection].find(i => i.id === id);
    if (item) {
      const fileUrl = item.url || item.pdfUrl || item.photoUrl;
      if (fileUrl && (fileUrl.includes("drive.google.com") || fileUrl.includes("googleusercontent.com"))) {
        deleteFileFromGoogleDrive(fileUrl);
      }
    }
    this.memoryData[collection] = this.memoryData[collection].filter(i => i.id !== id);
    this.saveData(this.memoryData);
  }

  updateTest(id, updatedData) {
    if (!this.memoryData.tests) return null;
    const index = this.memoryData.tests.findIndex(t => t.id === id);
    if (index !== -1) {
      this.memoryData.tests[index] = { ...this.memoryData.tests[index], ...updatedData };
      this.saveData(this.memoryData);
      return this.memoryData.tests[index];
    }
    return null;
  }

  requestPasswordReset(inputVal) {
    if (!this.memoryData.students) return { success: false, message: 'No student records found.' };

    const q = inputVal.trim().toLowerCase();
    const student = this.memoryData.students.find(s => 
      s.studentId.toLowerCase() === q ||
      (s.email && s.email.toLowerCase() === q) ||
      (s.parentMobile && s.parentMobile.includes(q)) ||
      (s.name && s.name.toLowerCase().includes(q))
    );

    if (student) {
      student.passwordResetRequested = true;
      student.resetRequestedAt = new Date().toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      this.saveData(this.memoryData);
      return { success: true, student: student };
    }

    return { success: false, message: 'Student ID / Mobile number not found.' };
  }

  resetStudentPassword(studentId, newPassword) {
    const student = this.memoryData.students.find(s => s.studentId === studentId || s.id === studentId);
    if (student) {
      let firstName = "Student";
      if (student.name && student.name.trim()) {
        firstName = student.name.trim().split(' ')[0];
        firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
      }
      const randomNum = Math.floor(100 + Math.random() * 900);
      student.password = newPassword || `${firstName}@2026#${randomNum}`;
      student.passwordResetRequested = false;
      student.resetRequestedAt = null;
      this.saveData(this.memoryData);
      return student.password;
    }
    return null;
  }

  addTeacher(teacherData) {
    if (!this.memoryData.teachers) this.memoryData.teachers = [];

    const newTeacher = {
      id: 'tch_' + Date.now(),
      name: teacherData.name,
      username: teacherData.username.trim().toLowerCase(),
      email: teacherData.email || `${teacherData.username.trim().toLowerCase()}@abhyas.com`,
      password: teacherData.password,
      designation: teacherData.designation || 'Teacher',
      subject: teacherData.subject || 'All Subjects',
      photoUrl: teacherData.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(teacherData.name || 'Teacher')}&background=0d2b6b&color=fff&bold=true`,
      role: 'teacher'
    };

    this.memoryData.teachers.push(newTeacher);
    this.saveData(this.memoryData);
    return newTeacher;
  }

  updateTeacher(id, updatedData) {
    if (!this.memoryData.teachers) return null;
    const index = this.memoryData.teachers.findIndex(t => t.id === id || t.username === id);
    if (index !== -1) {
      this.memoryData.teachers[index] = { ...this.memoryData.teachers[index], ...updatedData };
      this.saveData(this.memoryData);
      return this.memoryData.teachers[index];
    }
    return null;
  }

  deleteTeacher(id) {
    if (!this.memoryData.teachers) return;
    const teacher = this.memoryData.teachers.find(t => t.id === id || t.username === id);
    if (teacher && teacher.photoUrl && (teacher.photoUrl.includes("drive.google.com") || teacher.photoUrl.includes("googleusercontent.com"))) {
      deleteFileFromGoogleDrive(teacher.photoUrl);
    }
    this.memoryData.teachers = this.memoryData.teachers.filter(t => t.id !== id && t.username !== id);
    this.saveData(this.memoryData);
  }

  generateNextStudentId(fullName) {
    this.memoryData.studentCounter = (this.memoryData.studentCounter || 4) + 1;

    let prefix = "ABH";
    if (fullName && fullName.trim()) {
      const firstName = fullName.trim().split(' ')[0];
      const cleanLetters = firstName.replace(/[^a-zA-Z]/g, '').toUpperCase();
      if (cleanLetters.length >= 3) {
        prefix = cleanLetters.substring(0, 3);
      } else if (cleanLetters.length > 0) {
        prefix = (cleanLetters + "ABH").substring(0, 3);
      }
    }

    const year = new Date().getFullYear().toString().substring(2);
    const seq = this.memoryData.studentCounter.toString().padStart(3, '0');
    return `${prefix}${year}${seq}`;
  }

  createStudent(studentData) {
    if (!this.memoryData.students) this.memoryData.students = [];

    const studentId = this.generateNextStudentId(studentData.name);
    
    let firstName = "Student";
    if (studentData.name && studentData.name.trim()) {
      firstName = studentData.name.trim().split(' ')[0];
      firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    }

    const randomNum = Math.floor(100 + Math.random() * 900);
    const autoPassword = studentData.password || `${firstName}@2026#${randomNum}`;

    const newStudent = {
      id: studentId,
      studentId: studentId,
      name: studentData.name,
      email: `${studentId.toLowerCase()}@abhyas.com`,
      password: autoPassword,
      class: studentData.class || "Class 1st",
      batch: studentData.batch || "Morning Batch",
      schoolName: studentData.schoolName || "",
      village: studentData.village || "Raimoha",
      parentMobile: studentData.parentMobile || "",
      studentMobile: studentData.studentMobile || "",
      admissionDate: studentData.admissionDate || new Date().toISOString().split('T')[0],
      photoUrl: studentData.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentData.name || 'Student')}&background=0d2b6b&color=fff&bold=true`,
      status: "Active",
      role: "student"
    };

    this.memoryData.students.push(newStudent);
    this.saveData(this.memoryData);
    return newStudent;
  }

  updateStudent(studentId, updatedData) {
    if (!this.memoryData.students) return null;
    const index = this.memoryData.students.findIndex(s => s.studentId === studentId || s.id === studentId);
    if (index !== -1) {
      this.memoryData.students[index] = { ...this.memoryData.students[index], ...updatedData };
      this.saveData(this.memoryData);
      return this.memoryData.students[index];
    }
    return null;
  }

  toggleStudentStatus(studentId) {
    if (!this.memoryData.students) return;
    const student = this.memoryData.students.find(s => s.studentId === studentId || s.id === studentId);
    if (student) {
      student.status = student.status === "Active" ? "Disabled" : "Active";
      this.saveData(this.memoryData);
      return student.status;
    }
    return null;
  }

  deleteStudent(studentId) {
    if (!this.memoryData.students) return;
    const student = this.memoryData.students.find(s => s.studentId === studentId || s.id === studentId);
    if (student && student.photoUrl && (student.photoUrl.includes("drive.google.com") || student.photoUrl.includes("googleusercontent.com"))) {
      deleteFileFromGoogleDrive(student.photoUrl);
    }
    this.memoryData.students = this.memoryData.students.filter(s => s.studentId !== studentId && s.id !== studentId);
    this.saveData(this.memoryData);
  }
}

window.appStore = new StoreEngine();
window.COACHING_INFO = COACHING_INFO;
window.HARDCODED_TEACHERS = HARDCODED_TEACHERS;

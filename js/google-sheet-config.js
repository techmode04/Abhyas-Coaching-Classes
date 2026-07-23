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
    photoUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80",
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
    photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
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
// GOOGLE DRIVE FILE UPLOADER HELPER (Base64 -> Apps Script -> Drive URL)
// --------------------------------------------------------------------------
async function uploadFileToGoogleDrive(file, folderType = "photos") {
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
        fileData: base64Data
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

window.uploadFileToGoogleDrive = uploadFileToGoogleDrive;

// --------------------------------------------------------------------------
// GOOGLE SHEETS STORE ENGINE CLASS
// --------------------------------------------------------------------------
class StoreEngine {
  constructor() {
    this.key = 'abhyas_raimoha_db';
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(this.key));
    } catch(e) {
      saved = null;
    }
    this.memoryData = saved || JSON.parse(JSON.stringify(DEFAULT_INITIAL_DATA));
    this.initStore();
  }

  async initStore() {
    if (GOOGLE_SHEET_SCRIPT_URL && GOOGLE_SHEET_SCRIPT_URL !== "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL") {
      try {
        const response = await fetch(`${GOOGLE_SHEET_SCRIPT_URL}?action=getInitialData`);
        const resJson = await response.json();
        if (resJson && resJson.success) {
          const mergeItems = (key, idProp = 'id') => {
            if (resJson[key] && Array.isArray(resJson[key])) {
              const remoteItems = resJson[key];
              const localItems = this.memoryData[key] || [];
              const combined = [...remoteItems];
              localItems.forEach(loc => {
                const exists = combined.some(rem => String(rem[idProp] || rem.id) === String(loc[idProp] || loc.id));
                if (!exists) combined.push(loc);
              });
              this.memoryData[key] = combined;
            }
          };

          mergeItems('teachers', 'username');
          mergeItems('students', 'studentId');
          mergeItems('questions', 'id');
          mergeItems('materials', 'id');
          mergeItems('tests', 'id');
          mergeItems('studentScores', 'id');
          
          localStorage.setItem(this.key, JSON.stringify(this.memoryData));

          if (window.App && typeof window.App.render === 'function') {
            window.App.render();
          }
        }
      } catch (e) {
        console.warn("⚠️ Google Sheet API fetch error, using local cache fallback:", e);
      }
    }
  }

  getData() {
    return this.memoryData;
  }

  saveData(data) {
    this.memoryData = data;
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
    } catch(e){}

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
      photoUrl: teacherData.photoUrl || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
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
      photoUrl: studentData.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
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
    this.memoryData.students = this.memoryData.students.filter(s => s.studentId !== studentId && s.id !== studentId);
    this.saveData(this.memoryData);
  }
}

window.appStore = new StoreEngine();
window.COACHING_INFO = COACHING_INFO;
window.HARDCODED_TEACHERS = HARDCODED_TEACHERS;

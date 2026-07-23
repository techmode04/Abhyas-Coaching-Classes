/* ==========================================================================
   Abhyas Coaching Classes - Raimoha
   Production Google Apps Script Backend API (Structured Google Drive + Sheets DB)
   ========================================================================== */

const MAIN_STORAGE_FOLDER = "Abhyas Coaching Storage";

function doGet(e) {
  let result = { success: false };

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSheetsAndHeaders(ss);

    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getInitialData";

    if (action === "saveFullState" && e.parameter.data) {
      const dataObj = JSON.parse(e.parameter.data);
      result = saveFullState(dataObj);
    } else if (action === "deleteFileDrive" && (e.parameter.fileUrl || e.parameter.fileId)) {
      result = deleteFileFromDrive(e.parameter.fileUrl || e.parameter.fileId);
    } else {
      result = getInitialData();
    }
  } catch (err) {
    result = { success: false, error: err.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let result = { success: false };

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSheetsAndHeaders(ss);

    let rawContent = "";
    if (e && e.postData && e.postData.contents) {
      rawContent = e.postData.contents;
    } else if (e && e.parameter && e.parameter.payload) {
      rawContent = e.parameter.payload;
    }

    if (!rawContent) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "No post data received" })).setMimeType(ContentService.MimeType.JSON);
    }

    const postData = JSON.parse(rawContent);
    const action = postData.action;

    if (action === "uploadFileDrive") {
      result = uploadFileToDrive(postData.fileData, postData.fileName, postData.mimeType, postData.category, postData.targetClass);
    } else if (action === "deleteFileDrive") {
      result = deleteFileFromDrive(postData.fileUrl || postData.fileId);
    } else if (action === "saveFullState" || action === "saveData") {
      result = saveFullState(postData.data);
    } else if (action === "saveStudent") {
      result = appendOrUpdateRow("Students", postData.data, "studentId");
    } else if (action === "saveTeacher") {
      result = appendOrUpdateRow("Teachers", postData.data, "id");
    } else if (action === "saveExam") {
      result = appendOrUpdateRow("Exams", postData.data, "id");
    } else if (action === "saveQuestion") {
      result = appendOrUpdateRow("Questions", postData.data, "id");
    } else if (action === "saveNote") {
      result = appendOrUpdateRow("Notes", postData.data, "id");
    } else if (action === "saveResult") {
      result = appendOrUpdateRow("Results", postData.data, "id");
    } else {
      result = saveFullState(postData.data || postData);
    }
  } catch (err) {
    result = { success: false, error: err.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// --------------------------------------------------------------------------
// STRUCTURED GOOGLE DRIVE FOLDER ENGINE
// --------------------------------------------------------------------------
function getOrCreateSubFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return parentFolder.createFolder(folderName);
  }
}

function getTargetDriveFolder(category, targetClass) {
  let mainFolder;
  const mainFolders = DriveApp.getFoldersByName(MAIN_STORAGE_FOLDER);
  if (mainFolders.hasNext()) {
    mainFolder = mainFolders.next();
  } else {
    mainFolder = DriveApp.createFolder(MAIN_STORAGE_FOLDER);
  }

  const catLower = String(category || '').toLowerCase();

  if (catLower.includes("photo") || catLower.includes("student")) {
    return getOrCreateSubFolder(mainFolder, "Student Photos");
  } else if (catLower.includes("exam")) {
    return getOrCreateSubFolder(mainFolder, "Exams");
  } else if (catLower.includes("poll") || catLower.includes("question") || catLower.includes("attachment")) {
    return getOrCreateSubFolder(mainFolder, "Poll Attachments");
  } else if (catLower.includes("note") || catLower.includes("pdf") || catLower.includes("doc")) {
    const pdfNotesFolder = getOrCreateSubFolder(mainFolder, "PDF Notes");
    let subClassName = "Class 1";

    if (targetClass) {
      const normalized = String(targetClass).trim();
      const match = normalized.match(/([1-8])/);
      if (match) {
        subClassName = "Class " + match[1];
      }
    }
    return getOrCreateSubFolder(pdfNotesFolder, subClassName);
  } else {
    return mainFolder;
  }
}

function uploadFileToDrive(base64Data, fileName, mimeType, category, targetClass) {
  try {
    const targetFolder = getTargetDriveFolder(category, targetClass);
    const cleanBase64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
    const fileBlob = Utilities.newBlob(Utilities.base64Decode(cleanBase64), mimeType || 'application/octet-stream', fileName);
    const file = targetFolder.createFile(fileBlob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileUrl = "https://lh3.googleusercontent.com/d/" + file.getId();
    return { success: true, url: fileUrl, fileId: file.getId() };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function deleteFileFromDrive(fileUrlOrId) {
  try {
    if (!fileUrlOrId) return { success: false, error: "No URL or ID provided" };
    let fileId = fileUrlOrId;
    if (fileUrlOrId.includes("id=")) {
      fileId = fileUrlOrId.split("id=")[1].split("&")[0];
    } else if (fileUrlOrId.includes("/d/")) {
      fileId = fileUrlOrId.split("/d/")[1].split("/")[0].split("?")[0];
    }
    const file = DriveApp.getFileById(fileId);
    file.setTrashed(true);
    return { success: true, message: "File trashed successfully from Google Drive" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

// --------------------------------------------------------------------------
// GOOGLE SHEETS DATABASE ENGINE
// --------------------------------------------------------------------------
const HEADERS_MAP = {
  Students: ["studentId", "id", "name", "email", "password", "class", "batch", "schoolName", "village", "parentMobile", "studentMobile", "admissionDate", "photoUrl", "status", "role"],
  Teachers: ["id", "username", "email", "password", "name", "designation", "subject", "photoUrl", "role"],
  Questions: ["id", "targetClass", "type", "question", "options", "correctAnswer", "explanation", "marks", "date"],
  Notes: ["id", "title", "targetClass", "type", "url", "description", "date"],
  Exams: ["id", "title", "targetClass", "timerMinutes", "examDate", "isPdfExam", "pdfUrl", "questionCount", "generatedQuestions"],
  Results: ["id", "studentId", "studentName", "studentClass", "testTitle", "score", "totalMarks", "percentage", "examDate", "details"],
  Classes: ["id", "name"],
  Batches: ["id", "name"],
  Attendance: ["id", "date", "class", "presentStudentIds"],
  Announcements: ["id", "title", "message", "date", "targetClass"]
};

function getInitialData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheetsAndHeaders(ss);

  return {
    success: true,
    teachers: getSheetDataAsJSON("Teachers"),
    students: getSheetDataAsJSON("Students"),
    classes: getSheetDataAsJSON("Classes"),
    batches: getSheetDataAsJSON("Batches"),
    questions: getSheetDataAsJSON("Questions"),
    materials: getSheetDataAsJSON("Notes"),
    tests: getSheetDataAsJSON("Exams"),
    studentScores: getSheetDataAsJSON("Results"),
    attendance: getSheetDataAsJSON("Attendance"),
    announcements: getSheetDataAsJSON("Announcements")
  };
}

function getSheetDataAsJSON(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const result = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    let obj = {};
    let isEmptyRow = true;

    for (let j = 0; j < headers.length; j++) {
      let val = row[j];
      if (val !== "" && val !== null && val !== undefined) isEmptyRow = false;
      if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try { val = JSON.parse(val); } catch (e) {}
      }
      obj[headers[j]] = val;
    }
    if (!isEmptyRow) result.push(obj);
  }
  return result;
}

function saveFullState(stateData) {
  if (!stateData) return { success: false, error: "Empty stateData" };
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheetsAndHeaders(ss);

  const mappings = {
    students: "Students",
    teachers: "Teachers",
    questions: "Questions",
    materials: "Notes",
    tests: "Exams",
    studentScores: "Results",
    classes: "Classes",
    batches: "Batches",
    attendance: "Attendance",
    announcements: "Announcements"
  };

  Object.keys(mappings).forEach(key => {
    if (stateData[key] && Array.isArray(stateData[key])) {
      const sheetName = mappings[key];
      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      }

      sheet.clearContents();

      const defaultHeaders = HEADERS_MAP[sheetName] || (stateData[key].length > 0 ? Object.keys(stateData[key][0]) : ["id"]);
      sheet.appendRow(defaultHeaders);

      if (stateData[key].length > 0) {
        const rows = stateData[key].map(item => {
          return defaultHeaders.map(h => {
            let val = item[h];
            if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
            return (val !== undefined && val !== null) ? val : "";
          });
        });
        sheet.getRange(2, 1, rows.length, defaultHeaders.length).setValues(rows);
      }
    }
  });

  return { success: true };
}

function appendOrUpdateRow(sheetName, itemObj, keyField) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);

  const data = sheet.getDataRange().getValues();
  let headers = data.length > 0 && data[0].length > 0 ? data[0] : (HEADERS_MAP[sheetName] || Object.keys(itemObj));

  if (data.length === 0 || !data[0] || data[0].length === 0) {
    sheet.appendRow(headers);
  }

  const keyVal = itemObj[keyField] || itemObj.id || itemObj.studentId;
  let keyColIdx = headers.indexOf(keyField);
  if (keyColIdx === -1) keyColIdx = headers.indexOf("id");
  if (keyColIdx === -1) keyColIdx = headers.indexOf("studentId");
  if (keyColIdx === -1) keyColIdx = 0;

  const rowValues = headers.map(h => {
    let val = itemObj[h];
    if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
    return (val !== undefined && val !== null) ? val : "";
  });

  let existingRowIdx = -1;
  if (data.length > 1) {
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][keyColIdx]) === String(keyVal)) {
        existingRowIdx = i + 1;
        break;
      }
    }
  }

  if (existingRowIdx > 0) {
    sheet.getRange(existingRowIdx, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  return { success: true };
}

function ensureSheetsAndHeaders(ss) {
  Object.keys(HEADERS_MAP).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    if (sheet.getDataRange().getLastRow() === 0) {
      sheet.appendRow(HEADERS_MAP[sheetName]);
    }
  });
}

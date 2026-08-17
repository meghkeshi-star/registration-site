/**
 * ============================================================
 *  REGISTRATION + EMAIL VERIFICATION — Google Apps Script backend
 * ============================================================
 *  Sheet: "Users"
 *  Columns (in this exact order):
 *  ID | Name | Email | PasswordHash | Verification Token | Token Expiry | Verified | Created At
 * ============================================================
 */

// ------------------------------------------------------------
// 1. PASTE YOUR GOOGLE SHEET ID HERE (one place, easy to change)
//    Found in the sheet's URL:
//    https://docs.google.com/spreadsheets/d/THIS_PART_HERE/edit
// ------------------------------------------------------------
const SPREADSHEET_ID = "1EXayVz1hJDx9_UyBie1qzU7cJvv64fTUqBDbUM9W71g";
const SHEET_NAME = "Users";

// ------------------------------------------------------------
// 2. PASTE YOUR DEPLOYED WEB APP URL HERE (used inside the email
//    button link, and for the verify/resend pages). Fill this in
//    AFTER your first deployment, then redeploy.
// ------------------------------------------------------------
const VERIFY_PAGE_URL = "PASTE_YOUR_VERIFY.HTML_PAGE_URL_HERE";

// How long a verification link stays valid, in minutes.
const TOKEN_EXPIRY_MINUTES = 30;

// Site name shown in the email.
const SITE_NAME = "My Website";

// ------------------------------------------------------------
// Sheet helper
// ------------------------------------------------------------
function getUsersSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "ID", "Name", "Email", "PasswordHash",
      "Verification Token", "Token Expiry", "Verified", "Created At"
    ]);
  }

  return sheet;
}

// Column indexes (1-based, matching the header row above)
const COL = {
  ID: 1,
  NAME: 2,
  EMAIL: 3,
  PASSWORD_HASH: 4,
  TOKEN: 5,
  TOKEN_EXPIRY: 6,
  VERIFIED: 7,
  CREATED_AT: 8
};

// ------------------------------------------------------------
// Web app entry point — routes every request based on `action`
// ------------------------------------------------------------
function doPost(e) {
  let result;

  try {
    const action = e.parameter.action;

    if (action === "registerUser") {
      result = registerUser(e.parameter.name, e.parameter.email, e.parameter.passwordHash);
    } else if (action === "verifyEmail") {
      result = verifyEmail(e.parameter.token);
    } else if (action === "resendVerification") {
      result = resendVerification(e.parameter.email);
    } else {
      result = { success: false, message: "Unknown action." };
    }
  } catch (err) {
    result = { success: false, message: "Server error: " + err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// Lets you open the web app URL directly in a browser to confirm it's alive.
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "Apps Script web app is running." }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ------------------------------------------------------------
// Utilities
// ------------------------------------------------------------
function generateToken() {
  return Utilities.getUuid().replace(/-/g, "");
}

function findRowByEmail(sheet, email) {
  const data = sheet.getDataRange().getValues();
  const normalizedEmail = email.trim().toLowerCase();

  for (let row = 1; row < data.length; row++) {
    if (String(data[row][COL.EMAIL - 1]).trim().toLowerCase() === normalizedEmail) {
      return row + 1; // convert to 1-based sheet row number
    }
  }
  return -1;
}

function findRowByToken(sheet, token) {
  const data = sheet.getDataRange().getValues();

  for (let row = 1; row < data.length; row++) {
    if (String(data[row][COL.TOKEN - 1]) === token) {
      return row + 1;
    }
  }
  return -1;
}

// ------------------------------------------------------------
// 1) REGISTER USER
// ------------------------------------------------------------
function registerUser(name, email, passwordHash) {
  name = (name || "").trim();
  email = (email || "").trim().toLowerCase();

  if (!name || !email || !passwordHash) {
    return { success: false, message: "All fields are required." };
  }

  const sheet = getUsersSheet();
  const existingRow = findRowByEmail(sheet, email);

  if (existingRow !== -1) {
    const alreadyVerified = sheet.getRange(existingRow, COL.VERIFIED).getValue();
    if (alreadyVerified === true || alreadyVerified === "TRUE") {
      return { success: false, message: "An account with this email already exists." };
    }
    // Not verified yet — just send a fresh verification email instead of
    // creating a duplicate row.
    return resendVerification(email);
  }

  const id = Utilities.getUuid();
  const token = generateToken();
  const expiry = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

  sheet.appendRow([id, name, email, passwordHash, token, expiry, false, new Date()]);

  sendVerificationEmail(name, email, token);

  return { success: true, message: "Account created. Please check your email to verify." };
}

// ------------------------------------------------------------
// 2) VERIFY EMAIL
// ------------------------------------------------------------
function verifyEmail(token) {
  if (!token) {
    return { success: false, message: "Missing token." };
  }

  const sheet = getUsersSheet();
  const row = findRowByToken(sheet, token);

  if (row === -1) {
    return { success: false, message: "Invalid or unknown verification link." };
  }

  const expiry = new Date(sheet.getRange(row, COL.TOKEN_EXPIRY).getValue());
  const alreadyVerified = sheet.getRange(row, COL.VERIFIED).getValue();

  if (alreadyVerified === true || alreadyVerified === "TRUE") {
    return { success: true, message: "Email already verified." };
  }

  if (new Date() > expiry) {
    return { success: false, message: "This verification link has expired." };
  }

  sheet.getRange(row, COL.VERIFIED).setValue(true);
  sheet.getRange(row, COL.TOKEN).setValue(""); // token can't be reused

  return { success: true, message: "Email verified successfully." };
}

// ------------------------------------------------------------
// 3) RESEND VERIFICATION
// ------------------------------------------------------------
function resendVerification(email) {
  email = (email || "").trim().toLowerCase();

  if (!email) {
    return { success: false, message: "Please enter your email address." };
  }

  const sheet = getUsersSheet();
  const row = findRowByEmail(sheet, email);

  if (row === -1) {
    return { success: false, message: "We couldn't find an account with that email." };
  }

  const alreadyVerified = sheet.getRange(row, COL.VERIFIED).getValue();
  if (alreadyVerified === true || alreadyVerified === "TRUE") {
    return { success: false, message: "This email is already verified. Try logging in." };
  }

  const newToken = generateToken();
  const newExpiry = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

  sheet.getRange(row, COL.TOKEN).setValue(newToken);
  sheet.getRange(row, COL.TOKEN_EXPIRY).setValue(newExpiry);

  const name = sheet.getRange(row, COL.NAME).getValue();
  sendVerificationEmail(name, email, newToken);

  return { success: true, message: "Verification email sent." };
}

// ------------------------------------------------------------
// Email sending
// ------------------------------------------------------------
function sendVerificationEmail(name, email, token) {
  const verifyLink = VERIFY_PAGE_URL + "?token=" + token;

  const template = HtmlService.createTemplateFromFile("Email");
  template.name = name;
  template.verifyLink = verifyLink;
  template.siteName = SITE_NAME;
  template.expiryMinutes = TOKEN_EXPIRY_MINUTES;

  const htmlBody = template.evaluate().getContent();

  GmailApp.sendEmail(email, "Verify your email for " + SITE_NAME, "", {
    htmlBody: htmlBody,
    name: SITE_NAME
  });
}

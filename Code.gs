/* =====================================================
   CONFIGURATION
===================================================== */

const SPREADSHEET_ID = "1EXayVz1hJDx9_UyBie1qzU7cJvv64fTUqBDbUM9W71g";

const SHEET_NAME = "Users";

const TOKEN_EXPIRY_MINUTES = 30;


/* =====================================================
   WEB APP
===================================================== */

/*
  Handles:
  - GET requests for verification links
  - POST requests from the registration website
*/


function doGet(e) {

  const token = e.parameter.token;


  /*
    If the URL has ?token=...
    show the verification page.
  */

  if (token) {

    const template =
      HtmlService.createTemplateFromFile("verify.html");


    return template
      .evaluate()
      .setTitle("Verify Email — Entry")
      .setXFrameOptionsMode(
        HtmlService.XFrameOptionsMode.ALLOWALL
      );

  }


  /*
    Simple fallback page.
  */

  return HtmlService
    .createHtmlOutput(
      "<h2>Entry Verification Service</h2>"
    );

}


/* =====================================================
   POST: REGISTER USER
===================================================== */

function doPost(e) {

  try {

    const data = JSON.parse(e.postData.contents);


    if (data.action === "register") {

      const result = registerUser(data);

      return ContentService
        .createTextOutput(
          JSON.stringify(result)
        )
        .setMimeType(
          ContentService.MimeType.JSON
        );

    }


    return ContentService
      .createTextOutput(
        JSON.stringify({
          success: false,
          message: "Unknown action."
        })
      )
      .setMimeType(
        ContentService.MimeType.JSON
      );


  } catch (error) {

    console.error(error);


    return ContentService
      .createTextOutput(
        JSON.stringify({
          success: false,
          message: error.message
        })
      )
      .setMimeType(
        ContentService.MimeType.JSON
      );

  }

}


/* =====================================================
   REGISTER USER
===================================================== */

function registerUser(data) {

  const name =
    String(data.name || "").trim();

  const email =
    String(data.email || "")
      .trim()
      .toLowerCase();

  const passwordHash =
    String(data.passwordHash || "").trim();


  /*
    Server-side validation
  */

  if (!name) {
    throw new Error("Name is required.");
  }


  if (!isValidEmail(email)) {
    throw new Error("Invalid email address.");
  }


  if (!passwordHash) {
    throw new Error("Password hash is required.");
  }


  const sheet = getUsersSheet();

  const lastRow = sheet.getLastRow();


  /*
    Check whether email already exists.
  */

  if (lastRow > 1) {

    const emails =
      sheet
        .getRange(2, 3, lastRow - 1, 1)
        .getValues()
        .flat()
        .map(value =>
          String(value).toLowerCase()
        );


    if (emails.includes(email)) {

      return {
        success: false,
        message:
          "An account with this email already exists."
      };

    }

  }


  /*
    Generate ID
  */

  const id =
    Utilities.getUuid();


  /*
    Generate secure verification token
  */

  const token =
    generateVerificationToken();


  /*
    30-minute expiry
  */

  const expiry =
    new Date(
      Date.now() +
      TOKEN_EXPIRY_MINUTES * 60 * 1000
    );


  const createdAt =
    new Date();


  /*
    Add user row

    Columns:
    ID
    Name
    Email
    Password Hash
    Verification Token
    Token Expiry
    Verified
    Created At
  */

  sheet.appendRow([

    id,

    name,

    email,

    passwordHash,

    token,

    expiry,

    false,

    createdAt

  ]);


  /*
    Send verification email
  */

  sendVerificationEmail(
    name,
    email,
    token
  );


  return {

    success: true,

    message:
      "Account created. Please check your email."

  };

}


/* =====================================================
   VERIFY EMAIL
===================================================== */

function verifyEmail(token) {

  if (!token) {

    return {
      success: false,
      expired: false,
      message: "Missing verification token."
    };

  }


  const sheet =
    getUsersSheet();

  const lastRow =
    sheet.getLastRow();


  if (lastRow < 2) {

    return {
      success: false,
      expired: false,
      message: "No account was found."
    };

  }


  /*
    Get all rows except header.
  */

  const data =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        8
      )
      .getValues();


  for (
    let index = 0;
    index < data.length;
    index++
  ) {

    const row = data[index];

    const verificationToken = row[4];
    const tokenExpiry = row[5];
    const verified = row[6];


    /*
      Match token.
    */

    if (verificationToken === token) {

      /*
        Already verified.
      */

      if (
        verified === true ||
        String(verified).toUpperCase() === "TRUE"
      ) {

        return {
          success: true,
          message:
            "Your email has already been verified."
        };

      }


      const expiryDate =
        new Date(tokenExpiry);


      /*
        Expired.
      */

      if (
        new Date() > expiryDate
      ) {

        return {
          success: false,
          expired: true,
          message:
            "This verification stamp expired after 30 minutes."
        };

      }


      /*
        Mark verified.
      */

      const actualRow =
        index + 2;


      sheet
        .getRange(actualRow, 7)
        .setValue(true);


      /*
        Optional:
        Clear the token after successful use.
      */

      sheet
        .getRange(actualRow, 5)
        .setValue("");


      sheet
        .getRange(actualRow, 6)
        .setValue("");


      return {

        success: true,

        message:
          "Email successfully verified."

      };

    }

  }


  return {

    success: false,

    expired: false,

    message:
      "This verification link is invalid or has already been replaced."

  };

}


/* =====================================================
   RESEND VERIFICATION
===================================================== */

function resendVerification(email) {

  email =
    String(email || "")
      .trim()
      .toLowerCase();


  if (!isValidEmail(email)) {

    return {
      success: false,
      message:
        "Please enter a valid email address."
    };

  }


  const sheet =
    getUsersSheet();

  const lastRow =
    sheet.getLastRow();


  if (lastRow < 2) {

    return {
      success: false,
      message:
        "No account was found with this email."
    };

  }


  const data =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        8
      )
      .getValues();


  for (
    let index = 0;
    index < data.length;
    index++
  ) {

    const row = data[index];

    const rowEmail =
      String(row[2])
        .toLowerCase();

    const verified =
      row[6];


    if (rowEmail === email) {

      /*
        Do not resend if already verified.
      */

      if (
        verified === true ||
        String(verified).toUpperCase() === "TRUE"
      ) {

        return {
          success: false,
          message:
            "This email has already been verified."
        };

      }


      /*
        New token + new expiry.
      */

      const newToken =
        generateVerificationToken();


      const newExpiry =
        new Date(
          Date.now() +
          TOKEN_EXPIRY_MINUTES * 60 * 1000
        );


      const actualRow =
        index + 2;


      sheet
        .getRange(actualRow, 5)
        .setValue(newToken);


      sheet
        .getRange(actualRow, 6)
        .setValue(newExpiry);


      /*
        Send email again.
      */

      sendVerificationEmail(

        row[1],

        email,

        newToken

      );


      return {

        success: true,

        message:
          "A new verification email has been sent."

      };

    }

  }


  /*
    Generic wording can be preferable in a real production
    system to avoid revealing whether an email is registered.
  */

  return {

    success: false,

    message:
      "No account was found with this email."

  };

}


/* =====================================================
   SEND VERIFICATION EMAIL
===================================================== */

function sendVerificationEmail(
  name,
  email,
  token
) {

  /*
    Get current deployed Web App URL automatically.
  */

  const webAppUrl =
    ScriptApp.getService().getUrl();


  const verificationUrl =
    webAppUrl +
    "?token=" +
    encodeURIComponent(token);


  /*
    Load Email.html template.
  */

  const template =
    HtmlService.createTemplateFromFile(
      "Email"
    );


  template.name =
    name;

  template.verificationUrl =
    verificationUrl;


  const htmlBody =
    template.evaluate()
      .getContent();


  GmailApp.sendEmail(

    email,

    "Your ENTRY verification stamp",

    "Please verify your email by opening this link: " +
    verificationUrl,

    {
      htmlBody: htmlBody,
      name: "ENTRY"
    }

  );

}


/* =====================================================
   GENERATE TOKEN
===================================================== */

function generateVerificationToken() {

  /*
    UUIDs combined together create a long,
    unpredictable token.
  */

  return (
    Utilities.getUuid().replace(/-/g, "") +
    Utilities.getUuid().replace(/-/g, "")
  );

}


/* =====================================================
   GET USERS SHEET
===================================================== */

function getUsersSheet() {

  const spreadsheet =
    SpreadsheetApp.openById(
      SPREADSHEET_ID
    );


  let sheet =
    spreadsheet.getSheetByName(
      SHEET_NAME
    );


  /*
    Create sheet automatically if it does not exist.
  */

  if (!sheet) {

    sheet =
      spreadsheet.insertSheet(
        SHEET_NAME
      );


    sheet.appendRow([

      "ID",

      "Name",

      "Email",

      "Password Hash",

      "Verification Token",

      "Token Expiry",

      "Verified",

      "Created At"

    ]);


    sheet
      .getRange("A1:H1")
      .setFontWeight("bold");

    sheet
      .setFrozenRows(1);

  }


  return sheet;

}


/* =====================================================
   EMAIL VALIDATION
===================================================== */

function isValidEmail(email) {

  const pattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return pattern.test(email);

}


/* =====================================================
   INCLUDE HTML FILE
===================================================== */

function include(filename) {

  return HtmlService
    .createHtmlOutputFromFile(filename)
    .getContent();

}

function doGet(e) {
  return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    // Get the active spreadsheet and the "Applications" sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const targetSheet = ss.getSheetByName("Applications");
    
    // Parse the POST data
    const data = JSON.parse(e.postData.contents);
    
    // Add timestamp
    const timestamp = new Date();
    const referenceNumber = generateRandomAlphanumericString();
    // Prepare row data - adjust based on your data structure
    const rowData = [
      timestamp,
      referenceNumber,
      ...data.formData
    ];
    // Append the data to the sheet
    targetSheet.appendRow(rowData);
    
    // Return success response
    return ContentService.createTextOutput(
      JSON.stringify({ success: true, referenceNumber: referenceNumber })
    ).setMimeType(ContentService.MimeType.TEXT);
    
  } catch (error) {
    // Return error response
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: error.toString() })
    ).setMimeType(ContentService.MimeType.TEXT);
  }
}

function generateRandomAlphanumericString() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
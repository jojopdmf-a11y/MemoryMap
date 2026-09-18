/**
 * MemoryMap Template — Apps Script
 *
 * Install once on the master template:
 * 1. Extensions → Apps Script → paste this file → Save
 * 2. Run onOpen once and Allow permissions
 * 3. Reload the Sheet → MemoryMap menu appears
 *
 * Add a clickable button on the Sheet:
 * 1. Insert → Drawing → make a rounded rectangle, text "Send to MemoryMap" → Save and Close
 * 2. Click the drawing → ⋮ (three dots) → Assign script
 * 3. Type exactly: sendToMemoryMap   (no spaces, no parentheses) → OK
 * 4. Click the button to test (first click may ask for permission again)
 *
 * You do NOT need Deploy.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('MemoryMap')
    .addItem('Send to MemoryMap', 'sendToMemoryMap')
    .addToUi()
}

function sendToMemoryMap() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const ui = SpreadsheetApp.getUi()

  // Prefer link-sharing so MemoryMap can read the file.
  try {
    DriveApp.getFileById(ss.getId()).setSharing(
      DriveApp.Access.ANYONE_WITH_LINK,
      DriveApp.Permission.VIEW,
    )
  } catch (err) {
    ui.alert(
      'Before sending: click Share → General access → Anyone with the link → Viewer. Then run Send to MemoryMap again.',
    )
    return
  }

  const dest =
    'https://memorymap.world/?sheet=' + encodeURIComponent(ss.getUrl())

  // Popup blockers often kill window.open from Apps Script. Show a real link to click.
  const html = HtmlService.createHtmlOutput(
    '<div style="font:15px/1.4 Helvetica,Arial,sans-serif;padding:8px 4px">' +
      '<p style="margin:0 0 14px">Your Sheet is ready. Click below to open it in MemoryMap:</p>' +
      '<p style="margin:0"><a href="' +
      dest.replace(/"/g, '&quot;') +
      '" target="_blank" style="display:inline-block;padding:10px 16px;background:#1f7a6a;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">Open in MemoryMap</a></p>' +
      '</div>',
  )
    .setWidth(360)
    .setHeight(140)
  ui.showModalDialog(html, 'MemoryMap')
}

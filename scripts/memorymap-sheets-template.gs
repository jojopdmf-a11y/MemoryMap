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

  // Apps Script can't navigate the Sheet tab directly; open MemoryMap in a dialog jump.
  const html = HtmlService.createHtmlOutput(
    '<p style="font:14px sans-serif;margin:12px">Opening MemoryMap…</p>' +
      '<script>window.open(' +
      JSON.stringify(dest) +
      ', "_blank");google.script.host.close();</script>',
  )
    .setWidth(280)
    .setHeight(80)
  ui.showModalDialog(html, 'MemoryMap')
}

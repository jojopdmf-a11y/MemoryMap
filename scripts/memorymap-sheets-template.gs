/**
 * Paste into the MemoryMap template spreadsheet:
 * Extensions → Apps Script → replace Code.gs → Save.
 * Reload the Sheet, then use the MemoryMap menu → Send to MemoryMap.
 *
 * Optional: insert a drawing/button, right-click → Assign script → sendToMemoryMap
 */
function sendToMemoryMap() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const file = DriveApp.getFileById(ss.getId())
  try {
    file.setSharing(
      DriveApp.Access.ANYONE_WITH_LINK,
      DriveApp.Permission.VIEW,
    )
  } catch (err) {
    SpreadsheetApp.getUi().alert(
      'Share this Sheet as “Anyone with the link can view”, then run Send to MemoryMap again.',
    )
    return
  }
  const dest =
    'https://memorymap.world/?sheet=' + encodeURIComponent(ss.getUrl())
  const html = HtmlService.createHtmlOutput(
    '<script>window.open(' +
      JSON.stringify(dest) +
      ', "_top");google.script.host.close();</script>',
  )
    .setWidth(120)
    .setHeight(60)
  SpreadsheetApp.getUi().showModalDialog(html, 'Opening MemoryMap…')
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('MemoryMap')
    .addItem('Send to MemoryMap', 'sendToMemoryMap')
    .addToUi()
}

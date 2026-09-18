/**
 * MemoryMap Template — Apps Script
 *
 * 1. In THIS spreadsheet: Extensions → Apps Script
 * 2. Delete any old code, paste THIS whole file, Save (disk icon)
 * 3. In the toolbar, choose function onOpen → click Run
 * 4. When Google asks, Allow permissions
 * 5. Close Apps Script, reload the spreadsheet tab
 * 6. Menu bar should show: MemoryMap → Send to MemoryMap
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

/**
 * MemoryMap Template — seamless return link (no permission prompts for visitors)
 *
 * Install on the MASTER template (do this once as the owner):
 * 1. Extensions → Apps Script → replace Code.gs with this file → Save
 * 2. In the toolbar, choose function writeMemoryMapLink → Run
 *    (You may Allow once as the owner. Visitors who Make a copy do not.)
 * 3. Back on the Sheet, cell F1 should show “Open in MemoryMap” centered
 * 4. Reload the tab; onOpen keeps that link up to date for each copy
 *
 * Remove any old drawing button / MemoryMap menu — not needed anymore.
 */

var LINK_CELL = 'F1'

function onOpen() {
  writeMemoryMapLink_()
}

/** Run this once from the Apps Script editor after pasting. */
function writeMemoryMapLink() {
  writeMemoryMapLink_()
}

function writeMemoryMapLink_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = ss.getSheets()[0]
  if (!sheet) return

  var dest =
    'https://memorymap.world/?sheet=' + encodeURIComponent(ss.getUrl())

  // Clean up leftovers from older script versions that used column G.
  sheet.getRange('G1:G10').clearContent().clearFormat()
  if (sheet.getMaxColumns() >= 7) {
    sheet.hideColumns(7)
  }

  var link = sheet.getRange(LINK_CELL)
  link.setFormula(
    '=HYPERLINK("' + dest.replace(/"/g, '""') + '","Open in MemoryMap")',
  )
  link
    .setFontFamily('Georgia')
    .setFontSize(12)
    .setFontWeight('bold')
    .setFontColor('#1f7a6a')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
}

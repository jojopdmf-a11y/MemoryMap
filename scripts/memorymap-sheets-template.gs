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
 * Columns (row 2 headers): Trip Name | Date | Location | State | Country |
 * Note | Image. Do not clear or hide column G — that is the Image column.
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

  // Keep column G (Image) visible — older script versions cleared/hid it
  // thinking it was leftover UI, which wiped the Image header on every open.
  ensureImageHeader_(sheet)
  if (sheet.getMaxColumns() >= 7 && sheet.isColumnHiddenByUser(7)) {
    sheet.showColumns(7)
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

/** Header row is row 2: Trip Name … Note | Image */
function ensureImageHeader_(sheet) {
  var header = sheet.getRange('G2')
  if (!String(header.getValue() || '').trim()) {
    header.setValue('Image')
  }
}

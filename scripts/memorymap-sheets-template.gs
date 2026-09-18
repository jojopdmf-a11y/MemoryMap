/**
 * MemoryMap Template — seamless return link (no permission prompts for visitors)
 *
 * Install on the MASTER template (do this once as the owner):
 * 1. Extensions → Apps Script → replace Code.gs with this file → Save
 * 2. In the toolbar, choose function writeMemoryMapLink → Run
 *    (You may Allow once as the owner. Visitors who Make a copy do not.)
 * 3. Back on the Sheet, look at cell G1 — “Open in MemoryMap”
 * 4. Reload the tab; onOpen keeps that link up to date for each copy
 *
 * Remove any old drawing button / MemoryMap menu — not needed anymore.
 */

// First tab, cell G1 (to the right of the title — no need to hunt for column H)
var LINK_CELL = 'G1'
var TIP_CELL = 'G2'

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

  var link = sheet.getRange(LINK_CELL)
  link.setFormula(
    '=HYPERLINK("' + dest.replace(/"/g, '""') + '","Open in MemoryMap")',
  )
  link
    .setFontFamily('Georgia')
    .setFontSize(12)
    .setFontWeight('bold')
    .setFontColor('#1f7a6a')
    .setHorizontalAlignment('left')

  var tip = sheet.getRange(TIP_CELL)
  tip.setValue(
    'Share → Anyone with the link → Viewer, then click the link above. Each stop needs a Location.',
  )
  tip.setWrap(true).setFontColor('#5b706c').setFontSize(10)

  // Make sure column G is wide enough to read.
  sheet.setColumnWidth(7, 200)
}

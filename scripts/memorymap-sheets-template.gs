/**
 * MemoryMap Template — seamless return link (no permission prompts)
 *
 * How it works:
 * Google "simple" onOpen can edit THIS spreadsheet without asking the user
 * to Allow anything. It writes a normal HYPERLINK into a cell. Clicking that
 * cell opens MemoryMap with ?sheet=… — no menu, no Assign script, no DriveApp.
 *
 * Install on the master template:
 * 1. Extensions → Apps Script → replace Code.gs with this file → Save
 * 2. Reload the spreadsheet once (optional: run onOpen from the editor)
 * 3. You should see an "Open in MemoryMap" link (default: cell H2)
 * 4. Remove any old drawing that used Assign script → sendToMemoryMap
 *
 * Every visitor who File → Make a copy gets their own link auto-filled for
 * their copy when they open it.
 *
 * You do NOT need Deploy. You do NOT need to Run → Allow.
 */

var LINK_SHEET = 0 // first tab
var LINK_CELL = 'H2'

function onOpen() {
  writeMemoryMapLink_()
}

/** Safe to run manually from the Apps Script editor while testing. */
function writeMemoryMapLink() {
  writeMemoryMapLink_()
}

function writeMemoryMapLink_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = ss.getSheets()[LINK_SHEET]
  if (!sheet) return

  var dest =
    'https://memorymap.world/?sheet=' + encodeURIComponent(ss.getUrl())

  // Plain Sheets hyperlink — clicks like any other link, no script auth.
  sheet.getRange(LINK_CELL).setFormula(
    '=HYPERLINK("' + dest.replace(/"/g, '""') + '","Open in MemoryMap")',
  )
  sheet.getRange(LINK_CELL).setFontWeight('bold').setFontColor('#1f7a6a')

  // One-line reminder next to it (optional).
  var noteCell = sheet.getRange('H3')
  if (noteCell.getValue() === '' || /share|viewer|location/i.test(String(noteCell.getValue()))) {
    noteCell.setValue(
      'Tip: Share → Anyone with the link → Viewer, then click Open in MemoryMap. Each stop needs a Location.',
    )
    noteCell.setWrap(true).setFontColor('#5b706c')
  }
}

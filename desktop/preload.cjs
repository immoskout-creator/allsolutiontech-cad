// Ura e ngushtë midis faqes së programit dhe Windows: ruajtja e skedarëve me dritaren "Ruaj si" dhe prova falas.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('astDesktop', {
  /** Ruan `data` (tekst ose bajtë) me dritaren "Ruaj si"; kthen 'saved' ose 'declined'. */
  saveFile: (filename, data) => ipcRenderer.invoke('ast:save-file', { filename, data }),
  /** Dritarja "Ruaj si" e Windows-it me llojet e skedarit; kthen shtegun e zgjedhur ose null. */
  saveAs: (defaultName, filters) => ipcRenderer.invoke('ast:save-as', { defaultName, filters }),
  /** Shkruan skedarin te shtegu që zgjodhi përdoruesi te saveAs. */
  writeFile: (filePath, data) => ipcRenderer.invoke('ast:write-file', { filePath, data }),
  /** Pajisja për provën falas: SHA-256 hex e "ast-cad|" + MachineGuid. */
  deviceId: () => ipcRenderer.invoke('ast:device-id'),
  /** Kërkesa e provës falas te serveri, nga procesi kryesor; kthen { status, text }. */
  requestTrial: () => ipcRenderer.invoke('ast:trial'),
});

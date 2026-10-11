// Ura e ngushtë midis faqes së programit dhe Windows: vetëm ruajtja e skedarëve me dritaren "Ruaj si".
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('astDesktop', {
  /** Ruan `data` (tekst ose bajtë) me dritaren "Ruaj si"; kthen 'saved' ose 'declined'. */
  saveFile: (filename, data) => ipcRenderer.invoke('ast:save-file', { filename, data }),
  /** Dritarja "Ruaj si" e Windows-it me llojet e skedarit; kthen shtegun e zgjedhur ose null. */
  saveAs: (defaultName, filters) => ipcRenderer.invoke('ast:save-as', { defaultName, filters }),
  /** Shkruan skedarin te shtegu që zgjodhi përdoruesi te saveAs. */
  writeFile: (filePath, data) => ipcRenderer.invoke('ast:write-file', { filePath, data }),
});

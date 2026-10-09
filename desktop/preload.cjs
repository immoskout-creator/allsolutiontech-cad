// Ura e ngushtë midis faqes së programit dhe Windows: vetëm ruajtja e skedarëve me dritaren "Ruaj si".
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('astDesktop', {
  /** Ruan `data` (tekst ose bajtë) me dritaren "Ruaj si"; kthen 'saved' ose 'declined'. */
  saveFile: (filename, data) => ipcRenderer.invoke('ast:save-file', { filename, data }),
});

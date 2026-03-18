/**
 * Preload script para Webviews.
 * Foca em ocultar automação e simular um navegador real.
 */

// Ocultar navigator.webdriver
Object.defineProperty(navigator, 'webdriver', {
  get: () => undefined,
});

// Simular plugins comuns
Object.defineProperty(navigator, 'plugins', {
  get: () => [
    { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
    { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Google Chrome PDF Viewer' },
    { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Chromium PDF Viewer' },
    { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: 'Microsoft Edge PDF Viewer' },
    { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: 'WebKit built-in PDF' },
  ],
});

// Simular idiomas
Object.defineProperty(navigator, 'languages', {
  get: () => ['pt-BR', 'pt', 'en-US', 'en'],
});

// Ocultar propriedades específicas do ChromeDriver/Electron
const hideAutomation = () => {
  const properties = [
    '__webdriver_evaluate',
    '__webdriver_unwrapped',
    '__webdriver_script_fn',
    '__webdriver_script_func',
    '__webdriver_script_function',
    '__webdriver_execute',
    '__webdriver_full_screen',
    '__webdriver_stop',
    '__webdriver_id',
    '__selenium_evaluate',
    '__selenium_unwrapped',
    '__selenium_script_fn',
    '__selenium_script_func',
    '__selenium_script_function',
    '__selenium_execute',
    '__selenium_full_screen',
    '__selenium_stop',
    '__selenium_id',
    'cdc_adoQbh7n4_Array',
    'cdc_adoQbh7n4_Promise',
    'cdc_adoQbh7n4_Symbol',
  ];

  properties.forEach(prop => {
    if (prop in window) {
      // @ts-ignore
      delete window[prop];
    }
  });
};

// Executar imediatamente
hideAutomation();

// Garantir que chrome.runtime exista (alguns sites verificam isso)
// @ts-ignore
if (!window.chrome) {
  // @ts-ignore
  window.chrome = {
    runtime: {},
    loadTimes: () => ({}),
    csi: () => ({}),
    app: {},
  };
}

console.log('Webview Preload: Stealth scripts applied.');

export const isElectronApp = () => {
    if (navigator.userAgent.toLowerCase().includes('electron')) return true;
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1';
};

export const isElectronApp = () => {
    return navigator.userAgent.toLowerCase().includes('electron');
};

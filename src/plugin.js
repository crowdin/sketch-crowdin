import BrowserWindow from 'sketch-module-web-view';

function start() {

    const options = {
        identifier: 'crowdin',
        width: 400,
        height: 600,
        hidesOnDeactivate: false,
        remembersWindowFrame: true,
        alwaysOnTop: true,
        title: 'Crowdin'
    }

    const browserWindow = new BrowserWindow(options)

    browserWindow.loadURL(require('./plugin.html'));
};

export { start };
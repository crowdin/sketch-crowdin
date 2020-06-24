import BrowserWindow from 'sketch-module-web-view';
import { getWebview } from 'sketch-module-web-view/remote';

const identifier = 'crowdin';

export default function start() {

    const options = {
        identifier,
        width: 380,
        height: 600,
        hidesOnDeactivate: false,
        remembersWindowFrame: true,
        alwaysOnTop: true,
        title: 'Crowdin',
        backgroundColor: '#FFFFFF',
        resizable: false
    };

    const browserWindow = new BrowserWindow(options);

    browserWindow.loadURL(require('../ui/plugin.html'));
};

export function onShutdown() {
    const existingWebview = getWebview(identifier);
    if (existingWebview) {
        existingWebview.close();
    }
}
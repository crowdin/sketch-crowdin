import ui from 'sketch/ui';
import dom from 'sketch/dom';
import settings from 'sketch/settings';
import BrowserWindow from 'sketch-module-web-view';
import { getWebview } from 'sketch-module-web-view/remote';
import { ACCESS_TOKEN_KEY, PROJECT_ID, ORGANIZATION } from './constants';
import { getProjects, getLanguages, getStrings, getFiles } from './util/client';
import { sendStrings } from './action/send-strings';
import { useString, getSelectedText } from './action/source-strings';
import { translate } from './action/translate';
import { uploadScreenshots } from './action/upload-screenshots';
import { stringsPreview } from './action/strings-preview';
import { addString, deleteString, editString } from './action/manage-string';
import { default as displayTexts } from '../assets/texts.json';

const identifier = 'crowdin';

export default function start() {

    //set to true for local development
    const devTools = true;

    const options = {
        identifier,
        width: 400,
        height: 700,
        hidesOnDeactivate: false,
        remembersWindowFrame: true,
        alwaysOnTop: true,
        title: 'Crowdin',
        backgroundColor: '#FFFFFF',
        resizable: false,
        webPreferences: { devTools }
    };

    const browserWindow = new BrowserWindow(options);

    browserWindow.loadURL(require('../ui/plugin.html'));

    browserWindow.webContents.on('getTexts', () => displayTexts);

    //settings
    browserWindow.webContents.on('contactUs', contactUs);
    browserWindow.webContents.on('getCredentials', getCredentials);
    browserWindow.webContents.on('saveCredentials', saveCredentials);
    browserWindow.webContents.on('saveProject', saveProject);

    //data
    browserWindow.webContents.on('getProjects', getProjects);
    browserWindow.webContents.on('getLanguages', getLanguages);
    browserWindow.webContents.on('getStrings', getStrings);
    browserWindow.webContents.on('getFiles', getFiles);

    //strings mode
    browserWindow.webContents.on('useString', useString);
    browserWindow.webContents.on('stringsPreview', stringsPreview);
    //string management
    browserWindow.webContents.on('getSelectedText', getSelectedText);
    browserWindow.webContents.on('addString', addString);
    browserWindow.webContents.on('deleteString', deleteString);
    browserWindow.webContents.on('editString', editString);

    //translate
    browserWindow.webContents.on('sendStrings', sendStrings);
    browserWindow.webContents.on('translate', translate);
    browserWindow.webContents.on('uploadScreenshots', uploadScreenshots);
};

function contactUs() {
    NSWorkspace.sharedWorkspace().openURL(NSURL.URLWithString("https://crowdin.com/contacts"));
}

function getCredentials() {
    let token = settings.settingForKey(ACCESS_TOKEN_KEY);
    if (!!token && token.length > 3) {
        token = token.substring(0, 3) + '...';
    }
    const organization = settings.settingForKey(ORGANIZATION);
    return { token, organization };
}

function saveCredentials(creds) {
    const token = settings.settingForKey(ACCESS_TOKEN_KEY);
    let initValue = undefined;
    if (!!token && token.length > 3) {
        initValue = token.substring(0, 3) + '...';
    }
    if (creds.token !== initValue) {
        settings.setSettingForKey(ACCESS_TOKEN_KEY, creds.token);
    }
    settings.setSettingForKey(ORGANIZATION, creds.organization);
    ui.message(displayTexts.notifications.info.credentialsSaved);
}

function saveProject(projectId) {
    if (!dom.getSelectedDocument()) {
        ui.message(displayTexts.notifications.warning.selectDocument);
        return;
    }
    settings.setDocumentSettingForKey(dom.getSelectedDocument(), PROJECT_ID, projectId);
    ui.message(displayTexts.notifications.info.projectSaved);
}

export function onShutdown() {
    const existingWebview = getWebview(identifier);
    if (existingWebview) {
        existingWebview.close();
    }
}
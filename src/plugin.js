import ui from 'sketch/ui';
import dom from 'sketch/dom';
import settings from 'sketch/settings';
import BrowserWindow from 'sketch-module-web-view';
import { getWebview } from 'sketch-module-web-view/remote';
import { ACCESS_TOKEN_KEY, PROJECT_ID, ORGANIZATION, OVERRIDE_TRANSLATIONS, CONTENT_SEGMENTATION, DEFAULT_STRINGS_KEY_NAMING_OPTION, KEY_NAMING_PATTERN, STRINGS_KEY_NAMING_OPTIONS } from './constants';
import { getProjects, getLanguages, getStrings, getFiles } from './util/client';
import { sendStrings } from './action/send-strings';
import { useString, getSelectedText, getUsedStrings, deselectString } from './action/source-strings';
import { translate } from './action/translate';
import { uploadScreenshots } from './action/upload-screenshots';
import { stringsPreview } from './action/strings-preview';
import { addString, deleteString, editString } from './action/manage-string';
import { default as displayTexts } from '../assets/texts.json';

const identifier = 'crowdin';

export default function start() {

    //set to true for local development
    const devTools = false;

    const options = {
        identifier,
        width: 400,
        height: 700,
        hidesOnDeactivate: true,
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
    browserWindow.webContents.on('getOverrideTranslations', getOverrideTranslations);
    browserWindow.webContents.on('saveOverrideTranslations', saveOverrideTranslations);
    browserWindow.webContents.on('getContentSegmentation', getContentSegmentation);
    browserWindow.webContents.on('saveContentSegmentation', saveContentSegmentation);
    browserWindow.webContents.on('getKeyPatternOptions', getKeyPatternOptions);
    browserWindow.webContents.on('saveKeyPatternOption', saveKeyPatternOption);

    //data
    browserWindow.webContents.on('getProjects', getProjects);
    browserWindow.webContents.on('getLanguages', getLanguages);
    browserWindow.webContents.on('getStrings', getStrings);
    browserWindow.webContents.on('getFiles', getFiles);

    //strings mode
    browserWindow.webContents.on('useString', useString);
    browserWindow.webContents.on('deselectString', deselectString);
    browserWindow.webContents.on('stringsPreview', stringsPreview);
    browserWindow.webContents.on('getUsedStrings', getUsedStrings);
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

function getOverrideTranslations() {
    if (!dom.getSelectedDocument()) {
        ui.message(displayTexts.notifications.warning.selectDocument);
        return { overrideTranslations: false };
    }
    return {
        overrideTranslations: settings.documentSettingForKey(dom.getSelectedDocument(), OVERRIDE_TRANSLATIONS)
    };
}

function saveOverrideTranslations(value) {
    if (!dom.getSelectedDocument()) {
        ui.message(displayTexts.notifications.warning.selectDocument);
        return;
    }
    settings.setDocumentSettingForKey(dom.getSelectedDocument(), OVERRIDE_TRANSLATIONS, value);
    ui.message(displayTexts.notifications.info.overrideTranslationsSaved);
}

function getContentSegmentation() {
    if (!dom.getSelectedDocument()) {
        ui.message(displayTexts.notifications.warning.selectDocument);
        return { contentSegmentation: true };
    }
    const value = settings.documentSettingForKey(dom.getSelectedDocument(), CONTENT_SEGMENTATION);
    return {
        contentSegmentation: value === undefined ? true : !!value
    };
}

function saveContentSegmentation(value) {
    if (!dom.getSelectedDocument()) {
        ui.message(displayTexts.notifications.warning.selectDocument);
        return;
    }
    settings.setDocumentSettingForKey(dom.getSelectedDocument(), CONTENT_SEGMENTATION, !!value);
    ui.message(displayTexts.notifications.info.contentSegmentationSaved);
}

function getKeyPatternOptions() {
    let selectedOption = !!dom.getSelectedDocument() && !!settings.documentSettingForKey(dom.getSelectedDocument(), KEY_NAMING_PATTERN)
        ? parseInt(settings.documentSettingForKey(dom.getSelectedDocument(), KEY_NAMING_PATTERN))
        : DEFAULT_STRINGS_KEY_NAMING_OPTION;
    return STRINGS_KEY_NAMING_OPTIONS.map(e => {
        return {
            selected: selectedOption === e.id,
            ...e
        };
    })
}

function saveKeyPatternOption(value) {
    if (!dom.getSelectedDocument()) {
        ui.message(displayTexts.notifications.warning.selectDocument);
        return;
    }
    settings.setDocumentSettingForKey(dom.getSelectedDocument(), KEY_NAMING_PATTERN, value);
    ui.message(displayTexts.notifications.info.stringsKeyNamingSaved);
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
    if (!!projectId) {
        ui.message(displayTexts.notifications.info.projectSaved);
    }
}

export function onShutdown() {
    const existingWebview = getWebview(identifier);
    if (existingWebview) {
        existingWebview.close();
    }
}
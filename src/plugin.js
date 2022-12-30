import BrowserWindow from 'sketch-module-web-view';
import { getWebview } from 'sketch-module-web-view/remote';
import { getProjects, getBranches, getLanguages, getStrings, getFiles, getLabels, getSourceLanguage } from './util/client';
import { sendStrings } from './action/send-strings';
import { useString, getSelectedText, getUsedStrings, deselectString } from './action/source-strings';
import { translate, pseudoLocalize } from './action/translate';
import { uploadScreenshots } from './action/upload-screenshots';
import { stringsPreview } from './action/strings-preview';
import { addString, deleteString, editString } from './action/manage-string';
import { default as displayTexts } from '../assets/texts.json';
import {
    contactUs,
    getCredentials,
    saveCredentials,
    saveProject,
    saveBranch,
    getOverrideTranslations,
    saveOverrideTranslations,
    getContentSegmentation,
    saveContentSegmentation,
    getKeyPatternOptions,
    saveKeyPatternOption,
    logout,
    isArtboardSelected,
    fileFormats,
    saveCustomKeyPattern,
    getSearchHelperList,
    getCustomKeyPattern
} from './action/settings';

const identifier = 'crowdin';

export default function start() {

    //set to true for local development
    const devTools = false;

    const options = {
        identifier,
        width: 400,
        height: 760,
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
    browserWindow.webContents.on('saveBranch', saveBranch);
    browserWindow.webContents.on('getOverrideTranslations', getOverrideTranslations);
    browserWindow.webContents.on('saveOverrideTranslations', saveOverrideTranslations);
    browserWindow.webContents.on('getContentSegmentation', getContentSegmentation);
    browserWindow.webContents.on('saveContentSegmentation', saveContentSegmentation);
    browserWindow.webContents.on('getKeyPatternOptions', getKeyPatternOptions);
    browserWindow.webContents.on('saveKeyPatternOption', saveKeyPatternOption);
    browserWindow.webContents.on('saveCustomKeyPatternOption', saveCustomKeyPattern);
    browserWindow.webContents.on('getSearchHelperList', getSearchHelperList);
    browserWindow.webContents.on('getCustomKeyPattern', getCustomKeyPattern);
    browserWindow.webContents.on('logout', logout);

    //data
    browserWindow.webContents.on('getProjects', getProjects);
    browserWindow.webContents.on('getSourceLanguage', getSourceLanguage);
    browserWindow.webContents.on('getBranches', getBranches);
    browserWindow.webContents.on('getLanguages', getLanguages);
    browserWindow.webContents.on('getStrings', getStrings);
    browserWindow.webContents.on('getFiles', getFiles);
    browserWindow.webContents.on('getLabels', getLabels);

    //strings mode
    browserWindow.webContents.on('useString', useString);
    browserWindow.webContents.on('deselectString', deselectString);
    browserWindow.webContents.on('stringsPreview', stringsPreview);
    browserWindow.webContents.on('getUsedStrings', getUsedStrings);
    browserWindow.webContents.on('uploadScreenshots', uploadScreenshots);
    browserWindow.webContents.on('fileFormats', fileFormats);
    //string management
    browserWindow.webContents.on('getSelectedText', getSelectedText);
    browserWindow.webContents.on('addString', addString);
    browserWindow.webContents.on('deleteString', deleteString);
    browserWindow.webContents.on('editString', editString);

    //translate
    browserWindow.webContents.on('sendStrings', sendStrings);
    browserWindow.webContents.on('translate', translate);
    browserWindow.webContents.on('pseudoLocalize', pseudoLocalize);


    //other
    browserWindow.webContents.on('isArtboardSelected', isArtboardSelected);
};

export function onShutdown() {
    const existingWebview = getWebview(identifier);
    if (existingWebview) {
        existingWebview.close();
    }
}
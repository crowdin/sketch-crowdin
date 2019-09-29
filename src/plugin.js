import ui from 'sketch/ui';
import dom from 'sketch/dom';
import settings from 'sketch/settings';
import AdmZip from './adm-zip';
import { PROJECT_ID } from './constants';
import { createClient, handleError } from './util';

async function sendDocumentStringsToCrowdin() {
    try {
        const selectedDocument = dom.getSelectedDocument();
        const projectId = settings.settingForKey(PROJECT_ID);

        if (!selectedDocument) {
            throw 'Please select a document';
        }
        if (!projectId) {
            throw 'Please set project id';
        }

        if (selectedDocument.pages === 0) {
            throw 'Nothing to send to Crowdin system';
        }

        //just for validation
        createClient();

        const promises = selectedDocument.pages.map(page => sendPageStrings(page));
        try {
            await Promise.all(promises);
            ui.message('Strings were successfully pushed to Crowdin');
        } catch (error) {
            ui.message('Processed with errors');
        }
    } catch (error) {
        handleError(error);
    }
}

async function sendPageStringsToCrowdin() {
    try {
        const selectedDocument = dom.getSelectedDocument();
        const selectedPage = selectedDocument ? selectedDocument.selectedPage : undefined;
        const projectId = settings.documentSettingForKey(selectedDocument, PROJECT_ID);

        if (!selectedDocument) {
            throw 'Please select a document';
        }
        if (!selectedPage) {
            throw 'Please select a page';
        }
        if (!projectId) {
            throw 'Please set project id';
        }

        await sendPageStrings(selectedPage);
        ui.message('Strings were successfully pushed to Crowdin');
    } catch (error) {
        handleError(error);
    }
}

async function sendPageStrings(page) {
    const projectId = settings.documentSettingForKey(dom.getSelectedDocument(), PROJECT_ID);

    const strings = dom.find('Text', page);

    if (strings.length === 0) {
        throw 'Nothing to send to Crowdin system';
    }

    const text = strings.map(t => t.text).join('\n\r');

    const { sourceFilesApi, uploadStorageApi } = createClient();

    //add proper pagination here
    const fileName = `Sketch_${page.id}`;
    const projectFiles = await sourceFilesApi.listProjectFiles(projectId, undefined, undefined, 500);
    const file = projectFiles.data
        .map(f => f.data)
        .find(f => f.name === fileName);
    const storage = await uploadStorageApi.addStorage('text/plain', text);
    const storageId = storage.data.id;
    if (!!file) {
        await sourceFilesApi.updateFile(projectId, file.id, { storageId });
    } else {
        await sourceFilesApi.createFile(projectId, {
            storageId: storageId,
            name: fileName
        });
    }
}

async function translatePage() {
    try {
        const selectedDocument = dom.getSelectedDocument();
        const selectedPage = selectedDocument ? selectedDocument.selectedPage : undefined;
        const projectId = settings.documentSettingForKey(selectedDocument, PROJECT_ID);

        if (!selectedDocument) {
            throw 'Please select a document';
        }
        if (!selectedPage) {
            throw 'Please select a page';
        }
        if (!projectId) {
            throw 'Please set project id';
        }

        const { projectsGroupsApi, languagesApi, translationsApi } = createClient();
        const languages = await languagesApi.listSupportedLanguages(500);
        const project = await projectsGroupsApi.getProject(projectId);
        const targetLanguages = languages.data
            .filter(l => project.data.targetLanguageIds.includes(l.data.id))
            .map(l => l.data.name);
        ui.getInputFromUser('Select language', {
            type: ui.INPUT_TYPE.selection,
            possibleValues: targetLanguages
        }, async (err, value) => {
            if (err) {
                return;
            }
            const language = languages.data.find(l => l.data.name === value);
            if (!!language) {
                try {
                    const languageId = language.data.id;
                    const build = await translationsApi.buildProject(projectId, {
                        targetLanguagesId: [languageId]
                    });
                    let finished = false;
                    while (!finished) {
                        const status = await translationsApi.checkBuildStatus(projectId, build.data.id);
                        finished = status.data.status === 'finished';
                    }
                    const downloadLink = await translationsApi.downloadTranslations(projectId, build.data.id);
                    const resp = await fetch(downloadLink.data.url);
                    const blob = await resp.blob();
                    //looks like BE returns old translations (some caching?)
                    const translations = extractTranslations(blob, selectedPage.id);
                    //TODO create copy of page, change text, mark page as temp
                    ui.message(JSON.stringify(translations));
                } catch (error) {
                    handleError(error);
                }
            }
        });
    } catch (error) {
        handleError(error);
    }
}

function extractTranslations(blob, pageId) {
    const buffer = require('@skpm/buffer').Buffer.from(blob);
    const zip = new AdmZip(buffer);
    const foundFile = zip.getEntries().find(entry => entry.name === `Sketch_${pageId}`);
    if (!!foundFile) {
        return foundFile.getData().toString().split('\n\r');
    } else {
        throw 'Translations for page are missing';
    }
}

export { sendPageStringsToCrowdin, sendDocumentStringsToCrowdin, translatePage };
import ui from 'sketch/ui';
import dom from 'sketch/dom';
import settings from 'sketch/settings';
import AdmZip from './adm-zip';
import { PROJECT_ID } from './constants';
import { createClient, handleError, removeTranslatedPage, addTranslatedPage, getListOfTranslatedPages } from './util';

//Push

async function sendDocumentStringsToCrowdin() {
    try {
        const selectedDocument = dom.getSelectedDocument();
        const projectId = settings.documentSettingForKey(selectedDocument, PROJECT_ID);

        if (!selectedDocument) {
            throw 'Please select a document';
        }
        if (!projectId) {
            throw 'Please set project';
        }

        if (selectedDocument.pages === 0) {
            throw 'Nothing to send to Crowdin system';
        }

        //just for validation
        createClient();

        const translatedPages = getListOfTranslatedPages(selectedDocument);
        const promises = selectedDocument.pages
            .filter(p => !translatedPages.includes(p.id))
            .map(page => sendPageStrings(page));
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
            throw 'Please set project';
        }

        const translatedPages = getListOfTranslatedPages(selectedDocument);
        if (translatedPages.includes(selectedPage.id)) {
            return;
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
            name: fileName,
            title: page.name
        });
    }
}

//Pull

async function translateDocument() {
    translate(true);
}

async function translatePage() {
    translate(false);
}

async function translate(wholeDocument) {
    try {
        const selectedDocument = dom.getSelectedDocument();
        const selectedPage = selectedDocument ? selectedDocument.selectedPage : undefined;
        const projectId = settings.documentSettingForKey(selectedDocument, PROJECT_ID);

        if (!selectedDocument) {
            throw 'Please select a document';
        }
        if (!wholeDocument && !selectedPage) {
            throw 'Please select a page';
        }
        if (wholeDocument && selectedDocument.pages === 0) {
            throw 'Nothing to translate';
        }
        if (!projectId) {
            throw 'Please set project';
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
                    //looks like BE returns old translations (some caching?)
                    const downloadLink = await translationsApi.downloadTranslations(projectId, build.data.id);
                    const resp = await fetch(downloadLink.data.url);
                    const blob = await resp.blob();
                    const buffer = require('@skpm/buffer').Buffer.from(blob);
                    const zip = new AdmZip(buffer);

                    const arr = wholeDocument ? selectedDocument.pages : [selectedPage];
                    arr.forEach(pg => extractTranslations(selectedDocument, pg, value, zip));
                } catch (error) {
                    handleError(error);
                }
            }
        });
    } catch (error) {
        handleError(error);
    }
}

function extractTranslations(document, page, languageName, zip) {
    const foundFile = zip.getEntries().find(entry => entry.name === `Sketch_${page.id}`);
    if (!!foundFile) {
        const translations = foundFile.getData().toString().split('\n\r');
        removeTranslatedPage(document, page.id, languageName);
        const newPage = page.duplicate();
        addTranslatedPage(document, page.id, newPage.id, languageName);
        newPage.name = `${newPage.name} (${languageName})`;
        const texts = dom.find('Text', newPage);
        const map = texts.flatMap(txt => txt.text
            .split('\n\r')
            .map(e => {
                return {
                    txt: e,
                    id: txt.id
                };
            })
        );
        for (let i = 0; i < map.length; i++) {
            const e = map[i];
            let translationText = e.txt;
            if (translations.length > i) {
                translationText = translations[i];
            }
            i++;
            for (; i < map.length; i++) {
                const e2 = map[i];
                if (e2.id !== e.id) {
                    i--;
                    break;
                } else if (translations.length > i) {
                    translationText += '\n\r' + translations[i];;
                } else {
                    translationText += '\n\r' + e2.txt;
                }
            }
            const text = texts.find(t => t.id === e.id);
            if (text) {
                text.text = translationText;
            }
        }
        document.selectedPage = newPage;
    } else {
        throw `There are no translations for page ${page.name}`;
    }
}

export { sendPageStringsToCrowdin, sendDocumentStringsToCrowdin, translatePage, translateDocument };
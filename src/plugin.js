import ui from 'sketch/ui';
import dom from 'sketch/dom';
import settings from 'sketch/settings';
import AdmZip from './adm-zip';
import cheerio from 'cheerio';
import { PROJECT_ID } from './constants';
import * as util from './util';

//Push

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

        const translatedPages = util.getListOfTranslatedPages(selectedDocument);
        if (translatedPages.includes(selectedPage.id)) {
            return;
        }
        await sendPageStrings(selectedPage);
        ui.message('Strings were successfully pushed to Crowdin');
    } catch (error) {
        util.handleError(error);
    }
}

async function sendPageStrings(page) {
    const projectId = settings.documentSettingForKey(dom.getSelectedDocument(), PROJECT_ID);
    const { sourceFilesApi, uploadStorageApi } = util.createClient();

    const directories = await sourceFilesApi.listProjectDirectories(projectId, undefined, undefined, 500);
    let directory = directories.data.find(d => d.data.name === `Sketch_${page.id}`);
    if (!directory) {
        ui.message('Creating new directory');
        directory = await sourceFilesApi.createDirectory(projectId, {
            name: `Sketch_${page.id}`,
            title: page.name
        });
    }

    const projectFiles = await sourceFilesApi.listProjectFiles(projectId, undefined, directory.data.id, 500);
    const artboards = dom.find('Artboard', page);
    const promises = artboards.map(artboard => uploadArtboard(uploadStorageApi, sourceFilesApi, projectFiles, artboard, projectId, directory.data.id));
    promises.push(uploadLeftovers(uploadStorageApi, sourceFilesApi, projectFiles, page, projectId, directory.data.id));

    await Promise.all(promises);
}

async function uploadArtboard(uploadStorageApi, sourceFilesApi, projectFiles, artboard, projectId, directoryId) {
    const html = util.convertArtboardToHtml(artboard);
    const fileName = `Sketch_${artboard.id}.html`;
    const file = projectFiles.data
        .map(f => f.data)
        .find(f => f.name === fileName);
    const storage = await uploadStorageApi.addStorage('text/html', html);
    const storageId = storage.data.id;
    if (!!file) {
        ui.message(`Updating existing file for artboard ${artboard.name}`);
        await sourceFilesApi.updateFile(projectId, file.id, { storageId });
    } else {
        ui.message(`Creating new file for artboard ${artboard.name}`);
        await sourceFilesApi.createFile(projectId, {
            storageId: storageId,
            name: fileName,
            title: artboard.name,
            directoryId: directoryId
        });
    }
}

async function uploadLeftovers(uploadStorageApi, sourceFilesApi, projectFiles, page, projectId, directoryId) {
    const text = util.convertOutsideTextToHtml(page);
    const fileName = `Sketch_${page.id}.html`;
    const file = projectFiles.data
        .map(f => f.data)
        .find(f => f.name === fileName);
    const storage = await uploadStorageApi.addStorage('text/html', text);
    const storageId = storage.data.id;
    if (!!file) {
        ui.message(`Updating existing file for page ${page.name}`);
        await sourceFilesApi.updateFile(projectId, file.id, { storageId });
    } else {
        ui.message(`Creating new file for page ${page.name}`);
        await sourceFilesApi.createFile(projectId, {
            storageId: storageId,
            name: fileName,
            title: page.name,
            directoryId: directoryId
        });
    }
}

//Pull

async function translatePage() {
    try {
        const selectedDocument = dom.getSelectedDocument();
        const selectedPage = selectedDocument ? selectedDocument.selectedPage : undefined;
        const projectId = settings.documentSettingForKey(selectedDocument, PROJECT_ID);
        const translatedPages = util.getListOfTranslatedPages(selectedDocument);

        if (!selectedDocument) {
            throw 'Please select a document';
        }
        if (!selectedPage) {
            throw 'Please select a page';
        }
        if (selectedDocument.pages === 0) {
            throw 'Nothing to translate';
        }
        if (!projectId) {
            throw 'Please set project';
        }
        if (translatedPages.includes(selectedPage.id)) {
            throw 'Generated page cannot be translated';
        }

        const { projectsGroupsApi, languagesApi, translationsApi } = util.createClient();
        ui.message('Loading list of languages');
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

                    ui.message('Building project translations');
                    const build = await translationsApi.buildProject(projectId, {
                        targetLanguageIds: [languageId]
                    });

                    let finished = false;
                    while (!finished) {
                        const status = await translationsApi.checkBuildStatus(projectId, build.data.id);
                        finished = status.data.status === 'finished';
                    }
                    ui.message('Downloading translations');
                    //looks like BE returns old translations (some caching?)
                    const downloadLink = await translationsApi.downloadTranslations(projectId, build.data.id);
                    const resp = await fetch(downloadLink.data.url);
                    const blob = await resp.blob();
                    const buffer = require('@skpm/buffer').Buffer.from(blob);
                    const zip = new AdmZip(buffer);

                    extractTranslations(selectedDocument, selectedPage, value, zip);
                } catch (error) {
                    util.handleError(error);
                }
            }
        });
    } catch (error) {
        util.handleError(error);
    }
}

function extractTranslations(document, page, languageName, zip) {
    //entry.entryName === page.id + / + artboard.id or page.id + .html
    const foundFile = zip.getEntries().find(entry => entry.name === `Sketch_${page.id}.html`);
    if (!!foundFile) {
        const translations = parseHtmlForText(foundFile.getData().toString());
        util.removeTranslatedPage(document, page.id, languageName);
        const newPage = page.duplicate();
        util.addTranslatedPage(document, page.id, newPage.id, languageName);
        newPage.name = `${newPage.name} (${languageName})`;
        const originalStrings = dom.find('Text', page);
        const texts = dom.find('Text', newPage);
        translations.forEach(translation => {
            for (let i = 0; i < originalStrings.length; i++) {
                const originalString = originalStrings[i];
                if (originalString.id === translation.id && i < texts.length) {
                    texts[i].text = translation.text;
                }
            }
        });
        document.selectedPage = newPage;
    } else {
        throw `There are no translations for page ${page.name}`;
    }
}

function parseHtmlForText(html) {
    const $ = cheerio.load(html);
    const strings = $('div[id]');
    let result = [];
    for (let i = 0; i < strings.length; i++) {
        const string = strings[i];
        result.push({
            id: string.attribs.id,
            text: cheerio.text($(string))
        });
    }
    return result;
}

export { sendPageStringsToCrowdin, translatePage };
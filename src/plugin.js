import ui from 'sketch/ui';
import dom from 'sketch/dom';
import settings from 'sketch/settings';
import AdmZip from './adm-zip';
import cheerio from 'cheerio';
import { PROJECT_ID, ACCESS_TOKEN_KEY } from './constants';
import * as util from './util';
import { connectToCrowdin, setProjectIdFromExisting } from './settings';

//Push

async function sendPageStrings() {
    await sendStringsAction(true);
}

async function sendArtboardStrings() {
    await sendStringsAction(false);
}

async function sendStringsAction(wholePage) {
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
        if (!settings.settingForKey(ACCESS_TOKEN_KEY)) {
            await connectToCrowdin();
        }
        if (!projectId) {
            await setProjectIdFromExisting();
        }

        if (!!wholePage) {
            const translatedPages = util.getListOfTranslatedElements(selectedDocument, 'page');
            if (translatedPages.includes(selectedPage.id)) {
                return;
            }
            await uploadStrings(selectedPage);
        } else {
            const artboard = util.getSelectedArtboard(selectedPage);
            if (!artboard) {
                throw 'Please select an artboard';
            }
            const translatedArtboards = util.getListOfTranslatedElements(selectedDocument, 'artboard');
            if (translatedArtboards.includes(artboard.id)) {
                return;
            }
            await uploadStrings(selectedPage, artboard);
        }

        ui.message('Strings were successfully pushed to Crowdin');
    } catch (error) {
        util.handleError(error);
    }
}

async function uploadStrings(page, artboard) {
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
    if (!!artboard) {
        await uploadArtboard(uploadStorageApi, sourceFilesApi, projectFiles, artboard, projectId, directory.data.id);
        return;
    }
    const artboards = dom.find('Artboard', page);
    const translatedArtboards = util.getListOfTranslatedElements(dom.getSelectedDocument(), 'artboard');
    const promises = artboards
        .filter(artboard => !translatedArtboards.includes(artboard.id))
        .map(artboard => uploadArtboard(uploadStorageApi, sourceFilesApi, projectFiles, artboard, projectId, directory.data.id));
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
    await translate(true);
}

async function translateArtboard() {
    await translate(false);
}

async function translate(wholePage) {
    try {
        const selectedDocument = dom.getSelectedDocument();
        const selectedPage = selectedDocument ? selectedDocument.selectedPage : undefined;
        const projectId = settings.documentSettingForKey(selectedDocument, PROJECT_ID);
        let artboard;

        if (!selectedDocument) {
            throw 'Please select a document';
        }
        if (!selectedPage) {
            throw 'Please select a page';
        }
        if (selectedDocument.pages === 0) {
            throw 'Nothing to translate';
        }
        if (!settings.settingForKey(ACCESS_TOKEN_KEY)) {
            await connectToCrowdin();
        }
        if (!projectId) {
            await setProjectIdFromExisting();
        }
        if (!!wholePage) {
            const translatedPages = util.getListOfTranslatedElements(selectedDocument, 'page');
            if (translatedPages.includes(selectedPage.id)) {
                throw 'Generated page cannot be translated';
            }
        } else {
            artboard = util.getSelectedArtboard(selectedPage);
            if (!artboard) {
                throw 'Please select an artboard';
            }
            const translatedArtboard = util.getListOfTranslatedElements(selectedDocument, 'artboard');
            if (translatedArtboard.includes(artboard.id)) {
                throw 'Generated artboard cannot be translated';
            }
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
                        if (!finished) {
                            ui.message(`Build status ${status.data.progress.percent}%`);
                        }
                    }
                    ui.message('Downloading translations');
                    //looks like BE returns old translations (some caching?)
                    const downloadLink = await translationsApi.downloadTranslations(projectId, build.data.id);
                    const resp = await fetch(downloadLink.data.url);
                    const blob = await resp.blob();
                    const buffer = require('@skpm/buffer').Buffer.from(blob);
                    const zip = new AdmZip(buffer);
                    if (wholePage) {
                        extractPageTranslations(selectedDocument, selectedPage, value, zip);
                    } else {
                        extractArtboardTranslations(selectedDocument, selectedPage, artboard, value, zip);
                    }
                } catch (error) {
                    util.handleError(error);
                }
            }
        });
    } catch (error) {
        util.handleError(error);
    }
}

function extractArtboardTranslations(document, page, artboard, languageName, zip) {
    const foundFile = zip.getEntries().find(entry => entry.entryName.includes(`${page.id}/Sketch_${artboard.id}.html`));
    if (!!foundFile) {
        const translations = parseHtmlForText(foundFile.getData().toString());
        util.removeTranslatedElement(document, artboard.id, languageName, 'artboard');
        const newArtboard = artboard.duplicate();
        util.addTranslatedElement(document, artboard.id, newArtboard.id, languageName, 'artboard');
        newArtboard.name = `${newArtboard.name} (${languageName})`;
        newArtboard.selected = true;
        artboard.selected = false;
        //by default duplicate will appear in the same place as original
        newArtboard.frame.offset(0, - (newArtboard.frame.height + 100));
        const originalStrings = dom.find('Text', artboard);
        const texts = dom.find('Text', newArtboard);
        translations.forEach(translation => {
            for (let i = 0; i < originalStrings.length; i++) {
                const originalString = originalStrings[i];
                if (originalString.id === translation.id && i < texts.length) {
                    texts[i].text = translation.text;
                }
            }
        });
    } else {
        throw `There are no translations for artboard ${artboard.name}`;
    }
}

function extractPageTranslations(document, page, languageName, zip) {
    const foundFiles = zip.getEntries().filter(entry => entry.entryName.includes(`Sketch_${page.id}`));
    if (foundFiles.length > 0) {
        const translations = foundFiles.flatMap(foundFile => parseHtmlForText(foundFile.getData().toString()));
        util.removeTranslatedElement(document, page.id, languageName, 'page');
        const newPage = page.duplicate();
        util.addTranslatedElement(document, page.id, newPage.id, languageName, 'page');
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
        removeGeneratedArtboards(document, page, newPage, languageName);
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

function removeGeneratedArtboards(document, sourcePage, duplicatePage, languageName) {
    const generatedArtboards = util.getListOfTranslatedElements(document, 'artboard');
    const sourceArtboards = dom.find('Artboard', sourcePage);
    const duplicateArtboards = dom.find('Artboard', duplicatePage);
    for (let i = 0; i < sourceArtboards.length; i++) {
        const sourceArtboard = sourceArtboards[i];
        if (generatedArtboards.includes(sourceArtboard.id) && i < duplicateArtboards.length) {
            duplicateArtboards[i].remove();
        }
    }
}

export { sendPageStrings, sendArtboardStrings, translatePage, translateArtboard };
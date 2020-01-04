import ui from 'sketch/ui';
import dom from 'sketch/dom';
import settings from 'sketch/settings';
import { PROJECT_ID, ACCESS_TOKEN_KEY, TEXT_TYPE, SYMBOL_TYPE } from './constants';
import * as domUtil from './util/dom';
import * as httpUtil from './util/http';
import * as translationsUtil from './util/translations';
import * as htmlUtil from './util/html';
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

        const translatedPages = translationsUtil.getListOfTranslatedElements(selectedDocument, 'page');
        if (!!wholePage) {
            if (translatedPages.includes(selectedPage.id)) {
                throw 'Generated page cannot be translated';
            }
            await uploadStrings(selectedPage);
        } else {
            const artboard = domUtil.getSelectedArtboard(selectedPage);
            if (!artboard) {
                throw 'Please select an artboard';
            }
            const translatedArtboards = translationsUtil.getListOfTranslatedElements(selectedDocument, 'artboard');
            if (translatedArtboards.includes(artboard.id) || translatedPages.includes(artboard.parent.id)) {
                throw 'Generated artboard cannot be translated';
            }
            await uploadStrings(selectedPage, artboard);
        }

        ui.message('Strings were successfully pushed to Crowdin');
    } catch (error) {
        httpUtil.handleError(error);
    }
}

async function uploadStrings(page, artboard) {
    const projectId = settings.documentSettingForKey(dom.getSelectedDocument(), PROJECT_ID);
    const { sourceFilesApi, uploadStorageApi } = httpUtil.createClient();

    const directories = await sourceFilesApi.listProjectDirectories(projectId, undefined, undefined, 500);
    let directory = directories.data.find(d => d.data.name === getDirectoryName(page));
    if (!directory) {
        ui.message('Creating new directory');
        directory = await sourceFilesApi.createDirectory(projectId, {
            name: getDirectoryName(page),
            title: page.name
        });
    }

    const projectFiles = await sourceFilesApi.listProjectFiles(projectId, undefined, directory.data.id, 500);
    if (!!artboard) {
        await uploadArtboard(uploadStorageApi, sourceFilesApi, projectFiles, page, artboard, projectId, directory.data.id);
        return;
    }
    const artboards = dom.find('Artboard', page);
    const translatedArtboards = translationsUtil.getListOfTranslatedElements(dom.getSelectedDocument(), 'artboard');
    const promises = artboards
        .filter(artboard => !translatedArtboards.includes(artboard.id))
        .map(artboard => uploadArtboard(uploadStorageApi, sourceFilesApi, projectFiles, page, artboard, projectId, directory.data.id));
    promises.push(uploadLeftovers(uploadStorageApi, sourceFilesApi, projectFiles, page, projectId, directory.data.id));

    await Promise.all(promises);
}

async function uploadArtboard(uploadStorageApi, sourceFilesApi, projectFiles, page, artboard, projectId, directoryId) {
    const html = htmlUtil.convertArtboardToHtml(page, artboard);
    const fileName = getFileName(artboard);
    const file = projectFiles.data
        .map(f => f.data)
        .find(f => f.name === fileName);
    const storage = await uploadStorageApi.addStorage(fileName, html);
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
    const text = htmlUtil.convertOutsideTextToHtml(page);
    const fileName = getFileName(page);
    const file = projectFiles.data
        .map(f => f.data)
        .find(f => f.name === fileName);
    const storage = await uploadStorageApi.addStorage(fileName, text);
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
        const translatedPages = translationsUtil.getListOfTranslatedElements(selectedDocument, 'page');
        if (!!wholePage) {
            if (translatedPages.includes(selectedPage.id)) {
                throw 'Generated page cannot be translated';
            }
        } else {
            artboard = domUtil.getSelectedArtboard(selectedPage);
            if (!artboard) {
                throw 'Please select an artboard';
            }
            const translatedArtboard = translationsUtil.getListOfTranslatedElements(selectedDocument, 'artboard');
            if (translatedArtboard.includes(artboard.id) || translatedPages.includes(artboard.parent.id)) {
                throw 'Generated artboard cannot be translated';
            }
        }

        const { projectsGroupsApi, languagesApi, translationsApi, sourceFilesApi } = httpUtil.createClient();
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
                    const directories = await sourceFilesApi.listProjectDirectories(projectId, undefined, undefined, 500);
                    const directory = directories.data.find(d => d.data.name === getDirectoryName(selectedPage));
                    if (!directory) {
                        throw 'There are no translations for ' + (wholePage ? `page ${selectedPage.name}` : `artboard ${artboard.name}`);
                    }
                    const projectFiles = await sourceFilesApi.listProjectFiles(projectId, undefined, directory.data.id, 500);
                    ui.message('Downloading translations');
                    if (wholePage) {
                        await extractPageTranslations(projectId, languageId, translationsApi, selectedDocument, selectedPage, value, projectFiles);
                    } else {
                        await extractArtboardTranslations(projectId, languageId, translationsApi, selectedDocument, selectedPage, artboard, value, projectFiles);
                    }
                } catch (error) {
                    httpUtil.handleError(error);
                }
            }
        });
    } catch (error) {
        httpUtil.handleError(error);
    }
}

async function extractArtboardTranslations(projectId, targetLanguageId, translationsApi, document, page, artboard, languageName, projectFiles) {
    const foundFile = projectFiles.data.find(file => file.data.name === getFileName(artboard));
    if (!!foundFile) {
        const html = await getFile(translationsApi, projectId, foundFile.data.id, targetLanguageId);
        const translations = htmlUtil.parseHtmlForText(html);
        translationsUtil.removeTranslatedElement(document, artboard.id, languageName, 'artboard');
        const newArtboard = artboard.duplicate();
        translationsUtil.addTranslatedElement(document, artboard.id, newArtboard.id, languageName, 'artboard');
        newArtboard.name = `${newArtboard.name} (${languageName})`;
        newArtboard.selected = true;
        artboard.selected = false;
        //by default duplicate will appear in the same place as original
        domUtil.offsetArtboard(page, newArtboard);
        const originalStrings = dom.find('Text', artboard);
        const texts = dom.find('Text', newArtboard);
        const originalSymbols = dom.find('SymbolInstance', artboard);
        const symbols = dom.find('SymbolInstance', newArtboard);
        translations
            .filter(tr => tr.type === TEXT_TYPE)
            .forEach(translation => {
                for (let i = 0; i < originalStrings.length; i++) {
                    const originalString = originalStrings[i];
                    if (originalString.id === translation.id && i < texts.length) {
                        texts[i].text = translation.text;
                    }
                }
            });
        translations
            .filter(tr => tr.type === SYMBOL_TYPE)
            .forEach(translation => {
                const symbolId = translation.symbol;
                const textId = translation.id
                for (let i = 0; i < originalSymbols.length; i++) {
                    const originalSymbol = originalSymbols[i];
                    for (let j = 0; j < originalSymbol.overrides.length; j++) {
                        const override = originalSymbol.overrides[j];
                        if (originalSymbol.id + '/' + override.id === textId) {
                            symbols[i].overrides[j].value = translation.text;
                            break;
                        }
                    }
                }
            });
    } else {
        throw `There are no translations for artboard ${artboard.name}`;
    }
}

async function extractPageTranslations(projectId, targetLanguageId, translationsApi, document, page, languageName, projectFiles) {
    if (projectFiles.data.length > 0) {
        const files = await Promise.all(
            projectFiles.data.map(file => getFile(translationsApi, projectId, file.data.id, targetLanguageId))
        );
        const translations = files.flatMap(file => htmlUtil.parseHtmlForText(file));
        translationsUtil.removeTranslatedElement(document, page.id, languageName, 'page');
        const newPage = page.duplicate();
        translationsUtil.addTranslatedElement(document, page.id, newPage.id, languageName, 'page');
        newPage.name = `${newPage.name} (${languageName})`;
        const originalStrings = dom.find('Text', page);
        const texts = dom.find('Text', newPage);
        const originalSymbols = dom.find('SymbolInstance', page);
        const symbols = dom.find('SymbolInstance', newPage);
        translations
            .filter(tr => tr.type === TEXT_TYPE)
            .forEach(translation => {
                for (let i = 0; i < originalStrings.length; i++) {
                    const originalString = originalStrings[i];
                    if (originalString.id === translation.id && i < texts.length) {
                        texts[i].text = translation.text;
                    }
                }
            });
        translations
            .filter(tr => tr.type === SYMBOL_TYPE)
            .forEach(translation => {
                const symbolId = translation.symbol;
                const textId = translation.id
                for (let i = 0; i < originalSymbols.length; i++) {
                    const originalSymbol = originalSymbols[i];
                    for (let j = 0; j < originalSymbol.overrides.length; j++) {
                        const override = originalSymbol.overrides[j];
                        if (originalSymbol.id + '/' + override.id === textId) {
                            symbols[i].overrides[j].value = translation.text;
                            break;
                        }
                    }
                }
            });
        domUtil.removeGeneratedArtboards(document, page, newPage);
        document.selectedPage = newPage;
    } else {
        throw `There are no translations for page ${page.name}`;
    }
}

async function getFile(translationsApi, projectId, fileId, targetLanguageId) {
    const downloadLink = await translationsApi.buildProjectFileTranslation(projectId, fileId, { targetLanguageId });
    const resp = await fetch(downloadLink.data.url);
    const blob = await resp.blob();
    const html = NSString.alloc().initWithData_encoding(blob, NSUTF8StringEncoding);
    return html.trim();
}

function getFileName(element) {
    return `Sketch_${element.id}.html`;
}

function getDirectoryName(page) {
    return `Sketch_${page.id}`;
}

export { sendPageStrings, sendArtboardStrings, translatePage, translateArtboard };
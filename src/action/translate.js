import ui from 'sketch/ui';
import dom from 'sketch/dom';
import settings from 'sketch/settings';
import { PROJECT_ID, ACCESS_TOKEN_KEY, TEXT_TYPE, SYMBOL_TYPE } from '../constants';
import * as domUtil from '../util/dom';
import * as httpUtil from '../util/http';
import * as localStorage from '../util/local-storage';
import * as htmlUtil from '../util/html';
import { getFileName, getDirectoryName } from '../util/file';

async function translate(languageId, wholePage) {
    try {
        if (!languageId) {
            throw 'Please select a language';
        }
        const selectedDocument = dom.getSelectedDocument();
        if (!selectedDocument) {
            throw 'Please select a document';
        }
        const selectedPage = selectedDocument ? selectedDocument.selectedPage : undefined;
        const projectId = settings.documentSettingForKey(selectedDocument, PROJECT_ID);
        let artboard;

        if (!selectedPage) {
            throw 'Please select a page';
        }
        if (selectedDocument.pages === 0) {
            throw 'Nothing to translate';
        }
        if (!settings.settingForKey(ACCESS_TOKEN_KEY)) {
            throw 'Please specify correct access token';
        }
        if (!projectId) {
            throw 'Please select a project';
        }
        const translatedPages = localStorage.getListOfTranslatedElements(selectedDocument, 'page');
        if (!!wholePage) {
            if (translatedPages.includes(selectedPage.id)) {
                throw 'Generated page cannot be translated';
            }
        } else {
            artboard = domUtil.getSelectedArtboard(selectedPage);
            if (!artboard) {
                throw 'Please select an artboard';
            }
            const translatedArtboard = localStorage.getListOfTranslatedElements(selectedDocument, 'artboard');
            if (translatedArtboard.includes(artboard.id) || translatedPages.includes(artboard.parent.id)) {
                throw 'Generated artboard cannot be translated';
            }
        }

        const { projectsGroupsApi, languagesApi, translationsApi, sourceFilesApi } = httpUtil.createClient();

        const languages = await languagesApi.listSupportedLanguages(500);
        const project = await projectsGroupsApi.getProject(projectId);

        let selectedLanguages = [];
        if (languageId < 0) {
            selectedLanguages = languages.data.filter(l => project.data.targetLanguageIds.includes(l.data.id));
        } else {
            const language = languages.data.find(l => l.data.id === languageId);
            if (!!language) {
                selectedLanguages = [language];
            }
        }

        if (selectedLanguages.length > 0) {
            try {
                const directories = await sourceFilesApi.listProjectDirectories(projectId, undefined, undefined, 500);
                const directory = directories.data.find(d => d.data.name === getDirectoryName(selectedPage));
                if (!directory) {
                    throw 'There are no translations for ' + (wholePage ? `page ${selectedPage.name}` : `artboard ${artboard.name}`);
                }
                const projectFiles = await sourceFilesApi.listProjectFiles(projectId, undefined, directory.data.id, 500);
                ui.message('Downloading translations');
                if (wholePage) {
                    await extractPageTranslations(projectId, selectedLanguages, translationsApi, selectedDocument, selectedPage, projectFiles);
                } else {
                    await extractArtboardTranslations(projectId, selectedLanguages, translationsApi, selectedDocument, selectedPage, artboard, projectFiles);
                }
            } catch (error) {
                httpUtil.handleError(error);
            }
        }
    } catch (error) {
        httpUtil.handleError(error);
    }
}

async function extractArtboardTranslations(projectId, selectedLanguages, translationsApi, document, page, artboard, projectFiles) {
    const foundFile = projectFiles.data.find(file => file.data.name === getFileName(artboard));
    if (!!foundFile) {
        ui.message('Loading translations');
        const fileForEachLanguage = [];
        for (let i = 0; i < selectedLanguages.length; i++) {
            const lang = selectedLanguages[i];
            //in sequential manner instead of parallel because back end produce incorrect results
            const html = await getFile(translationsApi, projectId, foundFile.data.id, lang.data.id);
            ui.message(`Translations for language ${lang.data.name} loaded`);
            fileForEachLanguage.push({ html, languageName: lang.data.name });
        }
        fileForEachLanguage.forEach(e => {
            const { html, languageName } = e;
            const translations = htmlUtil.parseHtmlForText(html);
            localStorage.removeTranslatedElement(document, artboard.id, languageName, 'artboard');
            const newArtboard = artboard.duplicate();
            localStorage.addTranslatedElement(document, artboard.id, newArtboard.id, languageName, 'artboard');
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
                    const textId = translation.id
                    for (let i = 0; i < originalSymbols.length; i++) {
                        const originalSymbol = originalSymbols[i];
                        for (let j = 0; j < originalSymbol.overrides.length; j++) {
                            const override = originalSymbol.overrides[j];
                            if (originalSymbol.id + '/' + override.id === textId) {
                                symbols[i].overrides[j].value = translation.text;
                                return;
                            }
                        }
                    }
                });
            ui.message(`Artboard ${newArtboard.name} was created`);
        });
    } else {
        throw `There are no translations for artboard ${artboard.name}`;
    }
}

async function extractPageTranslations(projectId, selectedLanguages, translationsApi, document, page, projectFiles) {
    if (projectFiles.data.length > 0) {
        ui.message('Loading translations');
        const filesForEachLanguage = [];
        for (let i = 0; i < selectedLanguages.length; i++) {
            const lang = selectedLanguages[i];
            //in sequential manner instead of parallel because back end produce incorrect results
            const files = await Promise.all(
                projectFiles.data.map(file => getFile(translationsApi, projectId, file.data.id, lang.data.id))
            );
            ui.message(`Translations for language ${lang.data.name} loaded`);
            filesForEachLanguage.push({ files, languageName: lang.data.name });
        }
        filesForEachLanguage.forEach(e => {
            const { files, languageName } = e;
            const translations = files.flatMap(file => htmlUtil.parseHtmlForText(file));
            localStorage.removeTranslatedElement(document, page.id, languageName, 'page');
            const newPage = page.duplicate();
            localStorage.addTranslatedElement(document, page.id, newPage.id, languageName, 'page');
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
            ui.message(`Page ${newPage.name} was created`);
        });
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

export { translate };
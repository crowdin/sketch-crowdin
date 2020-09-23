import ui from 'sketch/ui';
import dom from 'sketch/dom';
import settings from 'sketch/settings';
import { PROJECT_ID, ACCESS_TOKEN_KEY, TEXT_TYPE, SYMBOL_TYPE } from '../constants';
import * as domUtil from '../util/dom';
import * as httpUtil from '../util/http';
import * as localStorage from '../util/local-storage';
import * as htmlUtil from '../util/html';
import { getFileName, getDirectoryName } from '../util/file';
import { default as displayTexts } from '../../assets/texts.json';

async function translate(languageId, wholePage) {
    try {
        if (!languageId) {
            throw displayTexts.notifications.warning.selectLanguage;
        }
        const selectedDocument = dom.getSelectedDocument();
        if (!selectedDocument) {
            throw displayTexts.notifications.warning.selectDocument;
        }
        const selectedPage = selectedDocument ? selectedDocument.selectedPage : undefined;
        const projectId = settings.documentSettingForKey(selectedDocument, PROJECT_ID);
        let artboard;

        if (!selectedPage) {
            throw displayTexts.notifications.warning.selectPage;
        }
        if (selectedDocument.pages === 0) {
            throw displayTexts.notifications.warning.nothingToTranslate;
        }
        if (!settings.settingForKey(ACCESS_TOKEN_KEY)) {
            throw displayTexts.notifications.warning.noAccessToken;
        }
        if (!projectId) {
            throw displayTexts.notifications.warning.selectProject;
        }
        const translatedPages = localStorage.getListOfTranslatedElements(selectedDocument, 'page');
        if (!!wholePage) {
            if (translatedPages.includes(selectedPage.id)) {
                throw displayTexts.notifications.warning.generatedPageCannotBeTranslated;
            }
        } else {
            artboard = domUtil.getSelectedArtboard(selectedPage);
            if (!artboard) {
                throw displayTexts.notifications.warning.selectArtboard;
            }
            const translatedArtboard = localStorage.getListOfTranslatedElements(selectedDocument, 'artboard');
            if (translatedArtboard.includes(artboard.id) || translatedPages.includes(artboard.parent.id)) {
                throw displayTexts.notifications.warning.generatedArtboardCannotBeTranslated;
            }
        }

        const { projectsGroupsApi, languagesApi, translationsApi, sourceFilesApi } = httpUtil.createClient();

        const languages = await languagesApi.withFetchAll().listSupportedLanguages();
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
                const directories = await sourceFilesApi.withFetchAll().listProjectDirectories(projectId);
                const directory = directories.data.find(d => d.data.name === getDirectoryName(selectedPage));
                if (!directory) {
                    if (wholePage) {
                        throw displayTexts.notifications.warning.noTranslationsForPage.replace('%name%', selectedPage.name);
                    } else {
                        throw displayTexts.notifications.warning.noTranslationsForArtboard.replace('%name%', artboard.name);
                    }
                }
                const projectFiles = await sourceFilesApi.withFetchAll().listProjectFiles(projectId, undefined, directory.data.id);
                ui.message(displayTexts.notifications.info.downloadingTranslations);
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
        ui.message(displayTexts.notifications.info.loadingTranslations);
        const fileForEachLanguage = [];
        for (let i = 0; i < selectedLanguages.length; i++) {
            const lang = selectedLanguages[i];
            //in sequential manner instead of parallel because back end produce incorrect results
            const html = await getFile(translationsApi, projectId, foundFile.data.id, lang.data.id);
            ui.message(displayTexts.notifications.info.translationsForLanguageLoaded.replace('%name%', lang.data.name));
            fileForEachLanguage.push({ html, languageName: lang.data.name });
        }
        fileForEachLanguage.forEach(e => {
            const { html, languageName } = e;
            const translations = htmlUtil.parseHtmlForText(html);
            localStorage.removeTranslatedElements(document, artboard.id, languageName, 'artboard');
            const amountOfTranslatedElements = localStorage.getAmountOfTranslatedElements(document, artboard.id, languageName, 'artboard');
            const newArtboard = artboard.duplicate();
            localStorage.addTranslatedElement(document, artboard.id, newArtboard.id, languageName, 'artboard');
            newArtboard.name = `${newArtboard.name} (${languageName})${amountOfTranslatedElements > 0 ? ` (${amountOfTranslatedElements + 1})` : ''}`;
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
            ui.message(displayTexts.notifications.info.translatedArtboardCreated.replace('%name%', newArtboard.name));
        });
    } else {
        throw displayTexts.notifications.warning.noTranslationsForArtboard.replace('%name%', artboard.name);
    }
}

async function extractPageTranslations(projectId, selectedLanguages, translationsApi, document, page, projectFiles) {
    if (projectFiles.data.length > 0) {
        ui.message(displayTexts.notifications.info.loadingTranslations);
        const filesForEachLanguage = [];
        for (let i = 0; i < selectedLanguages.length; i++) {
            const lang = selectedLanguages[i];
            //in sequential manner instead of parallel because back end produce incorrect results
            const files = await Promise.all(
                projectFiles.data.map(file => getFile(translationsApi, projectId, file.data.id, lang.data.id))
            );
            ui.message(displayTexts.notifications.info.translationsForLanguageLoaded.replace('%name%', lang.data.name));
            filesForEachLanguage.push({ files, languageName: lang.data.name });
        }
        filesForEachLanguage.forEach(e => {
            const { files, languageName } = e;
            const translations = files.flatMap(file => htmlUtil.parseHtmlForText(file));
            localStorage.removeTranslatedElements(document, page.id, languageName, 'page');
            const amountOfTranslatedElements = localStorage.getAmountOfTranslatedElements(document, page.id, languageName, 'page');
            const newPage = page.duplicate();
            localStorage.addTranslatedElement(document, page.id, newPage.id, languageName, 'page');
            newPage.name = `${newPage.name} (${languageName})${amountOfTranslatedElements > 0 ? ` (${amountOfTranslatedElements + 1})` : ''}`;
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
            ui.message(displayTexts.notifications.info.translatedPageCreated.replace('%name%', newPage.name));
        });
    } else {
        throw displayTexts.notifications.warning.noTranslationsForPage.replace('%name%', page.name);
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
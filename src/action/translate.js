import ui from 'sketch/ui';
import dom from 'sketch/dom';
import settings from 'sketch/settings';
import JSZip from 'jszip';
import { Buffer } from '@skpm/buffer';
import { PROJECT_ID, ACCESS_TOKEN_KEY, TEXT_TYPE, SYMBOL_TYPE, BRANCH_ID } from '../constants';
import * as domUtil from '../util/dom';
import * as httpUtil from '../util/http';
import * as localStorage from '../util/local-storage';
import * as htmlUtil from '../util/html';
import { getFileName, getDirectoryName } from '../util/file';
import { default as displayTexts } from '../../assets/texts.json';
import { truncateLongText } from '../util/string';

async function translate(languageId, wholePage) {
    try {
        if (!languageId) {
            throw displayTexts.notifications.warning.selectLanguage;
        }
        const { projectId, branchId, selectedDocument, selectedPage, artboards } = checkConfiguration(wholePage);

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

        if (selectedLanguages.length === 0) {
            return;
        }

        try {
            const directories = await sourceFilesApi.withFetchAll().listProjectDirectories(projectId, { branchId: branchId});
            const directory = directories.data.find(d => d.data.name === getDirectoryName(selectedPage));
            if (!directory) {
                throw displayTexts.notifications.warning.noTranslationsForPage.replace('%name%', truncateLongText(selectedPage.name));
            }
            const projectFiles = await sourceFilesApi.withFetchAll().listProjectFiles(projectId, { branchId: undefined, directoryId: directory.data.id });
            if (projectFiles.data.length === 0) {
                throw displayTexts.notifications.warning.noTranslationsForPage.replace('%name%', truncateLongText(page.name));
            }
            const artboardFileNames = artboards && artboards.map(getFileName);
            ui.message(displayTexts.notifications.info.loadingTranslations);
            const filesForEachLanguage = [];
            for (let i = 0; i < selectedLanguages.length; i++) {
                const lang = selectedLanguages[i];
                //in sequential manner instead of parallel because back end produce incorrect results
                let files = await Promise.all(
                    projectFiles.data
                        .filter(file => !artboardFileNames || artboardFileNames.includes(file.data.name))
                        .map(file => getFile(translationsApi, projectId, file.data.id, lang.data.id))
                );
                files = files.filter(f => !!f);
                ui.message(displayTexts.notifications.info.translationsForLanguageLoaded.replace('%name%', lang.data.name));
                filesForEachLanguage.push({ files, languageName: lang.data.name });
            }
            ui.message(displayTexts.notifications.info.downloadingTranslations);
            await extractPageTranslations(filesForEachLanguage, selectedDocument, selectedPage, artboards);
        } catch (error) {
            httpUtil.handleError(error);
        }
    } catch (error) {
        httpUtil.handleError(error);
    }
}

async function getFile(translationsApi, projectId, fileId, targetLanguageId) {
    const downloadLink = await translationsApi.buildProjectFileTranslation(projectId, fileId, { targetLanguageId });
    if (!downloadLink || !downloadLink.data) {
        return;
    }
    const resp = await fetch(downloadLink.data.url);
    const blob = await resp.blob();
    const html = NSString.alloc().initWithData_encoding(blob, NSUTF8StringEncoding);
    return html.trim();
}

async function pseudoLocalize(request) {
    try {
        const { wholePage, lengthTransformation, charTransformation, prefix, suffix } = request;
        const { projectId, branchId, selectedDocument, selectedPage, artboards } = checkConfiguration(wholePage);

        const { translationsApi, sourceFilesApi } = httpUtil.createClient();
        let filesPrefix = getDirectoryName(selectedPage);
        if (branchId) {
            const branchRes = await sourceFilesApi.getBranch(projectId, branchId);
            filesPrefix = `${branchRes.data.name}/${filesPrefix}`;
        }
        ui.message(displayTexts.notifications.info.pseudoLocalizationBuildStarted);
        const build = await translationsApi.buildProject(projectId, {
            prefix,
            suffix,
            lengthTransformation,
            charTransformation,
            pseudo: true,
            branchId,
        });

        let finished = false;
        while (!finished) {
            const status = await translationsApi.checkBuildStatus(projectId, build.data.id);
            finished = status.data.status === 'finished';
            if (!finished) {
                ui.message(displayTexts.notifications.info.pseudoLocalizationBuildProgress.replace('%progress%', status.data.progress));
            }
        }
        ui.message(displayTexts.notifications.info.pseudoLocalizationBuildFinished);
        const downloadLink = await translationsApi.downloadTranslations(projectId, build.data.id);
        const resp = await fetch(downloadLink.data.url);
        const blob = await resp.blob();
        const buffer = Buffer.from(blob);
        const zip = await new JSZip().loadAsync(buffer);
        const files = await Promise.all(
            Object.keys(zip.files)
                .filter(fileName => fileName.startsWith(filesPrefix) && fileName.endsWith('.html'))
                .map(fileName => zip.file(fileName).async('text'))
        );
        if (files.length === 0) {
            throw displayTexts.notifications.warning.noTranslationsForPage.replace('%name%', truncateLongText(selectedPage.name));
        }
        const filesForEachLanguage = [{
            files,
            languageName: 'pseudo'
        }];
        await extractPageTranslations(filesForEachLanguage, selectedDocument, selectedPage, artboards);
    } catch (error) {
        httpUtil.handleError(error);
    }
}

function checkConfiguration(wholePage) {
    const selectedDocument = dom.getSelectedDocument();
    if (!selectedDocument) {
        throw displayTexts.notifications.warning.selectDocument;
    }
    const selectedPage = selectedDocument ? selectedDocument.selectedPage : undefined;
    const projectId = settings.documentSettingForKey(selectedDocument, PROJECT_ID);
    let branchId = settings.documentSettingForKey(dom.getSelectedDocument(), BRANCH_ID);
    branchId = !!branchId && branchId > 0 ? branchId : undefined;
    let artboards;

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
    const translatedPages = localStorage.getListOfTranslatedPages(selectedDocument);
    if (!!wholePage) {
        if (translatedPages.includes(selectedPage.id)) {
            throw displayTexts.notifications.warning.generatedPageCannotBeTranslated;
        }
    } else {
        artboards = domUtil.getSelectedArtboards(selectedPage);
        if (artboards.length === 0) {
            throw displayTexts.notifications.warning.selectArtboard;
        }
        const translatedSelected = artboards.some(artboard => translatedPages.includes(artboard.parent.id));
        if (translatedSelected) {
            throw displayTexts.notifications.warning.generatedArtboardCannotBeTranslated;
        }
    }
    return { branchId, projectId, artboards, selectedPage, selectedDocument }
}

async function extractPageTranslations(filesForEachLanguage, document, page, artboards) {
    filesForEachLanguage.forEach(e => {
        const { files, languageName } = e;
        const translations = files.flatMap(file => htmlUtil.parseHtmlForText(file));
        localStorage.removeTranslatedPages(document, page.id, languageName);
        const amountOfTranslatedElements = localStorage.getAmountOfTranslatedPages(document, page.id, languageName);
        const newPage = page.duplicate();
        localStorage.addTranslatedPage(document, page.id, newPage.id, languageName);
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
        artboards && domUtil.removeGeneratedArtboards(page, newPage, artboards.map(artboard => artboard.id));
        document.selectedPage = newPage;
        ui.message(displayTexts.notifications.info.translatedPageCreated.replace('%name%', truncateLongText(newPage.name)));
    });
}

export { translate, pseudoLocalize };
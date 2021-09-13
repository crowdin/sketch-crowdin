import ui from 'sketch/ui';
import dom from 'sketch/dom';
import settings from 'sketch/settings';
import { PROJECT_ID, ACCESS_TOKEN_KEY, TEXT_TYPE, SYMBOL_TYPE } from '../constants';
import * as httpUtil from '../util/http';
import * as localStorage from '../util/local-storage';
import * as domUtil from '../util/dom';
import { default as displayTexts } from '../../assets/texts.json';
import { truncateLongText } from '../util/string';

async function stringsPreview(options, wholePage) {
    try {
        const language = {
            id: options.langId,
            name: options.langName
        };
        const previewMode = options.previewMode;
        const cachedTranslations = options.translations && { data: options.translations };
        if (!language) {
            throw displayTexts.notifications.warning.selectLanguage;
        }
        const selectedDocument = dom.getSelectedDocument();
        if (!selectedDocument) {
            throw displayTexts.notifications.warning.selectDocument;
        }
        const selectedPage = selectedDocument ? selectedDocument.selectedPage : undefined;
        const projectId = settings.documentSettingForKey(selectedDocument, PROJECT_ID);

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
        let artboards;
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

        const { stringTranslationsApi, languagesApi, projectsGroupsApi } = httpUtil.createClient();
        let selectedLanguages = [];
        if (language.id < 0) {
            const languages = await languagesApi.withFetchAll().listSupportedLanguages();
            const project = await projectsGroupsApi.getProject(projectId);
            selectedLanguages = languages.data.map(e => e.data).filter(l => project.data.targetLanguageIds.includes(l.id));
        } else {
            selectedLanguages.push(language);
        }
        for (let i = 0; i < selectedLanguages.length; i++) {
            const lang = selectedLanguages[i];
            !cachedTranslations && ui.message(displayTexts.notifications.info.loadingTranslationsForLanguage.replace('%name%', lang.name));
            const res = cachedTranslations || await stringTranslationsApi.withFetchAll().listLanguageTranslations(projectId, lang.id);
            extractPageTranslations(lang.name, selectedDocument, selectedPage, res.data, previewMode === 'duplicate', artboards);
        }
    } catch (error) {
        httpUtil.handleError(error);
    }
}


function extractPageTranslations(languageName, document, page, translations, previewInDuplicate, artboards) {
    const artboardIds = artboards && artboards.map(a => a.id);
    const tags = localStorage.getTags(document);
    let newPage;
    if (previewInDuplicate) {
        localStorage.removeTranslatedPages(document, page.id, languageName);
        const amountOfTranslatedElements = localStorage.getAmountOfTranslatedPages(document, page.id, languageName);
        newPage = page.duplicate();
        localStorage.addTranslatedPage(document, page.id, newPage.id, languageName);
        newPage.name = `${newPage.name} (${languageName})${amountOfTranslatedElements > 0 ? ` (${amountOfTranslatedElements + 1})` : ''}`;
    } else {
        newPage = page;
    }

    const originalStrings = dom.find('Text', page);
    const texts = dom.find('Text', newPage);
    const originalSymbols = dom.find('SymbolInstance', page);
    const symbols = dom.find('SymbolInstance', newPage);
    tags
        .filter(tag => tag.pageId === page.id)
        .filter(tag => !artboardIds || artboardIds.includes(tag.artboardId))
        .forEach(tag => {
            const translation = translations.map(e => e.data).find(e => e.stringId === tag.stringId);
            if (!translation) {
                return;
            }
            const translationText = translation.text || (translation.plurals || []).map(e => e.text).find(e => !!e);
            if (!translationText) {
                return;
            }
            if (tag.type === TEXT_TYPE) {
                const index = originalStrings.findIndex(e => e.id === tag.id);
                if (index >= 0) {
                    texts[index].text = translationText;
                }
            } else if (tag.type === SYMBOL_TYPE) {
                for (let i = 0; i < originalSymbols.length; i++) {
                    const originalSymbol = originalSymbols[i];
                    for (let j = 0; j < originalSymbol.overrides.length; j++) {
                        const override = originalSymbol.overrides[j];
                        if (originalSymbol.id + '/' + override.id === tag.id) {
                            symbols[i].overrides[j].value = translationText;
                            return;
                        }
                    }
                }
            }
        });

    if (previewInDuplicate) {
        artboardIds && domUtil.removeGeneratedArtboards(page, newPage, artboardIds);
        document.selectedPage = newPage;
        ui.message(displayTexts.notifications.info.translatedPageCreated.replace('%name%', truncateLongText(newPage.name)));
    }
}

export { stringsPreview };
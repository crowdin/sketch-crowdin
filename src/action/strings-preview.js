import ui from 'sketch/ui';
import dom from 'sketch/dom';
import settings from 'sketch/settings';
import { PROJECT_ID, ACCESS_TOKEN_KEY, TEXT_TYPE, SYMBOL_TYPE } from '../constants';
import * as httpUtil from '../util/http';
import * as localStorage from '../util/local-storage';
import * as domUtil from '../util/dom';

async function stringsPreview(language) {
    try {
        if (!language) {
            throw 'Please select a language';
        }
        const selectedDocument = dom.getSelectedDocument();
        if (!selectedDocument) {
            throw 'Please select a document';
        }
        const selectedPage = selectedDocument ? selectedDocument.selectedPage : undefined;
        const projectId = settings.documentSettingForKey(selectedDocument, PROJECT_ID);

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
        if (translatedPages.includes(selectedPage.id)) {
            throw 'Generated page cannot be translated';
        }

        const { stringTranslationsApi } = httpUtil.createClient();
        const res = await stringTranslationsApi.withFetchAll().listLanguageTranslations(projectId, language.id);
        extractPageTranslations(language.name, selectedDocument, selectedPage, res.data);
    } catch (error) {
        httpUtil.handleError(error);
    }
}


function extractPageTranslations(languageName, document, page, translations) {
    const tags = localStorage.getTags(document);
    localStorage.removeTranslatedElement(document, page.id, languageName, 'page');
    const newPage = page.duplicate();
    localStorage.addTranslatedElement(document, page.id, newPage.id, languageName, 'page');
    newPage.name = `${newPage.name} (${languageName})`;

    const originalStrings = dom.find('Text', page);
    const texts = dom.find('Text', newPage);
    const originalSymbols = dom.find('SymbolInstance', page);
    const symbols = dom.find('SymbolInstance', newPage);
    tags
        .filter(tag => tag.pageId === page.id)
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

    domUtil.removeGeneratedArtboards(document, page, newPage);
    document.selectedPage = newPage;
    ui.message(`Page ${newPage.name} was created`);

}



export { stringsPreview };
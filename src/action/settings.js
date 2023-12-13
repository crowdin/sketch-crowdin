import ui from 'sketch/ui';
import dom from 'sketch/dom';
import settings from 'sketch/settings';
import { capitalize, snakeCase } from 'lodash';
import {
    ACCESS_TOKEN_KEY,
    PROJECT_ID,
    ORGANIZATION,
    OVERRIDE_TRANSLATIONS,
    CONTENT_SEGMENTATION,
    DEFAULT_STRINGS_KEY_NAMING_OPTION,
    KEY_NAMING_PATTERN,
    STRINGS_KEY_NAMING_OPTIONS,
    BRANCH_ID,
    CUSTOM_KEY_NAMING_PATTERN
} from '../constants';
import { default as displayTexts } from '../../assets/texts.json';
import * as domUtil from '../util/dom';

function contactUs() {
    NSWorkspace.sharedWorkspace().openURL(NSURL.URLWithString("https://crowdin.com/contacts"));
}

function fileFormats() {
    NSWorkspace.sharedWorkspace().openURL(NSURL.URLWithString("https://support.crowdin.com/files-management/#string-editing"));
}

function getCredentials() {
    let token = settings.settingForKey(ACCESS_TOKEN_KEY);
    const organization = settings.settingForKey(ORGANIZATION);
    return { token, organization };
}

function getOverrideTranslations() {
    if (!dom.getSelectedDocument()) {
        ui.message(displayTexts.notifications.warning.selectDocument);
        return { overrideTranslations: false };
    }
    return {
        overrideTranslations: settings.documentSettingForKey(dom.getSelectedDocument(), OVERRIDE_TRANSLATIONS)
    };
}

function saveOverrideTranslations(value) {
    if (!dom.getSelectedDocument()) {
        ui.message(displayTexts.notifications.warning.selectDocument);
        return;
    }
    settings.setDocumentSettingForKey(dom.getSelectedDocument(), OVERRIDE_TRANSLATIONS, value);
    ui.message(displayTexts.notifications.info.overrideTranslationsSaved);
}

function getContentSegmentation() {
    if (!dom.getSelectedDocument()) {
        ui.message(displayTexts.notifications.warning.selectDocument);
        return { contentSegmentation: true };
    }
    const value = settings.documentSettingForKey(dom.getSelectedDocument(), CONTENT_SEGMENTATION);
    return {
        contentSegmentation: value === undefined ? true : !!value
    };
}

function saveContentSegmentation(value) {
    if (!dom.getSelectedDocument()) {
        ui.message(displayTexts.notifications.warning.selectDocument);
        return;
    }
    settings.setDocumentSettingForKey(dom.getSelectedDocument(), CONTENT_SEGMENTATION, !!value);
    ui.message(displayTexts.notifications.info.contentSegmentationSaved);
}

function getKeyPatternOptions() {
    let selectedOption = !!dom.getSelectedDocument() && !!settings.documentSettingForKey(dom.getSelectedDocument(), KEY_NAMING_PATTERN)
        ? parseInt(settings.documentSettingForKey(dom.getSelectedDocument(), KEY_NAMING_PATTERN))
        : DEFAULT_STRINGS_KEY_NAMING_OPTION;
    return STRINGS_KEY_NAMING_OPTIONS.map(e => {
        return {
            selected: selectedOption === e.id,
            ...e
        };
    })
}

function saveKeyPatternOption(value) {
    if (!dom.getSelectedDocument()) {
        ui.message(displayTexts.notifications.warning.selectDocument);
        return;
    }
    settings.setDocumentSettingForKey(dom.getSelectedDocument(), KEY_NAMING_PATTERN, value);
    ui.message(displayTexts.notifications.info.stringsKeyNamingSaved);
}

function saveCustomKeyPattern(value) {
    settings.setSettingForKey(CUSTOM_KEY_NAMING_PATTERN, value);
    ui.message(displayTexts.notifications.info.stringsCustomKeyNamingSaved);
}

function getCustomKeyPattern() {
    const customKey = settings.settingForKey(CUSTOM_KEY_NAMING_PATTERN);
    return customKey
}

const keyNaming = {
    artboard: ({ page }) => `${snakeCase(page)}`,
    Artboard: ({ page }) => `${capitalize(snakeCase(page))}`,
    group: ({ frame }) => `${snakeCase(frame)}`,
    Group: ({ frame }) => `${capitalize(snakeCase(frame))}`,
    element_name: ({ element }) => `${snakeCase(element)}`,
    Element_name: ({ element }) => `${capitalize(snakeCase(element))}`,
  };

const getSearchHelperList = (value) => {
    let substring = null;
    const helpers = [];
    Object.keys(keyNaming).forEach((el) => {
      const lastIndex = value.lastIndexOf("[%");
      substring = lastIndex === -1 ? null : value.substring(lastIndex + 2, value.length);
      if (el.indexOf(substring) !== -1) {
        helpers.push(el);
      }
    });
  
    return helpers;
  };

function saveCredentials(creds) {
    const token = settings.settingForKey(ACCESS_TOKEN_KEY);
    let initValue = undefined;
    if (!!token && token.length > 3) {
        initValue = token.substring(0, 3) + '...';
    }
    if (creds.token !== initValue) {
        settings.setSettingForKey(ACCESS_TOKEN_KEY, creds.token);
    }
    settings.setSettingForKey(ORGANIZATION, extractCrowdinOrganization(creds.organization));
    ui.message(displayTexts.notifications.info.credentialsSaved);
}

function extractCrowdinOrganization(value) {
    if (value) {
        const match = value.match(/([\w\d\-]+)(\.crowdin\.com|$)/);
        return match ? match[1] : value;
    }
}

function saveProject(projectId) {
    if (!dom.getSelectedDocument()) {
        ui.message(displayTexts.notifications.warning.selectDocument);
        return;
    }
    settings.setDocumentSettingForKey(dom.getSelectedDocument(), PROJECT_ID, projectId);
    if (!!projectId) {
        ui.message(displayTexts.notifications.info.projectSaved);
    }
}

function saveBranch(branchId) {
    if (!dom.getSelectedDocument()) {
        ui.message(displayTexts.notifications.warning.selectDocument);
        return;
    }
    settings.setDocumentSettingForKey(dom.getSelectedDocument(), BRANCH_ID, branchId);
    if (!!branchId) {
        ui.message(displayTexts.notifications.info.branchSaved);
    }
}

function logout() {
    if (!dom.getSelectedDocument()) {
        ui.message(displayTexts.notifications.warning.selectDocument);
        return;
    }
    settings.setSettingForKey(ORGANIZATION, undefined);
    settings.setSettingForKey(ACCESS_TOKEN_KEY, undefined);
    settings.setDocumentSettingForKey(dom.getSelectedDocument(), PROJECT_ID, undefined);
}

function isArtboardSelected() {
    try {
        const selectedDocument = dom.getSelectedDocument();
        if (!selectedDocument) {
            throw displayTexts.notifications.warning.selectDocument;
        }
        const selectedPage = selectedDocument ? selectedDocument.selectedPage : undefined;

        if (!selectedPage) {
            throw displayTexts.notifications.warning.selectPage;
        }
        return {
            selected: domUtil.getSelectedArtboards(selectedPage).length > 0
        }
    } catch (error) {
        httpUtil.handleError(error);
    }
}

export {
    contactUs,
    getCredentials,
    getOverrideTranslations,
    saveOverrideTranslations,
    getContentSegmentation,
    saveContentSegmentation,
    getKeyPatternOptions,
    saveKeyPatternOption,
    saveCredentials,
    saveProject,
    saveBranch,
    logout,
    isArtboardSelected,
    fileFormats,
    saveCustomKeyPattern,
    getSearchHelperList,
    getCustomKeyPattern
};
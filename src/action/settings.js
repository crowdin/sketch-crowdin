import ui from 'sketch/ui';
import dom from 'sketch/dom';
import settings from 'sketch/settings';
import {
    ACCESS_TOKEN_KEY,
    PROJECT_ID,
    ORGANIZATION,
    OVERRIDE_TRANSLATIONS,
    CONTENT_SEGMENTATION,
    DEFAULT_STRINGS_KEY_NAMING_OPTION,
    KEY_NAMING_PATTERN,
    STRINGS_KEY_NAMING_OPTIONS,
    BRANCH_ID
} from '../constants';
import { default as displayTexts } from '../../assets/texts.json';

function contactUs() {
    NSWorkspace.sharedWorkspace().openURL(NSURL.URLWithString("https://crowdin.com/contacts"));
}

function getCredentials() {
    let token = settings.settingForKey(ACCESS_TOKEN_KEY);
    if (!!token && token.length > 3) {
        token = token.substring(0, 3) + '...';
    }
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

function saveCredentials(creds) {
    const token = settings.settingForKey(ACCESS_TOKEN_KEY);
    let initValue = undefined;
    if (!!token && token.length > 3) {
        initValue = token.substring(0, 3) + '...';
    }
    if (creds.token !== initValue) {
        settings.setSettingForKey(ACCESS_TOKEN_KEY, creds.token);
    }
    settings.setSettingForKey(ORGANIZATION, creds.organization);
    ui.message(displayTexts.notifications.info.credentialsSaved);
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
    saveBranch
};
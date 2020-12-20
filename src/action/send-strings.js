import ui from 'sketch/ui';
import dom from 'sketch/dom';
import settings from 'sketch/settings';
import { PROJECT_ID, ACCESS_TOKEN_KEY, CONTENT_SEGMENTATION } from '../constants';
import * as domUtil from '../util/dom';
import * as httpUtil from '../util/http';
import * as localStorage from '../util/local-storage';
import * as htmlUtil from '../util/html';
import { getFileName, getDirectoryName } from '../util/file';
import { default as displayTexts } from '../../assets/texts.json';

async function sendStrings(wholePage) {
    try {
        const selectedDocument = dom.getSelectedDocument();
        if (!selectedDocument) {
            throw displayTexts.notifications.warning.selectDocument;
        }
        const selectedPage = selectedDocument ? selectedDocument.selectedPage : undefined;
        const projectId = settings.documentSettingForKey(selectedDocument, PROJECT_ID);

        if (!selectedPage) {
            throw displayTexts.notifications.warning.selectPage;
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
            await uploadStrings(selectedPage);
        } else {
            const artboard = domUtil.getSelectedArtboard(selectedPage);
            if (!artboard) {
                throw displayTexts.notifications.warning.selectArtboard;
            }
            const translatedArtboards = localStorage.getListOfTranslatedElements(selectedDocument, 'artboard');
            if (translatedArtboards.includes(artboard.id) || translatedPages.includes(artboard.parent.id)) {
                throw displayTexts.notifications.warning.generatedArtboardCannotBeTranslated;
            }
            await uploadStrings(selectedPage, artboard);
        }

        ui.message(displayTexts.notifications.info.stringsUploadedToCrowdin);
    } catch (error) {
        httpUtil.handleError(error);
    }
}

async function uploadStrings(page, artboard) {
    const projectId = settings.documentSettingForKey(dom.getSelectedDocument(), PROJECT_ID);
    const { sourceFilesApi, uploadStorageApi } = httpUtil.createClient();

    const directories = await sourceFilesApi.withFetchAll().listProjectDirectories(projectId);
    let directory = directories.data.find(d => d.data.name === getDirectoryName(page));
    if (!directory) {
        ui.message(displayTexts.notifications.info.creatingNewDirectory);
        directory = await sourceFilesApi.createDirectory(projectId, {
            name: getDirectoryName(page),
            title: page.name
        });
    }

    const projectFiles = await sourceFilesApi.withFetchAll().listProjectFiles(projectId, undefined, directory.data.id);
    if (!!artboard) {
        await uploadArtboard(uploadStorageApi, sourceFilesApi, projectFiles, page, artboard, projectId, directory.data.id);
        return;
    }
    const artboards = dom.find('Artboard', page);
    const translatedArtboards = localStorage.getListOfTranslatedElements(dom.getSelectedDocument(), 'artboard');
    const promises = artboards
        .filter(artboard => !translatedArtboards.includes(artboard.id))
        .map(artboard => uploadArtboard(uploadStorageApi, sourceFilesApi, projectFiles, page, artboard, projectId, directory.data.id));
    promises.push(uploadLeftovers(uploadStorageApi, sourceFilesApi, projectFiles, page, projectId, directory.data.id));

    await Promise.all(promises);
}

async function uploadArtboard(uploadStorageApi, sourceFilesApi, projectFiles, page, artboard, projectId, directoryId) {
    let contentSegmentation = settings.documentSettingForKey(dom.getSelectedDocument(), CONTENT_SEGMENTATION);
    contentSegmentation = contentSegmentation === undefined ? true : !!contentSegmentation;
    const html = htmlUtil.convertArtboardToHtml(page, artboard);
    const fileName = getFileName(artboard);
    const file = projectFiles.data
        .map(f => f.data)
        .find(f => f.name === fileName);
    const storage = await uploadStorageApi.addStorage(fileName, html);
    const storageId = storage.data.id;
    if (!!file) {
        ui.message(`${displayTexts.notifications.info.updatingExistingFileForArtboard} ${artboard.name}`);
        await sourceFilesApi.updateOrRestoreFile(
            projectId,
            file.id,
            {
                storageId,
                importOptions: {
                    contentSegmentation
                }
            }
        );
    } else {
        ui.message(displayTexts.notifications.info.creatingNewFileForArtboard.replace('%name%', artboard.name));
        await sourceFilesApi.createFile(projectId, {
            storageId: storageId,
            name: fileName,
            title: artboard.name,
            directoryId: directoryId,
            importOptions: {
                contentSegmentation
            }
        });
    }
}

async function uploadLeftovers(uploadStorageApi, sourceFilesApi, projectFiles, page, projectId, directoryId) {
    let contentSegmentation = settings.documentSettingForKey(dom.getSelectedDocument(), CONTENT_SEGMENTATION);
    contentSegmentation = contentSegmentation === undefined ? true : !!contentSegmentation;
    const text = htmlUtil.convertOutsideTextToHtml(page);
    const fileName = getFileName(page);
    const file = projectFiles.data
        .map(f => f.data)
        .find(f => f.name === fileName);
    const storage = await uploadStorageApi.addStorage(fileName, text);
    const storageId = storage.data.id;
    if (!!file) {
        ui.message(displayTexts.notifications.info.updatingExistingFileForPage.replace('%name%', page.name));
        await sourceFilesApi.updateOrRestoreFile(
            projectId,
            file.id,
            {
                storageId,
                importOptions: {
                    contentSegmentation
                }
            }
        );
    } else {
        ui.message(displayTexts.notifications.info.creatingNewFileForPage.replace('%name%', page.name));
        await sourceFilesApi.createFile(projectId, {
            storageId: storageId,
            name: fileName,
            title: page.name,
            directoryId: directoryId,
            importOptions: {
                contentSegmentation
            }
        });
    }
}

export { sendStrings };
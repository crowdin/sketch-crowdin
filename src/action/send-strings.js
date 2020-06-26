import ui from 'sketch/ui';
import dom from 'sketch/dom';
import settings from 'sketch/settings';
import { PROJECT_ID, ACCESS_TOKEN_KEY } from '../constants';
import * as domUtil from '../util/dom';
import * as httpUtil from '../util/http';
import * as localStorage from '../util/local-storage';
import * as htmlUtil from '../util/html';
import { getFileName, getDirectoryName } from '../util/file';

async function sendStrings(wholePage) {
    try {
        const selectedDocument = dom.getSelectedDocument();
        if (!selectedDocument) {
            throw 'Please select a document';
        }
        const selectedPage = selectedDocument ? selectedDocument.selectedPage : undefined;
        const projectId = settings.documentSettingForKey(selectedDocument, PROJECT_ID);

        if (!selectedPage) {
            throw 'Please select a page';
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
            await uploadStrings(selectedPage);
        } else {
            const artboard = domUtil.getSelectedArtboard(selectedPage);
            if (!artboard) {
                throw 'Please select an artboard';
            }
            const translatedArtboards = localStorage.getListOfTranslatedElements(selectedDocument, 'artboard');
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
    const translatedArtboards = localStorage.getListOfTranslatedElements(dom.getSelectedDocument(), 'artboard');
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
        await sourceFilesApi.updateOrRestoreFile(projectId, file.id, { storageId });
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
        await sourceFilesApi.updateOrRestoreFile(projectId, file.id, { storageId });
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

export { sendStrings };
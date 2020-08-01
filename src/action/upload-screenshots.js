import dom from 'sketch/dom';
import ui from 'sketch/ui';
import settings from 'sketch/settings';
import * as httpUtil from '../util/http';
import * as localStorage from '../util/local-storage';
import { getTextElementsInArtboard } from '../util/dom';
import { PROJECT_ID, ACCESS_TOKEN_KEY } from '../constants';
import { fetchStrings } from '../util/client';
import { default as displayTexts } from '../../assets/texts.json';

async function uploadScreenshots() {
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

        let tags = localStorage.getTags(selectedDocument);
        let artboards = dom.find('Artboard', selectedPage);
        const allTexts = dom.find('Text', selectedPage);
        const translatedArtboards = localStorage.getListOfTranslatedElements(selectedDocument, 'artboard');
        artboards = artboards.filter(artboard => !translatedArtboards.includes(artboard.id));

        //removing obsolete tags
        const { sourceStringsApi, screenshotsApi } = httpUtil.createClient();
        const strings = await fetchStrings(projectId, sourceStringsApi);
        const stringsIds = strings.map(st => st.id)

        const screenshotsBefore = [];
        tags
            .filter(t => !!t.artboardId)
            .map(t => __buildScreenshotName(t.artboardId, t.pageId))
            .filter(id => !screenshotsBefore.includes(id))
            .forEach(id => screenshotsBefore.push(id));

        tags = tags.filter(t => stringsIds.includes(t.stringId));

        const artboardsTexts = artboards.map(e => {
            return {
                artboard: e,
                texts: getTextElementsInArtboard(e)
            }
        });

        const tempTags = [];
        tags = tags.filter(e => {
            if (e.pageId !== selectedPage.id) {
                return !!selectedDocument.pages.find(p => p.id === e.pageId);
            }
            if (!e.artboardId) {
                return !!allTexts.find(t => t.id === e.id);
            }
            const artboardTexts = artboardsTexts.find(e2 => e2.artboard.id === e.artboardId);
            if (!!artboardTexts) {
                const foundText = artboardTexts.texts.find(t => t.textId === e.id && t.type === e.type);
                if (!!foundText) {
                    tempTags.push({
                        ...e,
                        textElement: foundText
                    });
                }
                return !!foundText;
            }
            return false;
        });

        const groupedTags = tempTags.reduce((accumulator, tag) => {
            if (!accumulator[`artboard_${tag.artboardId}`]) {
                accumulator[`artboard_${tag.artboardId}`] = {
                    artboard: artboards.find(a => a.id === tag.artboardId),
                    tags: [tag]
                };
            } else {
                accumulator[`artboard_${tag.artboardId}`].tags.push(tag);
            }
            return accumulator;
        }, {});

        const screenshots = await screenshotsApi.withFetchAll().listScreenshots(projectId);

        const screenshotsAfter = [];
        tags
            .filter(t => !!t.artboardId)
            .map(t => __buildScreenshotName(t.artboardId, t.pageId))
            .filter(id => !screenshotsAfter.includes(id))
            .forEach(id => screenshotsAfter.push(id));

        //removing obsolete screenshots
        const promises = screenshotsBefore
            .filter(id => !screenshotsAfter.includes(id))
            .map(async screenshotName => {
                const screenshot = screenshots.data.find(sc => sc.data.name === screenshotName);
                if (!!screenshot) {
                    ui.message(displayTexts.notifications.info.removingNotValidScreenshot.replace('%name%', screenshot.data.name));
                    await screenshotsApi.deleteScreenshot(projectId, screenshot.data.id);
                }
            })

        for (let key in groupedTags) {
            if (groupedTags.hasOwnProperty(key)) {
                promises.push(sendTagsGroup(groupedTags[key], selectedPage, projectId, screenshots));
            }
        }

        await Promise.all(promises);

        localStorage.saveTags(selectedDocument, tags);
        ui.message(displayTexts.notifications.info.screenshotsUploadedToCrowdin);
    } catch (error) {
        httpUtil.handleError(error);
    }
}

async function sendTagsGroup(tagsGroup, page, projectId, screenshots) {
    const artboard = tagsGroup.artboard;
    const tags = tagsGroup.tags;
    const b = dom.export(artboard, {
        output: false,
        formats: 'png'
    });
    ui.message(displayTexts.notifications.info.screenshotUploadingToCrowdin.replace('%name%', artboard.name));
    const { screenshotsApi, uploadStorageApi } = httpUtil.createClient();
    const screenshotName = __buildScreenshotName(artboard.id, page.id);
    const storageRecord = await uploadStorageApi.addStorage(`${screenshotName}.png`, b.slice(b.byteOffset, b.byteOffset + b.byteLength));

    let screenshot = screenshots.data.find(sc => sc.data.name === screenshotName);

    if (!screenshot) {
        screenshot = await screenshotsApi.addScreenshot(projectId, {
            storageId: storageRecord.data.id,
            name: screenshotName
        });
    } else {
        screenshot = await screenshotsApi.updateScreenshot(projectId, screenshot.data.id, {
            storageId: storageRecord.data.id,
            name: screenshotName
        });
    }
    const screenshotId = screenshot.data.id;

    ui.message(displayTexts.notifications.info.addingTagsToScreenshot.replace('%name%', artboard.name));
    await screenshotsApi.clearTags(projectId, screenshotId);

    const tagsRequest = tags.map(tag => {
        return {
            stringId: tag.stringId,
            position: {
                x: tag.textElement.x,
                y: tag.textElement.y,
                width: tag.textElement.frame.width,
                height: tag.textElement.frame.height
            }
        };
    });

    await screenshotsApi.addTag(projectId, screenshotId, tagsRequest);
    ui.message(displayTexts.notifications.info.screenshotUploadedToCrowdin.replace('%name%', artboard.name));
}

function __buildScreenshotName(artboardId, pageId) {
    return `Sketch_${pageId}_Artboard_${artboardId}`;
}

export { uploadScreenshots };
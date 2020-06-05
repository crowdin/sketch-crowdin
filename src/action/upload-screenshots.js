import dom from 'sketch/dom';
import ui from 'sketch/ui';
import settings from 'sketch/settings';
import * as httpUtil from '../util/http';
import * as localStorage from '../util/local-storage';
import { getTextElementsInArtboard } from '../util/dom';
import { PROJECT_ID, ACCESS_TOKEN_KEY } from '../constants';
import { connectToCrowdin, setProjectIdFromExisting } from '../settings';
import { fetchAllStrings } from '../util/client';

async function uploadScreenshots() {
    try {
        const selectedDocument = dom.getSelectedDocument();
        const selectedPage = selectedDocument ? selectedDocument.selectedPage : undefined;
        const projectId = settings.documentSettingForKey(selectedDocument, PROJECT_ID);

        if (!selectedDocument) {
            throw 'Please select a document';
        }
        if (!selectedPage) {
            throw 'Please select a page';
        }
        if (!settings.settingForKey(ACCESS_TOKEN_KEY)) {
            await connectToCrowdin();
            return;
        }
        if (!projectId) {
            await setProjectIdFromExisting();
            return;
        }

        let tags = localStorage.getTags(selectedDocument);
        let artboards = dom.find('Artboard', selectedPage);
        const translatedArtboards = localStorage.getListOfTranslatedElements(selectedDocument, 'artboard');
        artboards = artboards.filter(artboard => !translatedArtboards.includes(artboard.id));
        const artboardIds = artboards.map(e => e.id);

        //removing obsolete tags
        const { sourceStringsApi, screenshotsApi } = httpUtil.createClient();
        const strings = await fetchAllStrings(projectId, sourceStringsApi);
        const stringsIds = strings.map(st => st.id)

        const artboardIdsBefore = [];
        tags
            .map(t => t.artboardId)
            .filter(artboardId => !artboardIdsBefore.includes(artboardId))
            .forEach(artboardId => artboardIdsBefore.push(artboardId));

        tags = tags
            .filter(t => stringsIds.includes(t.stringId))
            .filter(t => t.pageId !== selectedPage.id || artboardIds.includes(t.artboardId));

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

        const screenshots = await screenshotsApi.listScreenshots(projectId, 500);

        const artboardIdsAfter = [];
        tags
            .map(t => t.artboardId)
            .filter(artboardId => !artboardIdsAfter.includes(artboardId))
            .forEach(artboardId => artboardIdsAfter.push(artboardId));

        //removing obsolete screenshots
        const promises = artboardIdsBefore
            .filter(artboardId => !artboardIdsAfter.includes(artboardId))
            .map(artboardId => __buildScreenshotName(artboardId, selectedPage.id))
            .map(async screenshotName => {
                const screenshot = screenshots.data.find(sc => sc.data.name === screenshotName);
                if (!!screenshot) {
                    ui.message(`Removing screenshot ${screenshot.data.name}`);
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
        ui.message('Screenshots were successfully pushed to Crowdin');
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
    ui.message(`Sending screenshot for ${artboard.name} Artboard`);
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

    ui.message(`Adding tags to screenshot for ${artboard.name} Artboard`);
    await screenshotsApi.clearTags(projectId, screenshotId);

    const tagsRequest = tags.map(tag => {
        return {
            stringId: tag.stringId,
            position: {
                x: tag.textElement.x,
                y: tag.textElement.y,
                width: tag.textElement.e.frame.width,
                height: tag.textElement.e.frame.height
            }
        };
    });

    await screenshotsApi.addTag(projectId, screenshotId, tagsRequest);
    ui.message(`Screenshot for ${artboard.name} Artboard successfully pushed to Crowdin`);
}

function __buildScreenshotName(artboardId, pageId) {
    return `Sketch_${pageId}_Artboard_${artboardId}`;
}

export { uploadScreenshots };
const KEY_PREFIX = 'crowdin';

export const ACCESS_TOKEN_KEY = `${KEY_PREFIX}-access-token`;
export const ORGANIZATION = `${KEY_PREFIX}-organization`;
export const PROJECT_ID = `${KEY_PREFIX}-project-id`;
export const BRANCH_ID = `${KEY_PREFIX}-branch-id`;
export const OVERRIDE_TRANSLATIONS = `${KEY_PREFIX}-override-translations`;
export const CONTENT_SEGMENTATION = `${KEY_PREFIX}-content-segmentation`;
export const KEY_NAMING_PATTERN = `${KEY_PREFIX}-key-naming`;

export const SYMBOL_TYPE = 'symbol-override';
export const TEXT_TYPE = 'text';

export const PLUGIN_VERSION = '2.3.1';

export const STRINGS_KEY_NAMING_OPTIONS = [
    { id: 1, name: 'Artboard.Group.Element_name', },
    { id: 2, name: 'Artboard:Group:Element_name' },
    { id: 3, name: 'Artboard::Group::Element_name' },
    { id: 4, name: 'Artboard__Group__Element_name' },
    { id: 5, name: 'Artboard.Element_name' },
    { id: 6, name: 'Artboard::Element_name' },
    { id: 7, name: 'Artboard__Element_name' },
    { id: 8, name: 'artboard.group.element_name' },
    { id: 9, name: 'artboard:group:element_name' },
    { id: 10, name: 'artboard::group::element_name' },
    { id: 11, name: 'artboard__group__element_name' },
    { id: 12, name: 'artboard.element_name' },
    { id: 13, name: 'artboard:element_name' },
    { id: 14, name: 'artboard::element_name' },
    { id: 15, name: 'artboard__element_name' },
    { id: 16, name: 'element_name' }
];

export const DEFAULT_STRINGS_KEY_NAMING_OPTION = 16;
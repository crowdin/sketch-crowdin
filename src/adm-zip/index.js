import ZipFile from './zipFile';

export default function (input) {
    var _zip = new ZipFile(input);
    return {
        getEntries: function () {
            if (_zip) {
                return _zip.entries;
            } else {
                return [];
            }
        }
    }
};
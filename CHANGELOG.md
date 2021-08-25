# Change Log

All notable changes to the Crowdin Sketch Plugin extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.4.0]

### Added

- Option to preview strings translations in the current page ([#81](https://github.com/crowdin/sketch-crowdin/pull/81))
- Option to update texts linked to strings changed in Crowdin ([#81](https://github.com/crowdin/sketch-crowdin/pull/81))
- Option to preview string keys ([#81](https://github.com/crowdin/sketch-crowdin/pull/81))
- Recursive search for selected text elements for strings mass adding ([#83](https://github.com/crowdin/sketch-crowdin/pull/83))

### Updated

- Dependencies update ([#78](https://github.com/crowdin/sketch-crowdin/pull/78)), ([#82](https://github.com/crowdin/sketch-crowdin/pull/82))

### Fixed

- Fix: fixed issue with use single string in multiple places ([#80](https://github.com/crowdin/sketch-crowdin/pull/80))
- Fix: updating text in design if source string was edited ([#79](https://github.com/crowdin/sketch-crowdin/pull/79))

## [2.3.7]

### Added

- String labels ([#76](https://github.com/crowdin/sketch-crowdin/pull/76))

## [2.3.6]

### Updated

- Updated dependencies ([#72](https://github.com/crowdin/sketch-crowdin/pull/72))
- Added delay in search strings ([#69](https://github.com/crowdin/sketch-crowdin/pull/69))

### Fixed

- Fixed strings rendering ([#64](https://github.com/crowdin/sketch-crowdin/pull/64))

## [2.3.5]

### Added

- Added search by string context ([#64](https://github.com/crowdin/sketch-crowdin/pull/64))
- Preserving files selection ([#65](https://github.com/crowdin/sketch-crowdin/pull/65))

### Fixed

- Limited amount of strings to display ([#66](https://github.com/crowdin/sketch-crowdin/pull/66))

## [2.3.4]

### Updated

- Disable connect/logout buttons when necessary ([#58](https://github.com/crowdin/sketch-crowdin/pull/58))
- Improved validation for max length ([#60](https://github.com/crowdin/sketch-crowdin/pull/60))

### Fixed

- Fixed missing context in new strings ([#60](https://github.com/crowdin/sketch-crowdin/pull/60))
- Fixes UI for adding multiple strings. Common markup fixes ([#61](https://github.com/crowdin/sketch-crowdin/pull/60))

## [2.3.3]

### Added

- Files multiselect ([#56](https://github.com/crowdin/sketch-crowdin/pull/56))

### Updated

- Removed max length autofill ([#56](https://github.com/crowdin/sketch-crowdin/pull/56))

## [2.3.2]

### Added

- Button to preview selected artboard ([#54](https://github.com/crowdin/sketch-crowdin/pull/54))
- Max. length field to add string form ([#53](https://github.com/crowdin/sketch-crowdin/pull/53))
- Logout button ([#54](https://github.com/crowdin/sketch-crowdin/pull/54))
- Validation to not add string with not unique identifier ([#54](https://github.com/crowdin/sketch-crowdin/pull/54))

### Updated

- Removed delete button when adding new string ([#54](https://github.com/crowdin/sketch-crowdin/pull/54))
- Updating max length every time when text was changed ([#54](https://github.com/crowdin/sketch-crowdin/pull/54))

## [2.3.1]

### Added

- Strings reload button ([#50](https://github.com/crowdin/sketch-crowdin/pull/50))
- Sorted files based on several parameters ([#51](https://github.com/crowdin/sketch-crowdin/pull/51))

### Updated

- Improved strings select/deselect performance ([#50](https://github.com/crowdin/sketch-crowdin/pull/50))
- Significantly improved text coordinates ([#50](https://github.com/crowdin/sketch-crowdin/pull/50))
- Improved loading strings for the specific branch ([#50](https://github.com/crowdin/sketch-crowdin/pull/50))

### Fixed

- Fixed info icon color ([#50](https://github.com/crowdin/sketch-crowdin/pull/50))

## [2.3.0]

### Added

- Branch configuration ([#46](https://github.com/crowdin/sketch-crowdin/pull/46))

### Updated

- Improved performance & code refactoring ([#48](https://github.com/crowdin/sketch-crowdin/pull/48))

## [2.2.0]

### Added

- Search strings by identifier ([#44](https://github.com/crowdin/sketch-crowdin/pull/44))
- Content segmentation option ([#45](https://github.com/crowdin/sketch-crowdin/pull/45))
- Additional file type which can be edited ([#44](https://github.com/crowdin/sketch-crowdin/pull/44))
- Info icon with information about string identifier, context and file ([#45](https://github.com/crowdin/sketch-crowdin/pull/45))

### Fixed

- Fixed messages with long text ([#45](https://github.com/crowdin/sketch-crowdin/pull/45))

## [2.1.2]

### Fixed

- Fixed position of the "check" icon ([#42](https://github.com/crowdin/sketch-crowdin/pull/42))

## [2.1.1]

### Added

- Possibility to deselect used strings by right clicking on it ([#40](https://github.com/crowdin/sketch-crowdin/pull/40))

### Fixed

- Issue with multi line strings ([#40](https://github.com/crowdin/sketch-crowdin/pull/40))

## [2.1.0]

### Added

- Strings management update ([#38](https://github.com/crowdin/sketch-crowdin/pull/38)):
  - new option in settings called 'Key Naming Pattern'
  - adding multiple strings
  - used string identifier for layer name instead of string text
  - added 'check' icon to used strings

### Updated

- Using file path as a file name ([#36](https://github.com/crowdin/sketch-crowdin/pull/36/))

### Fixed

- Fixed UI for Override translations functionality ([#37](https://github.com/crowdin/sketch-crowdin/pull/37))


## [2.0.1]

### Added

- Added flag to enable/disable translations override ([#34](https://github.com/crowdin/sketch-crowdin/pull/34/commits/c76521e4a8abdd19e612ef192fe7f97c8283790b))

### Updated

- css -> scss ([#34](https://github.com/crowdin/sketch-crowdin/pull/34/commits/3bae9c4a2f579cca5f87b0cb130255687046b595))
- Updated libraries versions ([#34](https://github.com/crowdin/sketch-crowdin/pull/34/commits/3cbf8b58f661af8db1a707006037a8eedbbe93fc))

### Fixed

- Fixed issue with single project ([#34](https://github.com/crowdin/sketch-crowdin/pull/34/commits/1a489f0130c4cfa1d993bc8827595d7af36d404c))

## [2.0.0]

### Added

- Introduced new UI/UX for the plugin ([#28](https://github.com/crowdin/sketch-crowdin/pull/28))
- Added "Crowdin Strings", "Screenshots" and "Preview" functionality ([#26](https://github.com/crowdin/sketch-crowdin/pull/26))

### Fixed

- Fixed height value and text coordinates for nested symbols ([#26](https://github.com/crowdin/sketch-crowdin/pull/26))

## [1.2.1]

### Added

- feat: added sketch plugin user agent

## [1.2.0]

### Added

- feat: implemented "All Languages" option for translations

## [1.1.1]

### Changed

- feat: re-implemented translations loading
- feat: updated skpm builder version
- feat: updated client version

## [1.1.0]

### Added

- Sketch Symbols support

## [1.0.1]

### Added

- "Contact Us" menu option
- Messages when user pull/push strings with translated elements

### Changed

- Improved error messages
- Updated texts

## [1.0.0]

### Added

- First release!

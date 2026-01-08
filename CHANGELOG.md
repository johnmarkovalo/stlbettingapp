# Changelog

All notable changes to the BettingApp project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2.9] - Version Code 19

### Added
- Total unsynced transactions count display
- Validation to block new bets if unsynced transaction limit is exceeded
- Enhanced documentation for transaction screen optimizations

### Changed
- Optimized database queries for better performance and maintainability
- Removed outdated documentation

### Chores
- Updated `.gitignore` to include IDE/editor specific files

---

## [2.8] - Version Code 18

### Added
- Maintenance schedule management with database integration
- Fetching maintenance schedules from API
- Saving schedules and checking maintenance status in Home screen

### Fixed
- Ensure betNumber, targetAmount, and rambolAmount values are treated as strings before concatenation to prevent potential errors in TransacScreen

---

## [2.7] - Version Code 17

### Added
- Enhanced SoldOut interface with improved error handling
- Integrated `react-native-fs` for file system access
- Update check functionality in App and Settings screens
- Enhanced error handling and validation in `isWithin15MinutesOfCutoff` and TransacScreen

### Changed
- Updated `printTransaction` function to improve text formatting
- Removed unused table printing code for enhanced output clarity

---

## [2.6] - Version Code 16

### Added
- Normalization functions for bet data in `printTransaction` to handle null and undefined values
- Improved error handling and output consistency for printing

---

## [2.5] - Version Code 15

### Added
- Authentication error handling in ApiClient to log out users on 401 errors
- Improved retry logic for network errors

### Changed
- Updated batch processing threshold in History screen from 50 to 20 unsynced transactions for improved performance

---

## [2.4] - Version Code 14

### Added
- Enhanced TransacScreen to include current transaction bets in target and rambol amount calculations
- Refined betting limit checks with detailed alerts for target and rambol bets
- POS combination amounts calculation and validation for betting limit checks
- Enhanced validation for combination amounts to ensure compliance with betting limits
- Combination amounts tracking and validation within 15 minutes of draw cutoff
- Sold out checks for target and rambol bets
- Enhanced validation logic for target and rambol amounts to respect capping limits

---

## [2.3] - Version Code 13

### Changed
- Updated Result component to use ResultModel type
- Improved result handling and enhanced data normalization

---

## [2.2] - Version Code 12

### Changed
- Refactored date calculations in History screen
- Disabled database cleanup in Home screen

---

## [2.1] - Version Code 11

### Added
- Bulk transaction fetching and syncing methods in ApiClient
- Enhanced History screen to utilize bulk API for improved performance
- Enhanced printer functionality with improved job management
- Detailed transaction printing and test print capabilities
- Printer integration with Nyx SDK
- Printer MAC address retrieval
- HTML stripping for print functions
- Test print functionality
- Printing queue management with error handling and connection checks
- Function to convert bet objects back to trans_data format
- Full sync flow in History screen
- Database optimization with disable draw if there's unsynced bets
- Server to local and local to server sync
- Sync settings upon login
- Interval fetch for soldout
- Sold out check when saving transaction
- Version display in settings
- Selected draw in Redux
- Confirmation for printing
- Agent name and smaller QR in print transaction
- Disable back, home and app tray buttons
- App logo
- Agent name to sales and hits ticket
- Delete last week transactions feature
- Database indexes
- Capping feature
- Loading states
- Triple digit betting support
- Winners page
- Sales printing
- Print transaction functionality
- Basic functions and scaffold

### Fixed
- QR code size reduction in printer
- Transaction syncing optimization with concurrency handling
- Saving bets from server
- History sync issues
- Transaction currentDraw null error
- Transaction with internet after checking soldout
- Soldout rambol sort value
- Double rambol win calculation
- Scanning crash
- Fetching issues
- Database close on every screen
- Transaction print issues
- DateTime formatting
- Created_at transaction field

### Changed
- Optimized API client
- Refactored TransacScreen
- Optimized and refactored components and screens
- Updated and optimized SQLite operations
- Hide debug information
- Hide logout button
- Check internet before scanning
- Separated target and rambol for hits and print
- Improved sync types messaging
- Removed long press on history
- Login scanning method improvements
- Camera style updates

### Chores
- Made filter use Redux
- Removed iOS folder
- Changed print button design

---

## [1.0] - Initial Release

### Added
- Initial commit with project scaffold
- TransacScreen implementation
- Settings Screen
- Home and History screens
- Current Draw functionality
- Redux state management
- Types and API helper
- Basic betting application functionality

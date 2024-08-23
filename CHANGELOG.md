# CHANGE LOG

This project is versioning following the rules on  [Semantic Versioning](http://semver.org/).

<!-- ## WIP -->
## 1.0.0 - 2024-08-22

### Fixed

- Fixed secuential ID generation when inserted many registries at once
- Data for update action is converted to correct format and type before saving it
- field selection in select method was fixed

### Changes

- field values are parsed to Date when filter value is a Date in where filters criterias
- idStrategyType could be defined globally through config method or locally with each insert, which overrides the global configuration
- Redefined paginator method

### Added

- Join without criteria to make a full-join
- concat function to tables with same structure
- Logic to allow joins between tables with the same name in differents spreadsheets
- Delete method now accept a harDelete param, false by default
- Marked as deleted registries are by default excluded in select queries
- hash column now is used to validate when an update is a real one so it changes the updated_at field value
- Added filter methods whereAny, orWhere, or.

## 0.2.0 - 2023-12-08

### Changes in 0.2.0

- select method now returns a Paginator class instance

### Added in 0.2.0

- Support for functions as an argument of filtering in with()
- Paginator class with methods to transform and paginate select results

## 0.1.0 - 2023-11-15

### Added in 0.1.0

- Initial Commit

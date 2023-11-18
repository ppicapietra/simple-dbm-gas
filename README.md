# README

## Purpose

SimpleDBM is a database management library for Google Apps Script, which simplifies CRUD operations on Google Sheets spreadsheets.

## Import Library into App Script Project

1) Open your Google Apps Script project and click on "Resources" in the menu bar.
2) Select "Libraries" and in the "Add a library" field, enter the following script ID: `1idg_NM6FIZQZxgM7Howrt44u2vmmhkypG9ha9iSn9xhv_GbfaVScfo0J`
3) Choose the latest version and select "Save".
4) In your code, you can now use the SimpleDBM to make queries on spreadsheets

## Usage

### Configuration

If you also import SimpleLogger, you can configure this service to log with that service too.

```javascript
SimpleDBM.config({ logger: SimpleLogger });
```

### Queries

#### Select

```javascript
dbm.spreadsheet('spreadsheet-id').sheet('sheet-name').select();

dbm.spreadsheet('spreadsheet-id').sheet('sheet-name').with('fieldName', '=', 'value').select(["fieldName", "fieldName2"]);

const filterFunction = (cellValue, desiredResult) => {/** do some magic and return true/false */} 
dbm.spreadsheet('spreadsheet-id').sheet('sheet-name').with('fieldName', filterFunction, 'value').select(["fieldName", "fieldName2"]);
```

#### With Join

```javascript
dbm.spreadsheet('spreadsheet-id').sheet('sheet-name').join('another-spreadsheet-id', 'another-sheet-name', [ "id", "id_post", "=" ], 'tableAlias').select();

dbm.spreadsheet('spreadsheet-id').sheet('sheet-name').with('fieldName', '=', 'value').join('another-spreadsheet-id', 'another-sheet-name', [ "id", "id_post" ], 'tableAlias').select(); // equal criteria in join filter is the default behaviour

// several criteria conditions to the join
dbm.spreadsheet('spreadsheet-id').sheet('sheet-name').join('another-spreadsheet-id', 'another-sheet-name', [[ "id", "id_post" ], [ "author_id", "author_id" ]], 'tableAlias').select();
```

#### Insert

```javascript
dbm.spreadsheet('spreadsheet-id').sheet('sheet-name').insert({ fieldName: 'value' });

// several rows on the same sentence
dbm.spreadsheet('spreadsheet-id').sheet('sheet-name').insert([{ fieldName: 'value' }, { fieldName: 'value2' }]);

// with defaults values
dbm.spreadsheet('spreadsheet-id').sheet('sheet-name').withDefaults(defaultVauesObject).insert([{ fieldName: 'value' }, { fieldName: 'value2' }]);
```

#### Update

```javascript
dbm.spreadsheet('spreadsheet-id').sheet('sheet-name').with('fieldName', '=', 'value').update({ fieldName: 'new-value' });
```

#### Delete

```javascript
dbm.spreadsheet('spreadsheet-id').sheet('sheet-name').with('fieldName', '=', 'value').delete();

dbm.spreadsheet('spreadsheet-id').sheet('sheet-name').with('fieldName', 'value').delete(); //
```

## Methods

| Method Name | Function and Parameters Description | Returned Value | Throws Exceptions |
|-------------|-------------------------------------|----------------|-------------------|
| delete() | Deletes data from the spreadsheet based on filters. | SimpleDBM instance for chaining. | Yes, if filters or the sheet name are not provided. |
| insert(data) | Inserts data into the spreadsheet. <br> - data (array/object): Data to be inserted. Required. | SimpleDBM instance for chaining. | Yes, if the data type is invalid. |
| join(spreadsheetId, sheetNameOrIndex, criterias, as) | Performs join operations with another sheet. <br> - spreadsheetId (string): Spreadsheet ID to join. Required. <br> - sheetNameOrIndex (string/number): Name or index of the sheet to join. Required. <br> - criterias (array): Criteria for joining. Required. <br> - as (string): Optional alias for joined data. Default: null. | SimpleDBM instance for chaining. | Yes, if join criteria are invalid or ambiguous. |
| select(fields) | Selects data from the spreadsheet. <br> - fields (string/array): Fields to select, "*" for all. Default: "*". | Object with fields and data. | No |
| sheet(sheetNameOrIndex, as) | Sets the spreadsheet and an optional prefix for subsequent operations. <br> - sheetNameOrIndex (string/number): Name or index of the sheet. Required. <br> - as (string): Optional prefix for field names. Default: null. | SimpleDBM instance for chaining. | Yes, if the spreadsheet is not found. |
| spreadsheet(spreadsheetId) | Creates a SimpleDBM instance for a specified spreadsheet. <br> - spreadsheetId (string): Spreadsheet ID. Required. | SimpleDBM instance for chaining. | No |
| update(data) | Updates data in the spreadsheet. <br> - data (object): Data to be updated. Required. | SimpleDBM instance for chaining. | Yes, if filters or the sheet name are not provided. |
| with(fieldName, criteria, value) | Adds filters to the operation. <br> - fieldName: Name of the field to be compared. <br> - criteria: string, regular expression, or function used to evaluate the acceptance condition. <br> - value: (optional) value used for comparison in the evaluation. | SimpleDBM instance for chaining. | Yes, if filters or the sheet name are not provided. |
| withDefaults(defaultValues) | Sets default values for insert and update operations. <br> - defaultValues (object): Object with default values. Required. | SimpleDBM instance for chaining. | No |

## Contributions

To contribute to this library, please submit a pull request or open an issue in our repository.

## License

SimpleDBM is distributed under the MIT license.

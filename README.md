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
dbm.spreadsheet('spreadsheet-id').sheet('sheet-name').select().get();

/**o picking only specific fields/columns */
dbm.spreadsheet('spreadsheet-id').sheet('sheet-name').where('fieldName', '=', 'value').select(["fieldName", "fieldName2"]).firstOrFail();

/**o filtering results */
const filterFunction = (cellValue, desiredResult) => {/** do some magic and return true/false */} 
dbm.spreadsheet('spreadsheet-id').sheet('sheet-name').where('fieldName', filterFunction, 'value').select(["fieldName", "fieldName2"]).get();

/**o ordering results */
dbm.spreadsheet('spreadsheet-id').sheet('sheet-name').withOrder('table.field-name', 'desc').select().getAllAsObjects();
```

#### With Join

```javascript
dbm.spreadsheet('spreadsheet-id').sheet('sheet-name').join('another-spreadsheet-id', 'another-sheet-name', [ "id", "id_post", "=" ], 'tableAlias').select();

dbm.spreadsheet('spreadsheet-id').sheet('sheet-name').where('fieldName', '=', 'value').join('another-spreadsheet-id', 'another-sheet-name', [ "id", "id_post" ], 'tableAlias').select(); // equal criteria in join filter is the default behaviour

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
dbm.spreadsheet('spreadsheet-id').sheet('sheet-name').where('fieldName', '=', 'value').update({ fieldName: 'new-value' });
```

#### Delete

```javascript
dbm.spreadsheet('spreadsheet-id').sheet('sheet-name').where('fieldName', '=', 'value').delete();

dbm.spreadsheet('spreadsheet-id').sheet('sheet-name').where('fieldName', 'value').delete(); //
```

## DBM Methods

| Method Name | Function and Parameters Description | Returned Value | Throws Exceptions |
|-------------|-------------------------------------|----------------|-------------------|
| source(spreadsheetId, sheetNameOrIndex, [as]) | Set the base source table for operations.<br>- spreadsheetId (string): spreadsheet ID.<br>- sheetNameOrIndex (string \| int): sheet name or zero-indexed index of sheet in spreadsheet.<br>- as: Optional. Alias for the table used in field names in results. If isn't passed, original sheet name is used in his place | SimpleDBM instance for chaining. | Yes, if filters or the sheet name are not provided. |
| delete(hardDelete) | Deletes data from the spreadsheet based on filters.<br>- hardDelete(bool): Optional. Whether to delete the registry or just mark it as deleted | SimpleDBM instance for chaining. | Yes, if filters or the sheet name are not provided. |
| insert(data) | Inserts data into the spreadsheet. <br> - data (array \| object): Data to be inserted. Required. | SimpleDBM instance for chaining. | Yes, if the data type is invalid. |
| join(spreadsheetId, sheetNameOrIndex, criterias, [as]) | Performs join operations with another sheet. <br> - spreadsheetId (string): Spreadsheet ID to join. Required. <br> - sheetNameOrIndex (string \| number): Name or index of the sheet to join. Required. <br> - criterias (array): Criteria for joining. Required. <br> - as (string): Optional alias for joined data. Default: null. | SimpleDBM instance for chaining. | Yes, if join criteria are invalid or ambiguous. |
| orderBy(fieldName, [orderType]) | Adds order clause to the results.<br>- fieldName (string): Field name or column to use in ordering. When joins operations are performed, fieldName has to be prefixed with table name with dot notation. Required. <br>- orderType (string): if it is asc or desc. Default: desc | None | Yes, if fieldName is missing. |
| select([fields]) | Selects data from the spreadsheet. <br> - fields (string \| array): Fields to select, "*" for all. Default: "*". | Paginator class instance | No |
| sheet(sheetNameOrIndex, [as]) | Sets the spreadsheet and an optional prefix for subsequent operations. <br> - sheetNameOrIndex (string \| number): Name or index of the sheet. Required. <br> - as (string): Optional prefix for field names. Default: null. | SimpleDBM instance for chaining. | Yes, if the spreadsheet is not found. |
| spreadsheet(spreadsheetId) | Creates a SimpleDBM instance for a specified spreadsheet. <br> - spreadsheetId (string): Spreadsheet ID. Required. | SimpleDBM instance for chaining. | No |
| update(data) | Updates data in the spreadsheet. <br> - data (object): Data to be updated. Required. id Data contains an id property, a new where filter is defined limiting changes to records with that id| SimpleDBM instance for chaining. | Yes, if filters or the sheet name are not provided. |
| where(fieldName, criteria, value) | Adds filters to the operation. <br> - fieldName: Name of the field to be compared. <br> - criteria: string, regular expression, or function used to evaluate the acceptance condition. <br> - value: (optional) value used for comparison in the evaluation. | SimpleDBM instance for chaining. | No |
| whereNotNull(fieldName) | Adds filters to the operation. <br> - fieldName: Name of the field to validate as not null. | SimpleDBM instance for chaining. | No |
| whereNull(fieldName) | Adds filters to the operation. <br> - fieldName: Name of the field to validate as null. | SimpleDBM instance for chaining. | No |
| orWhere(fieldName, criteria?, value) | Adds a new group of where filters to the operation. Arguments are similar to where method. | SimpleDBM instance for chaining. | No |
| or() | Initialize a new empty group of where filters to the operation. | SimpleDBM instance for chaining. | No |
| whereAny(conditions: Array<[fieldName, [criteria], value]>) | Adds filters to the operation with OR logic. Every condition item is similar to a where clause. | SimpleDBM instance for chaining. | Yes, if conditions is not an array of any condition item isn't a where valid clause. |
| withTrash() | Adds filters to include soft deleted records. | SimpleDBM instance for chaining. | No |
| withDefaults(defaultValues) | Sets default values for insert and update operations. <br> - defaultValues (object): Object with default values. Required. | SimpleDBM instance for chaining. | No |

## Where criterias operators

| operator | filter value | Observations
|-------------|----------------|----------------|
| regExp | string | string |
| function | Any | the function is called with field value as a first parameter and filter value as a second parameter|
| 'in' | Array | if the field value is in the array of filter values|
| "=", "!=", ">", "<", ">=", "<=" | string | a common comparison between the field and filter values. Date values are converted calling getTime() method. Numbers are parsed if both are numbers  |
| "X=", "X>=", "X<=" (where "X" is a number) | number | a common comparison between the field and filter values, parsing field value and filter value to a number, where the filter value is a X multiple of field value|

## Paginator Methods

| Method Name | Function and Parameters Description | Returned Value | Throws Exceptions |
|-------------|-------------------------------------|----------------|-------------------|
| paginate(resultsPerPage, pageNumber) | Returns an object with generic data to recreate a pagination of results.<br>- resultsPerPage (int): max items per page,<br>- pageNumber (int): page number to retrieve | Object: { currentPage: int, resultsPerPage: int, totalResults: int, totalPages: int, headers: string[], data: object[] } | No |
| first() | Returns the first record after applying filters and ordering | array \| null | No |
| firstOrFail() |  Returns the first record after applying filters and ordering or throw an exception if there isn't one | array | Yes. If is there no records in results |
| getAllAsObject() | Returns all the records parsed as objects, where keys are table fields names, and values are the record values  | Object[] | No |
| transform() | Applies a transformation function to each record in the data set and stores the result  | Paginator instance | Yes. If the callback isn't a function |

## Contributions

To contribute to this library, please submit a pull request or open an issue in our repository.

## License

SimpleDBM is distributed under the MIT license.

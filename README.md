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

dbm.spreadsheet('spreadsheet-id').sheet('sheet-name').with('columnName', '=', 'value').select(["colName", "colName2"]);
```

#### With Join

```javascript
dbm.spreadsheet('spreadsheet-id').sheet('sheet-name').join('another-spreadsheet-id', 'another-sheet-name', [ "id", "id_post", "=" ], 'tableAlias').select();

dbm.spreadsheet('spreadsheet-id').sheet('sheet-name').with('columnName', '=', 'value').join('another-spreadsheet-id', 'another-sheet-name', [ "id", "id_post" ], 'tableAlias').select(); // equal criteria in join filter is the default behaviour

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

Method Name | Function and Parameters Description | Returned Value | Throws Exceptions
|---------|---------|---------|---------|
spreadsheet(spreadsheetId) | Crea una instancia de SimpleDBM para una hoja de cálculo especificada. - spreadsheetId (string): ID de la hoja de cálculo. Obligatorio. | Instancia de SimpleDBM para encadenamiento. | No
sheet(sheetNameOrIndex, as) | Establece la hoja de cálculo y un prefijo opcional para las operaciones subsiguientes. - sheetNameOrIndex (string/number): Nombre o índice de la hoja. Obligatorio. - as (string): Prefijo opcional para nombres de campo. Por defecto: null. | Instancia de SimpleDBM para encadenamiento. | Sí, si la hoja de cálculo no se encuentra.
with(fieldName, comparisonOperator, filterValue) | Filtra los datos basándose en un campo y un valor. - fieldName (string): Nombre del campo para filtrar. Obligatorio. - comparisonOperator (string): Operador de comparación, por defecto '='. Opcional. - filterValue (any): Valor para comparar. Obligatorio. | Instancia de SimpleDBM para encadenamiento. | No
withDefaults(defaultValues) | Establece valores predeterminados para operaciones de inserción y actualización. - defaultValues (object): Objeto con valores predeterminados. Obligatorio. | Instancia de SimpleDBM para encadenamiento. | No
join(spreadsheetId, sheetNameOrIndex, criterias, as) | Realiza operaciones de unión con otra hoja. - spreadsheetId (string): ID de la hoja de cálculo para unir. Obligatorio. - sheetNameOrIndex (string/number): Nombre o índice de la hoja para unir. Obligatorio. - criterias (array): Criterios para la unión. Obligatorio. - as (string): Alias opcional para los datos unidos. Por defecto: null. | Instancia de SimpleDBM para encadenamiento. | Sí, si los criterios de unión son inválidos o ambiguos.
select(fields) | Selecciona datos de la hoja de cálculo. - fields (string/array): Campos a seleccionar, "*" para todos. Por defecto: "*". | Objeto con fields y data. | No
insert(data) | Inserta datos en la hoja de cálculo. - data (array/object): Datos a insertar. Obligatorio. | Instancia de SimpleDBM para encadenamiento. | Sí, si el tipo de datos es inválido.
update(data) | Actualiza datos en la hoja de cálculo. - data (object): Datos a actualizar. Obligatorio. | Instancia de SimpleDBM para encadenamiento. | Sí, si no se proporcionan filtros o el nombre de la hoja de cálculo.
delete() | Elimina datos de la hoja de cálculo basándose en filtros. | Instancia de SimpleDBM para encadenamiento. | Sí, si no se proporcionan filtros o el nombre de la hoja de cálculo.


## Contributions

To contribute to this library, please submit a pull request or open an issue in our repository.

## License

SimpleDBM is distributed under the MIT license.
